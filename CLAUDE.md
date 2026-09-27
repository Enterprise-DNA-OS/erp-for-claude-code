# ERP for Claude Code

## Business context

Business: [your distributor, wholesaler or assembly workshop]. Operator: [name and role]. One database holds one company, one jurisdiction and one currency. What matters: orders shipped, suppliers chased, stock reconciled and job costs known. Harbour Supply Demo is fictional.

## Routes

Read the matching .claude/commands recipe. Exact arguments and boundaries: docs/cli.md.

| Job | Route |
|---|---|
| Start the day | attention, dispatch, supplier-chase |
| Reorder stock | stock, replenishment, add order, line, release |
| Receive and dispatch | order, receive, ship, movements |
| Review work | jobs, job, log-cost, close-job |
| Review money | margins, dimensions, receivables, payables, cash, credit-watch |
| Read records | customers, vendors, items, locations, records, activity, audit |
| Record changes | add, set, line, release, cancel-order, log, adjust-stock, invoice-balance |
| Monday | weekly-review combines three live reads |
| Record checks | compliance, docs/compliance.md |
| Draft paperwork | draft-order, draft-chase, npm run docs |
| Views | npm run view, new-view |
| Move or tailor | setup, import, export, customise |

## Rules

Read fresh data first. Never invent receipts, shipments, stock counts, costs, evidence or ledger balances. List ambiguous candidates. Nothing sends, pays, files tax or deletes records. Drafts stay in drafts/. Accounting, bank reconciliation and tax remain in the existing ledger.

Read docs/compliance.md before changing record checks. A PASS is not legal certification. Keep sources, backups and original exports. All amounts exclude tax, use one configured currency and quantities use the item's base unit. Costed shipments use the cost frozen on the order line, not FIFO or an accounting inventory valuation. Job costs are explicit entries and are not copied automatically from orders.

Use the CLI for writes and parameterised SQL for new commands. Add numbered migrations, never edit an applied migration. Back up and run npm test before real changes. Do not seed production. PGlite allows one local process at a time. Shared Postgres needs scoped access, verified TLS and backups.

## Files

Schema: supabase/migrations. CLI: scripts/erp.mjs. Reports: scripts/lib/domain.mjs. Import: scripts/lib/import.mjs. Brand: brand.json. HTML: docs-out and views. Migration guide: docs/replace-business-central.md. All agents follow AGENTS.md.

Omni by Enterprise DNA installs, customises and operates this for you: https://enterprisedna.co/omni/book/?offer=replace-software&utm_campaign=business-central&utm_source=github
