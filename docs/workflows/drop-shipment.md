---
title: Drop-Shipment Workflow
last_updated: 2026-01-27
source_files:
  - apps/erp/app/routes/x+/purchase-order+/$orderId.delivery.tsx
  - apps/erp/app/modules/purchasing/purchasing.models.ts
  - apps/erp/app/routes/x+/sales-order+/$orderId.shipment.tsx
  - docs/business-rules/purchase-orders.md
---

This workflow enables direct shipping from suppliers to customers, bypassing internal warehouse operations while maintaining full traceability and accounting integration.

## User Journey Overview

```mermaid
flowchart TD
    Start([Sales User Creates Order]) --> CreateSO[Create Sales Order]
    CreateSO --> AddSOLines[Add Sales Order Lines]
    AddSOLines --> MarkDropShip[Flag for Drop Shipment]
    MarkDropShip --> NotifyPurchasing[Notify Purchasing Team]

    NotifyPurchasing --> PurchasingStart([Purchasing User])
    PurchasingStart --> CreatePO[Create Purchase Order]
    CreatePO --> FlagDropShipment[Enable Drop Shipment<br/>Flag]
    FlagDropShipment --> SelectCustomer[Select Customer &<br/>Delivery Location]
    SelectCustomer --> AddPOLines[Add PO Lines]
    AddPOLines --> SupplierInfo[Configure Supplier<br/>Details]

    SupplierInfo --> ValidateConfig{Validation<br/>Passes?}
    ValidateConfig -->|No - Location Required| FixError[Fix Configuration]
    FixError --> SelectCustomer
    ValidateConfig -->|Yes - Customer Required| SendPOToSupplier[Send PO to Supplier]

    SendPOToSupplier --> SupplierShips[Supplier Ships Directly<br/>to Customer]
    SupplierShips --> TrackShipment[Track Shipment]
    TrackShipment --> CustomerReceives{Customer<br/>Receives Items?}

    CustomerReceives -->|No - Damaged/Missing| IssueResolution[Issue Resolution<br/>with Supplier]
    CustomerReceives -->|Yes| CustomerConfirms[Customer Confirms<br/>Receipt]

    IssueResolution --> SupplierAction{Supplier<br/>Action}
    SupplierAction -->|Reship| SupplierShips
    SupplierAction -->|Refund/Credit| UpdateAccounting[Adjust Accounting]

    CustomerConfirms --> ReceiptRecord[Create Receipt Record<br/>(No Inventory Impact)]
    ReceiptRecord --> LinkToSO[Link Receipt to<br/>Sales Order]
    LinkToSO --> InvoiceCustomer[Invoice Customer]
    InvoiceCustomer --> ProcessSupplierInvoice[Process Supplier Invoice]
    ProcessSupplierInvoice --> CalculateMargin[Calculate Margin &<br/>Complete]

    UpdateAccounting --> Complete([Workflow Ends])
    CalculateMargin --> Complete

    style CreateSO fill:#e1f5ff
    style FlagDropShipment fill:#fff4e1
    style SupplierShips fill:#e7f5e1
    style Complete fill:#d4edda
```

## Step-by-Step User Flow

### Step 1: Identify Drop Shipment Need

**User (Sales):** Recognize order requires drop shipment

**Drop Shipment Scenarios:**
- Customer needs direct delivery from manufacturer
- Large/heavy items bypass warehouse
- Special order items not stocked
- Expedited delivery requirements
- International direct shipping

**Decision Point:** Standard order vs drop shipment
- **Standard** - Items ship from company warehouse
- **Drop Shipment** - Items ship directly from supplier to customer

---

### Step 2: Create Sales Order

**User Action:** Create sales order as normal

**API Endpoint:** `POST /x+/sales-order+/new`

**Required Fields:**
- Customer (required)
- Customer Location (ship-to address)
- Customer Contact (optional)

**Note:** Sales order creation identical to standard orders

**Related Workflow:** See Order-to-Cash workflow for complete sales order process

---

### Step 3: Configure Drop Shipment on Sales Order

**User Action:** Navigate to Shipment tab on sales order

**API Endpoint:** `POST /x+/sales-order+/$orderId.shipment.tsx`

**Fields:**
- Drop Shipment checkbox (enable)
- Verify customer location (ship-to address)

