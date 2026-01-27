---
title: Kanban-Replenishment Workflow
last_updated: 2026-01-27
source_files:
  - apps/erp/app/routes/api+/kanban.$id.tsx
  - apps/erp/app/modules/inventory/inventory.models.ts
  - llm/cache/kanban-system.md
---

This workflow implements pull-based inventory replenishment using kanban cards and QR codes, supporting both purchase-based (Buy) and production-based (Make) replenishment strategies.

## User Journey Overview

```mermaid
flowchart TD
    Start([Warehouse/Production]) --> UseInventory[Use Inventory<br/>from Kanban Bin]
    UseInventory --> LowStock{Bin Empty or<br/>Low Stock?}

    LowStock -->|No| Continue[Continue Using]
    LowStock -->|Yes| ScanQR[Scan Kanban<br/>QR Code]

    ScanQR --> DetectSystem{Replenishment<br/>System?}

    DetectSystem -->|Buy| CheckPO{Active PO<br/>for Supplier?}
    DetectSystem -->|Make| CheckJob{Active Job<br/>Exists?}

    CheckPO -->|Yes| AddToPO[Add Line to<br/>Existing PO]
    CheckPO -->|No| CreatePO[Create New<br/>Draft PO]

    AddToPO --> POCreated[PO Line Added]
    CreatePO --> POCreated

    POCreated --> SupplierNotified[Supplier Notified]
    SupplierNotified --> SupplierShips[Supplier Ships<br/>Material]
    SupplierShips --> Receive[Receive at<br/>Kanban Location]
    Receive --> RefillBin[Refill Kanban Bin]
    RefillBin --> Complete1([Replenishment<br/>Complete])

    CheckJob -->|Yes - Collision| RedirectJob[Redirect to<br/>Existing Job]
    CheckJob -->|No| CreateJob[Create Production<br/>Job]

    CreateJob --> AutoReleaseCheck{Auto-Release<br/>Enabled?}
    AutoReleaseCheck -->|Yes| TriggerMRP[Trigger MRP &<br/>Scheduling]
    AutoReleaseCheck -->|No| DraftJob[Job Saved<br/>as Draft]

    TriggerMRP --> AutoStartCheck{Auto-Start<br/>Enabled?}
    AutoStartCheck -->|Yes| StartProduction[Start First<br/>Operation]
    AutoStartCheck -->|No| PlanProduction[Plan Production]

    DraftJob --> PlanProduction
    StartProduction --> ProduceItems[Produce Items]
    PlanProduction --> ProduceItems

    ProduceItems --> ScanComplete[Scan "Complete"<br/>QR Code]
    ScanComplete --> RecordCycle[Record Cycle Time]
    RecordCycle --> CompleteJob[Complete Job]
    CompleteJob --> AddToStock[Add to Kanban<br/>Location]
    AddToStock --> Complete2([Replenishment<br/>Complete])

    RedirectJob --> ReviewJob[Review Job<br/>Status]
    ReviewJob --> ContinueJob[Continue<br/>Production]
    ContinueJob --> Complete2

    style ScanQR fill:#e1f5ff
    style CreatePO fill:#fff4e1
    style CreateJob fill:#fff4e1
    style Complete1 fill:#d4edda
    style Complete2 fill:#d4edda
```

## Step-by-Step User Flow

### Step 1: Kanban Setup (One-Time Configuration)

**User Action:** Create kanban card for item/location

**API Endpoint:** `POST /x+/inventory+/kanbans/new`

**Permissions Required:** `inventory.create`

**Required Fields:**
- Item ID (required)
- Location ID (required)
- Quantity (integer >= 1) - Replenishment quantity
- Replenishment System: "Buy", "Make", or "Buy and Make"

**Conditional Fields:**

**For "Buy" System:**
- Supplier ID (required)

**For "Make" System:**
- Auto-release (checkbox)
- Auto-start (checkbox)

**Validation:**

```typescript
export const kanbanValidator = z.object({
  id: zfd.text(z.string().optional()),
  itemId: z.string().min(1, { message: "Item is required" }),
  locationId: z.string().min(1, { message: "Location is required" }),
  shelfId: zfd.text(z.string().optional()),
  quantity: zfd.numeric(z.number().int().min(1)),
  replenishmentSystem: z.enum(["Buy", "Make", "Buy and Make"], {
    errorMap: () => ({ message: "Replenishment system is required" })
  }),
  supplierId: zfd.text(z.string().optional()),
  autoRelease: zfd.checkbox(),
  autoStart: zfd.checkbox()
});
```

**System Actions:**
1. Generate QR codes:
   - "Order" QR code (trigger replenishment)
   - "Start" QR code (for Make system only)
   - "Complete" QR code (for Make system only)
2. Print kanban card label (PDF)

