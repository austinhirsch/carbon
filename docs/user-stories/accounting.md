---
title: Accounting Module User Stories
last_updated: 2026-01-27
source_files:
  - apps/carbon/app/modules/accounting/accounting.service.ts
  - apps/carbon/app/modules/accounting/accounting.models.ts
  - apps/carbon/app/routes/x+/accounting+/*.tsx
---

This document contains user stories for the Accounting module, covering chart of accounts, account categories, multi-currency support, payment terms, fiscal year configuration, and posting groups. Stories are derived from actual implemented features.

## Chart of Accounts

### Story: Create GL Account

- **As an** accountant
- **I want to** create a general ledger account
- **So that** I can track financial transactions

**Acceptance criteria:**
- [ ] Account number is required
- [ ] Account number cannot start or end with "."
- [ ] Account number cannot have consecutive dots
- [ ] Account name is required
- [ ] Account type is required: Posting, Total, Begin Total, End Total
- [ ] Income/Balance classification is required: Balance Sheet, Income Statement
- [ ] Account class is required: Asset, Liability, Equity, Revenue, Expense
- [ ] Asset, Liability, Equity must be Balance Sheet accounts
- [ ] Revenue, Expense must be Income Statement accounts
- [ ] Non-total accounts require account category
- [ ] Direct posting defaults to true for Posting accounts

**Source:** `apps/carbon/app/modules/accounting/accounting.models.ts` - `accountValidator`

---

### Story: Define Account Totaling

- **As an** accountant
- **I want to** create summary accounts
- **So that** I can view account group totals

**Acceptance criteria:**
- [ ] Can create "Total" type account
- [ ] Totaling range required for Total type
- [ ] Range format: "1000..1999" or "1000|2000|3000"
- [ ] Can create "Begin Total" and "End Total" markers
- [ ] Accounts between markers roll up to Total account
- [ ] Total accounts cannot have direct posting
- [ ] Hierarchy validates correctly

**Source:** Account type field with totaling validation

---

### Story: View Chart of Accounts

- **As an** accountant
- **I want to** view hierarchical chart of accounts
- **So that** I can understand account structure

**Acceptance criteria:**
- [ ] Accounts displayed in number order
- [ ] Indentation shows hierarchy (Begin Total/End Total)
- [ ] Can filter by Income Balance (Balance Sheet vs Income Statement)
- [ ] Can filter by account class
- [ ] Can see account type indicators
- [ ] Can see net change and balance for posting accounts
- [ ] Can drill down to account transactions

**Source:** `apps/carbon/app/routes/x+/accounting+/charts.tsx`

---

## Account Categories

### Story: Create Account Category

- **As an** accountant
- **I want to** define account categories
- **So that** I can organize accounts logically

**Acceptance criteria:**
- [ ] Category name is required
- [ ] Income/Balance is required: Balance Sheet, Income Statement
- [ ] Class is required: Asset, Liability, Equity, Revenue, Expense
- [ ] Income/Balance and Class must match correctly:
  - Assets, Liabilities, Equity → Balance Sheet
  - Revenue, Expense → Income Statement
- [ ] Categories are company-specific

**Source:** `apps/carbon/app/modules/accounting/accounting.models.ts` - `accountCategoryValidator`

---

### Story: Create Account Subcategory

- **As an** accountant
- **I want to** create subcategories within categories
- **So that** accounts are further organized

**Acceptance criteria:**
- [ ] Subcategory name is required
- [ ] Account category ID is required
- [ ] Subcategory inherits category's income/balance and class
- [ ] Can create multiple subcategories per category
- [ ] Subcategories used when creating posting accounts

**Source:** `apps/carbon/app/modules/accounting/accounting.models.ts` - `accountSubcategoryValidator`

---

## Multi-Currency Support

### Story: Define Currency

- **As an** accountant
- **I want to** define currencies
- **So that** I can conduct international business

**Acceptance criteria:**
- [ ] Currency code is required (e.g., USD, EUR, CAD)
- [ ] Currency name is required
- [ ] Symbol is required
- [ ] Decimal places: 0-4
- [ ] Exchange rate required (>= 0)
- [ ] Can designate base currency
- [ ] Only one base currency per company
- [ ] Exchange rates track conversion to base currency

**Source:** `apps/carbon/app/modules/accounting/accounting.models.ts` - `currencyValidator`

---

### Story: Update Exchange Rates

- **As an** accountant
- **I want to** update currency exchange rates
- **So that** foreign transactions are valued correctly

**Acceptance criteria:**
- [ ] Can update exchange rate for any currency
- [ ] Exchange rate must be >= 0
- [ ] Update timestamp recorded
- [ ] Historical rates preserved
- [ ] New rates apply to new transactions only
- [ ] Can run unrealized gain/loss calculation

**Source:** Currency update functionality

---

### Story: Record Multi-Currency Transaction

- **As an** accountant
- **I want to** record transactions in foreign currencies
- **So that** international operations are tracked

**Acceptance criteria:**
- [ ] Can specify transaction currency
- [ ] Exchange rate captured at transaction time
- [ ] Amount converted to base currency automatically
- [ ] Both foreign and base amounts stored
- [ ] Realized gains/losses calculated on payment

**Source:** Multi-currency transaction support

---

## Payment Terms

### Story: Define Payment Terms

- **As an** accountant
- **I want to** define standard payment terms
- **So that** due dates calculate automatically

**Acceptance criteria:**
- [ ] Name is required
- [ ] Days until due is required (>= 0)
- [ ] Can specify discount percentage (0-100)
- [ ] Can specify days until discount (>= 0)
- [ ] Calculation method: Net, End of Month, Day of Month
- [ ] Terms default to customers and suppliers

**Source:** `apps/carbon/app/modules/accounting/accounting.models.ts` - `paymentTermValidator`

---

### Story: Calculate Due Dates

- **As a** system
- **I want to** calculate due dates from payment terms
- **So that** users know when payment is due

**Acceptance criteria:**
- [ ] Net method: due date = invoice date + days
- [ ] End of Month: due date = end of month + days
- [ ] Day of Month: due date = specific day + days
- [ ] Discount date calculated separately
- [ ] Weekends and holidays considered (optional)

**Examples:**
- Net 30: 30 days from invoice date
- EOM+15: 15 days after end of month
- 2/10 Net 30: 2% discount if paid within 10 days, else net 30

**Source:** Payment term calculation methods

---

## Fiscal Year Configuration

### Story: Configure Fiscal Year

- **As an** accountant
- **I want to** set fiscal year parameters
- **So that** reporting periods align with our fiscal calendar

**Acceptance criteria:**
- [ ] Start month is required (1-12)
- [ ] Tax start month is required (1-12)
- [ ] Fiscal year can differ from calendar year
- [ ] Tax year can differ from fiscal year
- [ ] Settings apply company-wide
- [ ] Cannot change after transactions posted (validation)

**Source:** `apps/carbon/app/modules/accounting/accounting.models.ts` - `fiscalYearSettingsValidator`

---

### Story: Manage Accounting Periods

- **As an** accountant
- **I want to** open and close accounting periods
- **So that** historical data is locked

**Acceptance criteria:**
- [ ] Periods align with fiscal year settings
- [ ] Can create monthly, quarterly, or custom periods
- [ ] Period status: Inactive, Active, Closed
- [ ] Can post to Active periods only
- [ ] Closing period requires all transactions reconciled
- [ ] Closing user and timestamp recorded
- [ ] Cannot reopen closed periods without permission

**Source:** Accounting period management

---

## Default Accounts

### Story: Configure System Default Accounts

- **As an** accountant
- **I want to** map default GL accounts
- **So that** transactions post to correct accounts automatically

**Acceptance criteria:**
- [ ] Can configure defaults for:
  - Inventory
  - Cost of goods sold
  - Inventory adjustments
  - Accrued purchases
  - Accrued sales
  - Shipping expense
  - Other common accounts
- [ ] Default accounts must be Posting type
- [ ] Defaults used when creating posting groups
- [ ] Can override at posting group level

**Source:** `apps/carbon/app/routes/x+/accounting+/defaults.tsx`

---

## Posting Groups

### Story: Create Inventory Posting Group

- **As an** accountant
- **I want to** define inventory posting groups
- **So that** different item types post to different accounts

**Acceptance criteria:**
- [ ] Group name is required
- [ ] Can specify inventory account
- [ ] Can specify inventory interim account
- [ ] Can specify WIP account
- [ ] Can specify material variance account
- [ ] Can specify capacity variance account
- [ ] All accounts must be Posting type
- [ ] Groups assigned to items

**Source:** `apps/carbon/app/routes/x+/accounting+/groups+/inventory.tsx`

---

### Story: Create Purchasing Posting Group

- **As an** accountant
- **I want to** define purchasing posting groups
- **So that** purchases post to correct expense accounts

**Acceptance criteria:**
- [ ] Group name is required
- [ ] Can specify payables account
- [ ] Can specify purchase account
- [ ] Can specify purchase discount account
- [ ] Can specify purchase variance account
- [ ] All accounts must be Posting type
- [ ] Groups assigned to suppliers

**Source:** `apps/carbon/app/routes/x+/accounting+/groups+/purchasing.tsx`

---

### Story: Create Sales Posting Group

- **As an** accountant
- **I want to** define sales posting groups
- **So that** sales post to correct revenue accounts

**Acceptance criteria:**
- [ ] Group name is required
- [ ] Can specify receivables account
- [ ] Can specify sales account
- [ ] Can specify sales discount account
- [ ] Can specify COGS account
- [ ] All accounts must be Posting type
- [ ] Groups assigned to customers

**Source:** `apps/carbon/app/routes/x+/accounting+/groups+/sales.tsx`

---

## Journal Entry & Posting

### Story: View Account Transactions

- **As an** accountant
- **I want to** view all transactions for an account
- **So that** I can reconcile balances

**Acceptance criteria:**
- [ ] Can select any posting account
- [ ] Transactions shown in date order
- [ ] Shows: date, description, debit, credit, balance
- [ ] Can filter by date range
- [ ] Can filter by document type
- [ ] Can drill down to source document
- [ ] Running balance calculated

**Source:** Account transaction views

---

### Story: Validate Accounting Equation

- **As a** system
- **I want to** validate accounting equation
- **So that** books remain in balance

**Acceptance criteria:**
- [ ] Assets = Liabilities + Equity (always)
- [ ] Every journal entry debits = credits
- [ ] Cannot post unbalanced entries
- [ ] Validation runs before posting
- [ ] Error message identifies imbalance

**Source:** Accounting validation rules

---

## Permissions & Access Control

### Module Permission: `accounting`

| Action | Permission | Description |
|--------|------------|-------------|
| View | `accounting.view` | View chart of accounts, transactions |
| Create | `accounting.create` | Create accounts, categories |
| Update | `accounting.update` | Edit accounts, post transactions |
| Delete | `accounting.delete` | Delete accounts (if unused) |

**Special Permissions:**
- Account creation may require controller approval
- Journal posting may require accountant role
- Period closing requires special permission
- Exchange rate updates may be restricted

**Source:** Permission checks in route loaders via `requirePermissions(request, { view: "accounting" })`

---

## Data Validation Summary

| Field | Validation | Module |
|-------|------------|--------|
| Account Number | Required, no leading/trailing/consecutive dots | Account |
| Account Name | Required | Account |
| Account Type | Enum: Posting, Total, Begin Total, End Total | Account |
| Income/Balance | Enum: Balance Sheet, Income Statement | Account, Category |
| Class | Enum: Asset, Liability, Equity, Revenue, Expense | Account, Category |
| Currency Code | Required | Currency |
| Decimal Places | 0-4 | Currency |
| Exchange Rate | >= 0 | Currency |
| Payment Term Name | Required | Payment Term |
| Days Until Due | >= 0 | Payment Term |
| Discount Percent | 0-100 | Payment Term |
| Fiscal Start Month | 1-12 | Fiscal Year Settings |

---

## Account Type Rules

| Type | Direct Posting | Totaling Range | Use Case |
|------|----------------|----------------|----------|
| Posting | Yes | N/A | Regular GL account |
| Total | No | Required | Sum of range |
| Begin Total | No | N/A | Start of range |
| End Total | No | N/A | End of range |

---

## Income/Balance & Class Validation

| Class | Valid Income/Balance |
|-------|---------------------|
| Asset | Balance Sheet only |
| Liability | Balance Sheet only |
| Equity | Balance Sheet only |
| Revenue | Income Statement only |
| Expense | Income Statement only |

---

## Payment Term Calculation Methods

| Method | Formula | Example |
|--------|---------|---------|
| Net | Invoice Date + Days | Invoice 1/15 + 30 days = 2/14 |
| End of Month | End of Month + Days | Invoice 1/15 + EOM + 10 = 2/10 |
| Day of Month | Next Day of Month + Days | Invoice 1/15, day=10 → 2/10 |

---

## Source References

- `apps/carbon/app/modules/accounting/accounting.service.ts` - Business logic for accounting operations
- `apps/carbon/app/modules/accounting/accounting.models.ts` - Zod validators for accounting entities
- `apps/carbon/app/routes/x+/accounting+/*.tsx` - Route handlers for accounting pages
- `apps/carbon/app/routes/x+/accounting+/charts.tsx` - Chart of accounts
- `apps/carbon/app/routes/x+/accounting+/categories.tsx` - Account category management
- `apps/carbon/app/routes/x+/accounting+/currencies.tsx` - Currency management
- `apps/carbon/app/routes/x+/accounting+/payment-terms.tsx` - Payment term configuration
- `apps/carbon/app/routes/x+/accounting+/defaults.tsx` - Default account configuration
- `apps/carbon/app/routes/x+/accounting+/groups+/*.tsx` - Posting group configuration
- `apps/carbon/app/routes/x+/accounting+/years.tsx` - Fiscal year settings
- `packages/database/supabase/migrations/20230123004612_suppliers-and-customers.sql` - Account schema
