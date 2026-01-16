# Carbon Manufacturing System - Database Schema Documentation

## Overview

This document provides a comprehensive overview of the Carbon Manufacturing ERP/MES database schema, including all tables, relationships, and entity diagrams organized by functional module.

## Database Technology

- **Database**: PostgreSQL (via Supabase)
- **ID Generation**: Custom `xid()` function - 20-character ordered unique IDs
- **Multi-Tenancy**: Company-based isolation with Row-Level Security (RLS)
- **Real-time**: Supabase real-time subscriptions enabled on key tables
- **Type Safety**: Full TypeScript types generated from database schema

## Core Patterns

### Multi-Tenancy Pattern
All business tables follow this structure:
```sql
CREATE TABLE "tableName" (
  "id" TEXT NOT NULL DEFAULT xid(),
  "companyId" TEXT NOT NULL REFERENCES "company"("id") ON DELETE CASCADE,
  -- other fields --
  PRIMARY KEY ("id", "companyId")
);
CREATE INDEX "tableName_companyId_idx" ON "tableName"("companyId");
```

### Audit Trail Pattern
Standard audit fields on most tables:
```sql
"createdBy" TEXT NOT NULL REFERENCES "user"("id"),
"createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
"updatedBy" TEXT REFERENCES "user"("id"),
"updatedAt" TIMESTAMP WITH TIME ZONE
```

### Extensibility Pattern
```sql
"customFields" JSONB,
"tags" TEXT[]
```

---

## Entity Relationship Diagrams by Module

### 1. Core System & Authentication

```mermaid
erDiagram
    company ||--o{ user : "has"
    company ||--o{ employee : "has"
    company ||--o{ location : "has"
    company ||--o{ currency : "defines"

    user ||--o{ userToCompany : "belongs to"
    company ||--o{ userToCompany : "has"
    user ||--o{ userPermission : "has"
    user ||--o{ group : "belongs to"

    employee ||--|| employeeType : "has"
    employeeType ||--o{ employeeTypePermission : "has"

    location ||--o{ warehouse : "contains"
    location ||--o{ department : "contains"
    location ||--o{ shift : "operates"

    company {
        text id PK
        text name
        text taxId
        text logo
        jsonb contact
    }

    user {
        text id PK
        text email
        text firstName
        text lastName
        text fullName
        text avatarUrl
        boolean active
    }

    employee {
        text id PK
        text companyId FK
        text employeeTypeId FK
        text userId FK
    }

    location {
        text id PK
        text companyId FK
        text name
        text timezone
        decimal latitude
        decimal longitude
    }
```

### 2. Items & Parts Module

```mermaid
erDiagram
    item ||--o| part : "is"
    item ||--o| material : "is"
    item ||--o| tool : "is"
    item ||--o| consumable : "is"

    item ||--|| itemCost : "has"
    item ||--|| itemReplenishment : "has"
    item ||--|| itemUnitSalePrice : "has"
    item ||--o{ itemPlanning : "has per location"
    item ||--o{ pickMethod : "has per location"

    item ||--o{ makeMethod : "has manufacturing method"
    makeMethod ||--o{ methodOperation : "has operations"
    makeMethod ||--o{ methodMaterial : "has materials"

    item ||--o{ buyMethod : "sourced from suppliers"
    supplier ||--o{ buyMethod : "supplies items"

    itemCost ||--|| itemPostingGroup : "belongs to"

    item {
        text id PK
        text readableId
        text revision
        text companyId FK
        text name
        text description
        enum type
        enum replenishmentSystem
        enum itemTrackingType
        text unitOfMeasureCode
        text thumbnailUrl
    }

    itemCost {
        text itemId FK
        text companyId FK
        enum costingMethod
        numeric standardCost
        numeric unitCost
        text itemPostingGroupId FK
    }

    makeMethod {
        text id PK
        text itemId FK
        text companyId FK
        int version
    }

    methodOperation {
        text id PK
        text makeMethodId FK
        int order
        text workCellTypeId FK
        numeric setupHours
        numeric productionStandard
    }

    methodMaterial {
        text id PK
        text makeMethodId FK
        text itemId FK
        enum methodType
        numeric quantity
        text unitOfMeasureCode
    }
```

