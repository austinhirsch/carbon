-- Add source and schedule link to maintenanceDispatch
ALTER TABLE "maintenanceDispatch"
  ADD COLUMN IF NOT EXISTS "source" TEXT,
  ADD COLUMN IF NOT EXISTS "maintenanceScheduleId" TEXT,
  ADD COLUMN IF NOT EXISTS "isFailure" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "previousDispatchId" TEXT;

-- Add unit cost to maintenanceDispatchItem
ALTER TABLE "maintenanceDispatchItem"
  ADD COLUMN IF NOT EXISTS "unitCost" NUMERIC;

-- Recreate maintenanceDispatchItem with totalCost as generated column
-- First, drop and recreate the table to add the generated column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'maintenanceDispatchItem'
    AND column_name = 'totalCost'
  ) THEN
    ALTER TABLE "maintenanceDispatchItem"
      ADD COLUMN "totalCost" NUMERIC GENERATED ALWAYS AS ("quantity" * "unitCost") STORED;
  END IF;
END $$;

-- Maintenance frequency enum
DO $$ BEGIN
  CREATE TYPE "maintenanceFrequency" AS ENUM (
    'Daily',
    'Weekly',
    'Monthly',
    'Quarterly',
    'Annual'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Maintenance schedule table
CREATE TABLE IF NOT EXISTS "maintenanceSchedule" (
  "id" TEXT NOT NULL DEFAULT id(),
  "name" TEXT NOT NULL,
  "description" TEXT,
  "workCenterId" TEXT NOT NULL,
  "frequency" "maintenanceFrequency" NOT NULL,
  "priority" "maintenanceDispatchPriority" NOT NULL DEFAULT 'Medium',
  "estimatedDuration" INTEGER,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "lastGeneratedAt" TIMESTAMP WITH TIME ZONE,
  "nextDueAt" TIMESTAMP WITH TIME ZONE,
  "companyId" TEXT NOT NULL,
  "createdBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  "updatedBy" TEXT,
  "updatedAt" TIMESTAMP WITH TIME ZONE,

  CONSTRAINT "maintenanceSchedule_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "maintenanceSchedule_workCenterId_fkey" FOREIGN KEY ("workCenterId") REFERENCES "workCenter"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "maintenanceSchedule_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "company"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "maintenanceSchedule_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "maintenanceSchedule_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "maintenanceSchedule_workCenterId_idx" ON "maintenanceSchedule" ("workCenterId");
CREATE INDEX IF NOT EXISTS "maintenanceSchedule_companyId_idx" ON "maintenanceSchedule" ("companyId");
CREATE INDEX IF NOT EXISTS "maintenanceSchedule_active_idx" ON "maintenanceSchedule" ("active");

-- Maintenance schedule items (parts required for scheduled maintenance)
CREATE TABLE IF NOT EXISTS "maintenanceScheduleItem" (
  "id" TEXT NOT NULL DEFAULT id(),
  "maintenanceScheduleId" TEXT NOT NULL,
  "itemId" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL,
  "unitOfMeasureCode" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "createdBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  "updatedBy" TEXT,
  "updatedAt" TIMESTAMP WITH TIME ZONE,

  CONSTRAINT "maintenanceScheduleItem_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "maintenanceScheduleItem_maintenanceScheduleId_fkey" FOREIGN KEY ("maintenanceScheduleId") REFERENCES "maintenanceSchedule"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "maintenanceScheduleItem_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "item"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "maintenanceScheduleItem_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "company"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "maintenanceScheduleItem_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "maintenanceScheduleItem_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "maintenanceScheduleItem_maintenanceScheduleId_idx" ON "maintenanceScheduleItem" ("maintenanceScheduleId");
CREATE INDEX IF NOT EXISTS "maintenanceScheduleItem_itemId_idx" ON "maintenanceScheduleItem" ("itemId");
CREATE INDEX IF NOT EXISTS "maintenanceScheduleItem_companyId_idx" ON "maintenanceScheduleItem" ("companyId");

-- Add foreign key for maintenanceScheduleId on maintenanceDispatch
ALTER TABLE "maintenanceDispatch"
  ADD CONSTRAINT "maintenanceDispatch_maintenanceScheduleId_fkey"
  FOREIGN KEY ("maintenanceScheduleId") REFERENCES "maintenanceSchedule"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "maintenanceDispatch"
  ADD CONSTRAINT "maintenanceDispatch_previousDispatchId_fkey"
  FOREIGN KEY ("previousDispatchId") REFERENCES "maintenanceDispatch"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- Company settings for maintenance scheduling
ALTER TABLE "companySettings"
  ADD COLUMN IF NOT EXISTS "maintenanceGenerateInAdvance" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "companySettings"
  ADD COLUMN IF NOT EXISTS "maintenanceAdvanceDays" INTEGER NOT NULL DEFAULT 7;

