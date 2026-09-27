# ERP for Claude Code

Orders, stock, purchasing and job costs in a database you own. A free operational ERP base for NZ and AU distributors, wholesalers and assembly workshops. MIT licensed. Works with Claude Code, Codex, OpenCode or Cursor.

| Do it yourself | We customise it | We run it for you |
|---|---|---|
| Free. Clone, run the demo, import your records. | Your fields, rules, Business Central data, web front end or different stack. | Installed, connected and operated through Omni by Enterprise DNA. Setup fee, then a retainer. |
| [Quick start](#quick-start) | [Get your version built](https://enterprisedna.co/omni/book/?offer=replace-software&utm_campaign=business-central&utm_source=github&utm_medium=customise) | [Book a call](https://enterprisedna.co/omni/book/?offer=replace-software&utm_campaign=business-central&utm_source=github&utm_medium=managed) |

## The weekly routine

Review orders, plan dispatch, chase suppliers, reorder stock and check job margins. The base records customers, suppliers, items, warehouses, sales and purchase orders, partial receipts and shipments, stock movements, job budgets and costs, ledger balance snapshots, document evidence and change history. Accounting stays in the existing ledger.

Microsoft's [Australian pricing page](https://www.microsoft.com/en-au/dynamics-365/products/business-central/pricing), checked 26 September 2026, lists Essentials at A$119.70 and Premium at A$164.60 per user per month, paid yearly, excluding GST. For 10 to 30 full users that is A$14,364 to A$59,256 a year in licences, depending on plan and headcount. This is a calculated licence range, not a claim about an actual customer's all-in invoice. Partner work and extras need their own quote.

Harbour Supply Demo has an overdue pump order short of stock, a late supplier delivery, a workshop job over budget, an overdue customer balance and incomplete archive evidence. These records are fictional. Dates are relative to the first seed and repeated seeding preserves existing data.

## Quick start

Node 20 or later on Windows or Linux:

```bash
git clone https://github.com/Enterprise-DNA-OS/erp-for-claude-code.git
cd erp-for-claude-code
npm install
npm run demo
npm test
npm run view
npm run docs
```

Open the folder in your coding agent and ask “What can we ship this week?” or run `/dispatch`. The same AGENTS.md and CLAUDE.md work across runtimes. No database server is needed for the demo. PGlite stores local records under .data/db and serves one process at a time.

For real records, choose a new DATA_DIR, migrate, then run setup and import. Never seed production. DATABASE_URL selects shared Postgres through the same adapter. Configure scoped access, verified TLS, backups and a tested restore before sharing. One database holds one company, currency and jurisdiction. Amounts exclude tax and quantities use each item's base unit.

## Commands

45 CLI commands return human-readable results or --json. There are 47 slash recipes: 45 CLI commands plus /customise and /new-view. Names match without case, IDs by prefix, and ambiguous matches list candidates and exit 1. [CLI arguments and calculations](docs/cli.md).

| Recipe | What it does |
|---|---|
| /activity | Read order follow-up notes. |
| /add | Read docs/cli.md for the allowed entities and fields |
| /adjust-stock | Read stock first |
| /attention | Find late, quiet and unreleased orders and over-budget jobs. |
| /audit | Read the change history. |
| /cancel-order | Read the order first |
| /cash | Compare overdue and upcoming balances, without treating them as bank cash. |
| /close-job | Read the costs, delivery position and outstanding tasks |
| /compliance | Read docs/compliance.md and run the source-backed record checks |
| /credit-watch | Find customers whose recorded outstanding balance exceeds their credit limit. |
| /customers | List customers and credit limits. |
| /customise | Read CLAUDE.md, the relevant CLI command and the schema |
| /dimensions | Group order value and progress by department. |
| /dispatch | Review open sales lines in due-date order with stock shortages. |
| /draft-chase | Read the remaining quantities and supplier follow-up |
| /draft-order | Read the order and create a local draft in drafts/ |
| /export | Write a complete data snapshot including movements and audit |
| /help | List commands and open the CLI guide. |
| /import | Read docs/replace-business-central.md |
| /invoice-balance | Copy the balance verified in the existing accounting ledger |
| /items | List item costs, prices, units and preferred suppliers. |
| /job | Show the budget and recorded costs |
| /jobs | Compare job budgets, costs and agreed revenue. |
| /line | Read the draft order and item |
| /locations | List warehouses. |
| /log-cost | Record a documented job cost, excluding tax, in the configured currency |
| /log | Read the order then record the factual follow-up |
| /margins | Review fulfilled sales margins using cost at order entry. |
| /movements | Read stock movement history. |
| /new-view | Read the operator question and the relevant records |
| /order | Show the order, lines and activity before proposing a change. |
| /payables | List supplier balances from the existing ledger. |
| /purchase-orders | Read supplier order values and progress. |
| /receivables | List customer balances from the existing ledger. |
| /receive | Record only goods physically received |
| /records | Read the retained evidence register. |
| /release | Read the draft and confirm its real quantities, partner and due date |
| /replenishment | Review shortages after open sales and purchases. |
| /sales-orders | Read sales order values and progress. |
| /set | Read the record first |
| /settings | Read the business jurisdiction, currency and archive policy. |
| /setup | Set one company per database |
| /ship | Record only goods physically dispatched |
| /stock | Compare stock on hand, open sales commitments and incoming purchases. |
| /supplier-chase | List supplier orders due within a week and already late. |
| /vendors | List suppliers and lead times. |
| /weekly-review | Write the Monday plan from the three included reports: attention, dispatch and supplier-chase |

## Ten questions beyond a fixed dashboard

These are working queries you can change. Business Central supports configurable reports too; this is not a claim that Microsoft cannot produce equivalent analysis.

1. Which overdue orders have also gone quiet for a week? `npm run erp -- attention`
2. Which sales lines need more stock before they can ship? `npm run erp -- dispatch`
3. What should we buy after counting open sales and incoming purchases? `npm run erp -- replenishment`
4. Which suppliers have deliveries due this week or already late? `npm run erp -- supplier-chase`
5. Which jobs have exceeded their budget and what margin remains? `npm run erp -- jobs`
6. What margin have we actually shipped at the cost recorded on each line? `npm run erp -- margins`
7. Which department holds the most unfulfilled order value? `npm run erp -- dimensions`
8. Which customers exceed their credit limit on recorded ledger balances? `npm run erp -- credit-watch`
9. What customer and supplier balances are overdue or due next week? `npm run erp -- cash`
10. Which source records lack evidence or enough retention time? `npm run erp -- compliance`

## Your first hour: ten things to ask for

1. Put our name and colours on the purchase order.
2. Add our warehouses and base item units.
3. Do a test run with one Business Central export.
4. Show orders that are both late and quiet.
5. Explain what is stopping each dispatch.
6. List purchases needed after outstanding deliveries arrive.
7. Show the workshop jobs over budget.
8. Draft a supplier follow-up for the late order.
9. Add our buyer's reference with a numbered migration.
10. Add a weekly view for our warehouse manager.

## Documents and views

Change brand.json once. `npm run docs` creates draft purchase orders, sales confirmations and job cost sheets in docs-out/. `npm run view` creates week and cash snapshots in views/. Each document is keyed by record ID. Print HTML to PDF from a browser. Nothing sends. /new-view adds a question to the read-only renderer. /customise adds fields, stages or rules with a migration and tests.

## Bring your history

[The Business Central migration guide](docs/replace-business-central.md) covers Open in Excel, saving CSV, visible columns, one-company exports, import preview and reconciliation. `npm run erp -- import business-central bundle exports --location=MAIN --apply` imports supported files in one transaction. Keep a copy of the original exports. Standard English headings are supported; custom headings need mapping. Order lines bring across remaining quantities to avoid fulfilling completed history twice.

## Controls and scope

A receipt or shipment cannot exceed the line's remaining quantity. Stock cannot go negative. Unique event references prevent a retry from duplicating a stock movement or job cost. Failed transactions and imports roll back. Audit events record CLI changes. Completed orders cannot be cancelled. Corrections preserve history.

[Record checks](docs/compliance.md) cover NZ and AU retention dates, archive references, backup evidence and empty released orders, with sources. They check recorded evidence, not legal compliance. [Why no front end](docs/why-no-front-end.md) explains mobile, offline and scanning needs. Enterprise DNA builds those into your custom version.

This is operational ERP, not the general ledger, manufacturing planning, payroll, banking, payments or tax filing. Stock margins use the cost frozen on the order line, not FIFO or statutory valuation. Job costs are entered explicitly. Invoice balances are snapshots from the accountant. The base does not claim full Business Central parity.

## Verification

`npm test` creates a temporary database, migrates and seeds it, exercises every CLI command, checks rollback, stock and cost calculations, duplicate receipts, ambiguous matches, imports and branded HTML. The suite runs on PGlite with no secrets. Windows-compatible paths and Node subprocesses are used. Hosted Postgres shares the SQL and adapter interface but requires validation in the installation. Agent usage and hosting have separate costs.

## Licence and relationship

MIT. Built by Enterprise DNA. Not affiliated with Microsoft or Anthropic. [Omni by Enterprise DNA](https://enterprisedna.co/omni/instead-of/business-central?utm_source=github&utm_medium=readme&utm_campaign=business-central) installs, customises and runs your version. [Book 30 minutes with Sam](https://enterprisedna.co/omni/book/?offer=replace-software&utm_campaign=business-central&utm_source=github&utm_medium=readme).