**QR Code Endpoints:**
- `GET /file+/kanban+/$id.order.png` - Order QR code
- `GET /file+/kanban+/$id.start.png` - Start QR code
- `GET /file+/kanban+/$id.complete.png` - Complete QR code

---

### Step 2: Inventory Usage

**Worker Action:** Use inventory from kanban bin

**Kanban Bin:** Physical location labeled with kanban card

**Trigger Point:** When bin empty or reaches minimum level

**Visual Signal:** Empty bin or reorder point marker

---

### Step 3: Scan Kanban QR Code

**Worker Action:** Scan "Order" QR code on kanban card

**API Endpoint:** `GET /api+/kanban/$id`

**System Action:** Detect replenishment system and route accordingly

**Source:** `apps/erp/app/routes/api+/kanban.$id.tsx`

**Decision Point: Replenishment System**

- **Buy** → Create/add to purchase order
- **Make** → Create production job
- **Buy and Make** → Hybrid (not yet implemented)

---

### Path A: Buy System Replenishment

#### Step 4A: Find or Create Purchase Order

**System Logic:**

```typescript
const { data: existingPO } = await client
  .from("purchaseOrder")
  .select("id")
  .eq("supplierId", supplierId)
  .eq("status", "Draft")
  .single();

if (existingPO) {
  // Add line to existing PO
} else {
  // Create new draft PO
}
```

**Create New PO (if needed):**
- Supplier: From kanban
- Status: Draft
- Order Date: Today
- Location: From kanban

**Add PO Line:**
- Item: From kanban
- Quantity: From kanban quantity
- Unit Price: From supplier pricing or item cost
- Location: From kanban
- Shelf: From kanban (optional)
- Requested Receipt Date: Calculated from lead time

---

#### Step 5A: Supplier Notification

**User Action (Purchasing):** Review and send PO to supplier

**System Flow:**
1. Purchasing reviews draft POs with kanban lines
2. Consolidates multiple kanban requests
3. Finalizes PO and sends to supplier
4. Supplier ships materials

**Related Workflow:** See Purchase-to-Receive workflow

---

#### Step 6A: Receive and Refill

**User Action:** Receive materials at kanban location

**Receiving:**
- Receipt links to PO
- Quantity: Kanban quantity
- Location: Kanban location
- Shelf: Kanban bin

**Refill:**
- Place received materials in kanban bin
- Kanban card ready for next cycle

---

### Path B: Make System Replenishment

#### Step 4B: Check for Job Collision

**System Logic:**

```typescript
const { data: activeJob } = await client
  .from("job")
  .select("id")
  .eq("kanbanId", kanbanId)
  .in("status", ["Draft", "Planned", "Ready", "In Progress"])
  .single();

if (activeJob) {
  // Collision: redirect to existing job
} else {
  // Create new job
}
```

**Kanban Collision:** Active job already exists for this kanban

**Collision Handling:**
- Redirect worker to existing job
- Display current job status
- Option to continue production

---

#### Step 5B: Create Production Job

**System Actions:**

1. **Auto-generate Job ID** from sequence
2. **Copy from Kanban:**
   - Quantity
   - Location
   - Shelf

3. **Create Job Method** from item
   - Operations
   - Materials
   - BOM

4. **Link Job to Kanban:**
   - Job.kanbanId = Kanban ID

**Decision Point: Auto-Release?**

**If auto-release enabled:**
- Trigger MRP
- Run scheduling
- Job status → Ready
- Released date set

**If auto-release disabled:**
- Job status → Draft
- Manual planning required

**Source:** `apps/erp/app/routes/api+/kanban.$id.tsx` (lines 140-185)

```typescript
const jobStatus = autoRelease ? "Ready" : "Draft";

const newJob = await createJobFromKanban(client, {
  itemId: kanban.itemId,
  quantity: kanban.quantity,
  locationId: kanban.locationId,
  shelfId: kanban.shelfId,
  kanbanId: kanban.id,
  status: jobStatus,
  companyId,
  userId
});

if (autoRelease) {
  await runMRP(serviceRole, {
    type: "job",
    id: newJob.id,
    companyId,
    userId
  });
}
```

---

#### Step 6B: Start Production (Optional Auto-Start)

**Decision Point: Auto-Start?**

**If auto-start enabled:**
- Redirect to MES operation page
- Worker clocks in immediately
- Begin first operation

**If auto-start disabled:**
- Job waits in queue
- Scheduler assigns to work center
- Production planner schedules

**MES Workflow:**
1. Scan job barcode
2. Select operation
3. Clock in
4. Record production events
5. Record quantities

**Related Workflow:** See Job-to-Completion workflow

---

#### Step 7B: Scan "Complete" QR Code

**Worker Action:** Scan "Complete" QR code when job finished

