---
type: guide
title: Product – Change Detection and Confirmation Dialogs
description: >-
  Product: Smart Change Detection BPAL notebooks include intelligent change
  detection that monitors whether the user has made any modifications to the
  data within the notebook. Covers: Smart Change Detection; Confirmation
  Behavior When Closing; Scenario 1: User Made Changes and Presses Cancel or
  X;...
tags:
  - cdcprod
  - product
status: active
generated:
  by: 'script:buildOkfBundle'
  at: '2026-10-22'
sources:
  - id: product-7
    resource: CDCPROD/English/product.txt
    title: product.txt
---
# Product – Change Detection and Confirmation Dialogs

**Smart Change Detection**
BPAL notebooks include intelligent change detection that monitors whether the user has made any modifications to the data within the notebook.

**Confirmation Behavior When Closing**

**Scenario 1: User Made Changes and Presses Cancel or X**
- The notebook detects that data has been modified
- A confirmation dialog appears asking: "Do you want to save your changes?"
- User options:
  - **Save:** Saves all changes and closes the notebook
  - **Don't Save:** Discards all changes and closes the notebook
  - **Cancel:** Returns to the notebook to continue editing

**Scenario 2: User Made No Changes and Presses Cancel or X**
- The notebook detects that no data has been modified
- The notebook closes immediately without any confirmation prompt
- No dialog appears - the action is instantaneous

**X Button in Top Right Corner**
The X button in the top right corner of the notebook window behaves identically to the Cancel button:
- If changes were made, it triggers the confirmation dialog
- If no changes were made, it closes the notebook immediately

**Why This Matters**
This change detection feature protects users from accidentally losing work. By prompting for confirmation only when changes exist, it also prevents unnecessary dialogs when simply reviewing data without making edits.

---

**Lookup Table Fields - Standard Feature**
Any field in BPAL that displays a magnifying glass icon follows the same standard lookup functionality:
- Click the magnifying glass to open the lookup table
- Browse or search for the desired value
- Select from the predefined list
- This ensures data integrity and consistency across the system

**Information Popup - Standard Feature**
The circular "i" icon next to lookup fields is a standard feature in BPAL:
- Provides context-sensitive information about the selected value
- Helps users verify their selection
- Displays additional properties and details about the code
- Available for any lookup field with this icon

---


**Common User Workflows**

**To Enter or Edit Product Information**

**Click **Apply** to save and continue editing, or **OK** to save and close**

**To View Additional Details About a Selection**

**Close the popup and proceed with your work**

**To Discard Changes**

**The notebook will close without modifying the database**

---

## Related

- [Product – Field Components - Key Example](./product-field-components-key-example.md)
- [Product – Control Buttons](./product-control-buttons.md)
- [Product – Best Practices](./product-best-practices.md)