**System Action:**
- Flag sales order for drop shipment
- Notify purchasing team (optional)
- Create drop shipment indicator on order

---

### Step 4: Create Purchase Order with Drop Shipment

**User (Purchasing):** Create PO linked to sales order

**API Endpoint:** `POST /x+/purchase-order+/new`

**Required Fields:**
- Supplier (required)
- PO Type: "Purchase"

**Initial Status:** Draft

---

### Step 5: Enable Drop Shipment Flag on PO

**User Action:** Navigate to Delivery tab

**API Endpoint:** `POST /x+/purchase-order+/$orderId.delivery.tsx`

**Critical Configuration:**

**Drop Shipment Enabled:**
- ✓ Check "Drop Shipment" box
- ✓ Select Customer (from sales order)
- ✓ Select Customer Location (ship-to address)
- ✗ **DO NOT** select receiving location (internal warehouse)

**Validation Rules:**

```typescript
IF dropShipment === true THEN
  customerId REQUIRED - "Customer is required for drop shipment"
  customerLocationId REQUIRED - "Customer location is required for drop shipment"
  locationId NOT REQUIRED (must be empty)
ELSE
  locationId REQUIRED - "Location is required"
  customerId NOT REQUIRED
  customerLocationId NOT REQUIRED
```

**Decision Point: Validation**

**Error States:**
- "Customer is required for drop shipment" - Must select customer when drop shipment enabled
- "Customer location is required for drop shipment" - Must select delivery location
- "Location must be empty for drop shipment" - Cannot have both receiving location and customer location

**Source:** `apps/erp/app/modules/purchasing/purchasing.models.ts` (lines 244-277)

```typescript
export const purchaseOrderDeliveryValidator = z
  .object({
    id: z.string(),
    locationId: zfd.text(z.string().optional()),
    shelfId: zfd.text(z.string().optional()),
    receiptRequestedDate: zfd.text(z.string().optional()),
    dropShipment: zfd.checkbox(),
    shippingMethodId: zfd.text(z.string().optional()),
    shippingTermId: zfd.text(z.string().optional()),
    customerId: zfd.text(z.string().optional()),
    customerLocationId: zfd.text(z.string().optional())
  })
  .refine(
    (data) => {
      if (data.dropShipment) {
        return !!data.customerId;
      }
      return true;
    },
    {
      message: "Customer is required for drop shipment",
      path: ["customerId"]
    }
  )
  .refine(
    (data) => {
      if (data.dropShipment) {
        return !!data.customerLocationId;
      }
      return true;
    },
    {
      message: "Customer location is required for drop shipment",
      path: ["customerLocationId"]
    }
  )
  .refine(
    (data) => {
      if (!data.dropShipment) {
        return !!data.locationId;
      }
      return true;
    },
    {
      message: "Location is required",
      path: ["locationId"]
    }
  );
```

---

### Step 6: Add PO Lines

**User Action:** Add items to purchase order

**API Endpoint:** `POST /x+/purchase-order+/$orderId.$lineId.details.tsx`

**Fields:**
- Item (from catalog)
- Purchase Quantity
- Unit Price (from supplier)
- Requested Receipt Date (customer delivery date)

**Note:** Do NOT assign bin/shelf locations (no warehouse receipt)

---

### Step 7: Send PO to Supplier

**User Action:** Finalize PO and send to supplier

**System Actions:**
1. Generate PO PDF with customer shipping address
2. Email PO to supplier
3. Include customer location details
4. Specify drop shipment instructions

**Communication to Supplier:**
- "DIRECT SHIP TO CUSTOMER"
- Customer Name
- Customer Address
- Customer Contact Information
- Requested Delivery Date
- Any special delivery instructions

**PO Status:** Draft → Planned → To Review (if needed) → To Receive

**Related:** See Purchase-to-Receive workflow for PO approval process

---

### Step 8: Supplier Ships to Customer

**Supplier Action:** Ship items directly to customer location

**System Tracking:**
- Supplier provides tracking number
- Update PO with carrier and tracking info
- Optional: Auto-notify customer with tracking

**User Action:** Enter tracking information

**Fields:**
- Carrier (UPS, FedEx, USPS, DHL, etc.)
- Tracking Number
- Ship Date
- Expected Delivery Date