### 3. Sales Module

```mermaid
erDiagram
    customer ||--o{ customerLocation : "has"
    customer ||--o{ customerContact : "has"
    customer ||--|| customerPayment : "has settings"
    customer ||--|| customerShipping : "has settings"
    customer ||--o{ customerAccount : "has portal access"

    customer ||--o{ opportunity : "has"
    customer ||--o{ salesRfq : "requests quotes"
    customer ||--o{ quote : "receives"
    customer ||--o{ salesOrder : "places"

    salesRfq ||--o{ salesRfqLine : "contains"
    salesRfq ||--o{ quote : "generates"

    quote ||--o{ quoteLine : "contains"
    quoteLine ||--o{ quoteMaterial : "has BOM"
    quoteLine ||--o{ quoteOperation : "has operations"
    quoteLine ||--o{ quoteMakeMethod : "has method tree"

    quote ||--o{ salesOrder : "converts to"
    salesOrder ||--o{ salesOrderLine : "contains"
    salesOrder ||--o{ shipment : "ships via"

    customer {
        text id PK
        text companyId FK
        text name
        text customerTypeId FK
        text customerStatusId FK
        text accountManagerId FK
        text currencyCode
    }

    quote {
        text id PK
        text quoteId
        int revisionId
        text companyId FK
        text customerId FK
        enum status
        date expirationDate
        text assignee
    }

    quoteLine {
        text id PK
        text quoteId FK
        text companyId FK
        text itemId FK
        enum status
        enum methodType
        text description
        numeric[] quantities
    }

    salesOrder {
        text id PK
        text salesOrderId
        int revisionId
        text companyId FK
        text customerId FK
        enum status
        date orderDate
        text currencyCode
    }

    salesOrderLine {
        text id PK
        text salesOrderId FK
        enum lineType
        text itemId FK
        numeric saleQuantity
        numeric unitPrice
        text locationId FK
    }
```

### 4. Purchasing Module

```mermaid
erDiagram
    supplier ||--o{ supplierLocation : "has"
    supplier ||--o{ supplierContact : "has"
    supplier ||--|| supplierPayment : "has settings"
    supplier ||--|| supplierShipping : "has settings"
    supplier ||--o{ supplierAccount : "has portal access"

    supplier ||--o{ buyMethod : "supplies items"
    item ||--o{ buyMethod : "sourced from"

    supplier ||--o{ supplierQuote : "provides"
    supplierQuote ||--o{ supplierQuoteLine : "contains"

    supplier ||--o{ purchaseOrder : "receives"
    purchaseOrder ||--o{ purchaseOrderLine : "contains"
    purchaseOrder ||--o{ receipt : "received via"

    supplier {
        text id PK
        text companyId FK
        text name
        text supplierTypeId FK
        text supplierStatusId FK
        text accountManagerId FK
        text currencyCode
    }

    buyMethod {
        text id PK
        text itemId FK
        text supplierId FK
        text companyId FK
        text supplierPartId
        numeric minimumOrderQuantity
        numeric conversionFactor
    }

    purchaseOrder {
        text id PK
        text purchaseOrderId
        int revisionId
        text companyId FK
        text supplierId FK
        enum type
        enum status
        date orderDate
    }

    purchaseOrderLine {
        text id PK
        text purchaseOrderId FK
        enum lineType
        text itemId FK
        numeric purchaseQuantity
        numeric unitPrice
        text locationId FK
    }

    receipt {
        text id PK
        text receiptId
        text companyId FK
        text locationId FK
        enum sourceDocument
        text sourceDocumentId
        enum status
    }
```

