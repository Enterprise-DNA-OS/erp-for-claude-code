---
description: "Record only goods physically received. Read the remaining quantity first. Keep the delivery reference unique. This does not pay the supplier."
---

# receive

Record only goods physically received. Read the remaining quantity first. Keep the delivery reference unique. This does not pay the supplier.

Run `npm run erp -- receive <purchase-order> <line-number> <quantity> --event=<unique-receipt-reference>`. Exact argument details: docs/cli.md. Resolve ambiguous names by listing candidates. Never send, pay or delete.
