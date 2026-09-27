import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {parse} from 'csv-parse/sync';
import {pick} from './csv.mjs';
import {entities,resolve,number,date,audit} from './domain.mjs';
import {addRecord} from '../erp.mjs';
const types=['customers','vendors','items','jobs','sales-orders','purchase-orders','sales-lines','purchase-lines'];
function amount(v,fallback='0'){const s=(v||fallback).replaceAll(',','');if(!/^\d+(\.\d+)?$/.test(s))throw Error(`Invalid amount ${v}`);number(s);return s;}
function importedDate(v,order){if(/^\d{4}-\d{2}-\d{2}$/.test(v))return date(v);if(!['dmy','mdy'].includes(order))throw Error('Use ISO dates or --date-order=dmy / mdy');const m=/^(\d{1,2})[/.](\d{1,2})[/.](\d{4})$/.exec(v);if(!m)throw Error(`Invalid date ${v}`);return date(`${m[3]}-${(order==='dmy'?m[2]:m[1]).padStart(2,'0')}-${(order==='dmy'?m[1]:m[2]).padStart(2,'0')}`);}
export async function importBusinessCentral(db,type,file,f){
 if(type!=='bundle'&&!types.includes(type))throw Error(`Import type must be bundle or ${types.join(', ')}`);
 if(!file)throw Error('CSV file or bundle folder required');
 if(f.date_order&&!['dmy','mdy'].includes(f.date_order))throw Error('date-order must be dmy or mdy');
 const files=type==='bundle'?types.map(t=>({type:t,file:path.join(file,t+'.csv')})).filter(x=>fs.existsSync(x.file)):[{type,file}];
 if(!files.length)throw Error('No supported CSV files in bundle');const result=[];await db.exec('BEGIN');
 try{
 for(const input of files){
 const raw=fs.readFileSync(input.file,'utf8'),digest=createHash('sha256').update(raw).digest('hex');
 const rows=parse(raw,{columns:true,bom:true,skip_empty_lines:true,trim:true});if(!rows.length)throw Error(`Empty CSV ${input.file}`);
 const name=`${input.type}:${digest}:${f.location||''}:${f.date_order||''}`;
 if((await db.query('select id from import_batches where name=$1',[name])).length){result.push({type:input.type,mode:f.apply?'apply':'dry-run',inserted:0,existing:rows.length});continue;}
 let inserted=0,existing=0;
 for(let index=0;index<rows.length;index++){
 const row=rows[index];try{
 const code=pick(row,'No.','No','Number');
 if(input.type.endsWith('-lines')){
  const kind=input.type==='sales-lines'?'sales':'purchase';const doc=pick(row,'Document No.','Document No');if(!doc||!code)throw Error('Document No. and No. (item) are required');
  const o=await resolve(db,'order',doc);if(o.kind!==kind||o.status!=='draft')throw Error('Import lines into matching draft orders only');
  const typeCell=pick(row,'Type');if(typeCell&&typeCell!=='Item')throw Error('Only Item lines supported; map service or account lines separately');
  const no=number(pick(row,'Line No.','Line No'),{positive:true,integer:true});const qty=pick(row,'Outstanding Quantity');if(!qty)throw Error('Outstanding Quantity is required; completed history stays in the original archive');
  if(Number(amount(qty))===0)continue;
  const item=await resolve(db,'item',code),unit=pick(row,'Unit of Measure Code');if(unit&&unit!==item.unit)throw Error(`Unit differs for ${code}; convert to the base unit before import`);
  const price=amount(pick(row,kind==='sales'?'Unit Price':'Direct Unit Cost'));const count=amount(qty);
  const old=(await db.query('select * from order_lines where order_id=$1 and line_no=$2',[o.id,no]))[0];
  if(old){if(old.item_id!==item.id||Number(old.quantity)!==Number(count)||Number(old.unit_price)!==Number(price))throw Error('Existing line differs; reconcile it before importing');existing++;continue;}
  await db.query('insert into order_lines(order_id,line_no,item_id,quantity,unit_price,cost_basis) values($1,$2,$3,$4,$5,$6)',[o.id,no,item.id,count,price,item.unit_cost]);inserted++;continue;
 }
 if(!code)throw Error('No. is required');let entity,values;
 if(input.type==='customers'||input.type==='vendors'){
  if(pick(row,'Blocked')&&!['No','None'].includes(pick(row,'Blocked')))throw Error('Blocked account needs review before import');
  entity=input.type==='customers'?'customer':'vendor';values={code,name:pick(row,'Name'),email:pick(row,'E-Mail','Email')};if(entity==='customer')values.credit_limit=amount(pick(row,'Credit Limit (LCY)'));
 }else if(input.type==='items'){
  if(pick(row,'Type')&&pick(row,'Type')!=='Inventory')throw Error('Only Inventory items supported');
  entity='item';values={code,name:pick(row,'Description','Name'),unit:pick(row,'Base Unit of Measure')||'EA',unit_cost:amount(pick(row,'Unit Cost')),unit_price:amount(pick(row,'Unit Price')),reorder_point:amount(pick(row,'Reorder Point'))};if(pick(row,'Vendor No.'))values.vendor_id=pick(row,'Vendor No.');
 }else if(input.type==='jobs'){
  entity='job';values={code,name:pick(row,'Description','Name'),customer_id:pick(row,'Bill-to Customer No.'),due_date:importedDate(pick(row,'Ending Date'),f.date_order),budget:amount(pick(row,'Budget Total Cost')),revenue:amount(pick(row,'Budget Total Price')),dimension:pick(row,'Global Dimension 1 Code')};
 }else{
  entity='order';const kind=input.type==='sales-orders'?'sales':'purchase';const currency=pick(row,'Currency Code');const s=(await db.query('select currency from settings'))[0];if(currency&&currency!==s.currency)throw Error('Foreign currency order needs separate mapping');
  values={code,kind,location_id:pick(row,'Location Code')||f.location,due_date:importedDate(pick(row,kind==='sales'?'Shipment Date':'Expected Receipt Date'),f.date_order),dimension:pick(row,'Shortcut Dimension 1 Code')};
  values[kind==='sales'?'customer_id':'vendor_id']=pick(row,kind==='sales'?'Sell-to Customer No.':'Buy-from Vendor No.');
 }
 if((entity!=='order')&&!values.name)throw Error('Name or Description is required');
 const old=(await db.query(`select * from ${entities[entity].table} where code=$1`,[code]))[0];
 if(old){if(JSON.stringify(old.source_data)!==JSON.stringify(JSON.parse(JSON.stringify(row)))){
 // jsonb key order is not stable. Compare sorted entries instead.
 const sort=o=>JSON.stringify(Object.entries(o).sort(([a],[b])=>a.localeCompare(b)));
 if(sort(old.source_data)!==sort(row))throw Error(`Code ${code} exists with different source data; reconcile before import`);
 }existing++;continue;}
 const record=await addRecord(db,entity,values);await db.query(`update ${entities[entity].table} set source_data=$1 where id=$2`,[JSON.stringify(row),record.id]);
 if(entity==='item'&&pick(row,'Inventory')!==''){
  if(!f.location)throw Error('Items with Inventory require --location for the opening balance');const qty=Number(amount(pick(row,'Inventory')));const location=await resolve(db,'location',f.location);
  if(qty)await db.query('insert into stock_moves(item_id,location_id,quantity,reason,event_key) values($1,$2,$3,$4,$5)',[record.id,location.id,qty,'Business Central opening snapshot',`bc-opening:${record.id}`]);
 }
 inserted++;
 }catch(e){throw Error(`${input.type} row ${index+2}: ${e.message}`);}
 }
 await db.query('insert into import_batches(name,entity,digest,row_count,source_file) values($1,$2,$3,$4,$5)',[name,input.type,digest,rows.length,path.basename(input.file)]);
 await audit(db,'import',null,{type:input.type,inserted,existing,digest});result.push({type:input.type,mode:f.apply?'apply':'dry-run',inserted,existing});
 }
 await db.exec(f.apply?'COMMIT':'ROLLBACK');return result;
 }catch(e){await db.exec('ROLLBACK');throw e;}
}