### 5. Production/MES Module

```mermaid
erDiagram
    job ||--o{ jobOperation : "has"
    job ||--o{ jobMaterial : "requires"
    job ||--|| salesOrderLine : "fulfills"
    job ||--|| item : "produces"

    jobOperation ||--o{ jobOperationAssignment : "assigned to"
    jobOperation ||--o{ jobOperationStep : "has steps"
    jobOperation ||--o{ productionEvent : "tracked by"

    jobOperation ||--|| process : "uses"
    jobOperation ||--|| workCenter : "performed at"

    employee ||--o{ jobOperationAssignment : "assigned"

    workCenter ||--|| workCellType : "is type"
    workCenter ||--|| location : "located at"
    workCenter ||--|| department : "belongs to"

    process ||--o{ processParameter : "has parameters"

    job {
        text id PK
        text jobId
        text companyId FK
        text itemId FK
        text customerId FK
        text locationId FK
        enum status
        enum deadlineType
        date dueDate
        numeric quantity
        numeric quantityComplete
    }

    jobOperation {
        text id PK
        text jobId FK
        text companyId FK
        int order
        text processId FK
        text workCenterId FK
        numeric setupTime
        numeric laborTime
        numeric machineTime
        enum operationOrder
    }

    jobMaterial {
        text id PK
        text jobId FK
        text itemId FK
        enum methodType
        numeric quantity
        text jobOperationId FK
    }

    productionEvent {
        text id PK
        text jobOperationId FK
        text employeeId FK
        timestamp startTime
        timestamp endTime
        text eventType
    }
```

### 6. Inventory Module

```mermaid
erDiagram
    warehouse ||--o{ shelf : "contains"
    location ||--o{ warehouse : "has"

    receipt ||--o{ receiptLine : "contains"
    shipment ||--o{ shipmentLine : "contains"

    receiptLine ||--|| item : "receives"
    shipmentLine ||--|| item : "ships"

    item ||--o{ itemLedger : "tracked in"
    itemLedger ||--|| location : "at location"
    itemLedger ||--o| shelf : "on shelf"
    itemLedger ||--o| trackedEntity : "tracked by"

    itemLedger ||--o{ costLedger : "valued by"

    trackedEntity ||--o{ serialNumber : "is serial"
    trackedEntity ||--o{ batchNumber : "is batch"

    warehouse {
        text id PK
        text companyId FK
        text name
        text locationId FK
        boolean requiresPick
        boolean requiresReceive
        boolean requiresShipment
    }

    itemLedger {
        text id PK
        int entryNumber
        text companyId FK
        date postingDate
        enum entryType
        enum documentType
        text documentId
        text itemId FK
        text locationId FK
        numeric quantity
    }

    trackedEntity {
        text id PK
        text companyId FK
        text itemId FK
        numeric quantity
        enum status
        jsonb attributes
        text sourceDocument
        text sourceDocumentId
    }

    serialNumber {
        text id PK
        text serialNumber
        text itemId FK
        text locationId FK
        text shelfId FK
    }
```

### 7. Quality Module

```mermaid
erDiagram
    nonConformance ||--o{ investigationTask : "has"
    nonConformance ||--o{ actionTask : "has"
    nonConformance ||--o{ approvalTask : "has"

    nonConformance ||--o{ ncrReviewer : "has reviewers"

    qualityDocument ||--o{ qualityDocumentVersion : "has versions"
    qualityDocumentVersion ||--o{ procedure : "defines"
    procedure ||--o{ procedureStep : "has steps"

    gauge ||--o{ gaugeCalibration : "has calibrations"
    gaugeCalibration ||--o{ gaugeCalibrationRecord : "recorded in"

    nonConformance {
        text id PK
        text companyId FK
        text name
        enum priority
        enum source
        enum status
        text locationId FK
        date openDate
        date closeDate
        text description
    }

    investigationTask {
        text id PK
        text nonConformanceId FK
        text companyId FK
        enum status
        text investigationTypeId FK
        text assignee
    }

    actionTask {
        text id PK
        text nonConformanceId FK
        text companyId FK
        enum status
        text actionTypeId FK
        text assignee
    }

    gauge {
        text id PK
        text companyId FK
        text gaugeType
        enum role
        int calibrationInterval
        date lastCalibrationDate
        date nextCalibrationDate
    }
```

