---
type: guide
title: 'Knowledge Base – 16. Messages: Record-linked Operational Communications'
description: >-
  Knowledge Base: 16.1 Message definition Messages can be linked to Products,
  Vendors, Carriers, Contracts and other supported record types. Covers: 16.1
  Message definition; From/To date range; Sequence; French and English;
  Active/Inactive; Destinations; together in one message display; 16.2 Messag...
tags:
  - cdccommon
  - knowledge-base
status: active
generated:
  by: 'script:buildOkfBundle'
  at: '2026-10-22'
sources:
  - id: knowledge-base-17
    resource: CDCCOMMON/English/Knowledge_Base.txt
    title: Knowledge_Base.txt
---
# Knowledge Base – 16. Messages: Record-linked Operational Communications

**16.1 Message definition**

Messages can be linked to Products, Vendors, Carriers, Contracts and other supported record types. Each Message has an effective **From/To date range**, an optional **Sequence** ordering value, **French and English** text, **Active/Inactive** status, and one or more selected **Destinations**. Messages may be added, updated or deleted through the parent notebook's Messages Mini Container according to applicable authority, and saved immediately to the database.

A Product 004 message becomes relevant when a transaction is for Product 004. The same applies to other attached records: a transaction that involves a specific Vendor, Carrier or Contract may activate the associated messages, subject to dates, status and destination. When multiple messages apply, BPAL can show them **together in one message display**, identifying the originating type (e.g., Product, Vendor or Carrier) for each.

**16.2 Message destinations**

The visible Destination controls include: **Terminal (in)**, **Terminal (out)**, **Scale terminal (in)**, **Scale terminal (out)**, **Scale ticket (in)**, **Scale ticket (out)**, **Recycle - receiving**, **Quality analysis**, **Transaction**, and **Purchase Order**. One Message can target multiple destinations. Examples include: a guardhouse terminal advising staff of a driver's safety-equipment issue; a scale-terminal notice about temporary rerouting to a different dumper; an inbound/outbound scale ticket carrying a driver instruction; a laboratory quality warning; or a pricing reminder while administrative staff review a transaction.

**16.3 Language selection**

Each truck-scale installation has a configured **default language** (generally French at Quebec installations, English elsewhere in Canada and the US). Vendor and Carrier data can also specify their preferred language. Before a driver is identified, the initial screen uses the site's language, but drivers can **manually switch** the screen language with a scale-terminal button. When they scan their barcode and BPAL identifies them, the interface may switch to the Vendor/Carrier configured language; users can manually switch it again if desired. The selected language also governs the version of related Messages and scale-ticket text shown or printed. Example: a Quebec vendor arriving at an English-default Ontario location can receive French screens and ticket text.

**16.4 Example answers**

**Q: Can I display a safety warning only for one carrier?**  
**A:** Where Messages are available for that Carrier, create a Message on the carrier record, set its active date range and destinations (for example Terminal In), and enter the required text in French and/or English. BPAL evaluates that Message when transactions involve the carrier.

**Q: Will Product and Vendor messages both appear on a transaction?**  
**A:** Yes, when both apply to the transaction and destination. BPAL presents applicable messages together and identifies whether each comes from Product, Vendor, Carrier, or another linked record.

## Related

- [Knowledge Base – 14. Standard Notebook: Navigation, Save and Lookup](./knowledge-base-14-standard-notebook-navigation-save-and-look.md)
- [Knowledge Base – 15. Mini Containers Inside Notebooks](./knowledge-base-15-mini-containers-inside-notebooks.md)
- [Knowledge Base – 17. Notes and External Attachments](./knowledge-base-17-notes-and-external-attachments.md)
- [Knowledge Base – 18. Audit and Change History](./knowledge-base-18-audit-and-change-history.md)