---

### Step 9: Customer Receipt Confirmation

**Customer Action:** Receive items from supplier

**Decision Point: Receipt Condition**

**Option A: Items Received in Good Condition**

**Customer Action:** Confirm receipt

**User Action (Sales):** Create receipt record

**API Endpoint:** `POST /x+/receipt+/new`

**Receipt Configuration:**
- Source: Purchase Order (drop ship PO)
- **NO Inventory Impact** - Items do not enter warehouse
- **NO Bin Assignment** - No shelf locations
- Link to sales order for traceability

**System Action:**
- Create receipt record (for accounting only)
- Update PO quantities received
- DO NOT create inventory ledger entries
- DO NOT update on-hand quantities

**Option B: Items Damaged or Missing**

**Customer Action:** Report issue

**User Action:** Create Non-Conformance Report (NCR)

**API Endpoint:** `POST /x+/quality+/issues/new`

**NCR Details:**
- Issue Type: Receipt Damage, Quantity Shortage, Quality Issue
- Associate with PO line
- Associate with customer
- Supplier responsibility noted

**Resolution Paths:**
- **Supplier Reship** - New shipment directly to customer
- **Supplier Credit** - Issue credit memo, adjust invoice
- **Return to Supplier** - Customer ships back, supplier provides replacement
- **Customer Keeps with Discount** - Price adjustment

**Related Workflow:** See Non-Conformance-Resolution workflow

---

### Step 10: Invoice Customer

**User Action:** Create sales invoice for customer

**API Endpoint:** `POST /x+/sales-invoice+/new`

**Invoice Creation:**
- Source: Sales Order
- Items: Drop shipped items
- Pricing: Sales price (not supplier cost)
- No shipping cost from company (supplier ships direct)

**Calculation:**
```
Customer Invoice = Sales Order Price
(Not affected by supplier cost)
```

**Post Invoice:**
- API: `POST /x+/sales-invoice+/$invoiceId.post.tsx`
- Create GL entries for revenue
- Customer accounts receivable entry

**Related Workflow:** See Order-to-Cash workflow for invoicing process

---

### Step 11: Process Supplier Invoice

**User Action:** Enter supplier invoice when received

**API Endpoint:** `POST /x+/purchase-invoice+/new`

**Invoice Matching:**
- Match to drop ship PO
- Match quantities to customer receipt
- Verify prices

**Post Invoice:**
- API: `POST /x+/purchase-invoice+/$invoiceId.post.tsx`
- Create GL entries for COGS (Cost of Goods Sold)
- Supplier accounts payable entry

---

### Step 12: Calculate Margin and Complete

**System Action:** Calculate drop shipment margin

**Margin Calculation:**
```
Revenue = Sales Invoice Amount
COGS = Supplier Invoice Amount
Gross Margin = Revenue - COGS
Margin % = (Gross Margin / Revenue) × 100
```

**Example:**
- Sell to Customer: $1,000
- Buy from Supplier: $600
- Gross Margin: $400
- Margin %: 40%

**Completion:**
- Sales Order Status → Completed
- Purchase Order Status → Completed
- Revenue recognized
- COGS recognized
- Margin tracked for reporting

---

## Key Differences from Standard Orders

| Aspect | Standard Order | Drop Shipment |
|--------|----------------|---------------|
| Receiving Location | Required (warehouse) | NOT used |
| Customer Location | Optional | Required |
| Inventory Impact | Increases inventory | No inventory impact |
| Shelf/Bin Assignment | Required | Not applicable |
| Item Ledger Entries | Created | Not created |
| Physical Handling | Company ships to customer | Supplier ships to customer |
| Shipping Cost | Company pays/charges | Supplier pays, may charge to company |
| Quality Control | Inspect at warehouse | Customer inspects on receipt |

---

## Decision Points Summary

| Decision Point | Options | Impact |
|----------------|---------|--------|
| Order Type | Standard, Drop Shipment | Fulfillment method |
| Supplier Selection | Multiple suppliers | Supplier ships direct |
| Receipt Condition | Good, Damaged, Short | Issue resolution path |
| Issue Resolution | Reship, Credit, Return | Supplier/customer action |
| Invoice Timing | Before/After Receipt | Cash flow |

