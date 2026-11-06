---
type: guide
title: Product – Control Buttons
description: >-
  Product: OK Button Location: Bottom left of the notebook window Function:
  Saves all user-entered or modified data to the appropriate database tables
  Behavior: After savi Covers: OK Button; Cancel Button; Apply Button; remains
  open
tags:
  - cdcmsmtl
  - product
status: active
generated:
  by: 'script:buildOkfBundle'
  at: '2026-10-22'
sources:
  - id: product-6
    resource: CDCMSMTL/English/product.txt
    title: product.txt
---
# Product – Control Buttons

**OK Button**
- **Location:** Bottom left of the notebook window
- **Function:** Saves all user-entered or modified data to the appropriate database tables
- **Behavior:** After saving, the notebook closes automatically
- **Use When:** You have finished all data entry and want to save and exit the notebook

**Cancel Button**
- **Location:** Bottom left of the notebook window, next to OK button; Also represented by the X button in the top right corner of the notebook
- **Function:** Closes the notebook
- **Behavior - If Changes Were Made:** If the user has made any changes to data within the notebook, the Cancel button (or X in top right corner) will trigger a confirmation dialog asking the user if they want to save their changes before closing. This allows the user to choose between saving changes or discarding them.
- **Behavior - If No Changes Were Made:** If no data has been changed in the notebook, pressing the Cancel button or the X in the top right corner will close the notebook immediately without any user confirmation prompt.
- **Use When:** You want to exit the notebook. If you have made changes, you will be prompted to save or discard them. If you haven't made changes, the notebook closes immediately.

**Apply Button**
- **Location:** Bottom left of the notebook window, next to Cancel button
- **Function:** Saves all user-entered or modified data to the database, identical to OK button functionality
- **Behavior:** After saving, the notebook **remains open** - unlike OK, it does not close
- **Use When:** You want to save your progress but continue working on the same product or need to make additional changes

---

## Related

- [Product – Tabs and Sections](./product-tabs-and-sections.md)
- [Product – Field Components - Key Example](./product-field-components-key-example.md)
- [Product – Change Detection and Confirmation Dialogs](./product-change-detection-and-confirmation-dialogs.md)
- [Product – Best Practices](./product-best-practices.md)
