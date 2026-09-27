# CLI reference

Run `npm run erp -- help`. Every command accepts --json. Names match case-insensitively, codes exactly ignoring case, and IDs by prefix. Ambiguous matches list candidates and exit 1. Unknown options fail. Dates are YYYY-MM-DD. One company and currency per database. Amounts exclude tax.

## Start

`npm run migrate` creates an empty database. `npm run erp -- setup --name="Your business" --country=NZ --currency=NZD --retention-years=7` configures it. AU is also supported. Backup evidence uses --last-backup=YYYY-MM-DD and --backup-ref="reference". Setup can update the name, retention and backup evidence but never change an existing currency or jurisdiction.

## Read

settings, customers, vendors, items, locations, sales-orders, purchase-orders, stock, replenishment, dispatch, supplier-chase, jobs, margins, dimensions, receivables, payables, cash, credit-watch, attention, records, movements, activity, audit and compliance take no arguments. `order <code-or-id>` includes lines and activity. `job <name-or-code>` includes costs. `weekly-review` returns attention, dispatch and supplier-chase together.

Stock available = on hand minus all open sales commitments. Incoming stock is the remaining quantity on open purchase orders. Replenishment = max(reorder point minus on hand plus committed minus incoming, zero), per warehouse. Dispatch shows each order's shortage against current stock, not reserved allocation across orders. Prioritise by due date and re-read after each shipment.

Margins are fulfilled quantity times (selling price minus line cost frozen at entry). They exclude overhead and are not statutory accounting. Job margin = agreed revenue minus explicitly logged costs. Dimensions are department labels on orders and jobs, not the full Business Central dimension-set model. Invoice balances are manually verified ledger snapshots. Cash summarises those balances; it never reads a bank.

## Add records

`add <entity> --field=value`. Use hyphens for compound field names. Required fields are marked *. Relationships accept names, codes or partial IDs.

| Entity | Fields |
|---|---|
| customer | code*, name*, email, credit-limit |
| vendor | code*, name*, email, lead-days |
| location | code*, name* |
| item | code*, name*, unit, unit-cost, unit-price, reorder-point, vendor-id |
| job | code*, name*, customer-id*, due-date*, budget, revenue, dimension |
| order | code*, kind* (sales/purchase), customer-id* for sales or vendor-id* for purchase, location-id*, job-id, due-date*, dimension |
| invoice | code*, kind* (receivable/payable), customer-id* or vendor-id*, due-date*, total*, paid, ledger-ref* |
| record | name*, reference*, prepared-on*, completed-on*, period-end*, retain-until*, source-ref |

New orders are drafts. Example: `add order --code=SO-301 --kind=sales --customer-id=C100 --location-id=AKL --due-date=2026-10-15`. Then `line SO-301 PUMP-40 2 520 10000` and `release SO-301`. Empty orders cannot be released. Items use their base unit. Release records an internal commitment, not a sent order.

## Transactions

- `receive PO-100 10000 2 --event=DELIVERY-123` receives two units.
- `ship SO-100 10000 2 --event=DISPATCH-123` records two units dispatched.
- `adjust-stock PUMP-40 AKL -1 "Damaged unit, count sheet 9" --event=COUNT-9` records a difference.
- `log-cost J100 labour 120 "Bench hours 9" --event=TIMESHEET-9` records a job cost.
- `log PO-100 "Supplier confirmed dispatch tomorrow"` records a factual note.
- `invoice-balance INV-100 1000 "Ledger extract 2026-10-01"` records paid-to-date from the accountant.
- `close-job J100` closes a job.
- `cancel-order SO-301 "Customer cancelled"` cancels only an untouched order.

Receipts and shipments require an open order of the correct kind and cannot exceed its remaining quantity. Stock cannot go negative. Each event reference is unique; a repeat fails without another movement. The last receipt or shipment closes the order. Quantities have three decimal places. The database serialises stock changes per item. No returns, credits or silent inventory edits: add a reviewed correction migration or a new command for that workflow.

## Output

`draft-order SO-100` and `draft-chase PO-100` create Markdown drafts. `npm run docs` writes purchase orders, sales confirmations and job cost sheets as branded HTML. `npm run view` writes weekly and cash snapshots. `export <new-file.json>` exports every domain entity and audit event without overwriting. Export is a portable snapshot, not an automatic restore command. Keep database backups and test restoration separately.

Import syntax and supported columns: [migration guide](replace-business-central.md). /customise and /new-view are agent recipes that write and validate migrations or view definitions. They do not pretend to be standalone CLI features.

## Correct recorded details

`set <entity> <code-or-name> --field=value` records before and after values in the audit. Editable fields: customer name/email/credit-limit; vendor name/email/lead-days; item name/unit-cost/unit-price/reorder-point; location name; job name/due-date/budget/revenue/dimension; order due-date/dimension; invoice due-date/ledger-ref; all evidence-register fields. Closed jobs and orders are immutable through this command. Item prices apply to future lines only. Item units, codes, account relationships, stock and completed quantities cannot be rewritten.