---

## Alternative Paths

### Path: Partial Drop Shipment

**Scenario:** Some items drop ship, others ship from warehouse

**Solution:**
- Create separate POs:
  - Drop ship PO (drop shipment flag enabled)
  - Standard PO (standard receiving)
- Link both to same sales order
- Customer receives from multiple sources

---

### Path: Supplier Delay

**Scenario:** Supplier cannot meet delivery date

**Actions:**
1. Supplier notifies delay
2. Update customer with new delivery date
3. Options:
   - **Wait** - Accept revised date
   - **Cancel & Source Elsewhere** - Find alternate supplier
   - **Partial Ship** - Ship available quantity

---

### Path: Customer Refuses Delivery

**Scenario:** Customer rejects shipment at delivery

**Actions:**
1. Supplier returns items or holds
2. Determine reason (wrong item, not ordered, etc.)
3. Resolution:
   - **Return to Supplier** - Supplier takes back, credit issued
   - **Ship to Company** - Supplier sends to warehouse
   - **Cancel Order** - Full cancellation, refund customer

---

### Path: Lost Shipment

**Scenario:** Shipment lost or damaged in transit

**Actions:**
1. File carrier claim
2. Determine liability (supplier or company)
3. Resolution:
   - **Supplier Reships** - New shipment to customer
   - **Insurance Claim** - Carrier insurance pays
   - **Credit Customer** - Issue credit if item critical

---

## Error Recovery

### Configuration Error: Location and Customer Both Set

**Symptom:** Validation error "Location must be empty for drop shipment"

**Recovery:**
1. Clear receiving location field
2. Ensure customer and customer location are set
3. Save delivery configuration

---

### Missing Customer Configuration

**Symptom:** "Customer is required for drop shipment"

**Recovery:**
1. Enable drop shipment checkbox
2. Select customer from sales order
3. Select customer ship-to location
4. Save configuration

---

### Incorrect Inventory Impact

**Symptom:** Inventory quantities increased on drop shipment receipt

**Recovery:**
1. Void receipt
2. Verify drop shipment flag is enabled on PO
3. Recreate receipt (should not impact inventory)
4. If persistent, contact system administrator

---

## Integration Points

### Sales Order Integration

- Drop shipment flag on sales order shipment configuration
- Customer location captured for supplier delivery
- Sales invoice created from sales order (standard process)

### Purchase Order Integration

- Drop shipment configuration on PO delivery tab
- Customer and customer location validation
- Supplier PO includes customer shipping address

### Inventory Integration

- Receipt created for accounting only
- **No inventory ledger entries**
- **No on-hand quantity changes**
- Traceability maintained via receipt records

### Accounting Integration

- Revenue recognized on sales invoice (AR entry)
- COGS recognized on purchase invoice (AP entry)
- Margin calculated automatically
- GL entries for both customer and supplier transactions

---

## API Endpoints Reference

| Endpoint | Method | Purpose | Permissions |
|----------|--------|---------|-------------|
| `/x+/sales-order+/$orderId.shipment` | POST | Configure drop shipment on SO | `sales.update` |
| `/x+/purchase-order+/new` | POST | Create drop ship PO | `purchasing.create` |
| `/x+/purchase-order+/$orderId.delivery` | POST | Enable drop shipment flag | `purchasing.update` |
| `/x+/purchase-order+/$orderId.$lineId.details` | POST | Add PO lines | `purchasing.update` |
| `/x+/receipt+/new` | POST | Create receipt (no inventory) | `inventory.create` |
| `/x+/sales-invoice+/new` | POST | Invoice customer | `sales.create` |
| `/x+/purchase-invoice+/new` | POST | Process supplier invoice | `purchasing.create` |

---

## Source References

- `apps/erp/app/routes/x+/purchase-order+/$orderId.delivery.tsx` - Drop shipment configuration route
- `apps/erp/app/modules/purchasing/purchasing.models.ts` (lines 244-277) - `purchaseOrderDeliveryValidator` with drop shipment validation
- `apps/erp/app/routes/x+/sales-order+/$orderId.shipment.tsx` - Sales order shipment configuration
- `docs/business-rules/purchase-orders.md` - Complete PO business rules including drop shipment validation rules
