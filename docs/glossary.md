---
title: Carbon ERP Glossary
last_updated: 2026-01-27
source_files:
  - apps/erp/app/modules/*/models.ts
  - apps/erp/app/modules/*/service.ts
  - packages/database/supabase/migrations/*.sql
  - llm/cache/*.md
  - docs/business-rules/*.md
---

This glossary defines every domain-specific term used in the Carbon ERP system, including manufacturing, accounting, inventory, quality, and business process terminology. Each term includes its definition, location in the codebase, and any synonyms or inconsistent usage to ensure consistent understanding across the system.

## Manufacturing & Production

| Term | Definition | Where It Appears | Synonyms/Related Terms | Notes |
|------|-----------|------------------|------------------------|-------|
| **MRP** | Material Requirements Planning - automatic calculation of material needs based on demand, triggered every 3 hours or manually | `production.service.ts`, edge function `/api/mrp`, cache docs | Production Planning | Core planning system integrating sales, production, and purchasing |
| **MES** | Manufacturing Execution System - real-time production tracking and execution | `/apps/mes/` application directory | Shop Floor System | Separate application from main ERP |
| **Production Job** | Manufacturing work order for producing items | `production.models.ts`, `job` table | Work Order, Manufacturing Order, Job | Links to sales orders for Make-to-Order |
| **Job Status** | State of production job | `jobStatus` enum in `production.models.ts` | Production State | Values: Draft, Planned, Ready, In Progress, Paused, Completed, Cancelled, Overdue (deprecated), Due Today (deprecated) |
| **Job Operation** | Individual step/task within a production job | `jobOperation` table, MES system | Operation, Work Step | Each operation has own status tracking |
| **Job Operation Status** | State of individual operation | `jobOperationStatus` enum | Operation State | Values: Todo, Ready, Waiting, In Progress, Paused, Done, Canceled |
| **Make Method** | Manufacturing process definition including operations and materials | `makeMethod` table in items module | Manufacturing Recipe, BOM + Operations | Auto-created for Parts and Tools |
| **Method Operation** | Specific operation within a make method | `methodOperation` table | Operation Recipe | Includes setup/labor/machine times |
| **Method Material** | Bill of Materials line - material required for make method | `methodMaterial` table | BOM Line, Material Requirement | Links to items via itemId |
| **Inside Operation** | Operation performed internally with setup/labor/machine times and rates | Quote/job operations where `operationType='Inside'` | Internal Operation | Requires work center, time standards, and rates |
| **Outside Operation** | Subcontracting operation performed by external supplier | Quote/job operations where `operationType='Outside'` | Subcontracting, External Operation | Requires supplier, minimum cost, unit cost, lead time |
| **Make-to-Order** | Manufacturing in response to specific sales order | Jobs with `salesOrderId` or `salesOrderLineId` populated | MTO | No inventory receipt on completion - ships direct |
| **Make-to-Stock** | Manufacturing for inventory replenishment | Jobs without sales order linkage | MTS | Creates inventory receipt on completion |
| **Scrap** | Waste material or rejected parts during manufacturing | Production quantities, `scrapQuantity` fields | Defective, Waste, Reject | Tracked with scrap reasons |
| **Scrap Reason** | Category explaining why material was scrapped | `scrapReason` table | Defect Type, Waste Reason | Used in production quantity tracking |
| **Work Center** | Physical location/equipment where operations are performed | `workCenter` table | Station, Machine, Equipment | Capacity and shift tracking |
| **Work Cell Type** | Classification of work center used in methods | `workCellType` in `methodOperation` | Work Type, Operation Type | Replaces specific work center in method definitions |
| **Kanban** | Visual replenishment card triggering automatic production or purchase | `kanban` table with QR codes | Lean Replenishment, Visual Signal | Supports Buy and Make systems |
| **Replenishment System** | Method of restocking inventory | `kanban.replenishmentSystem` enum | Sourcing Strategy | Values: Buy, Make, Buy and Make |
| **Setup Time** | Time required to prepare equipment before production | `methodOperation.setupHours` | Setup Hours, Changeover Time | Part of Inside Operation requirements |
| **Production Standard** | Output quantity expected per time unit | `methodOperation.productionStandard` | Cycle Time, Output Rate | Used for capacity planning |
| **Lot Size** | Manufacturing batch quantity for a part | `part.lotSize` | Batch Size, Minimum Order Quantity | Determines number of jobs created from sales order |
| **Deadline Type** | Job urgency classification | `deadlineTypes` enum | Priority Level | Values: ASAP, Hard Deadline, Soft Deadline, No Deadline |

## Accounting & Finance

| Term | Definition | Where It Appears | Synonyms/Related Terms | Notes |
|------|-----------|------------------|------------------------|-------|
| **FIFO** | First In First Out - inventory costing method | `itemCost.costingMethod` | Stock Valuation Method | Default costing method |
| **LIFO** | Last In First Out - inventory costing method | `itemCost.costingMethod` option | Stock Valuation Method | Alternative to FIFO |
| **Average Cost** | Weighted average costing method | `itemCost.costingMethod` option | Average Costing, Moving Average | Recalculated on receipt |
| **Standard Cost** | Predetermined cost for product costing | `itemCost.standardCost` | Budgeted Cost, Target Cost | Set manually, variance tracking |
| **Unit Cost** | Current calculated cost per unit | `itemCost.unitCost` | Current Cost, Item Cost | Auto-calculated based on costing method |
| **Unit Price** | Selling price per unit | Sales orders, quotes, `unitPrice` fields | Sale Price | Before discounts |
| **COGS** | Cost of Goods Sold - expense when inventory is sold | Accounting module, GL postings | Cost of Sales, Manufacturing Cost | Debit on invoice posting |
| **GL Account** | General Ledger Account for accounting entries | `glAccount` table, posting groups | Ledger Account, Account Code | Chart of accounts |
| **AP** | Accounts Payable - obligations to pay suppliers | Accounting module, purchase invoices | Payables, Vendor Payable | Credit balance |
| **AR** | Accounts Receivable - amounts owed by customers | Accounting module, sales invoices | Receivables, Customer Receivable | Debit balance |
| **Posting Group** | Classification for accounting entries | `itemPostingGroup`, supplier/customer posting groups | Posting Category | Maps to GL accounts |
| **Item Posting Group** | Mapping of items to GL accounts | `itemPostingGroupId` on items | Item GL Category | Determines inventory/COGS/adjustment accounts |
| **Discount Percent** | Percentage reduction in unit price | `quoteLinePrice.discountPercent` | Price Reduction | 0-100% range |
| **Net Price** | Final price after discount | Calculated: `unitPrice × (1 - discountPercent)` | Final Price, Invoice Price | Used in total calculations |
| **Exchange Rate** | Conversion rate between currencies | Orders, quotes, `exchangeRate` fields | Currency Conversion Rate | Defaults to 1 for same currency |
| **Conversion Factor** | Ratio between purchase UOM and inventory UOM | `purchaseOrderLine.conversionFactor` | Unit Conversion | Formula: Inventory Price = (Supplier Price × Exchange Rate) / Conversion Factor |
| **Payment Terms** | Conditions for payment | `paymentTerm` table | Payment Conditions | Types: Net, EOM, Day of Month |

## Inventory & Material Management

| Term | Definition | Where It Appears | Synonyms/Related Terms | Notes |
|------|-----------|------------------|------------------------|-------|
| **Inventory** | Stock of items at a location | `get_inventory_quantities()` function | Stock, On-Hand Inventory | Calculated from item ledger |
| **Quantity on Hand** | Current physical inventory quantity | Inventory calculations, `quantityOnHand` | Available Inventory, Stock Level | May include committed quantities |
| **Committed Quantity** | Inventory reserved for orders | Sales orders, production jobs | Reserved Quantity, Allocated Inventory | Reduces available for new orders |
| **Quantity on Sales Order** | Inventory allocated to confirmed sales orders | `quantityOnSalesOrder` function | Committed to Sales, Promised | Demand against inventory |
| **Quantity on Purchase Order** | Inventory on order from suppliers | `quantityOnPurchaseOrder` function | Incoming Stock, On Order | Supply incoming |
| **Quantity on Production Order** | Inventory allocated to planned production jobs | `quantityOnProductionOrder` function | Allocated to Manufacturing | Demand from production |
| **Quantity on Production Demand** | Material quantity needed for planned jobs | `quantityOnProductionDemand` function | Production Material Need | Components for jobs |
| **UOM** | Unit of Measure - base unit for inventory tracking | `unitOfMeasure` table, `unitOfMeasureCode` fields | Unit, Measurement Unit | Examples: EA, LB, M, GAL |
| **Inventory UOM** | Primary unit for tracking item in inventory | `inventoryUnitOfMeasureCode` | Base Unit, Stock Unit | Cannot be changed after transactions exist |
| **Purchase UOM** | Unit used when ordering from supplier | `purchaseUnitOfMeasureCode` in supplier quotes | Buying Unit, Supplier Unit | May differ from inventory UOM |
| **Material** | Raw material or component item type | Items where `type = "Material"` | Raw Material, Component, Ingredient | Used in BOM |
| **Part** | Manufactured or assembled item type | Items where `type = "Part"` | Finished Good, Product, SKU | Can have make methods |
| **Tool** | Equipment or tool item type | Items where `type = "Tool"` | Equipment, Fixture, Jig | Can have make methods |
| **Consumable** | Non-inventory item consumed in operations | Items where `type = "Consumable"` | Supplies, Expense Item | Not typically restocked |
| **Service** | Service item type | Items where `type = "Service"` | Labor, Professional Service | No inventory tracking |
| **Lot** | Batch of items produced together for traceability | Tracked entities with lot tracking | Batch, Production Batch | Grouping for quality/expiration |
| **Serial Number** | Unique identifier for individual item unit | `trackedEntity.attributes` | Serial, SN, Unique ID | One-to-one item tracking |
| **Batch Number** | Identifier for group of items produced together | `trackedEntity.attributes` | Batch, Lot Number | One-to-many item tracking |
| **Tracked Entity** | Item/batch/lot tracked through system with full lineage | `trackedEntity` table | Tracked Item, Traceable Unit | Full genealogy tracking |
| **Tracked Entity Status** | State of tracked entity | `trackedEntity.status` enum | Entity State | Values: Available, Reserved, On Hold, Consumed |
| **Tracked Activity** | Transformation/process converting inputs to outputs | `trackedActivity` table | Manufacturing Activity, Conversion | Links parent and child tracked entities |
| **Item Tracking Type** | How items are tracked | `itemTrackingType` | Tracking Method | Values: Inventory, Non-Inventory, Serial, Batch |
| **Item Ledger** | Journal of all inventory movements | `itemLedger` table | Inventory Journal, Stock Ledger | Immutable after posting |
| **Shelf** | Physical storage location subdivision | `shelf` table | Bin, Location Code, Slot | Within a location |
| **Location** | Physical facility/warehouse | `location` table | Warehouse, Facility, Storeroom | Top-level storage |
| **Warehouse** | Building/facility for storage | `warehouse` table | Distribution Center, Storage Facility | May contain multiple locations |
| **Stock Transfer** | Movement of inventory between locations | `stockTransfer` table | Transfer, Replenishment Transfer | Creates ledger entries at both locations |
| **Warehouse Transfer** | Movement between warehouse locations | `warehouseTransfer` table | Inter-warehouse Transfer | Multi-step transfer process |

## Demand & Supply Planning

| Term | Definition | Where It Appears | Synonyms/Related Terms | Notes |
|------|-----------|------------------|------------------------|-------|
| **Demand** | Quantity needed from sales orders, forecasts, or jobs | MRP module, `demandActual` | Customer Demand, Material Need | Input to MRP |
| **Supply** | Quantity available from production or purchases | MRP module, `supplyActual`, `supplyForecast` | Incoming Supply, Replenishment | Input to MRP |
| **Demand Forecast** | Predicted future material needs | Demand projections | Sales Forecast, Demand Plan | User-entered or calculated |
| **Supply Forecast** | Predicted available inventory | MRP module, `supplyForecast` | Scheduled Receipt, Incoming | From planned orders |
| **Demand Actual** | Real demand from active orders and jobs | MRP module, `demandActual` | Confirmed Demand | From sales orders and job materials |
| **Supply Actual** | Real supply from active orders | MRP module, `supplyActual` | Scheduled Supply | From POs and production jobs |
| **Safety Stock** | Minimum inventory buffer to prevent stockouts | Item planning, `safetyStock` | Buffer Stock, Min Inventory | Target minimum |
| **Reorder Point** | Quantity level triggering replenishment | Inventory calculations | Min Order Level | When to reorder |
| **Reorder Quantity** | Standard quantity to order on replenishment | Item planning, `reorderQuantity` | Order Qty, Min Order Qty | How much to reorder |

## Sales & Customer Management

| Term | Definition | Where It Appears | Synonyms/Related Terms | Notes |
|------|-----------|------------------|------------------------|-------|
| **Quote** | Sales quotation/estimate provided to customer | `quote` table, sequence `quote_id_seq` | Estimate, Quotation, Proposal | Can convert to sales order |
| **Quote Status** | State of quote | `quote.status` enum | Quotation State | Values: Draft, Sent, Ordered, Partial, Lost, Cancelled, Expired |
| **Quote Line** | Individual item line in a quote | `quoteLine` table | Quote Item, Line Item | Can have multiple quantity breaks |
| **Quote Line Status** | State of quote line | `quoteLine.status` enum | Item Status, Estimation Status | Values: Not Started, In Progress, Complete, No Quote |
| **Quote Material** | BOM/components for quote line item | `quoteMaterial` table | Quote BOM, Components | Part of make method |
| **Quote Operation** | Manufacturing or subcontracting operation in quote | `quoteOperation` table | Quote Work Step, Estimated Operation | Inside or Outside type |
| **Sales Order** | Customer purchase order accepted by company | `salesOrder` table, sequence `salesOrder_id_seq` | Customer Order, SO | Created from quote or direct |
| **Sales Order Status** | State of sales order | `salesOrder.status` enum | Order State | Values: Draft, Needs Approval, To Ship and Invoice, To Ship, To Invoice, Completed, Cancelled, Closed |
| **Sales Order Line** | Individual item line in sales order | `salesOrderLine` table | Order Item, SO Line | Links to shipment and invoice lines |
| **Line Type** | Category of line item | Sales/purchase line types | Item Category, Line Classification | Values: Part, Material, Tool, Consumable, Comment, Fixed Asset, Service |
| **Drop Shipment** | Supplier ships directly to customer | `salesOrderLine.dropShipment` flag on PO | Direct Ship, Pass-through | No warehouse receipt |
| **RFQ** | Request for Quote from customer | `salesRfq` table | Customer RFQ, Quote Request | Precedes quote creation |
| **Opportunity** | Potential sales deal | `opportunity` table | Deal, Sales Prospect | CRM tracking |
| **Customer Portal** | Customer self-service access | Sales portal system, external links | Customer Account Portal, Self-service | View quotes and orders |
| **External Link** | Publicly shareable link for quote/document | External sharing system | Shared Link, Public URL | Expires based on quote expiration |
| **Customer** | Individual or company purchasing goods/services | `customer` table | Account, Buyer, Client | Core master data |
| **Customer Type** | Category of customer | `customerType` table | Customer Classification | Examples: Distributor, Retailer |
| **Customer Status** | Current status of customer | `customerStatus` table | Account Status | Active, Inactive, etc. |
| **Customer Location** | Delivery/billing location for customer | `customerLocation` table | Ship-to Address, Bill-to Address | Multiple per customer |
| **Customer Contact** | Contact person at customer location | `customerContact` table | Contact Person, Account Contact | Email and phone |
| **Account Manager** | Assigned sales person responsible for customer | `accountManagerId` on customer/supplier | Sales Rep, Account Rep | Employee reference |
| **Shipping Term** | Delivery terms | `shippingTerm` table | Incoterms, Delivery Term | FOB, CIF, etc. |
| **Shipping Method** | Transportation method | `shippingMethod` table | Delivery Method, Carrier | Ground, Air, etc. |
| **Shipping Cost** | Cost of delivery to customer | Orders, quotes, invoices | Freight, Delivery Cost, Shipping Fee | Per order or line |
| **Payment Term** | Conditions for payment | `paymentTerm` table | Credit Term, Invoice Term | Net 30, EOM+15, etc. |
| **Tax Percent** | Sales tax percentage | Order/quote lines, `taxPercent` | Tax Rate, VAT Rate | 0-1 range (0-100%) |
| **Tax ID** | Tax identification number | Customer/supplier `taxId` | Tax Number, VAT ID, TIN | For compliance |
| **Currency Code** | Currency for transaction | Orders, quotes, `currencyCode` | Currency, Money Code | ISO currency code |

## Purchasing & Supplier Management

| Term | Definition | Where It Appears | Synonyms/Related Terms | Notes |
|------|-----------|------------------|------------------------|-------|
| **Purchase Order** | Order placed with supplier for goods/services | `purchaseOrder` table, sequence `purchaseOrder_id_seq` | PO, Supplier Order | Triggers MRP on Planned status |
| **Purchase Order Status** | State of purchase order | `purchaseOrder.status` enum | Order State | Values: Draft, Planned, To Review, To Receive, To Receive and Invoice, To Invoice, Completed, Rejected, Closed |
| **Purchase Order Line** | Individual line item in purchase order | `purchaseOrderLine` table | PO Line, Order Item | Links to receipt and invoice lines |
| **Supplier Quote** | Pricing/terms quote from supplier | `supplierQuote` table, sequence `supplierQuote_id_seq` | Vendor Quote, RFQ Response | Response to RFQ |
| **Supplier Quote Status** | State of supplier quote | `supplierQuote.status` enum | Quote State | Values: Draft, Active, Expired, Declined, Cancelled |
| **Supplier Quote Line** | Individual item line in supplier quote | `supplierQuoteLine` table | Quote Item, Quote Line | Includes conversion factor |
| **Purchase Invoice** | Invoice received from supplier | `purchaseInvoice` table, sequence `purchaseInvoice_id_seq` | Vendor Invoice, AP Invoice | Three-way match with PO and receipt |
| **Purchase Invoice Status** | State of purchase invoice | `purchaseInvoice.status` enum | Invoice State | Values: Draft, Open, Partially Paid, Paid, Overdue, Cancelled |
| **Purchase Invoice Line** | Individual line item in purchase invoice | `purchaseInvoiceLine` table | Invoice Item, Invoice Line | Matches to PO line |
| **Supplier** | Vendor providing goods/services | `supplier` table | Vendor, Supplier Account | Core master data |
| **Supplier Type** | Category of supplier | `supplierType` table | Vendor Category | Classification |
| **Supplier Status** | Current status of supplier | `supplierStatus` table | Account Status | Active, Inactive, etc. |
| **Supplier Location** | Delivery/contact location for supplier | `supplierLocation` table | Warehouse Location, Branch | Multiple per supplier |
| **Supplier Contact** | Contact person at supplier | `supplierContact` table | Contact Person | Email and phone |
| **Supplier Process** | Specific process/capability offered by supplier | `supplierProcess` table | Manufacturing Process, Service Type | For outside operations |
| **Supplier Part** | Supplier's part number and specifications | Buy methods or supplier parts | Vendor SKU, Supplier SKU | May differ from company part number |
| **Buy Method** | Supplier sourcing option for an item | `buyMethod` table | Source, Supplier Option | Links item to supplier |

## Quality & Compliance

| Term | Definition | Where It Appears | Synonyms/Related Terms | Notes |
|------|-----------|------------------|------------------------|-------|
| **Non-Conformance** | Quality issue/defect requiring resolution | `nonConformance` table (renamed from `issue`) | NCR, Issue, Quality Issue, Defect | **Inconsistent naming**: Table is `nonConformance` but often called "Issue" in UI |
| **Issue** | Quality problem tracked through resolution | UI references, same as Non-Conformance | Non-conformance, Quality Issue | **Synonym for Non-Conformance** - inconsistent usage |
| **Non-Conformance Status** | State of quality issue | `nonConformance.status` enum | Issue State | Values: Registered, In Progress, Closed, Reopened |
| **Disposition** | Decision on how to handle non-conforming material | `nonConformance.disposition` enum | NCR Decision | Values: Pending, Rework, Scrap, Use As Is |
| **Investigation Task** | Quality investigation required | `nonConformanceInvestigationTask` table | Root Cause Analysis, Investigation | Assigned to users |
| **Investigation Type** | Category of investigation | `investigationType` table | Analysis Type | Examples: Root Cause, 5-Why |
| **Action Task** | Corrective/preventive action required | `nonConformanceActionTask` table | Corrective Action, Preventive Action | Tracked to completion |
| **Required Action** | Category of action needed | `requiredAction` table | Action Type | Examples: Corrective, Preventive |
| **Approval Task** | Review/approval needed for non-conformance | `nonConformanceApprovalTask` table | MRB Approval, Sign-off | May require MRB |
| **Approval Requirement** | Type of approval needed | `approvalRequirement` table | Approval Type, Sign-off Type | Examples: MRB, Manager |
| **MRB** | Material Review Board - approval group for quality decisions | Approval tasks, quality workflow | Material Review, Quality Board | Required for critical NCRs |
| **Gauge** | Measurement instrument used for inspection | `gauge` table | Measuring Tool, Instrument | Requires calibration |
| **Gauge Type** | Classification of gauge | `gaugeType` table | Instrument Type | Examples: Caliper, Micrometer |
| **Gauge Role** | Purpose of gauge | Gauge classification enum | Gauge Classification | Values: Reference, Process, Test |
| **Gauge Status** | State of gauge | `gauge.status` enum | Status | Values: Active, Inactive |
| **Calibration** | Verification of gauge accuracy against standard | `gaugeCalibrationRecord` table | Gauge Verification, Compliance Check | Scheduled by interval |
| **Calibration Status** | Result of calibration | `gaugeCalibrationRecord.status` enum | Verification Result | Values: Pass, Fail, In Progress |
| **Calibration Interval** | Frequency of required calibration | `calibrationIntervalInMonths` | Calibration Due Date, Cycle | In months |
| **FMEA** | Failure Mode and Effects Analysis - risk management tool | Quality system (documented but not implemented) | Risk Analysis, Failure Analysis | Standard quality tool |
| **Risk Register** | Tracking of identified risks and mitigation | `riskRegister` table | Risk Log, Risk List | Links to multiple entity types |
| **Risk Source** | Origin of risk | `riskSource` enum | Risk Category, Risk Type | Values: GENERAL, ITEM, QUOTE_LINE, JOB, WORK_CENTER, SUPPLIER, CUSTOMER |
| **Risk Status** | State of risk | `riskStatus` enum | Risk State | Values: OPEN, IN_REVIEW, MITIGATING, CLOSED, ACCEPTED |
| **Severity** | Impact level of risk | Risk Register, 1-5 scale | Risk Impact, Magnitude | Multiplies with Likelihood |
| **Likelihood** | Probability of risk occurring | Risk Register, 1-5 scale | Probability, Chance | Multiplies with Severity |
| **Risk Score** | Calculated value: Severity × Likelihood | `riskRegister.score` | Risk Priority, Risk Rating | Determines priority |

## Receiving & Shipping

| Term | Definition | Where It Appears | Synonyms/Related Terms | Notes |
|------|-----------|------------------|------------------------|-------|
| **Receipt** | Receiving of goods from supplier | `receipt` table, sequence `receipt_id_seq` | Goods Receipt, PO Receipt | Creates item ledger entries |
| **Receipt Status** | State of receipt | `receipt.status` enum | Receiving State | Values: Draft, Pending, Posted |
| **Receipt Line** | Individual item line in receipt | `receiptLine` table | Received Item, Receipt Item | Links to PO line |
| **Shipment** | Delivery of goods to customer | `shipment` table, sequence `shipment_id_seq` | Order Shipment, Delivery | Creates item ledger entries |
| **Shipment Status** | State of shipment | `shipment.status` enum | Shipping State | Values: Draft, Pending, Shipped, Cancelled, Delivered |
| **Shipment Line** | Individual item line in shipment | `shipmentLine` table | Shipped Item, Order Item | Links to SO line |
| **Tracked Entity Creation** | Creation of traceable unit during receipt/shipment | Traceability module | Traced Item, Batch/Serial | Auto-created for tracked items |

## Technical & System Terms

| Term | Definition | Where It Appears | Synonyms/Related Terms | Notes |
|------|-----------|------------------|------------------------|-------|
| **xid()** | PostgreSQL function generating 20-char ordered unique IDs | Database migrations, primary keys | xid ID, Custom UUID, Ordered UUID | Format: `DEFAULT xid()` |
| **RLS** | Row-Level Security - PostgreSQL policy for multi-tenancy | Database tables, Supabase policies | Row Security, Data Isolation | Ensures company data isolation |
| **Company ID** | Tenant identifier for data isolation | All tables, `companyId` field | Tenant ID, Organization ID | Part of composite primary key |
| **Readable ID** | Human-readable identifier for documents | Items, orders, `readableId` | Human ID, Document ID, Sequence | Generated from sequences |
| **Readable ID with Revision** | Human-readable ID including revision | Items, `readableIdWithRevision` generated | Item ID with Version | Format: `{readableId}-{revision}` |
| **Sequence** | Database sequence for auto-generating readable IDs | Quote, PO, Sales Order sequences | ID Sequence, Auto-increment | PostgreSQL sequence objects |
| **Revision** | Version of an item | Items module, `item.revision` | Item Version, ECN | Default '0', others like 'A', 'B' |
| **Audit Trail** | Tracking of changes | All business tables | Change History, User Attribution | Fields: createdBy, createdAt, updatedBy, updatedAt |
| **Created By** | User who created the record | All tables, `createdBy` | Author, Creator | User ID reference |
| **Updated By** | User who last modified the record | All tables, `updatedBy` | Last Modified By, Modifier | User ID reference |
| **Custom Fields** | Extensible JSONB field for custom data | Most tables, `customFields` JSONB | Additional Fields, Custom Data | Flexible schema extension |
| **Tags** | Array of text labels for categorization | Items, customers, suppliers, `tags` TEXT[] | Labels, Keywords, Categories | Full-text searchable |
| **Primary Key Composite** | Multi-column primary key pattern | Business tables | Composite PK | Pattern: `(id, companyId)` |
| **Foreign Key** | Reference to another table | Database relationships | FK, Relationship | Enforces referential integrity |
| **Edge Function** | Serverless function at database edge | MRP system, Supabase/Vercel functions | Serverless Function | TypeScript functions |
| **Service Role** | Database access with elevated privileges | Service operations, backend | Admin Role, Backend Access | Bypasses RLS |

## Business Process Terms

| Term | Definition | Where It Appears | Synonyms/Related Terms | Notes |
|------|-----------|------------------|------------------------|-------|
| **Bill of Materials** | Complete list of materials and components | Make methods, `methodMaterial` records | BOM, Component List | **Inconsistency**: Sometimes called "Method Materials" |
| **Approval Workflow** | Process requiring authorization before action | Quality approvals, purchase approvals | Sign-off, Review Process | Multi-step with tasks |
| **Estimation** | Process of determining cost/time for quote | Quotes, quote lines | Quoting, Cost Estimation | Inside and outside operations |
| **Finalization** | Process of completing a quote | Sales quotes, `finalize` action | Quote Close-out | Status changes to Sent |
| **Digital Acceptance** | Customer acceptance of quote electronically | Quotes, external portal | E-signature, Digital Sign-off | Tracks acceptedBy and acceptedByEmail |
| **Conversion** | Transforming one document type to another | Sales documents, `convert` edge function | Convert to Sales Order | Quote → Sales Order |
| **Fulfillment** | Process of delivering ordered items | Sales orders, shipment | Order Fulfillment, Delivery | Shipment → Invoice → Payment |
| **Completion** | Final state of a document/order | Jobs, orders, invoices | Finished, Closed Out | Terminal status |
| **Three-Way Match** | Validation of PO, Receipt, and Invoice | Purchase invoice posting | PO-Receipt-Invoice Match | Ensures accuracy before payment |

## Inconsistent Terminology

> **Important**: These terms are used inconsistently across the codebase and should be standardized.

| Primary Term | Inconsistent Usage | Locations | Recommendation |
|--------------|-------------------|-----------|----------------|
| **Non-Conformance** | "Issue" in UI, "nonConformance" in database | UI components vs database table | Standardize on "Non-Conformance" for consistency |
| **Bill of Materials** | "Method Materials", "BOM", "Components" | Various modules | Use "BOM" as abbreviation, "Method Materials" for data model |
| **Job** | "Production Job", "Work Order", "Manufacturing Order" | Production module | Standardize on "Job" (current usage) |
| **Quote** | "Quotation", "Estimate", "Proposal" | Sales module | Standardize on "Quote" (current database name) |
| **UOM** | "Unit of Measure", "Unit", "Measurement Unit" | Throughout system | Use "UOM" as abbreviation, "Unit of Measure" in full |
| **Readable ID** | "Human ID", "Document ID", "Sequence ID" | Items and documents | Standardize on "Readable ID" |
| **Lot** | "Batch", "Batch Number", "Lot Number" | Traceability | Use "Batch" for batch tracking, "Lot" for production lots |
| **Work Center** | "Station", "Machine", "Equipment" | Resources module | Standardize on "Work Center" |
| **Supplier** | "Vendor" (sometimes) | Purchasing module | Standardize on "Supplier" (current database name) |
| **Customer** | "Account", "Buyer", "Client" | Sales module | Standardize on "Customer" (current database name) |

## Module Prefixes

These prefixes appear consistently across table and field names:

| Prefix | Meaning | Example | Usage |
|--------|---------|---------|-------|
| **item-** | Item/inventory related | `itemLedger`, `itemCost` | Inventory domain |
| **quote-** | Sales quote related | `quoteLine`, `quoteOperation` | Sales quoting |
| **salesOrder-** | Sales order related | `salesOrderLine`, `salesOrderPayment` | Sales fulfillment |
| **purchaseOrder-** | Purchase order related | `purchaseOrderLine`, `purchaseOrderDelivery` | Procurement |
| **job-** | Production job related | `jobOperation`, `jobMaterial` | Manufacturing |
| **method-** | Make/buy method related | `methodOperation`, `methodMaterial` | Item methods |
| **nonConformance-** | Quality issue related | `nonConformanceTask`, `nonConformanceApproval` | Quality management |
| **tracked-** | Traceability related | `trackedEntity`, `trackedActivity` | Serial/batch tracking |
| **gauge-** | Calibration related | `gaugeCalibration`, `gaugeType` | Quality equipment |

## Source References

- `apps/erp/app/modules/*/models.ts` - Zod validators and type definitions for all modules
- `apps/erp/app/modules/*/service.ts` - Business logic implementations
- `packages/database/supabase/migrations/*.sql` - Database schema definitions with table and field names
- `llm/cache/*.md` - System architecture and component documentation
- `docs/business-rules/*.md` - Business rules with terminology definitions
- `docs/workflows/*.md` - User journey workflows with domain terminology
- `docs/user-stories/*.md` - User stories with acceptance criteria and field names
