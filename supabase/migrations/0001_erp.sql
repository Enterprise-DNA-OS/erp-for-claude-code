CREATE FUNCTION touch_updated_at() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN NEW.updated_at=now(); RETURN NEW; END $$;
CREATE TABLE settings (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), name text NOT NULL UNIQUE, country text NOT NULL CHECK(country IN ('NZ','AU')), currency text NOT NULL CHECK(currency IN ('NZD','AUD','USD')), retention_years integer NOT NULL CHECK(retention_years>=0), last_backup date, backup_ref text);
CREATE TRIGGER touch BEFORE UPDATE ON settings FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TABLE locations (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), code text NOT NULL UNIQUE, name text NOT NULL);
CREATE TRIGGER touch BEFORE UPDATE ON locations FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TABLE customers (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), code text NOT NULL UNIQUE, name text NOT NULL, email text NOT NULL DEFAULT '', credit_limit numeric(14,2) NOT NULL DEFAULT 0 CHECK(credit_limit>=0), source_data jsonb NOT NULL DEFAULT '{}');
CREATE TRIGGER touch BEFORE UPDATE ON customers FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TABLE vendors (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), code text NOT NULL UNIQUE, name text NOT NULL, email text NOT NULL DEFAULT '', lead_days integer NOT NULL DEFAULT 7 CHECK(lead_days>=0), source_data jsonb NOT NULL DEFAULT '{}');
CREATE TRIGGER touch BEFORE UPDATE ON vendors FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TABLE items (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), code text NOT NULL UNIQUE, name text NOT NULL, unit text NOT NULL DEFAULT 'EA', unit_cost numeric(14,2) NOT NULL DEFAULT 0 CHECK(unit_cost>=0), unit_price numeric(14,2) NOT NULL DEFAULT 0 CHECK(unit_price>=0), reorder_point numeric(14,3) NOT NULL DEFAULT 0 CHECK(reorder_point>=0), vendor_id uuid REFERENCES vendors, source_data jsonb NOT NULL DEFAULT '{}');
CREATE TRIGGER touch BEFORE UPDATE ON items FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TABLE jobs (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), code text NOT NULL UNIQUE, name text NOT NULL, customer_id uuid NOT NULL REFERENCES customers, status text NOT NULL DEFAULT 'open' CHECK(status IN ('open','closed')), due_date date NOT NULL, budget numeric(14,2) NOT NULL DEFAULT 0 CHECK(budget>=0), revenue numeric(14,2) NOT NULL DEFAULT 0 CHECK(revenue>=0), dimension text NOT NULL DEFAULT '', source_data jsonb NOT NULL DEFAULT '{}');
CREATE TRIGGER touch BEFORE UPDATE ON jobs FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TABLE orders (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), code text NOT NULL UNIQUE, kind text NOT NULL CHECK(kind IN ('sales','purchase')), customer_id uuid REFERENCES customers, vendor_id uuid REFERENCES vendors, location_id uuid NOT NULL REFERENCES locations, job_id uuid REFERENCES jobs, status text NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','open','closed','cancelled')), due_date date NOT NULL, dimension text NOT NULL DEFAULT '', source_data jsonb NOT NULL DEFAULT '{}', CHECK((kind='sales' AND customer_id IS NOT NULL AND vendor_id IS NULL) OR (kind='purchase' AND vendor_id IS NOT NULL AND customer_id IS NULL)));
CREATE TRIGGER touch BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TABLE order_lines (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), order_id uuid NOT NULL REFERENCES orders, line_no integer NOT NULL CHECK(line_no>0), item_id uuid NOT NULL REFERENCES items, quantity numeric(14,3) NOT NULL CHECK(quantity>0), completed numeric(14,3) NOT NULL DEFAULT 0 CHECK(completed>=0 AND completed<=quantity), unit_price numeric(14,2) NOT NULL CHECK(unit_price>=0), cost_basis numeric(14,2) NOT NULL CHECK(cost_basis>=0), UNIQUE(order_id,line_no));
CREATE TRIGGER touch BEFORE UPDATE ON order_lines FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TABLE stock_moves (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), item_id uuid NOT NULL REFERENCES items, location_id uuid NOT NULL REFERENCES locations, line_id uuid REFERENCES order_lines, quantity numeric(14,3) NOT NULL CHECK(quantity<>0), reason text NOT NULL CHECK(length(trim(reason))>0), event_key text NOT NULL UNIQUE);
CREATE TRIGGER touch BEFORE UPDATE ON stock_moves FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TABLE job_costs (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), job_id uuid NOT NULL REFERENCES jobs, category text NOT NULL CHECK(category IN ('labour','materials','other')), amount numeric(14,2) NOT NULL CHECK(amount>0), note text NOT NULL CHECK(length(trim(note))>0), event_key text NOT NULL UNIQUE);
CREATE TRIGGER touch BEFORE UPDATE ON job_costs FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TABLE invoices (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), code text NOT NULL UNIQUE, kind text NOT NULL CHECK(kind IN ('receivable','payable')), customer_id uuid REFERENCES customers, vendor_id uuid REFERENCES vendors, due_date date NOT NULL, total numeric(14,2) NOT NULL CHECK(total>0), paid numeric(14,2) NOT NULL DEFAULT 0 CHECK(paid>=0 AND paid<=total), ledger_ref text NOT NULL CHECK(length(trim(ledger_ref))>0), CHECK((kind='receivable' AND customer_id IS NOT NULL AND vendor_id IS NULL) OR (kind='payable' AND vendor_id IS NOT NULL AND customer_id IS NULL)));
CREATE TRIGGER touch BEFORE UPDATE ON invoices FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TABLE records (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), name text NOT NULL, reference text NOT NULL, prepared_on date NOT NULL, completed_on date NOT NULL, period_end date NOT NULL, retain_until date NOT NULL, source_ref text NOT NULL DEFAULT '', CHECK(period_end>=completed_on));
CREATE TRIGGER touch BEFORE UPDATE ON records FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TABLE activity (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), order_id uuid NOT NULL REFERENCES orders, note text NOT NULL CHECK(length(trim(note))>0));
CREATE TRIGGER touch BEFORE UPDATE ON activity FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TABLE audit (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), action text NOT NULL, record_id text, detail jsonb NOT NULL DEFAULT '{}');
CREATE TRIGGER touch BEFORE UPDATE ON audit FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TABLE import_batches (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), name text NOT NULL UNIQUE, entity text NOT NULL, digest text NOT NULL, row_count integer NOT NULL, source_file text NOT NULL);
CREATE TRIGGER touch BEFORE UPDATE ON import_batches FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

