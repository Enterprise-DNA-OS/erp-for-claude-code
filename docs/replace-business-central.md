# Move operational records from Business Central

The supported switch is orders, stock, purchasing and jobs for one company. Keep the accounting ledger, tax returns, posted history and original documents intact. Do a trial import and reconcile before retiring any operational process.

Microsoft's [export guide](https://learn.microsoft.com/en-us/dynamics365/business-central/about-export-data), checked 26 September 2026, describes **Open in Excel** on lists. The export contains columns visible in the current view. Add the columns below first. Export each company separately. The documented Excel export permission is required. Save each workbook as CSV UTF-8 in Excel; this importer reads CSV, not XLSX. Use English column headings and comma-separated files. Keep the original workbooks.

## One command after export

On a fresh database, run migrate and setup as shown in docs/cli.md. Add the warehouse codes from your export using `add location`. Put the files below in one folder, for example exports/. Each is optional; include dependencies first. The importer processes them in the order listed.

```bash
npm run erp -- import business-central bundle exports --location=MAIN --date-order=dmy
npm run erp -- import business-central bundle exports --location=MAIN --date-order=dmy --apply
```

The first command validates the whole bundle and rolls back. The second commits it as one transaction. A missing account, item, warehouse, invalid date or conflicting code rolls back the entire bundle. A repeated file is recognised by its content and mapping options. Unchanged records are skipped. Changed source records require reconciliation and are never silently overwritten. Run against a backup or test database first.

## Files and columns

| File | Business Central list and fields | Destination |
|---|---|---|
| customers.csv | Customers: No., Name, E-Mail, Credit Limit (LCY), Blocked | Customers and credit limits |
| vendors.csv | Vendors: No., Name, E-Mail, Blocked | Vendors |
| items.csv | Items: No., Description, Type, Base Unit of Measure, Unit Cost, Unit Price, Reorder Point, Vendor No., Inventory | Items and optional opening stock |
| jobs.csv | Projects/Jobs: No., Description, Bill-to Customer No., Ending Date, Budget Total Cost, Budget Total Price, Global Dimension 1 Code | Job dates, budgets and agreed revenue |
| sales-orders.csv | Sales Orders: No., Sell-to Customer No., Shipment Date, Location Code, Currency Code, Shortcut Dimension 1 Code | Draft sales orders |
| purchase-orders.csv | Purchase Orders: No., Buy-from Vendor No., Expected Receipt Date, Location Code, Currency Code, Shortcut Dimension 1 Code | Draft purchase orders |
| sales-lines.csv | Sales Lines export/report: Document No., Line No., Type, No., Outstanding Quantity, Unit Price, Unit of Measure Code | Remaining item commitments |
| purchase-lines.csv | Purchase Lines export/report: Document No., Line No., Type, No., Outstanding Quantity, Direct Unit Cost, Unit of Measure Code | Remaining supplier quantities |

List columns and captions vary by language and customisation. A line-list report may need your Business Central administrator to expose the listed fields. Do not turn order-header totals into guessed lines. The fixtures show the supported headings, not an export captured from a customer.

Dates must be YYYY-MM-DD unless --date-order=dmy or mdy is supplied for slash or dot dates. Numbers use a decimal point and optional comma grouping. A blank Currency Code means the company currency. Foreign-currency orders, service lines, non-inventory items, blocked accounts, alternate item units and incomplete required columns fail for review.

Only provide Inventory on items.csv for a single-warehouse snapshot and name that warehouse with --location. Business Central's unfiltered Inventory can aggregate multiple locations. For multiple locations, omit Inventory, export and reconcile each location's quantities, then record opening adjustments with unique source references. Never assign an aggregate quantity to every warehouse.

Order lines import **Outstanding Quantity**, not the original ordered quantity, to avoid receiving or shipping the completed history again. Completed lines are skipped. Imported orders remain drafts. Compare them with the source, then release each verified order. Original line files are identified by digest in import_batches and should stay in your archive. Original columns on customer, vendor, item, job and order headers are retained as source_data.

Single-file form: `npm run erp -- import business-central customers exports/customers.csv --apply`. Use the file type above without .csv.

## Reconcile before cutover

Count customers, vendors, items and open orders against the source. Compare opening stock by item, unit and location. Compare each outstanding line and due date. Check job budgets and explicitly bring over job cost entries with their evidence. Copy verified outstanding invoice balances from the accounting ledger. Run stock, dispatch, jobs, attention and compliance. Keep a dated snapshot of both systems and get the operator to sign off the opening position.

## What requires mapping

Posted general ledger, bank entries, GST/VAT, payroll, payments, manufacturing routings, bills of material, serial/lot tracking, unit conversions, approvals, attachments, full dimension sets and foreign exchange are outside the free operational base. Keep original legal records. Job cost history, ledger balances and evidence registers use the CLI or a reviewed import extension. No promise of Business Central feature parity is made. Enterprise DNA maps these requirements into a custom version and connects the accounting system through Omni by Enterprise DNA.
