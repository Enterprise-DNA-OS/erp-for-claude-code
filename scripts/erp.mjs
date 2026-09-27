#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {getDb,REPO_ROOT} from './lib/db.mjs';
import {table} from './lib/format.mjs';
import {entities,reports,snapshots,resolve,transaction,audit,number,date,compliance} from './lib/domain.mjs';
import {importBusinessCentral} from './lib/import.mjs';
export const actions=['setup','order','job','add','set','line','release','receive','ship','adjust-stock','log-cost','log','invoice-balance','close-job','cancel-order','draft-order','draft-chase','import','export'];
function parse(args){const pos=[],flags={};for(const a of args){if(!a.startsWith('--')){pos.push(a);continue;}const eq=a.indexOf('=');const key=(eq<0?a.slice(2):a.slice(2,eq)).replaceAll('-','_');if(key in flags)throw Error(`Duplicate flag ${key}`);flags[key]=eq<0?true:a.slice(eq+1);}delete flags.json;return {pos,flags};}
function allow(f,keys){for(const k of Object.keys(f))if(!keys.includes(k))throw Error(`Unknown option --${k.replaceAll('_','-')}`);}
function required(v,label){if(typeof v!=='string'||!v.trim())throw Error(`${label} is required`);return v.trim();}
async function configured(db){if((await db.query('select id from settings')).length!==1)throw Error('Run setup once before adding real records');}
export async function addRecord(db,entity,fields){
 const cfg=entities[entity];if(!cfg)throw Error(`Unknown entity ${entity}`);allow(fields,cfg.fields);
 const vals={...fields};
 for(const [key,value] of Object.entries(vals)){
  if(typeof value!=='string')throw Error(`--${key} needs a value`);
  if(/date$|_on$|period_end|retain_until/.test(key))date(value);
  if(['credit_limit','lead_days','unit_cost','unit_price','reorder_point','budget','revenue','total','paid'].includes(key))number(value,{integer:key==='lead_days'});
  if(cfg.refs?.[key])vals[key]=(await resolve(db,cfg.refs[key],value)).id;
 }
 if('code' in vals&&!vals.code.trim())throw Error('code is required');if('name' in vals&&!vals.name.trim())throw Error('name is required');
 if(entity==='order'&&vals.job_id){const j=(await db.query('select * from jobs where id=$1',[vals.job_id]))[0];if(j.status!=='open')throw Error('Job is closed');if(vals.kind==='sales'&&j.customer_id!==vals.customer_id)throw Error('Job and order customer differ');}
 const keys=Object.keys(vals);if(!keys.length)throw Error('Supply record fields');
 const row=(await db.query(`insert into ${cfg.table}(${keys.join(',')}) values(${keys.map((_,i)=>'$'+(i+1)).join(',')}) returning *`,Object.values(vals)))[0];
 await audit(db,`add ${entity}`,row.id,vals);return row;
}
async function lockedOrder(db,ref){const o=await resolve(db,'order',ref);return (await db.query('select * from orders where id=$1 for update',[o.id]))[0];}
async function lineRow(db,o,n){return (await db.query('select * from order_lines where order_id=$1 and line_no=$2 for update',[o.id,number(n,{positive:true,integer:true})]))[0]||(()=>{throw Error('No such order line');})();}
export async function run(db,args){
 const {pos,flags:f}=parse(args),[cmd='help',...p]=pos;
 if(cmd in reports){allow(f,[]);return db.query(reports[cmd]);}
 if(cmd==='help'){allow(f,[]);return [{commands:[...Object.keys(reports),'compliance','weekly-review',...actions].join(', '),guide:'docs/cli.md'}];}
 if(cmd==='compliance'){allow(f,[]);return compliance(db);}
 if(cmd==='weekly-review'){allow(f,[]);return {attention:await db.query(reports.attention),dispatch:await db.query(reports.dispatch),purchasing:await db.query(reports['supplier-chase'])};}
 if(cmd==='order'){allow(f,[]);const o=await resolve(db,'order',p[0]);return {order:(await db.query('select * from v_orders where id=$1',[o.id]))[0],lines:await db.query('select l.*,i.code as item,i.name from order_lines l join items i on i.id=l.item_id where order_id=$1 order by line_no',[o.id]),activity:await db.query('select note,created_at from activity where order_id=$1 order by created_at',[o.id])};}
 if(cmd==='job'){allow(f,[]);const j=await resolve(db,'job',p[0]);return {job:(await db.query('select * from v_jobs where id=$1',[j.id]))[0],costs:await db.query('select category,amount,note from job_costs where job_id=$1',[j.id])};}
 if(cmd==='export'){allow(f,[]);const file=path.resolve(required(p[0],'Output file'));const records={};await transaction(db,async()=>{await db.exec('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY');for(const t of snapshots)records[t]=await db.query(`select * from ${t} order by id`);});fs.writeFileSync(file,JSON.stringify({version:1,exported_at:new Date().toISOString(),records},null,2)+'\n',{flag:'wx'});return [{file,entities:snapshots.length}];}
 if(cmd==='import'){if(p[0]!=='business-central')throw Error('Supported import: business-central');allow(f,['apply','location','date_order']);if(f.apply!==undefined&&f.apply!==true)throw Error('Use --apply without a value');await configured(db);return importBusinessCentral(db,p[1],p[2],f);}
 if(cmd==='draft-order'||cmd==='draft-chase'){
  allow(f,[]);const o=(await run(db,['order',p[0]]));if(cmd==='draft-chase'&&o.order.kind!=='purchase')throw Error('Supplier chase needs a purchase order');
  const folder=path.resolve(process.env.OUTPUT_DIR||REPO_ROOT,'drafts');fs.mkdirSync(folder,{recursive:true});const file=path.join(folder,`${cmd}-${o.order.id}-${Date.now()}.md`);
  const lines=o.lines.map(l=>`| ${l.item} | ${l.quantity} | ${l.completed} | ${l.unit_price} |`).join('\n');
  fs.writeFileSync(file,`# DRAFT: ${o.order.code}\n\nFor ${o.order.partner}. Due ${(o.order.due_date instanceof Date?o.order.due_date.toISOString():String(o.order.due_date)).slice(0,10)}.\n\n${cmd==='draft-chase'?'Please confirm the remaining quantities and expected delivery date.':'Please review this order before issuing it.'}\n\n| Item | Ordered | Completed | Unit amount |\n|---|---|---|---|\n${lines}\n\nNothing has been sent. Amounts exclude tax.\n`,{flag:'wx'});return [{file}];
 }
 if(!actions.includes(cmd))throw Error(`Unknown command: ${cmd}. Run help.`);
 return transaction(db,async()=>{
 if(cmd==='setup'){
  allow(f,['name','country','currency','retention_years','last_backup','backup_ref']);required(f.name,'name');if(!['NZ','AU'].includes(f.country))throw Error('country must be NZ or AU');if(!['NZD','AUD','USD'].includes(f.currency))throw Error('currency must be NZD, AUD or USD');
  const existing=(await db.query('select * from settings for update'))[0];if(existing&&(f.country!==existing.country||f.currency!==existing.currency))throw Error('Country and currency are fixed for this database; use a separate database');
  const years=number(f.retention_years??(f.country==='NZ'?7:5),{integer:true});if(f.last_backup)date(f.last_backup);
  const rows=existing?await db.query('update settings set name=$1,retention_years=$2,last_backup=$3,backup_ref=$4 where id=$5 returning *',[f.name,years,f.last_backup||null,f.backup_ref||null,existing.id]):await db.query('insert into settings(name,country,currency,retention_years,last_backup,backup_ref) values($1,$2,$3,$4,$5,$6) returning *',[f.name,f.country,f.currency,years,f.last_backup||null,f.backup_ref||null]);
  await audit(db,cmd,rows[0].id,{name:f.name});return rows;
 }
 await configured(db);
 if(cmd==='add')return [await addRecord(db,p[0],f)];
 if(cmd==='set'){
  const cfg=entities[p[0]];if(!cfg)throw Error('Unknown entity');
  const editable={customer:['name','email','credit_limit'],vendor:['name','email','lead_days'],item:['name','unit_cost','unit_price','reorder_point'],location:['name'],job:['name','due_date','budget','revenue','dimension'],order:['due_date','dimension'],invoice:['due_date','ledger_ref'],record:entities.record.fields};
  allow(f,editable[p[0]]);if(!Object.keys(f).length)throw Error('Supply fields to change');const r=await resolve(db,p[0],p[1]);
  const locked=(await db.query(`select * from ${cfg.table} where id=$1 for update`,[r.id]))[0];if(locked.status&&['closed','cancelled'].includes(locked.status))throw Error('Record is closed');
  for(const [k,v] of Object.entries(f)){required(v,k);if(/date$|_on$|period_end|retain_until/.test(k))date(v);if(['credit_limit','lead_days','unit_cost','unit_price','reorder_point','budget','revenue'].includes(k))number(v,{integer:k==='lead_days'});}
  const keys=Object.keys(f);const rows=await db.query(`update ${cfg.table} set ${keys.map((k,i)=>`${k}=$${i+1}`).join(',')} where id=$${keys.length+1} returning *`,[...Object.values(f),r.id]);
  await audit(db,cmd,r.id,{entity:p[0],before:Object.fromEntries(keys.map(k=>[k,r[k]])),after:f});return rows;
 }
 if(cmd==='line'){
  allow(f,[]);const [order,item,qty,price,n]=p,o=await lockedOrder(db,order);if(o.status!=='draft')throw Error('Add lines only to draft orders');const i=await resolve(db,'item',item);
  const line=(await db.query('insert into order_lines(order_id,line_no,item_id,quantity,unit_price,cost_basis) values($1,$2,$3,$4,$5,$6) returning *',[o.id,number(n,{positive:true,integer:true}),i.id,number(qty,{positive:true}),number(price),i.unit_cost]))[0];await audit(db,cmd,o.id,line);return [line];
 }
 if(cmd==='release'||cmd==='cancel-order'){
  allow(f,[]);const o=await lockedOrder(db,p[0]);
  if(cmd==='release'){if(o.status!=='draft')throw Error('Release requires a draft');if(!(await db.query('select id from order_lines where order_id=$1',[o.id])).length)throw Error('Order has no lines');}
  else {if(!['draft','open'].includes(o.status))throw Error('Order is already closed');if((await db.query('select id from order_lines where order_id=$1 and completed>0',[o.id])).length)throw Error('Cannot cancel a partially fulfilled order');required(p[1],'Cancellation reason');}
  const rows=await db.query('update orders set status=$1 where id=$2 returning code,status',[cmd==='release'?'open':'cancelled',o.id]);await audit(db,cmd,o.id,{reason:p[1]||''});return rows;
 }
 if(cmd==='receive'||cmd==='ship'){
  allow(f,['event']);const o=await lockedOrder(db,p[0]);if(o.status!=='open')throw Error('Order is not open');if(o.kind!==(cmd==='receive'?'purchase':'sales'))throw Error('Wrong order kind');const l=await lineRow(db,o,p[1]);const qty=number(p[2],{positive:true});if(qty>Number(l.quantity)-Number(l.completed))throw Error('Quantity exceeds remaining order line');const event=required(f.event,'--event');
  await db.query('select id from items where id=$1 for update',[l.item_id]);
  const stock=Number((await db.query('select coalesce(sum(quantity),0) as qty from stock_moves where item_id=$1 and location_id=$2',[l.item_id,o.location_id]))[0].qty);
  if(cmd==='ship'&&qty>stock)throw Error('Insufficient stock');
  await db.query('insert into stock_moves(item_id,location_id,line_id,quantity,reason,event_key) values($1,$2,$3,$4,$5,$6)',[l.item_id,o.location_id,l.id,cmd==='receive'?qty:-qty,`${cmd} ${o.code}`,event]);
  await db.query('update order_lines set completed=completed+$1 where id=$2',[qty,l.id]);
  const rows=await db.query("update orders set status=case when exists(select 1 from order_lines where order_id=$1 and completed<quantity) then 'open' else 'closed' end where id=$1 returning code,status",[o.id]);
  await audit(db,cmd,o.id,{line:l.line_no,quantity:qty,event});return rows;
 }
 if(cmd==='adjust-stock'){
  allow(f,['event']);const i=await resolve(db,'item',p[0]),l=await resolve(db,'location',p[1]);const qty=Number(p[2]);if(!Number.isFinite(qty)||qty===0)throw Error('Nonzero stock quantity required');required(p[3],'Reason');required(f.event,'--event');
  await db.query('select id from items where id=$1 for update',[i.id]);const current=Number((await db.query('select coalesce(sum(quantity),0) as qty from stock_moves where item_id=$1 and location_id=$2',[i.id,l.id]))[0].qty);if(current+qty<0)throw Error('Insufficient stock');
  const rows=await db.query('insert into stock_moves(item_id,location_id,quantity,reason,event_key) values($1,$2,$3,$4,$5) returning *',[i.id,l.id,qty,p[3],f.event]);await audit(db,cmd,i.id,rows[0]);return rows;
 }
 if(cmd==='log-cost'||cmd==='close-job'){
  allow(f,cmd==='log-cost'?['event']:[]);const j=await resolve(db,'job',p[0]);const locked=(await db.query('select * from jobs where id=$1 for update',[j.id]))[0];if(locked.status!=='open')throw Error('Job is closed');let rows;
  if(cmd==='close-job')rows=await db.query("update jobs set status='closed' where id=$1 returning code,status",[j.id]);
  else rows=await db.query('insert into job_costs(job_id,category,amount,note,event_key) values($1,$2,$3,$4,$5) returning *',[j.id,p[1],number(p[2],{positive:true}),required(p[3],'Cost note'),required(f.event,'--event')]);
  await audit(db,cmd,j.id,rows[0]);return rows;
 }
 if(cmd==='log'){allow(f,[]);const o=await resolve(db,'order',p[0]);const rows=await db.query('insert into activity(order_id,note) values($1,$2) returning *',[o.id,required(p[1],'Note')]);await audit(db,cmd,o.id,rows[0]);return rows;}
 if(cmd==='invoice-balance'){allow(f,[]);const inv=await resolve(db,'invoice',p[0]);const rows=await db.query('update invoices set paid=$1,ledger_ref=$2 where id=$3 returning code,total,paid,ledger_ref',[number(p[1]),required(p[2],'Ledger evidence'),inv.id]);await audit(db,cmd,inv.id,rows[0]);return rows;}
 throw Error(`Unhandled command ${cmd}`);
 });
}
function display(value){if(Array.isArray(value)){if(!value.length)return '(none)';const rows=value.map(r=>Object.fromEntries(Object.entries(r).map(([k,v])=>[k,v instanceof Date?v.toISOString().slice(0,10):v&&typeof v==='object'?JSON.stringify(v):v])));return table(rows,Object.keys(rows[0]).map(key=>({key,label:key.replaceAll('_',' '),width:key==='id'?8:70})));}return Object.entries(value).map(([k,v])=>`${k.toUpperCase()}\n${display(Array.isArray(v)?v:[v])}`).join('\n\n');}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){let db;try{db=await getDb();const result=await run(db,process.argv.slice(2));console.log(process.argv.includes('--json')?JSON.stringify(result,null,2):display(result));}catch(e){console.error(e.message);process.exitCode=1;}finally{await db?.close();}}
