---
description: "Read CLAUDE.md, the relevant CLI command and the schema. Turn the requested field, stage or record rule into one numbered SQL migration. Export a backup first. Update the CLI allow"
---

# Customise

Read CLAUDE.md, the relevant CLI command and the schema. Turn the requested field, stage or record rule into one numbered SQL migration. Export a backup first. Update the CLI allowlist, documents and a test of the changed business behaviour. Run npm test on temporary data, then apply with npm run migrate. Use source references from docs/compliance.md for record rules. Preserve existing records and the audit trail. Never edit a migration already applied.
