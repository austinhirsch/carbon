# Carbon Manufacturing System Documentation

This directory contains comprehensive documentation for the Carbon Manufacturing ERP/MES system.

## Documentation Files

### 📊 [Database Schema](./database-schema.md)
Complete database schema documentation including:
- Entity Relationship Diagrams (ERD) for all modules
- Table structures and relationships
- Database patterns and conventions
- Multi-tenancy and security models
- Views, functions, and triggers

### 📋 [Business Logic Rules](./business-logic-rules.md)
Comprehensive business logic documentation covering:
- Validation rules for all modules
- Status workflows and state transitions
- Required vs optional fields
- Calculated fields and formulas
- Side effects and cascading actions
- Cross-module business rules

## Quick Reference

### Module Overview

| Module | Purpose | Key Tables |
|--------|---------|------------|
| **Sales** | Customer management, quotes, sales orders | customer, quote, salesOrder, opportunity |
| **Purchasing** | Supplier management, purchase orders, receipts | supplier, purchaseOrder, receipt, buyMethod |
| **Production** | Job management, MES, production planning | job, jobOperation, makeMethod, productionEvent |
| **Inventory** | Stock management, tracking, transfers | item, itemLedger, trackedEntity, warehouse |
| **Quality** | NCR, calibration, quality documents | nonConformance, gauge, qualityDocument |
| **Maintenance** | Work orders, preventive maintenance | maintenanceDispatch, maintenanceSchedule |
| **Accounting** | General ledger, cost tracking, ledgers | account, journal, itemLedger, costLedger |
| **Resources** | Work centers, employees, departments | workCenter, employee, department, shift |

### Core Concepts

#### Multi-Tenancy
- All business data is isolated by `companyId`
- Row-Level Security (RLS) enforces company boundaries
- Composite primary keys: `PRIMARY KEY (id, companyId)`

#### ID Generation
- Custom `xid()` function generates 20-character ordered unique IDs
- Readable IDs with revision system for parts/items
- Sequence-based IDs for documents (PO, SO, quotes, etc.)

#### Audit Trail
Standard fields on all business tables:
```sql
createdBy, createdAt, updatedBy, updatedAt
```

#### Extensibility
- `customFields JSONB` for flexible custom data
- `tags TEXT[]` for categorization
- Attribute system for custom fields with UI

### Key Workflows

#### Sales Flow
```
Customer → Opportunity → RFQ → Quote → Sales Order → Shipment → Invoice
```

#### Purchasing Flow
```
Supplier → Supplier Quote → Purchase Order → Receipt → Invoice
```

#### Production Flow
```
Item → Make Method → Job → Job Operations → Production Events → Completion
```

#### Inventory Flow
```
Receipt/Production → Item Ledger → Cost Ledger → On-Hand Quantities
```

### Database Technology

- **Database**: PostgreSQL via Supabase
- **Type Safety**: Full TypeScript types generated from schema
- **Real-time**: Supabase real-time subscriptions on key tables
- **Security**: Row-Level Security (RLS) policies on all tables
- **Storage**: Supabase Storage buckets for files/documents

### Common Patterns

#### Status Workflows
Most documents follow similar status patterns:
- Draft → Pending/Planned → In Progress → Completed
- Can transition to Cancelled from most states

#### Conversion Factors
Handle different units between inventory and purchasing:
```
Inventory unit price = (Purchase unit price × Exchange rate) / Conversion factor
```

#### Revision System
Items support multiple revisions:
- Same `readableId`, different `revision` numbers
- Default revision is '0'
- Display format: `readableId.revision` (except for revision 0)

#### Tracked Entities
Serial/batch tracking with full traceability:
- Forward tracing: Where did this material go?
- Backward tracing: Where did this come from?
- Forms a directed acyclic graph (DAG)

### MRP (Material Requirements Planning)

Automated planning system that:
- Runs every 3 hours automatically
- Calculates demand from sales orders and jobs
- Calculates supply from production orders and purchase orders
- Creates planning recommendations by location and period

### Integration Points

- **API**: RESTful API with webhooks
- **OAuth**: Support for third-party integrations
- **CAD**: Onshape integration for parts/models
- **Messaging**: Slack integration for notifications
- **Accounting**: QuickBooks integration
- **Other**: Linear, Paperless Parts, Radan integrations

## For Developers

### Creating Migrations

```bash
# Create new migration
npm run db:migrate <name-of-migration>

# Apply migrations
npm run db:push
```

### Migration Best Practices

1. Always include RLS policies
2. Use composite primary keys for multi-tenant tables
3. Include indexes on foreign keys and `companyId`
4. Use `ON DELETE CASCADE` for child records
5. Use `ON DELETE SET NULL` for optional relationships
6. Follow naming convention: `YYYYMMDDHHMMSS_description.sql`

### Validation with Zod

Each table should have corresponding `.models.ts` file with:
- Base validator matching database schema
- Form validator for create/update operations
- Exclusion of audit fields from forms

Example:
```typescript
export const baseValidator = z.object({
  id: z.string(),
  companyId: z.string(),
  name: z.string().min(1),
  // ... other fields
  createdBy: z.string(),
  createdAt: z.date(),
});

export const formValidator = baseValidator
  .omit({ id: true, createdBy: true, createdAt: true, updatedBy: true, updatedAt: true })
  .extend({
    // Form-specific validations
  });
```

## For Users

### Understanding Status Workflows

Each module has specific status workflows that control how documents progress:

- **Sales Orders**: Draft → Needs Approval → To Ship → Completed
- **Purchase Orders**: Draft → To Review → To Receive → Completed
- **Jobs**: Draft → Ready → In Progress → Completed
- **Quotes**: Draft → Sent → Ordered/Lost/Cancelled

See the [Business Logic Rules](./business-logic-rules.md) document for complete workflow details.

### Custom Fields

The system supports custom fields via:
- JSONB `customFields` column on most tables
- Attribute system with typed custom fields
- User-defined validation and UI rendering

### Traceability

Full forward and backward traceability for:
- Serial number tracked items
- Batch/lot tracked items
- Material consumption in production
- Genealogy tracking through the entire production process

## Architecture Highlights

### Real-time Updates

Tables enabled for real-time subscriptions:
- item, part
- journal
- receipt
- salesOrderLine
- job
- productionEvent

### Performance Optimization

- Materialized views for complex queries
- Indexes on all foreign keys and frequently queried columns
- Efficient RLS policies using helper functions
- Caching of frequently accessed data

### Security

- Row-Level Security (RLS) on all business tables
- Module-based permissions (sales, purchasing, production, etc.)
- Action-based permissions (view, create, update, delete)
- API key access for external integrations
- Audit trail on all modifications

## Additional Resources

- **Cache Files**: `/llm/cache/` - Detailed codebase knowledge for AI assistants
- **Workflows**: `/llm/workflows/` - Standardized development workflows
- **Migrations**: `/packages/database/supabase/migrations/` - All database migrations

## Contributing

When updating documentation:

1. Keep diagrams in sync with actual schema
2. Update business logic rules when validation changes
3. Document new features and their workflows
4. Include examples for complex concepts
5. Update this README when adding new documentation files

## Version Information

- **Last Updated**: 2026-01-16
- **Database**: PostgreSQL 15+ via Supabase
- **Schema Version**: See latest migration timestamp

---

For questions or clarifications, refer to the detailed documentation files linked above or consult the codebase directly.