CREATE INDEX order_lines_item ON order_lines(item_id);
CREATE INDEX stock_moves_item_location ON stock_moves(item_id,location_id);
CREATE INDEX orders_due ON orders(status,due_date);
CREATE VIEW v_stock AS
 SELECT i.id AS item_id,l.id AS location_id,i.code,i.name,l.code AS location,i.unit,i.reorder_point,
 COALESCE((SELECT sum(quantity) FROM stock_moves m WHERE m.item_id=i.id AND m.location_id=l.id),0)::numeric(14,3) AS on_hand,
 COALESCE((SELECT sum(ol.quantity-ol.completed) FROM order_lines ol JOIN orders o ON o.id=ol.order_id WHERE ol.item_id=i.id AND o.location_id=l.id AND o.kind='sales' AND o.status='open'),0)::numeric(14,3) AS committed,
 COALESCE((SELECT sum(ol.quantity-ol.completed) FROM order_lines ol JOIN orders o ON o.id=ol.order_id WHERE ol.item_id=i.id AND o.location_id=l.id AND o.kind='purchase' AND o.status='open'),0)::numeric(14,3) AS incoming
 FROM items i CROSS JOIN locations l;
CREATE VIEW v_orders AS
 SELECT o.*,COALESCE(c.name,v.name) AS partner,l.code AS location,
 COALESCE((SELECT sum(ol.quantity*ol.unit_price) FROM order_lines ol WHERE ol.order_id=o.id),0)::numeric(14,2) AS total,
 COALESCE((SELECT sum((ol.quantity-ol.completed)*ol.unit_price) FROM order_lines ol WHERE ol.order_id=o.id),0)::numeric(14,2) AS remaining_value,
 COALESCE((SELECT sum(ol.completed*ol.unit_price) FROM order_lines ol WHERE ol.order_id=o.id),0)::numeric(14,2) AS fulfilled_value,
 COALESCE((SELECT sum(ol.completed*(ol.unit_price-ol.cost_basis)) FROM order_lines ol WHERE ol.order_id=o.id),0)::numeric(14,2) AS fulfilled_margin,
 GREATEST(o.updated_at,COALESCE((SELECT max(created_at) FROM activity a WHERE a.order_id=o.id),o.updated_at)) AS last_activity
 FROM orders o LEFT JOIN customers c ON c.id=o.customer_id LEFT JOIN vendors v ON v.id=o.vendor_id JOIN locations l ON l.id=o.location_id;
CREATE VIEW v_jobs AS
 SELECT j.*,c.name AS customer,COALESCE((SELECT sum(amount) FROM job_costs x WHERE x.job_id=j.id),0)::numeric(14,2) AS cost,
 (j.budget-COALESCE((SELECT sum(amount) FROM job_costs x WHERE x.job_id=j.id),0))::numeric(14,2) AS budget_left,
 (j.revenue-COALESCE((SELECT sum(amount) FROM job_costs x WHERE x.job_id=j.id),0))::numeric(14,2) AS margin
 FROM jobs j JOIN customers c ON c.id=j.customer_id;