**API Endpoint:** `GET /api+/kanban/complete/$id`

**System Actions:**
1. Record cycle time (scan to complete)
2. Complete current operation
3. Update job quantities
4. Mark kanban cycle complete

---

#### Step 8B: Complete Job and Add to Stock

**System Actions:**
1. Complete job (Make-to-Stock logic)
2. Create inventory receipt
3. Add quantity to kanban location/shelf
4. Kanban ready for next cycle

**Related Workflow:** See Job-to-Completion workflow for completion logic

---

## Kanban Cycle Time Tracking

**Metrics Tracked:**
- **Order Scan Time** - When replenishment triggered
- **Start Time** - When production started (Make only)
- **Complete Time** - When job completed
- **Cycle Time** - Order → Complete duration

**Performance Analysis:**
- Average cycle time per kanban
- Min/max cycle times
- Trend analysis
- Bottleneck identification

---

## Decision Points Summary

| Decision Point | Options | Impact |
|----------------|---------|--------|
| Replenishment System | Buy, Make, Buy and Make | PO vs Job creation |
| Active PO Exists | Yes, No | Add line vs create new PO |
| Active Job Exists | Yes, No | Collision redirect vs create job |
| Auto-Release | Enabled, Disabled | Immediate MRP/scheduling |
| Auto-Start | Enabled, Disabled | MES redirect vs queue |

---

## Alternative Paths

### Path: Two-Bin Kanban

**Setup:**
- Two bins per item/location
- Use from Bin A while Bin B replenishes
- Swap when Bin A empty

**Process:**
1. Deplete Bin A
2. Trigger replenishment (scan QR)
3. Switch to Bin B
4. Bin A refills
5. Swap back when Bin B depletes

---

### Path: Signal Kanban

**Setup:**
- Visual signal instead of QR scan
- Physical card moved to signal area
- Daily collection of signal cards

**Process:**
1. Worker removes card from bin
2. Places in signal collection area
3. Purchasing/production collects cards
4. Manually creates POs/jobs
5. Refills bins

---

### Path: Electronic Kanban

**Setup:**
- Button/sensor trigger instead of QR
- Automatic signal to system
- Real-time replenishment

**Process:**
1. Sensor detects low stock
2. Automatic API call
3. PO/job auto-created
4. Email/notification sent

---

## Error Recovery

### Kanban Collision (Make System)

**Symptom:** Redirect to existing job instead of creating new

**Recovery:**
1. Review existing job status
2. Options:
   - Continue production on existing job
   - Cancel existing job and create new
   - Complete existing job first

---

### Missing Supplier (Buy System)

**Symptom:** "Supplier is required"

**Recovery:**
1. Update kanban with supplier
2. Retry QR scan
3. Or manually create PO with supplier

---

### Overstocked Bin

**Symptom:** Bin full but QR scanned accidentally

**Recovery:**
1. Cancel created PO line (if Draft)
2. Delete created job (if Draft)
3. Use inventory before next trigger

---

## Integration Points

### Purchase Order Integration

- Draft POs created automatically
- Consolidates multiple kanban triggers
- Purchasing reviews and finalizes
- Standard receiving process

### Production Integration

- Jobs created from kanban
- MRP triggered on auto-release
- Standard job execution
- Make-to-Stock completion

### Inventory Integration

- Quantities tracked per kanban bin
- Location and shelf specific
- On-hand updates on receipt/completion
- Traceability maintained

---

## API Endpoints Reference

| Endpoint | Method | Purpose | Permissions |
|----------|--------|---------|-------------|
| `/x+/inventory+/kanbans/new` | POST | Create kanban | `inventory.create` |
| `/api+/kanban/$id` | GET | Trigger replenishment (QR scan) | Public |
| `/api+/kanban/start/$id` | GET | Start operation (Make only) | Public |
| `/api+/kanban/complete/$id` | GET | Complete operation (Make only) | Public |
| `/api+/kanban/collision/$id` | GET | Handle job collision | Public |
| `/file+/kanban+/$id.order.png` | GET | Generate order QR code | - |
| `/file+/kanban+/$id.start.png` | GET | Generate start QR code | - |
| `/file+/kanban+/$id.complete.png` | GET | Generate complete QR code | - |
| `/file+/kanban+/labels.pdf` | GET | Generate kanban label PDFs | - |

---

## Source References

- `apps/erp/app/routes/api+/kanban.$id.tsx` - Main kanban trigger endpoint with Buy/Make logic and collision handling
- `apps/erp/app/modules/inventory/inventory.models.ts` (lines 122-145) - Kanban validator with replenishment system validation
- `llm/cache/kanban-system.md` - Complete kanban system documentation with QR code integration and cycle time tracking
- `docs/user-stories/inventory.md` - Kanban replenishment user stories
