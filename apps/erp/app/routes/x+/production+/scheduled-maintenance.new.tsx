import { assertIsPost, error, success } from "@carbon/auth";
import { requirePermissions } from "@carbon/auth/auth.server";
import { flash } from "@carbon/auth/session.server";
import { validationError, validator } from "@carbon/form";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { redirect, useNavigate } from "react-router";
import {
  maintenanceScheduleValidator,
  upsertMaintenanceSchedule
} from "~/modules/production";
import MaintenanceScheduleForm from "~/modules/production/ui/MaintenanceSchedule/MaintenanceScheduleForm";
import { getParams, path, requestReferrer } from "~/utils/path";

export async function loader({ request }: LoaderFunctionArgs) {
  await requirePermissions(request, {
    create: "production"
  });

  return null;
}

export async function action({ request }: ActionFunctionArgs) {
  assertIsPost(request);
  const { client, companyId, userId } = await requirePermissions(request, {
    create: "production"
  });

  const formData = await request.formData();
  const modal = formData.get("type") === "modal";

  const validation = await validator(maintenanceScheduleValidator).validate(
    formData
  );

  if (validation.error) {
    return validationError(validation.error);
  }

  // biome-ignore lint/correctness/noUnusedVariables: suppressed due to migration
  const { id, ...d } = validation.data;

  const insertSchedule = await upsertMaintenanceSchedule(client, {
    ...d,
    companyId,
    createdBy: userId
  });

  if (insertSchedule.error) {
    return modal
      ? insertSchedule
      : redirect(
          requestReferrer(request) ??
            `${path.to.maintenanceSchedules}?${getParams(request)}`,
          await flash(
            request,
            error(insertSchedule.error, "Failed to create maintenance schedule")
          )
        );
  }

  return modal
    ? insertSchedule
    : redirect(
        `${path.to.maintenanceSchedules}?${getParams(request)}`,
        await flash(request, success("Maintenance schedule created"))
      );
}

export default function NewMaintenanceScheduleRoute() {
  const navigate = useNavigate();
  const initialValues = {
    name: "",
    workCenterId: "",
    frequency: "Weekly" as const,
    priority: "Medium" as const,
    estimatedDuration: undefined,
    active: true
  };

  return (
    <MaintenanceScheduleForm
      initialValues={initialValues}
      onClose={() => navigate(-1)}
    />
  );
}
