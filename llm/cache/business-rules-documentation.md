# Business Rules Documentation

Last updated: 2026-01-27

## Overview

The `/docs/business-rules/` directory contains comprehensive business rules documentation for Carbon ERP features. Each file documents permissions, validation logic, state transitions, calculations, limits, and conditional logic with actual code snippets as evidence.

## Available Documentation Files

### `/docs/business-rules/production-jobs.md`
Comprehensive business rules for Production Job management including:
- **Permissions**: `production.view`, `production.create`, `production.update` with employee role requirement
- **Status Workflow**: Draft → Planned → Ready → In Progress → Paused → Completed → Cancelled
- **MRP Integration**: Automatically triggered on "Planned" or "Ready" status
- **Manufacturing Blocked Check**: Validates item not blocked before transitioning to "Ready"
- **Make-to-Order vs Make-to-Stock**: Different completion logic based on sales order linkage
- **Validation Rules**:
  - Due date required for "Hard Deadline" and "Soft Deadline" types
  - Inside operations require setup/labor/machine times and rates
  - Outside operations require minimum cost, unit cost, lead time
- **Calculations**: Job priority, bulk job quantity distribution, start date calculation
- **Source**: `apps/erp/app/modules/production/production.models.ts`, `production.service.ts`, route files

### `/docs/business-rules/quotes.md`
Comprehensive business rules for Quote management including:
- **Permissions**: `sales.view`, `sales.create`, `sales.update`, `sales.delete` with RLS for customers
- **Quote Statuses**: Draft → Sent → Ordered/Partial/Lost/Cancelled/Expired
- **Quote Line Statuses**: Not Started → In Progress → Complete (or No Quote)
- **Finalization Process**:
  - Status → "Sent"
  - Lines → "Complete" (except "No Quote")
  - PDF generated
  - External link created
  - Optional email notification
- **Conversion to Sales Order**:
  - "Ordered" if all lines converted
  - "Partial" if some lines with zero quantity
  - "No Quote" lines excluded
- **Validation Rules**:
  - Customer required
  - Inside operations: setup/labor/machine times and rates
  - Outside operations: minimum cost, unit cost, lead time
  - Tax percent: 0-1 range
  - Customer contact required for email notification
- **Source**: `apps/erp/app/modules/sales/sales.models.ts`, `sales.service.ts`, quote route files

### `/docs/business-rules/sales-orders.md`
Comprehensive business rules for Sales Order management including:
- **Permissions**: `sales.view`, `sales.create`, `sales.update` with bypassRls
- **Status Workflow**: Draft → Needs Approval → To Ship and Invoice → To Ship → To Invoice → Completed → Cancelled
- **Payment Terms**: Calculation formulas for net, EOM, days after invoice
- **Line Type Validation**: Part, Material, Tool, Consumable, Comment, Fixed Asset, Service
- **Conditional Logic**:
  - Item ID required for inventory types
  - Service item required for service lines
  - Tax percent: 0-1 range
- **Calculations**:
  - Line Total = Sale Quantity × Unit Price × (1 + Tax Percent)
  - Order Total = SUM(Line Totals) + Shipping
- **Credit Limit Check**: Optional validation against customer credit
- **Source**: `apps/erp/app/modules/sales/sales.models.ts`, sales order route files

### `/docs/business-rules/purchase-orders.md`
Comprehensive business rules for Purchase Order management including:
- **Permissions**: `purchasing.create`, `purchasing.view`, `purchasing.update` with bypassRls
- **Status Workflow**: Draft → Planned → To Review → To Receive → To Receive and Invoice → To Invoice → Completed → Rejected → Closed
- **MRP Integration**: Triggered when status changes to "Planned"
- **Drop Shipment Rules**:
  - Customer and customer location required
  - Regular location NOT required
  - Items ship directly to customer
- **Conversion Factor**:
  - Formula: `Inventory Unit Price = (Supplier Unit Price × Exchange Rate) / Conversion Factor`
  - Example: Buy in cases (100 units), track in each: factor = 100
- **Validation Rules**:
  - Supplier required
  - Item ID required for inventory line types
  - Conversion factor must be > 0, defaults to 1
- **Assignee Management**: Cleared when status = "Closed"
- **Source**: `apps/erp/app/modules/purchasing/purchasing.models.ts`, `purchasing.service.ts`, PO route files

## Documentation Standards

All business rules documentation follows consistent structure:

1. **YAML Frontmatter**: Title, last_updated, source_files
2. **Permissions & Authorization**: Permission checks with code snippets
3. **Status Transitions**: Mermaid diagrams showing workflow
4. **Validation Rules**: Tables with field requirements and error messages
5. **Conditional Logic**: IF-THEN rules with descriptions
6. **Calculations & Formulas**: Mathematical formulas with examples
7. **Limits & Thresholds**: Numeric ranges and string length constraints
8. **Business Rules Summary**: High-level workflow tables
9. **Error Handling**: Error messages and resolutions
10. **Data Integrity Rules**: Audit trail, multi-tenancy, special constraints
11. **Source References**: File paths to validators, services, routes

## Code Evidence Format

All rules include actual code snippets with file paths and line numbers:

```typescript
// Source: apps/erp/app/routes/x+/job+/$jobId.status.tsx (lines 60-73)
if (["Planned", "Ready"].includes(status)) {
  await runMRP(getCarbonServiceRole(), {
    type: "job",
    id,
    companyId,
    userId
  });
}
```

## Common Validation Patterns

### Conditional Validation by Type
Many entities use conditional validation based on type (Inside/Outside, Part/Service, etc.):

```typescript
.refine(
  (data) => {
    if (data.operationType === "Inside") {
      return Number.isFinite(data.setupTime);
    }
    return true;
  },
  { message: "Setup time is required", path: ["setupTime"] }
)
```

### Status Transition Logic
Most entities have status workflows with side effects:
- MRP triggers on specific statuses
- Assignee clearing on terminal statuses
- Date fields auto-set on status changes
- Notification triggers

### Multi-Tenancy
All entities isolated by `companyId`:
- Row-Level Security (RLS) policies
- Audit fields: `createdBy`, `createdAt`, `updatedBy`, `updatedAt`
- Primary keys: `(id, companyId)` composite

## Related Documentation

- `/docs/database-schema.md` - Database schema with ERD diagrams
- `/docs/business-logic-rules.md` - High-level business logic overview
- `/docs/data-models/entities.md` - Entity field specifications
- `/docs/user-stories/*.md` - User stories for each module

## Usage

Business rules documentation is used for:
- Understanding validation requirements before implementing features
- Debugging validation errors by looking up error messages
- Onboarding new developers to understand workflows
- Compliance and audit requirements
- API documentation and integration guides