### 8. Maintenance Module

```mermaid
erDiagram
    workCenter ||--o{ maintenanceDispatch : "has"
    workCenter ||--o{ maintenanceSchedule : "has schedule"

    maintenanceSchedule ||--o{ maintenanceScheduleItem : "requires items"
    maintenanceSchedule ||--o{ maintenanceDispatch : "generates"

    maintenanceDispatch ||--o{ maintenanceEvent : "tracked by"
    maintenanceDispatch ||--o{ maintenanceItem : "consumes"

    employee ||--o{ maintenanceEvent : "performs"

    maintenanceDispatch {
        text id PK
        text maintenanceDispatchId
        text companyId FK
        text content
        enum status
        enum priority
        enum source
        enum severity
        text workCenterId FK
        timestamp plannedStartTime
    }

    maintenanceSchedule {
        text id PK
        text companyId FK
        text name
        text workCenterId FK
        enum frequency
        enum priority
        numeric estimatedDuration
        timestamp nextDueAt
    }

    maintenanceEvent {
        text id PK
        text maintenanceDispatchId FK
        text employeeId FK
        text workCenterId FK
        timestamp startTime
        timestamp endTime
        text notes
    }
```

### 9. Accounting Module

```mermaid
erDiagram
    accountCategory ||--o{ accountSubcategory : "has"
    accountSubcategory ||--o{ account : "contains"

    account ||--o{ journalLine : "posted to"
    journal ||--o{ journalLine : "contains"

    accountingPeriod ||--o{ journal : "contains"

    itemLedger ||--o{ costLedger : "valued by"
    costLedger ||--|| account : "posts to"

    supplier ||--o{ supplierLedger : "has entries"
    customer ||--o{ customerLedger : "has entries"

    account {
        text number PK
        text companyId FK
        text name
        enum type
        enum class
        enum incomeBalance
        text accountCategoryId FK
        boolean directPosting
    }

    journal {
        text id PK
        text companyId FK
        text description
        text accountingPeriodId FK
        date postingDate
    }

    journalLine {
        text id PK
        text journalId FK
        text accountNumber FK
        text description
        numeric amount
        enum documentType
        text documentId
    }

    costLedger {
        text id PK
        text companyId FK
        enum itemLedgerType
        enum costLedgerType
        numeric cost
        numeric costPostedToGL
        text itemId FK
    }
```

### 10. Resources Module

```mermaid
erDiagram
    department ||--o{ department : "has sub-departments"
    department ||--o{ workCell : "contains"

    workCellType ||--o{ workCell : "defines"
    workCell ||--o{ equipment : "has"

    location ||--o{ shift : "operates"
    shift ||--o{ employeeShift : "assigned to"
    employee ||--o{ employeeShift : "works"

    employee ||--|| employeeJob : "has job details"
    employeeJob ||--|| department : "in department"
    employeeJob ||--|| workCell : "assigned to"

    employee ||--o{ employeeAbility : "has skills"
    ability ||--o{ employeeAbility : "possessed by"

    crew ||--o{ employee : "contains"
    crew ||--|| workCell : "assigned to"

    department {
        text id PK
        text companyId FK
        text name
        text parentDepartmentId FK
    }

    workCellType {
        text id PK
        text companyId FK
        text name
        text requiredAbility
        numeric quotingRate
        numeric laborRate
        numeric overheadRate
    }

    workCell {
        text id PK
        text companyId FK
        text name
        text departmentId FK
        text locationId FK
        text workCellTypeId FK
    }

    shift {
        text id PK
        text companyId FK
        text name
        time startTime
        time endTime
        text locationId FK
        boolean monday
        boolean tuesday
        boolean wednesday
        boolean thursday
        boolean friday
        boolean saturday
        boolean sunday
    }
```

