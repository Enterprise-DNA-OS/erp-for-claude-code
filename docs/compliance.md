# Record checks and sources

Checked 26 September 2026. These checks support distributors and assembly workshops in NZ and AU. They flag recorded gaps. They do not certify legal compliance, authenticate a receipt, inspect an archive or replace the accountant. There is no payroll, payments, tax filing or general ledger here.

## NZ records

[Inland Revenue record keeping](https://www.ird.govt.nz/managing-my-tax/record-keeping) requires records, including electronic records, for at least seven tax years. It also sets language and offshore storage requirements. RETENTION_POLICY checks for at least seven configured years. RETAIN_UNTIL uses the later of preparation, completion and the recorded tax period end, plus seven years. Enter the correct period end. This is a conservative operational date check, not a determination of the taxpayer's tax year. SOURCE_EVIDENCE flags missing archive references. The operator verifies English or Maori records, readable originals and any required offshore storage approval separately.

## AU records

[Australian Government record keeping](https://business.gov.au/finance/payments-and-invoicing/record-keeping) describes five years for most business records, with longer retention for some records. [ATO TD 2007/2](https://www.ato.gov.au/law/view/document?docid=TXD%2FTD20072%2FNAT%2FATO%2F00001) explains the later of preparation or completion and why losses can require longer retention. RETENTION_POLICY checks five years. RETAIN_UNTIL uses the later of prepared_on and completed_on plus five years. SOURCE_EVIDENCE flags a missing archive reference. Assets, disputes, losses and other exceptions need an accountant's longer date. No command deletes or authorises destruction when the date passes.

## House rules

BACKUP_REVIEW flags no referenced backup in seven days. Seven days is this demo's business policy, not a statutory deadline. It checks the register, not the existence or restoration of a backup. EMPTY_ORDER flags a released order without lines. Database constraints and transaction checks prevent over-receipt, over-shipment and negative recorded stock. These are operational controls, not legislation. Credit limits and overdue dates are the operator's agreements.

The fictional seed intentionally has too-short retention, missing evidence and an old backup. `npm run erp -- compliance` shows them. Correct the real evidence, policy and dates, never mark a gap complete from an assumption. Source files remain in your secured archive. The register stores references only.
