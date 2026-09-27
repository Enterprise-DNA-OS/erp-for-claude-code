export const entities={
 customer:{table:'customers',fields:['code','name','email','credit_limit']},
 vendor:{table:'vendors',fields:['code','name','email','lead_days']},
 item:{table:'items',fields:['code','name','unit','unit_cost','unit_price','reorder_point','vendor_id'],refs:{vendor_id:'vendor'}},
 location:{table:'locations',fields:['code','name']},
 job:{table:'jobs',fields:['code','name','customer_id','due_date','budget','revenue','dimension'],refs:{customer_id:'customer'}},
 order:{table:'orders',fields:['code','kind','customer_id','vendor_id','location_id','job_id','due_date','dimension'],refs:{customer_id:'customer',vendor_id:'vendor',location_id:'location',job_id:'job'}},
 invoice:{table:'invoices',fields:['code','kind','customer_id','vendor_id','due_date','total','paid','ledger_ref'],refs:{customer_id:'customer',vendor_id:'vendor'}},
 record:{table:'records',fields:['name','reference','prepared_on','completed_on','period_end','retain_until','source_ref']}
};
const summary="code,kind,partner,location,status,due_date::text,dimension,total,remaining_value";
export const reports={
 settings:'select name,country,currency,retention_years,last_backup::text,backup_ref from settings',
 customers:'select id,code,name,email,credit_limit from customers order by code',
 vendors:'select id,code,name,email,lead_days from vendors order by code',
 items:'select i.id,i.code,i.name,i.unit,i.unit_cost,i.unit_price,i.reorder_point,v.name as vendor from items i left join vendors v on v.id=i.vendor_id order by i.code',
 locations:'select id,code,name from locations order by code',
 'sales-orders':`select ${summary} from v_orders where kind='sales' order by due_date,code`,
 'purchase-orders':`select ${summary} from v_orders where kind='purchase' order by due_date,code`,
 stock:'select code,name,location,unit,on_hand,committed,(on_hand-committed) as available,incoming from v_stock order by code,location',
 replenishment:'select s.code,s.name,s.location,s.on_hand,s.committed,s.incoming,s.reorder_point,greatest(s.reorder_point-s.on_hand+s.committed-s.incoming,0) as buy_quantity,v.name as vendor,v.lead_days from v_stock s join items i on i.id=s.item_id left join vendors v on v.id=i.vendor_id where s.on_hand-s.committed<s.reorder_point order by buy_quantity desc,s.code',
 dispatch:`select o.code,o.partner,o.due_date::text,i.code as item,l.line_no,l.quantity-l.completed as remaining,s.on_hand,s.committed,greatest(l.quantity-l.completed-s.on_hand,0) as shortage from v_orders o join order_lines l on l.order_id=o.id join items i on i.id=l.item_id join v_stock s on s.item_id=l.item_id and s.location_id=o.location_id where o.kind='sales' and o.status='open' and l.completed<l.quantity order by o.due_date,o.code,l.line_no`,
 'supplier-chase':`select code,partner,due_date::text,remaining_value,current_date-due_date as days_late from v_orders where kind='purchase' and status='open' and due_date<=current_date+7 order by due_date,code`,
 jobs:'select code,name,customer,status,due_date::text,budget,cost,budget_left,revenue,margin,dimension from v_jobs order by due_date,code',
 margins:`select code,partner,dimension,status,fulfilled_value,fulfilled_margin from v_orders where kind='sales' order by code`,
 dimensions:`select dimension,kind,sum(total)::numeric(14,2) as ordered_value,sum(remaining_value)::numeric(14,2) as open_value,sum(fulfilled_value)::numeric(14,2) as fulfilled_value from v_orders where status<>'cancelled' group by dimension,kind order by dimension,kind`,
 receivables:`select i.code,c.name as partner,i.due_date::text,i.total,i.paid,i.total-i.paid as outstanding,greatest(current_date-i.due_date,0) as days_overdue,i.ledger_ref from invoices i join customers c on c.id=i.customer_id where kind='receivable' and paid<total order by due_date,code`,
 payables:`select i.code,v.name as partner,i.due_date::text,i.total,i.paid,i.total-i.paid as outstanding,greatest(current_date-i.due_date,0) as days_overdue,i.ledger_ref from invoices i join vendors v on v.id=i.vendor_id where kind='payable' and paid<total order by due_date,code`,
 cash:`select kind,sum(total-paid)::numeric(14,2) as outstanding,sum(case when due_date<current_date then total-paid else 0 end)::numeric(14,2) as overdue,sum(case when due_date between current_date and current_date+7 then total-paid else 0 end)::numeric(14,2) as due_next_week from invoices group by kind order by kind`,
 'credit-watch':`select c.code,c.name,c.credit_limit,coalesce(sum(i.total-i.paid),0)::numeric(14,2) as outstanding from customers c left join invoices i on i.customer_id=c.id group by c.id having coalesce(sum(i.total-i.paid),0)>c.credit_limit order by c.code`,
 attention:`select 'order' as record,code,concat_ws('; ',case when due_date<current_date then 'overdue' end,case when last_activity<now()-interval '7 days' then 'quiet over 7 days' end,case when status='draft' then 'not released' end) as reason from v_orders where status in ('open','draft') and (due_date<current_date or last_activity<now()-interval '7 days' or status='draft') union all select 'job',code,concat_ws('; ',case when due_date<current_date then 'overdue' end,case when budget_left<0 then 'over budget' end) from v_jobs where status='open' and (due_date<current_date or budget_left<0) order by record,code`,
 records:'select id,name,reference,prepared_on::text,completed_on::text,period_end::text,retain_until::text,source_ref from records order by name',
 movements:'select i.code as item,l.code as location,m.quantity,m.reason,m.event_key,m.created_at from stock_moves m join items i on i.id=m.item_id join locations l on l.id=m.location_id order by m.created_at,m.event_key',
 activity:'select o.code,a.note,a.created_at from activity a join orders o on o.id=a.order_id order by a.created_at',
 audit:'select action,record_id,detail,created_at from audit order by created_at,id'
};
export const snapshots=['settings','locations','customers','vendors','items','jobs','orders','order_lines','stock_moves','job_costs','invoices','records','activity','audit','import_batches'];
export async function resolve(db,entity,value){
 const cfg=entities[entity];if(!cfg)throw Error(`Unknown entity ${entity}`);if(!value)throw Error(`A ${entity} name or ID is required`);
 const hasCode=cfg.fields.includes('code'),label=cfg.fields.includes('name')?'name':'code';
 const exact=await db.query(`select * from ${cfg.table} where id::text=$1 ${hasCode?'or lower(code)=lower($1)':''}`, [value]);
 if(exact.length===1)return exact[0];
 const rows=await db.query(`select * from ${cfg.table} where starts_with(id::text,$1) or position(lower($1) in lower(${label}))>0 order by ${label}`, [value]);
 if(rows.length===1)return rows[0];if(!rows.length)throw Error(`No match for ${entity}: ${value}`);
 throw Error(`Ambiguous ${entity}: ${value}. Candidates:\n${rows.map(r=>`${r.id}  ${hasCode?r.code+'  ':''}${r[label]}`).join('\n')}`);
}
export async function audit(db,action,id,detail){await db.query('insert into audit(action,record_id,detail) values($1,$2,$3)',[action,id,JSON.stringify(detail)]);}
export async function transaction(db,fn){await db.exec('BEGIN');try{const r=await fn();await db.exec('COMMIT');return r;}catch(e){await db.exec('ROLLBACK');throw e;}}
export function number(v,{positive=false,integer=false}={}){if(v==null||v===''||!Number.isFinite(Number(v))||Number(v)<0||(positive&&Number(v)<=0)||(integer&&!Number.isInteger(Number(v))))throw Error(`Invalid ${positive?'positive ':''}number: ${v}`);return Number(v);}
export function date(v){if(!/^\d{4}-\d{2}-\d{2}$/.test(v||'')||Number.isNaN(Date.parse(v))||new Date(v).toISOString().slice(0,10)!==v)throw Error(`Invalid ISO date: ${v}`);return v;}
export async function compliance(db){
 const s=(await db.query('select * from settings'))[0];const out=[];
 if(!s)return [{rule:'SETUP',record:'business',finding:'Configure jurisdiction, currency and record retention before using real data',source:'docs/compliance.md'}];
 const source=s.country==='NZ'?'https://www.ird.govt.nz/managing-my-tax/record-keeping':'https://business.gov.au/finance/payments-and-invoicing/record-keeping';
 const minimumYears=s.country==='NZ'?7:5;
 const years=Math.max(minimumYears,s.retention_years);
 if(s.retention_years<years)out.push({rule:'RETENTION_POLICY',record:s.name,finding:`Retention policy below ${years} years`,source});
 const gaps=await db.query(`select name,source_ref,retain_until::text,(greatest(prepared_on,completed_on,${s.country==='NZ'?'period_end':'completed_on'})+make_interval(years => $1))::date::text as minimum from records where source_ref='' or retain_until<(greatest(prepared_on,completed_on,${s.country==='NZ'?'period_end':'completed_on'})+make_interval(years => $1))::date`,[years]);
 for(const r of gaps){if(!r.source_ref)out.push({rule:'SOURCE_EVIDENCE',record:r.name,finding:'Source reference missing',source});if(r.retain_until<r.minimum)out.push({rule:'RETAIN_UNTIL',record:r.name,finding:`Retain through at least ${r.minimum}; review exceptions`,source});}
 const backups=await db.query("select name from settings where last_backup is null or last_backup<current_date-7 or coalesce(backup_ref,'')='' ");
 for(const b of backups)out.push({rule:'BACKUP_REVIEW',record:b.name,finding:'No referenced backup in the last seven days (house rule)',source:'docs/compliance.md#house-rules'});
 for(const r of await db.query("select code from orders where status='open' and not exists(select 1 from order_lines where order_id=orders.id)"))out.push({rule:'EMPTY_ORDER',record:r.code,finding:'Released order has no lines (house rule)',source:'docs/compliance.md#house-rules'});
 return out;
}