---

## Key Relationships Summary

### Item/Part Hierarchy
- `item` (master) → `part`, `material`, `tool`, `consumable` (type-specific data)
- `item` → `itemCost`, `itemReplenishment`, `itemUnitSalePrice` (1:1)
- `item` → `itemPlanning` (1:many per location)
- `item` → `makeMethod` → `methodOperation`, `methodMaterial` (manufacturing BOM)
- `item` → `buyMethod` → `supplier` (purchasing)

### Sales Flow
- `customer` → `opportunity` → `salesRfq` → `quote` → `salesOrder` → `shipment`
- `quote` → `quoteLine` → `quoteMaterial`, `quoteOperation`, `quoteMakeMethod`
- `salesOrder` → `salesOrderLine` → `job` (production)

### Purchasing Flow
- `supplier` → `buyMethod` (item sourcing)
- `supplier` → `purchaseOrder` → `purchaseOrderLine` → `receipt`

### Production Flow
- `job` → `jobOperation` → `jobMaterial`
- `jobOperation` → `process`, `workCenter`
- `jobOperation` → `productionEvent` (MES tracking)

### Inventory Flow
- `receipt`, `shipment` → `itemLedger` (quantity tracking)
- `itemLedger` → `costLedger` (valuation)
- `itemLedger` → `trackedEntity` → `serialNumber`, `batchNumber`

### Location Hierarchy
- `company` → `location` → `warehouse` → `shelf`
- `location` → `department` → `workCell`
- `location` → `shift`

---

## Database Functions & Triggers

### Custom Functions
- `xid()` - Generate ordered 20-character unique IDs
- `has_role()` - Check user role in company
- `has_company_permission()` - Check user permission
- `get_companies_with_employee_permission()` - Get accessible companies for user

### Key Triggers
- Auto-create related records on item creation (cost, replenishment, pricing)
- Auto-create makeMethod for parts/tools
- Update search index on record changes
- Audit trail updates (updatedBy, updatedAt)

---

## Row-Level Security (RLS)

All business tables implement RLS policies:
- **SELECT**: Users can view records in companies they have permission to
- **INSERT**: Users can create records in companies they have employee permission
- **UPDATE**: Users can update records they have permission for
- **DELETE**: Users can delete records they have permission for

Policy naming convention (2025+):
- `"SELECT"` - View policy
- `"INSERT"` - Create policy
- `"UPDATE"` - Update policy
- `"DELETE"` - Delete policy

---

## Views

Major aggregated views with proper RLS:
- `parts` - Items with part details
- `suppliers` - Suppliers with type, status, counts
- `customers` - Customers with type, status, counts
- `quotes` - Quotes with customer, assignee details
- `salesOrders` - Sales orders with customer, status
- `jobs` - Jobs with item, customer, operation counts
- `itemQuantities` - Current inventory by item/location
- `itemQuantitiesByTrackingId` - Inventory by serial/batch

---

## Realtime-Enabled Tables

Tables with Supabase realtime enabled:
- `item`
- `part`
- `journal`
- `receipt`
- `salesOrderLine`
- `job`
- `productionEvent`

---

## Migration Conventions

### File Naming
Format: `YYYYMMDDHHMMSS_description.sql`

### Migration Commands
```bash
# Create new migration
npm run db:migrate <name-of-migration>

# Apply migrations
npm run db:push
```

### Best Practices
- Always include RLS policies
- Use composite primary keys for multi-tenant tables
- Include indexes on foreign keys and companyId
- Use ON DELETE CASCADE for child records
- Use ON DELETE SET NULL for optional relationships
