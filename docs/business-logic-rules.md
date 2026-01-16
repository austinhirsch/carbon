# Carbon Manufacturing System - Business Logic Rules

## Overview

This document provides comprehensive documentation of business logic rules, validation constraints, status workflows, calculated fields, and side effects across all modules in the Carbon ERP/MES system.

---

## Table of Contents

1. [Sales Module](#1-sales-module)
2. [Purchasing Module](#2-purchasing-module)
3. [Production Module](#3-production-module)
4. [Inventory Module](#4-inventory-module)
5. [Quality Module](#5-quality-module)
6. [Maintenance Module](#6-maintenance-module)
7. [Accounting Module](#7-accounting-module)
8. [Cross-Module Business Rules](#8-cross-module-business-rules)
9. [Key Automations & Triggers](#9-key-automations--triggers)

---

## 1. SALES MODULE

### 1.1 Customer Management

**Validation Rules:**
- Customer name: Required (min 1 character)
- Tax percent: Must be between 0 and 1 (0-100%)
- Currency code: Optional
- Account manager, contacts, locations: Optional references

**Required Fields:**
- Name
- Company ID (auto-assigned)

**Optional Fields:**
- Customer status, type
- Account manager
- Currency code
- Tax percent
- Sales/invoicing contacts
- Website

**Business Constraints:**
- Customers can have multiple locations
- Customers can have multiple contacts
- Each contact can be associated with a specific location
- Customer types and statuses are customizable

---

### 1.2 Quote Management

**Status Workflow:**
```
Draft → Sent → [Ordered | Partial | Lost | Cancelled | Expired]
```

**Status Definitions:**
- **Draft**: Quote being prepared
- **Sent**: Quote sent to customer
- **Ordered**: Fully converted to sales order
- **Partial**: Partially converted to sales order
- **Lost**: Opportunity lost to competitor
- **Cancelled**: Quote cancelled
- **Expired**: Quote past expiration date

**Validation Rules:**
- Customer: Required
- Customer location, contact: Optional
- Due date, expiration date: Optional dates
- Currency code: Optional (inherits from customer if not set)
- Exchange rate: Optional numeric
- Digital quote acceptance requires name and email

**Quote Line Validation:**
- Item/Part: Required
- Status: Required (Not Started, In Progress, Complete, No Quote)
- Description: Required (min 1 character)
- Method type: Required (Buy, Make, Buy and Make, Outside)
- Unit of measure: Required
- Quantity: Array of quantities (min 0.00001)
- Tax percent: 0-1 range

**Quote Line Status Workflow:**
```
Not Started → In Progress → [Complete | No Quote]
```

**Discount System:**
- Discounts applied at quote line price level (per quantity break)
- Each quantity can have its own discount percentage
- Net price = Unit price × (1 - Discount percent)
- **IMPORTANT**: Discounts are NOT propagated to sales orders or invoices

**Quote Operations:**

**Inside Operations (Manufacturing):**
- Setup unit, time: Required
- Labor unit, time: Required
- Machine unit, time, rate: Required
- Overhead rate: Required
- Labor rate: Required

**Outside Operations (Subcontracting):**
- Minimum cost: Required
- Unit cost: Required
- Lead time: Required
- Supplier process: Optional

**Quote Materials:**
- Item type validation: Part, Material, Tool, Consumable all require itemId
- Quantity: Min 0
- Unit cost: Min 0
- Kit flag: Boolean

**Side Effects:**
- Quote creation generates unique quote ID from sequence
- Quote line status changes don't auto-update quote status
- Quote finalization can send email notification to customer contact

---

### 1.3 Sales Order Management

**Status Workflow:**
```
Draft → Needs Approval → [To Ship and Invoice | To Ship | To Invoice] → Completed → Closed
                    ↓
                Cancelled
```

**Status Definitions:**
- **Draft**: Order being prepared
- **Needs Approval**: Requires management approval
- **To Ship and Invoice**: Both shipping and invoicing pending
- **To Ship**: Only shipping pending
- **To Invoice**: Only invoicing pending
- **Completed**: Fully shipped and invoiced
- **Cancelled**: Order cancelled
- **Closed**: Order closed (administrative)

**Validation Rules:**
- Customer: Required
- Currency code: Required
- Location: Optional
- Requested date, promised date: Optional
- Customer reference: Optional

**Sales Order Lines:**
- Line type: Part, Material, Tool, Consumable, Comment, Fixed Asset
- Item: Required for all types except Comment and Fixed Asset
- Method type: Required for non-Comment lines
- Description: Required for Comment lines
- Location: Required (min 0 length)
- Tax percent: 0-1 range
- Quantity, unit price: Numeric optional

**Line Type Specific Rules:**
- **Part**: itemId required
- **Comment**: description required, no itemId
- **Fixed Asset**: assetId potentially required
- **All others**: itemId required

**Drop Shipment:**
- When enabled, requires supplier and location
- Cannot have both location and drop shipment flag

**Side Effects:**
- Sales order creation generates unique order ID from sequence
- Confirming order can send email notification
- Releasing order creates shipment/invoice records
- Completing order updates inventory and accounting ledgers

---

### 1.4 RFQ (Request for Quote) Management

**Status Workflow:**
```
Draft → Ready for Quote → Quoted → Closed
```

**Validation Rules:**
- Customer: Required
- RFQ date: Required
- Status: Optional (defaults to Draft)
- Sales person: Optional

**RFQ Lines:**
- Customer part ID: Required
- Customer part revision: Optional
- Item ID: Optional (linked to internal item)
- Description: Optional
- Quantity: Array of quantities (min 0.00001)
- Unit of measure: Required
- Model upload: Optional

**Side Effects:**
- RFQ creation generates unique RFQ ID
- Can create quote from RFQ (copies lines and details)

---

## 2. PURCHASING MODULE

### 2.1 Supplier Management

**Validation Rules:**
- Name: Required (min 1 character)
- Supplier status, type: Optional
- Account manager: Optional
- Currency code: Optional
- Purchasing/invoicing contacts: Optional
- Website: Optional

**Supplier Process:**
- Supplier: Required
- Process: Required
- Minimum cost: Min 0
- Lead time: Min 0 days

**Business Constraints:**
- Suppliers can have multiple locations
- Suppliers can have multiple contacts
- Supplier processes define capabilities and pricing
- Payment terms can be customized per supplier

---

### 2.2 Supplier Quote Management

**Status Workflow:**
```
Draft → Active → [Expired | Declined | Cancelled]
```

**Validation Rules:**
- Supplier: Required
- Quote type: Purchase or Outside Processing
- Expiration date: Must be today or after
- Currency code: Optional
- Exchange rate: Optional

**Supplier Quote Lines:**
- Item: Required
- Description: Required
- Supplier part ID: Optional
- Inventory UOM: Required
- Purchase UOM: Required
- Conversion factor: Optional (default 1)
- Quantity: Array (min 0.00001)

**Conversion Factor System:**
- Handles different units between inventory and purchasing
- **Formula**: Inventory unit price = (Supplier unit price × Exchange rate) / Conversion factor
- **Example**: Buy in cases (100 units), track in each
- **Validation**: Conversion factor must be > 0

**Side Effects:**
- Quote creation generates unique quote ID
- Finalization can send email notification to supplier
- Can convert supplier quote to purchase order

---

### 2.3 Purchase Order Management

**Status Workflow:**
```
Draft → Planned → To Review → [To Receive | To Receive and Invoice] → To Invoice → Completed
                                                              ↓
                                                          Rejected → Closed
```

**Status Definitions:**
- **Draft**: Order being prepared
- **Planned**: Order planned but not submitted
- **To Review**: Pending approval
- **To Receive**: Awaiting receipt
- **To Receive and Invoice**: Both receipt and invoice pending
- **To Invoice**: Only invoice pending
- **Completed**: Fully received and invoiced
- **Rejected**: Order rejected
- **Closed**: Order closed

**Validation Rules:**
- Purchase order type: Required (Purchase or Outside Processing)
- Supplier: Required
- Supplier location, contact: Optional
- Supplier reference: Optional
- Currency code, exchange rate: Optional

**Purchase Order Lines:**
- Line type: Part, Material, Tool, Consumable, Comment
- Item: Required for inventory items
- Conversion factor: Optional (default 1)
- Purchase quantity: Optional numeric
- Purchase UOM, Inventory UOM: Optional
- Location, shelf: Optional
- Promised date: Optional
- Job/operation linkage: Optional (for outside processing)

**Line Type Validation:**
- Part, Material, Tool, Consumable: Require itemId

**Drop Shipment:**
- When enabled, requires customer and location
- Cannot have both receiving location and drop shipment

**Side Effects:**
- PO creation generates unique PO ID from sequence
- Finalizing can send email to supplier contact
- Receiving creates receipt and updates inventory
- Invoicing creates AP entries

---

## 3. PRODUCTION MODULE

### 3.1 Job Management

**Status Workflow:**
```
Draft → Planned → Ready → In Progress ⇄ Paused → Completed
                                  ↓
                              Cancelled
```

**Status Definitions:**
- **Draft**: Job being created
- **Planned**: Job planned but not released
- **Ready**: Released and ready for production
- **In Progress**: Active production
- **Paused**: Temporarily stopped
- **Completed**: Production finished
- **Cancelled**: Job cancelled

**Deadline Types:**
- **ASAP**: Highest priority
- **Hard Deadline**: Must meet date
- **Soft Deadline**: Target date
- **No Deadline**: No time constraint

**Validation Rules:**
- Item: Required
- Deadline type: Required
- Due date: Required for Hard/Soft deadlines
- Location: Required
- Quantity: Min 0
- Scrap quantity: Min 0
- Unit of measure: Required
- Customer: Optional
- Start date: Optional
- Model upload, configuration: Optional

**Bulk Job Creation:**
- Total quantity: Required
- Quantity per job: Required
- Scrap quantity per job: Required
- Due date of first/last job: Required for Hard/Soft deadlines
- **Validation**: First due date must be ≤ Last due date

**Job Operations:**

**Inside Operations:**
- Work center: Optional (Required when job is released)
- Process: Required
- Setup/Labor/Machine unit and time: Required
- Machine/Overhead/Labor rate: Required

**Outside Operations:**
- Supplier process: Required when released
- Minimum cost: Required
- Unit cost: Required
- Lead time: Required

**Job Materials:**
- Item: Required
- Item type: Part, Material, Tool, Consumable
- Method type: Buy, Make, etc.
- Quantity: Min 0
- Unit cost: Min 0
- Operation linkage: Optional (Required for released jobs)
- Shelf: Optional
- Kit flag: Boolean
- Tracking flags: Serial, Batch

**Job Completion:**
- Quantity complete: Min 0
- Sales order line linkage: Optional
- Location, shelf: Optional

**Side Effects:**
- Job creation generates unique job ID from sequence
- Releasing job creates make method from item
- Releasing job triggers MRP recalculation
- Completing job creates inventory transactions
- Job completion updates sales order status
- Job materials create demand in MRP

---

### 3.2 Production Planning

**MRP (Material Requirements Planning):**
- Runs automatically every 3 hours
- Can be triggered manually
- Scope: Company, Location, Job, Sales Order, Item, Purchase Order
- Creates/updates demand and supply forecasts
- Tracks actual demand from sales orders and job materials
- Tracks actual supply from production orders and purchase orders

**Demand Sources:**
- Sales orders (status: Confirmed, To Ship and Invoice, To Ship, To Invoice, In Progress)
- Job material requirements

**Supply Sources:**
- Production orders (status: Planned, Ready, In Progress, Paused)
- Purchase orders (status: Planned, To Receive, To Receive and Invoice)

**MRP Process:**
1. Generate demand periods (default 72 weeks)
2. Collect open orders from views
3. Calculate demand/supply quantities by location, period, item
4. Clear existing supply forecasts
5. Upsert demand actual records
6. Upsert supply actual records
7. Track created/updated by user

---

## 4. INVENTORY MODULE

### 4.1 Item Management

**Item Types:**
- Part
- Material
- Tool
- Consumable

**Item Tracking Types:**
- Inventory: Standard tracked inventory
- Non-Inventory: Not tracked in stock
- Serial: Individual serial number tracking
- Batch: Batch/lot number tracking

**Replenishment Systems:**
- Buy: Purchased from supplier
- Make: Manufactured internally
- Buy and Make: Both options available

**Method Types:**
- Buy: Purchase from supplier
- Make: Manufacture
- Outside: Subcontracted manufacturing
- Buy and Make: Combination

**Validation Rules:**
- Readable ID: Optional (auto-generated)
- Name: Required (max 255 chars)
- Description: Optional
- Replenishment system: Required
- Default method type: Required
- Item tracking type: Required
- Unit of measure: Required
- Unit cost: Optional (min 0)
- Posting group: Optional

**Part/Tool Specific:**
- Revision: Required (min 1 character)
- Model upload: Optional
- Lot size: Optional (min 0)

**Material Specific:**
- Material substance: Optional
- Material form: Optional
- Material type: Optional
- Finish, grade, dimension: Optional
- Sizes: Optional array

**Costing Methods:**
- Standard
- Average
- FIFO
- LIFO

**Reordering Policies:**
- Manual Reorder
- Demand-Based Reorder
- Fixed Reorder Quantity
- Maximum Quantity

**Validation for Maximum Quantity Policy:**
- Maximum inventory quantity must be > reorder point

**Validation for Fixed Reorder Quantity:**
- Reorder quantity must be > 0

**Manufacturing Policies:**
- Make to Stock
- Make to Order

**Item Planning:**
- Reordering policy: Required
- Reorder point: Optional (min 0)
- Reorder quantity: Optional (min 0)
- Maximum inventory quantity: Optional (min 0)
- Minimum/maximum order quantity: Optional (min 0)
- Order multiple: Optional (min 1)
- Demand accumulation period: Optional (min 1)
- Safety stock: Optional (min 0)

**Configuration Parameters:**
- Label: Required
- Data type: text, numeric, boolean, list, date, material
- List options: Required for "list" type
- Key: Must be lowercase and underscore separated
- Configuration parameter group: Optional

**Side Effects:**
- Item creation auto-generates readable ID if not provided
- Part/Tool creation auto-creates makeMethod record
- All items auto-create itemCost, itemReplenishment, itemUnitSalePrice records
- Revision system: Multiple items can share readableId with different revisions
- **Readable ID with revision** = readableId + (revision != '0' ? '.' + revision : '')

---

### 4.2 Inventory Transactions

**Item Ledger Types:**
- Purchase
- Sale
- Positive Adjmt. (Adjustment)
- Negative Adjmt.
- Transfer
- Consumption
- Output
- Assembly Consumption
- Assembly Output

**Item Ledger Document Types:**
- Sales Shipment, Invoice, Return Receipt, Credit Memo
- Purchase Receipt, Invoice, Return Shipment, Credit Memo
- Transfer Shipment, Receipt
- Service Shipment, Invoice, Credit Memo
- Posted Assembly
- Inventory Receipt, Shipment
- Direct Transfer

**Inventory Adjustment:**
- Item: Required
- Location: Required
- Shelf: Optional
- Adjustment type: Ledger types + "Set Quantity"
- Quantity: Numeric (can be negative)
- Tracked entity: Optional

**Side Effects:**
- All inventory transactions create item ledger entries
- Ledger entries update on-hand quantities
- Tracked entity transactions link serial/batch numbers
- Cost ledger entries created for valuation

---

### 4.3 Receipts & Shipments

**Receipt Status Workflow:**
```
Draft → Pending → Posted
```

**Receipt Source Documents:**
- Purchase Order
- Purchase Invoice
- Inbound Transfer

**Validation Rules:**
- Receipt ID: Required
- Location: Optional
- Source document: Optional enum
- Source document ID: Required
- External document ID: Optional
- Supplier: Optional

**Shipment Status Workflow:**
```
Draft → Pending → Posted → Voided
```

**Shipment Source Documents:**
- Sales Order
- Purchase Order (returns)
- Outbound Transfer

**Shipment Carriers:**
- UPS
- FedEx
- USPS
- DHL
- Other

**Validation Rules:**
- Shipment ID: Required
- Location: Optional
- Source document: Optional enum
- Source document ID: Required
- Tracking number: Optional
- Shipping method: Optional
- Customer: Optional

**Side Effects:**
- Posting receipt creates item ledger entries
- Posting receipt updates purchase order status
- Posting shipment creates item ledger entries
- Posting shipment updates sales order status
- Shipment creates accounts receivable entries
- Receipt creates accounts payable entries

---

### 4.4 Warehouse Transfers

**Transfer Status Workflow:**
```
Draft → To Ship and Receive → [To Ship | To Receive] → Completed
                          ↓
                      Cancelled
```

**Validation Rules:**
- From location: Required
- To location: Required
- **From and To locations must be different**
- Transfer date: Optional
- Expected receipt date: Optional
- Notes, reference: Optional

**Transfer Lines:**
- Transfer ID: Required
- Item: Required
- Quantity: Min 0.0001
- From/To locations: Required (must be different)
- From/To shelf: Optional
- Unit of measure: Optional
- Notes: Optional

**Stock Transfer (Internal Movement):**

**Status Workflow:**
```
Draft → Released → In Progress → Completed
```

**Validation Rules:**
- Location: Required
- Lines: JSON array of line items (min 1 line)

**Stock Transfer Lines:**
- Item: Required
- From shelf, To shelf: Optional
- Quantity: Min 0
- Picked quantity: Optional
- Batch/Serial tracking flags: Boolean

**Stock Transfer Scanning:**
- Item: Required
- Location: Required
- Stock transfer: Required
- Tracked entity: Required

**Side Effects:**
- Completing transfer creates item ledger entries
- Transfer creates outbound and inbound transactions
- Stock transfer updates shelf locations
- Tracked entity scanning validates serial/batch numbers

---

### 4.5 Tracked Entities & Traceability

**Tracked Entity Status:**
- Available: Ready for use
- Consumed: Used in production
- On Hold: Quality hold
- Reserved: Reserved for order

**Tracked Entity Structure:**
- ID: Auto-generated (xid)
- Quantity: Current quantity
- Status: Enum (see above)
- Source document: Document type that created entity
- Source document ID: Specific revision UUID
- Source document readable ID: Base readable ID
- Attributes: JSONB (serial number, batch number, dates, custom properties)

**Tracked Activity:**
- Represents transformations/processes
- Type: Manufacturing, Assembly, Conversion
- Source document: Job, operation, etc.
- Attributes: Additional metadata

**Traceability Graph:**
- **Nodes**: Tracked entities
- **Edges**: Tracked activities with inputs/outputs
- Forms directed acyclic graph (DAG)
- **Forward tracing**: Where did this material go?
- **Backward tracing**: Where did this come from?

**Graph Traversal:**
- `get_direct_descendants_of_tracked_entity_strict()` - Forward tracing
- `get_direct_ancestors_of_tracked_entity_strict()` - Backward tracing

**Conversion Pattern:**
1. Create tracked activity (transformation)
2. Create tracked activity inputs (consumed entities)
3. Create tracked activity outputs (produced entities)
4. Update item ledgers (deduct inputs, add outputs)
5. Update entity statuses (inputs → Consumed, outputs → Available)

---

### 4.6 Kanban System

**Replenishment Systems:**
- Buy: Purchase from supplier
- Make: Manufacture internally
- Buy and Make: Not yet implemented

**Validation Rules:**
- Item: Required
- Replenishment system: Required (default "Buy")
- Quantity: Integer min 1
- Location: Required
- Shelf: Optional
- Supplier: Required for "Buy" system
- Purchase UOM, conversion factor: Optional

**Kanban Actions:**
- **Order/Create**: Creates job (Make) or PO (Buy)
- **Start**: Starts next operation (Make only)
- **Complete**: Completes current operation (Make only)

**QR Code Integration:**
- Three QR code types per kanban (order, start, complete)
- QR codes link to API endpoints
- Label PDF generation (2×3 grid, 6 labels per page)
- Includes item info, location, quantity, supplier

**Make Kanban Side Effects:**
- Creates production job with auto-generated ID
- Copies quantity, location, shelf from kanban
- Creates job method from item
- Associates kanban with job
- Optional auto-release (triggers MRP, scheduling)
- Optional auto-start (redirects to MES)

**Buy Kanban Side Effects:**
- Finds or creates draft PO for supplier
- Adds PO line with kanban quantity
- Uses supplier pricing or item cost
- Sets location/shelf from kanban or defaults

**Collision Handling:**
- Prevents duplicate jobs for same kanban
- Redirects to existing job if already active

---

## 5. QUALITY MODULE

### 5.1 Non-Conformance (Issue) Management

**Status Workflow:**
```
Registered → In Progress → Closed
          ↓ (can reopen)
```

**Priority Levels:**
- Low
- Medium
- High
- Critical

**Source Types:**
- Internal
- External

**Validation Rules:**
- Name: Required
- Priority: Required (enum)
- Source: Required (Internal/External)
- Location: Required
- Non-conformance type: Required
- Open date: Required
- Due date: Optional
- Close date: Optional
- Description: Optional
- Required action IDs: Optional array
- Approval requirements: Optional array (MRB)
- Workflow: Optional
- Quantity: Optional

**Association Types:**
- Items
- Customers
- Suppliers
- Job operations
- Purchase order lines
- Sales order lines
- Shipment lines
- Receipt lines
- Tracked entities

**Task Types:**

**1. Investigation Tasks:**
- Created from investigation type IDs
- Status: Pending → In Progress → Completed/Skipped
- Examples: Root cause analysis, material analysis

**2. Action Tasks:**
- Created from required action IDs
- Status: Pending → In Progress → Completed/Skipped
- Examples: Corrective action, preventive action

**3. Approval Tasks:**
- Created from approval requirements
- Status: Pending → In Progress → Completed/Skipped
- MRB approvals create reviewer records

**Task Status Workflow:**
```
Pending → In Progress → [Completed | Skipped]
     ↓ (can reopen)
```

**Task Actions:**
- **Start**: Pending → In Progress
- **Complete**: In Progress → Completed
- **Skip**: Pending → Skipped (only when pending)
- **Reopen**: Completed/Skipped → Pending

**IMPORTANT NOTE:**
- Tasks do NOT auto-start when issue goes "In Progress"
- All tasks remain in "Pending" until manually started

**Disposition Types:**
- Pending: Awaiting disposition
- Rework: Requires rework
- Scrap: Scrap material
- Use As Is: Accept as-is

**Side Effects:**
- Issue creation calls edge function to create tasks
- Tasks created based on workflow configuration
- Issue completion requires all tasks complete
- Issues appear in "Used In" panel for associated items
- MRB approvals create reviewer records

---

### 5.2 Risk Register

**Risk Types:**
- Risk: Potential negative outcome
- Opportunity: Potential positive outcome

**Risk Sources:**
- Customer
- General
- Item
- Job
- Quote Line
- Supplier
- Work Center

**Risk Status:**
- Open: Active risk needing attention
- In Review: Being assessed
- Mitigating: Actions being taken
- Closed: Resolved
- Accepted: Risk accepted

**Validation Rules:**
- Title: Required
- Source: Required (enum)
- Severity: 1-5 scale
- Likelihood: 1-5 scale
- Status: Required
- Description: Optional
- Assignee: Optional
- Source ID: Optional (entity this risk relates to)

**Calculated Fields:**
- **Risk Score = Severity × Likelihood** (auto-calculated)

**Integration:**
- Risks can be associated with any source entity via sourceId
- Item details pages show associated risks
- Can be integrated with any module via RiskRegister component

---

### 5.3 Calibration & Gauges

**Gauge Status:**
- Active
- Inactive

**Gauge Calibration Status:**
- Pending
- In-Calibration
- Out-of-Calibration

**Gauge Role:**
- Master: Reference standard
- Standard: Working standard

**Validation Rules:**
- Gauge type: Required
- Gauge role: Required
- Calibration interval (months): Min 1
- Supplier, model/serial number: Optional
- Date acquired: Optional
- Last/next calibration date: Optional
- Location, shelf: Optional

**Calibration Record Validation:**
- Gauge: Required
- Date calibrated: Required
- Supplier: Optional
- Temperature: -200 to 500 (optional)
- Humidity: 0 to 1 (optional)
- Approved by: Optional
- Measurement standard: Optional
- Calibration attempts: Array of reference/actual pairs
- Requires adjustment/repair/action: Boolean flags
- Notes: Optional (JSON)

**Side Effects:**
- Gauge creation sets initial calibration status
- Calibration record creation updates gauge status
- Next calibration date auto-calculated from interval
- Out-of-calibration gauges flagged for action

---

### 5.4 Quality Documents

**Document Status:**
- Draft: Being created
- Active: In use
- Archived: No longer active

**Validation Rules:**
- Name: Required
- Version: Min 0
- Content: Optional
- Copy from: Optional (copy existing document)

**Document Steps:**
- Name: Required
- Description: Optional
- Type: Text, Numeric, Measurement, Boolean, List, Date
- Unit of measure: Required for Measurement type
- Min/max value: Optional (max must be ≥ min)
- List values: Required for List type (array of strings)
- Sort order: Optional

**Step Type Validation:**
- **Measurement**: Requires unit of measure
- **List**: Requires non-empty list values
- Min/max values: Max ≥ Min if both provided

---

## 6. MAINTENANCE MODULE

**Dispatch Status Workflow:**
```
Open → Assigned → In Progress → [Completed | Cancelled]
```

**Dispatch Priority:**
- Low
- Medium
- High
- Critical

**Maintenance Severity:**
- Preventive
- Operator Performed
- Support Required
- OEM Required

**Maintenance Source:**
- Scheduled
- Reactive
- Non-Conformance

**OEE Impact:**
- Down: Equipment unavailable
- Planned: Scheduled downtime
- Impact: Reduced efficiency
- No Impact: No production impact

**Validation Rules:**
- Status: Required
- Priority: Required
- Severity, Source, OEE Impact: Optional
- Work center: Optional
- Suspected failure mode: Optional
- Planned start/end time: Optional
- Assignee: Optional
- Content/description: Optional

**Maintenance Events:**
- Dispatch: Required
- Employee: Required
- Work center: Required
- Start time: Required
- End time: Optional (must be after start time if provided)
- Notes: Optional

**Maintenance Items:**
- Item: Required
- Quantity: Min 1
- Unit of measure: Required
- Unit cost: Min 0 (optional)

**Maintenance Schedule:**
- Name: Required
- Work center: Required
- Frequency: Daily, Weekly, Monthly, Quarterly, Annual
- Priority: Required
- Estimated duration: Optional numeric
- Active: Boolean flag

**Side Effects:**
- Dispatch creation can auto-create tasks
- Completing dispatch creates maintenance history
- Maintenance events track labor hours
- Item consumption updates inventory

---

## 7. ACCOUNTING MODULE

### 7.1 Chart of Accounts

**Account Types:**
- Posting: Regular posting account
- Total: Summarizes other accounts
- Begin Total: Starts summary range
- End Total: Ends summary range

**Income/Balance Types:**
- Balance Sheet: Asset, Liability, Equity
- Income Statement: Revenue, Expense

**Account Classes:**
- Asset
- Liability
- Equity
- Revenue
- Expense

**Validation Rules:**
- Number: Required (cannot start/end with dot, no consecutive dots)
- Name: Required
- Type: Required
- Income/Balance: Required
- Class: Required
- Consolidated rate: Average, Current, Historical
- Direct posting: Boolean
- Account category: Required for Posting accounts

**Business Constraints:**
- Asset, Liability, Equity must be Balance Sheet accounts
- Revenue, Expense must be Income Statement accounts
- Non-total accounts require account category
- Account subcategories must belong to parent category

**Consolidated Rate Types:**
- Average: Use average exchange rate
- Current: Use current exchange rate
- Historical: Use historical rate

---

### 7.2 Journal Entries

**Document Types:**
- Receipt
- Invoice
- Credit Memo
- Blanket Order
- Return Order

**Validation Rules:**
- Posting date: Optional
- Account number: Required
- Description: Optional
- Amount: Required numeric
- Document type: Optional enum
- Document ID: Optional
- External document ID: Optional

**Side Effects:**
- Journal lines create general ledger entries
- Auto-balancing validation (debits = credits)
- Posting updates account balances

---

### 7.3 Cost Ledger

**Cost Ledger Types:**
- Direct Cost
- Revaluation
- Rounding
- Indirect Cost
- Variance
- Total

**Validation Rules:**
- Posting date: Optional
- Item ledger type: Required
- Cost ledger type: Required
- Adjustment: Boolean
- Document type: Optional
- Document ID: Optional
- Item: Required
- Quantity: Required numeric
- Cost: Required numeric
- Cost posted to GL: Required numeric

**Side Effects:**
- Cost ledger entries track inventory valuation
- Links to item ledger for quantity tracking
- Updates GL accounts based on posting group

---

### 7.4 Payment Terms

**Calculation Methods:**
- Net: Days from invoice date
- End of Month: Due at end of month + days
- Day of Month: Due on specific day of month

**Validation Rules:**
- Name: Required
- Days due: Min 0
- Days discount: Min 0
- Discount percentage: 0-100
- Calculation method: Required

**Example:**
- "Net 30": Due 30 days from invoice
- "EOM+15": Due 15 days after end of month
- "2/10 Net 30": 2% discount if paid within 10 days, else net 30

---

### 7.5 Currency & Exchange Rates

**Validation Rules:**
- Code: Required (e.g., USD, EUR, CAD)
- Decimal places: 0-4
- Exchange rate: Min 0

**Multi-Currency Support:**
- Base currency defined in company settings
- Exchange rates track conversion to base
- Quote/order exchange rate captured at creation
- Exchange rate updated timestamp tracked

**Calculation:**
- **Amount in base currency = Foreign amount × Exchange rate**

---

## 8. CROSS-MODULE BUSINESS RULES

### 8.1 Revision System

**Key Concepts:**
- Multiple revisions per item (same readableId, different revision)
- Default revision is '0'
- **Readable ID with revision** = readableId + (revision != '0' ? '.' + revision : '')
- Latest revision determined by createdAt DESC

**Unique Constraint:**
- (readableId, revision, companyId, type) must be unique

**Relationships:**
- Part/Material/Tool/Consumable tables join via readableId (not item.id)
- ItemCost, ItemReplenishment per specific revision (references item.id)
- Tracked entities reference specific revision UUID

**Views Pattern:**
```sql
WITH latest_items AS (
  SELECT DISTINCT ON (readableId, companyId)
    *
  FROM item
  ORDER BY readableId, companyId, createdAt DESC
)
```

**Side Effects:**
- Each revision gets own cost, replenishment, pricing records
- Part/Tool revisions auto-create makeMethod
- Tracked entities linked to specific revision
- Method can be copied between revisions

---

### 8.2 Make Methods (Bills of Material)

**Structure:**
- Make method belongs to item
- Make method version controls revisions
- Operations define routing
- Materials define BOM

**Method Types:**
- Buy: Purchase the item
- Make: Manufacture the item
- Outside: Subcontract manufacturing
- Buy and Make: Both options

**Operations:**
- Sequential order
- Operation order: Pre, Post, Sequential
- Operation type: Inside (internal) or Outside (subcontract)

**Materials:**
- Item type: Part, Material, Tool, Consumable
- Method type: How to acquire the material
- Kit flag: Is this a kit of items?
- Operation linkage: Which operation consumes this?

**Method Tree:**
- Recursive structure (materials can have their own methods)
- Enables multi-level BOM explosion
- Tracks parent-child relationships

---

### 8.3 Conversion Factors

**Purpose:**
- Handle different units between inventory and purchasing/sales
- Example: Buy in cases, track in each

**Formula:**
- **Inventory unit price = (Purchase unit price × Exchange rate) / Conversion factor**

**Application:**
- Supplier quotes
- Purchase orders
- Purchase invoices
- Receipt lines
- Supplier parts

**Validation:**
- Conversion factor must be > 0
- Defaults to 1 when units are same

---

### 8.4 Sequence Numbers

**Auto-Generated IDs:**
- Quote ID
- Sales Order ID
- RFQ ID
- Purchase Order ID
- Supplier Quote ID
- Job ID
- Receipt ID
- Shipment ID
- Transfer ID

**Pattern:**
- Company-specific sequences
- Prefix + incrementing number
- Configurable format per document type

---

### 8.5 Permissions & Security

**Permission Structure:**
- Module-based: sales, purchasing, production, inventory, quality, accounting
- Action-based: view, create, update, delete
- Row-level security (RLS) enforces company isolation

**Common Patterns:**
- Employees can view within company
- Specific permissions required for create/update/delete
- API key access for external integrations
- Service role for system operations

---

## 9. KEY AUTOMATIONS & TRIGGERS

### 9.1 Database Triggers

**Item Creation:**
- Auto-creates itemCost (default FIFO)
- Auto-creates itemReplenishment
- Auto-creates itemUnitSalePrice (default USD)
- For Parts/Tools: Auto-creates makeMethod

**Inventory Posting:**
- Receipt posting creates item ledger entries
- Shipment posting creates item ledger entries
- Inventory adjustments update on-hand quantities
- Cost ledger entries auto-calculate valuation

**MRP Automation:**
- Runs every 3 hours automatically
- Triggered by job release
- Creates demand/supply forecasts
- Updates planning records

---

### 9.2 Cascade Deletes

**ON DELETE CASCADE:**
- Company deletion cascades to all company data
- Item deletion cascades to cost, replenishment, planning
- Job deletion cascades to operations, materials
- Quote deletion cascades to lines, prices, methods
- PO deletion cascades to lines
- SO deletion cascades to lines

**ON DELETE SET NULL:**
- Item ledger tracked entity deletion
- User deletions in assignment fields
- Contact deletions in reference fields

---

### 9.3 Status Workflows & Allowed Transitions

**Sales Order:**
- Draft → Needs Approval
- Needs Approval → To Ship and Invoice | Cancelled
- To Ship and Invoice → To Ship | To Invoice | Completed
- To Ship → Completed
- To Invoice → Completed
- Completed → Closed

**Purchase Order:**
- Draft → Planned → To Review → To Receive
- To Receive → To Receive and Invoice | To Invoice | Completed
- To Invoice → Completed
- Any → Rejected → Closed

**Job:**
- Draft → Planned → Ready → In Progress
- In Progress ⇄ Paused
- In Progress → Completed | Cancelled

**Quote:**
- Draft → Sent → Ordered | Partial | Lost | Cancelled | Expired

---

## Summary

This comprehensive business logic documentation provides the rules, constraints, workflows, and side effects that govern the Carbon Manufacturing ERP/MES system. Understanding these rules is essential for:

- **Developers**: Implementing features correctly and maintaining data integrity
- **QA**: Testing business logic and edge cases
- **Users**: Understanding system behavior and workflows
- **Integrators**: Building integrations that respect business rules

All modules work together to provide a complete manufacturing management solution with proper validation, automation, and traceability throughout the entire production lifecycle.
