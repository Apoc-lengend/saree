# BIll Generator 

## Overview
This app is a mobile-first business tool for managing a saree store. It is built around one main workflow: create bills quickly, keep customer records, maintain a product catalog, generate reports, and manage store settings from a single place.

## Main Navigation Structure
The app is organized into a tab-based layout with these sections:

- **Bill**
- **Bills**
- **Customers**
- **Catalog**
- **Reports**
- **Settings**

There is also a separate **Admin** area for managing the website catalog and content.

## Global App Flow
The app starts with a root layout that wraps all screens in shared providers so the main billing data, customer data, and admin data stay available across the app. The experience is designed for fast retail operations: load the app, create a bill, save the customer, and move on.

---

## Bill Screen
This is the primary working screen of the app.

### Purpose
Used to create and edit invoices, add products to a bill, manage customer details, and finalize sales.

### Main UI Sections

#### 1. Hero Header
- Shows the store branding.
- Displays whether the user is creating a new bill or editing an existing one.
- Shows summary stats such as customer count and total billed amount.
- Displays the current invoice number prominently.

#### 2. Customer Section
- Fields for customer name, phone, city/PIN, and address.
- Save customer button.
- Saved customer picker.
- Auto-suggestions based on entered customer name or phone.

#### 3. Invoice Details Section
- Invoice number field.
- Date field.

#### 4. Products Section
- Add product button opens a modal.
- Existing bill items are shown in a list.
- Each item shows:
  - product name
  - category
  - price
  - item discount if present
  - item total
- Each item can be increased, decreased, or removed.
- Empty state explains that products must be added before saving.

#### 5. Charges Section
- GST percentage
- Bill discount percentage
- Delivery charge
- Notes or payment comments

#### 6. Bill Preview Card
- Styled like a bill summary.
- Shows store name, phone, invoice number, date, and customer name.
- Breaks down totals:
  - subtotal
  - catalog discount
  - bill discount
  - GST
  - delivery
  - final total

#### 7. Action Buttons
- Save bill and customer
- Print PDF
- Share PDF
- New bill

### Modal Behaviors

#### Add Products Modal
- Search products.
- Filter by category.
- Show products in a selectable list.
- Add products directly to the bill.
- Existing selected items can be adjusted from inside the modal.

#### Saved Customers Modal
- Browse all stored customers.
- Pick a customer to load into the bill.

---

## Bills Screen
This screen is the bill archive.

### Purpose
Used to review saved invoices, reopen them, print them, share them, or delete them.

### Main UI Sections

#### 1. Header
- Shows the total number of bills saved.
- Displays total revenue from saved billing.
- Includes a search field for invoice number, customer name, phone, or date.

#### 2. Bills List
Each bill row shows:
- invoice number
- customer name
- date
- number of items
- saved discount amount
- total amount
- quick actions for printing and editing

#### 3. Bill Detail Modal
When a bill is selected, a detail view opens with:
- invoice summary
- total amount
- customer info
- action buttons:
  - Print PDF
  - Share
  - Edit
- item list
- full totals breakdown
- delete bill action

---

## Customers Screen
This screen manages customer records and their order history.

### Purpose
Used to track customer profiles, lifetime spending, billing history, and repeat purchases.

### Main UI Sections

#### 1. Header
- Shows customer management title.
- Displays order count, average order value, and top customer if available.
- Includes search and add customer controls.

#### 2. Customer List
Each customer card shows:
- customer name
- phone
- city
- order count
- last bill date
- total spent
- edit action

#### 3. Customer Detail Modal
When a customer is selected, a detail view opens with:
- total spending summary
- order count
- last visit date
- phone number
- action buttons:
  - Use in bill
  - Edit
  - Delete customer

#### 4. Order History
Inside the customer detail view, each saved bill shows:
- invoice number
- date
- item summary
- saved discount
- print action
- share action
- edit action
- delete bill action

#### 5. Customer Editor Modal
Used for adding or editing customer information.
It includes:
- name
- phone
- city/PIN
- address
- save action

#### Empty State
If no customers exist, the screen shows a prompt encouraging the user to save a bill or create a profile.

---

## Catalog Screen
This screen is for product browsing and adding custom products.

### Purpose
Used to view the available catalog, filter items, sync the catalog, and add custom products.

### Main UI Sections

#### 1. Hero Header
- Shows the catalog title.
- Displays number of products.
- Shows catalog sync status.
- Includes a sync button for refreshing from the source repo.

#### 2. Search and Filters
- Search field for catalog items.
- Add button for creating a custom product.
- Category chips for:
  - All
  - Saree
  - Bedsheet
  - Custom

#### 3. Product List
Each product card shows:
- product icon or category icon
- product name
- category
- discount if present
- price

#### 4. Add Product Modal
Lets the user create a custom catalog item with:
- product name
- price
- discount percentage
- category selection
- save action

#### Empty State
If no results match the search, the screen shows a clear empty message.

---

## Reports Screen
This screen summarizes sales over a chosen range.

### Purpose
Used to analyze performance by time period or by customer.

### Main UI Sections

#### 1. Hero Header
- Shows total sales for the selected period.
- Displays bill count, item count, and customer count.

#### 2. Date Range Filters
- Quick presets:
  - Week
  - Month
  - Year
  - All
  - Custom
- Custom range includes From and To date fields.

#### 3. Report Mode Switch
- Datewise list
- Per customer

#### 4. Report Actions
- Print PDF
- Share PDF

#### 5. Report Results
Depending on mode:
- **Datewise** shows each bill with invoice number, date, customer, and amount.
- **Customer mode** shows customer totals with bill count and item count.

#### Empty State
Shows a message when no sales exist in the selected range.

---

## Settings Screen
This screen controls store-level information.

### Purpose
Used to configure the store profile and access the admin area.

### Main UI Sections

#### 1. Hero Header
- Shows business profile title.
- Displays lifetime billing total.

#### 2. Settings Form
Fields include:
- store name
- address
- phone
- GSTIN
- default GST percentage
- default note

#### 3. Save Action
- Save settings button updates the store profile.

#### 4. Admin Entry
- Link to GitHub website admin.
- Intended for managing public website content and catalog data.

#### 5. Info Card
- Explains that customer records, catalog edits, saved bills, and invoice numbers are stored on the device for quick offline billing.

---



## Key App Behaviors

### Billing Workflow
1. Open Bill screen.
2. Enter customer details.
3. Add products.
4. Adjust quantities and charges.
5. Save the bill.
6. Print or share if needed.

### Customer Workflow
1. Save bills.
2. Reopen customers.
3. Review order history.
4. Reuse customer data for faster billing.

### Product Workflow
1. Browse catalog.
2. Sync products.
3. Add custom products.
4. Use products while creating bills.

### Reporting Workflow
1. Choose a date range.
2. Pick report mode.
3. View bill or customer summary.
4. Export as PDF.

---

## Empty States and Feedback
The app uses clear empty states and feedback messages throughout:
- no items in a bill
- no customers yet
- no products found
- no bills saved yet
- no sales in range
- unsaved changes warning in admin
- validation prompts for missing required data

---

## What a Developer Should Understand First
- The app centers on billing and customer history.
- Bills are the core object; customers and reports are built from saved bills.
- Catalog items feed into bill creation.
- Settings define the store identity and default billing behavior.
- Admin mode is separate and manages website/catalog content.
