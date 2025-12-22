import { getCarbonServiceRole } from "@carbon/auth";
import { NotificationEvent } from "@carbon/notifications";
import { schedules } from "@trigger.dev/sdk";
import { notifyTask } from "./notify.ts";

const serviceRole = getCarbonServiceRole();

export const generateMaintenanceDispatches = schedules.task({
  id: "generate-maintenance-dispatches",
  // Run daily at 6 AM UTC
  cron: "0 6 * * *",
  run: async () => {
    console.log(
      `🔧 Starting maintenance dispatch generation: ${new Date().toISOString()}`
    );

    try {
      // Get all companies with maintenanceGenerateInAdvance enabled
      const { data: companiesWithSettings, error: settingsError } =
        await serviceRole
          .from("companySettings")
          .select("companyId, maintenanceGenerateInAdvance, maintenanceAdvanceDays")
          .eq("maintenanceGenerateInAdvance", true);

      if (settingsError) {
        console.error(
          `Failed to fetch company settings: ${settingsError.message}`
        );
        return;
      }

      console.log(
        `Found ${companiesWithSettings?.length || 0} companies with auto-generation enabled`
      );

      let totalDispatchesCreated = 0;

      for (const settings of companiesWithSettings ?? []) {
        const advanceDays = settings.maintenanceAdvanceDays ?? 7;
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + advanceDays);

        // Get active schedules that are due
        const { data: dueSchedules, error: schedulesError } = await serviceRole
          .from("maintenanceSchedule")
          .select("*")
          .eq("companyId", settings.companyId)
          .eq("active", true)
          .or(`nextDueAt.is.null,nextDueAt.lte.${futureDate.toISOString()}`);

        if (schedulesError) {
          console.error(
            `Failed to fetch schedules for company ${settings.companyId}: ${schedulesError.message}`
          );
          continue;
        }

        console.log(
          `Company ${settings.companyId}: ${dueSchedules?.length || 0} schedules due`
        );

        for (const schedule of dueSchedules ?? []) {
          try {
            // Get next sequence number
            const { data: sequenceData, error: sequenceError } =
              await serviceRole.rpc("get_next_sequence", {
                sequence_name: "maintenanceDispatch",
                company_id: settings.companyId
              });

            if (sequenceError) {
              console.error(
                `Failed to get sequence for schedule ${schedule.id}: ${sequenceError.message}`
              );
              continue;
            }

            // Create the dispatch
            const { data: newDispatch, error: dispatchError } = await serviceRole
              .from("maintenanceDispatch")
              .insert({
                maintenanceDispatchId: sequenceData,
                status: "Open",
                priority: schedule.priority,
                source: "Scheduled",
                severity: "Preventive",
                oeeImpact: "Planned",
                workCenterId: schedule.workCenterId,
                maintenanceScheduleId: schedule.id,
                plannedStartTime: schedule.nextDueAt || new Date().toISOString(),
                companyId: settings.companyId,
                createdBy: "system"
              })
              .select("id")
              .single();

            if (dispatchError) {
              console.error(
                `Failed to create dispatch for schedule ${schedule.id}: ${dispatchError.message}`
              );
              continue;
            }

            // Copy items from schedule to dispatch
            const { data: scheduleItems } = await serviceRole
              .from("maintenanceScheduleItem")
              .select("itemId, quantity, unitOfMeasureCode")
              .eq("maintenanceScheduleId", schedule.id);

            if (scheduleItems && scheduleItems.length > 0) {
              await serviceRole.from("maintenanceDispatchItem").insert(
                scheduleItems.map((item) => ({
                  maintenanceDispatchId: newDispatch.id,
                  itemId: item.itemId,
                  quantity: item.quantity,
                  unitOfMeasureCode: item.unitOfMeasureCode,
                  companyId: settings.companyId,
                  createdBy: "system"
                }))
              );
            }

            // Link work center
            await serviceRole.from("maintenanceDispatchWorkCenter").insert({
              maintenanceDispatchId: newDispatch.id,
              workCenterId: schedule.workCenterId,
              companyId: settings.companyId,
              createdBy: "system"
            });

            // Calculate next due date based on frequency
            let nextDueAt = new Date(schedule.nextDueAt || new Date());
            switch (schedule.frequency) {
              case "Daily":
                nextDueAt.setDate(nextDueAt.getDate() + 1);
                break;
              case "Weekly":
                nextDueAt.setDate(nextDueAt.getDate() + 7);
                break;
              case "Monthly":
                nextDueAt.setMonth(nextDueAt.getMonth() + 1);
                break;
              case "Quarterly":
                nextDueAt.setMonth(nextDueAt.getMonth() + 3);
                break;
              case "Annual":
                nextDueAt.setFullYear(nextDueAt.getFullYear() + 1);
                break;
            }

            // Update schedule's lastGeneratedAt and nextDueAt
            await serviceRole
              .from("maintenanceSchedule")
              .update({
                lastGeneratedAt: new Date().toISOString(),
                nextDueAt: nextDueAt.toISOString()
              })
              .eq("id", schedule.id);

            totalDispatchesCreated++;
            console.log(
              `Created dispatch ${sequenceData} for schedule "${schedule.name}"`
            );

            // Get employees assigned to this work center to notify them
            const { data: workCenterEmployees } = await serviceRole
              .from("workCenterEmployee")
              .select("userId")
              .eq("workCenterId", schedule.workCenterId);

            if (workCenterEmployees && workCenterEmployees.length > 0) {
              const userIds = workCenterEmployees.map((e) => e.userId);
              await notifyTask.trigger({
                event: NotificationEvent.MaintenanceDispatchCreated,
                companyId: settings.companyId,
                documentId: newDispatch.id,
                recipient: {
                  type: "users",
                  userIds
                }
              });
              console.log(
                `Notified ${userIds.length} work center employees about dispatch ${sequenceData}`
              );
            }
          } catch (err) {
            console.error(
              `Error processing schedule ${schedule.id}: ${
                err instanceof Error ? err.message : String(err)
              }`
            );
          }
        }
      }

      console.log(
        `🔧 Maintenance dispatch generation completed: ${totalDispatchesCreated} dispatches created`
      );

      return { dispatchesCreated: totalDispatchesCreated };
    } catch (error) {
      console.error(
        `Unexpected error in maintenance generation: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      throw error;
    }
  }
});
