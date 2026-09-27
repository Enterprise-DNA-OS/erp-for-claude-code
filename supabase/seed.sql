INSERT INTO settings(name,country,currency,retention_years,last_backup,backup_ref) VALUES('Harbour Supply Demo','NZ','NZD',5,current_date-15,'backup-demo-old') ON CONFLICT DO NOTHING;
INSERT INTO locations(code,name) VALUES('AKL','Auckland warehouse'),('CHC','Christchurch warehouse') ON CONFLICT DO NOTHING;
INSERT INTO customers(code,name,email,credit_limit) VALUES('C100','Harbour Fabrication','purchasing@example.invalid',15000),('C200','Harbour Marine','orders@example.invalid',5000),('C300','Canterbury Pumps','office@example.invalid',12000) ON CONFLICT DO NOTHING;
INSERT INTO vendors(code,name,email,lead_days) VALUES('V100','Tasman Components','sales@example.invalid',10),('V200','Southern Bearings','desk@example.invalid',7) ON CONFLICT DO NOTHING;
INSERT INTO items(code,name,unit_cost,unit_price,reorder_point,vendor_id) VALUES
('PUMP-40','Transfer pump',320,520,3,(SELECT id FROM vendors WHERE code='V100')),
('SEAL-40','Pump seal kit',35,70,5,(SELECT id FROM vendors WHERE code='V100')),
('BRG-20','Bearing pack',18,32,10,(SELECT id FROM vendors WHERE code='V200')) ON CONFLICT DO NOTHING;
INSERT INTO jobs(code,name,customer_id,due_date,budget,revenue,dimension) VALUES('J100','Pump package assembly',(SELECT id FROM customers WHERE code='C100'),current_date-3,1000,1800,'Workshop'),('J200','Marine spares programme',(SELECT id FROM customers WHERE code='C200'),current_date+14,2000,3200,'Marine') ON CONFLICT DO NOTHING;
INSERT INTO orders(code,kind,customer_id,vendor_id,location_id,job_id,status,due_date,dimension,created_at,updated_at) VALUES
('SO-100','sales',(SELECT id FROM customers WHERE code='C100'),NULL,(SELECT id FROM locations WHERE code='AKL'),(SELECT id FROM jobs WHERE code='J100'),'open',current_date-4,'Workshop',now()-interval '20 days',now()-interval '10 days'),
('SO-200','sales',(SELECT id FROM customers WHERE code='C200'),NULL,(SELECT id FROM locations WHERE code='AKL'),NULL,'open',current_date+2,'Marine',now(),now()),
('PO-100','purchase',NULL,(SELECT id FROM vendors WHERE code='V100'),(SELECT id FROM locations WHERE code='AKL'),NULL,'open',current_date-2,'Workshop',now()-interval '20 days',now()-interval '9 days') ON CONFLICT DO NOTHING;
INSERT INTO order_lines(order_id,line_no,item_id,quantity,completed,unit_price,cost_basis) VALUES
((SELECT id FROM orders WHERE code='SO-100'),10000,(SELECT id FROM items WHERE code='PUMP-40'),4,0,520,320),
((SELECT id FROM orders WHERE code='SO-200'),10000,(SELECT id FROM items WHERE code='SEAL-40'),3,0,70,35),
((SELECT id FROM orders WHERE code='PO-100'),10000,(SELECT id FROM items WHERE code='PUMP-40'),6,0,320,320) ON CONFLICT DO NOTHING;
INSERT INTO stock_moves(item_id,location_id,quantity,reason,event_key) VALUES
((SELECT id FROM items WHERE code='PUMP-40'),(SELECT id FROM locations WHERE code='AKL'),2,'Opening count','seed-pumps'),
((SELECT id FROM items WHERE code='SEAL-40'),(SELECT id FROM locations WHERE code='AKL'),8,'Opening count','seed-seals'),
((SELECT id FROM items WHERE code='BRG-20'),(SELECT id FROM locations WHERE code='CHC'),14,'Opening count','seed-bearings') ON CONFLICT DO NOTHING;
INSERT INTO job_costs(job_id,category,amount,note,event_key) VALUES((SELECT id FROM jobs WHERE code='J100'),'labour',800,'Assembly hours','seed-job-labour'),((SELECT id FROM jobs WHERE code='J100'),'materials',450,'Workshop materials','seed-job-materials') ON CONFLICT DO NOTHING;
INSERT INTO invoices(code,kind,customer_id,vendor_id,due_date,total,paid,ledger_ref) VALUES('INV-100','receivable',(SELECT id FROM customers WHERE code='C100'),NULL,current_date-12,2400,600,'Ledger INV-100'),('BILL-100','payable',NULL,(SELECT id FROM vendors WHERE code='V100'),current_date+5,1920,0,'Ledger BILL-100') ON CONFLICT DO NOTHING;
INSERT INTO records(id,name,reference,prepared_on,completed_on,period_end,retain_until,source_ref) VALUES('a0000000-0000-0000-0000-000000000001','Opening purchase evidence','PO-100',current_date,current_date,current_date+365,current_date+730,'') ON CONFLICT DO NOTHING;
