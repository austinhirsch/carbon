import { assertIsPost, error, success } from "@carbon/auth";
import { requirePermissions } from "@carbon/auth/auth.server";
import { flash } from "@carbon/auth/session.server";
import type { ActionFunctionArgs } from "react-router";
import { data } from "react-router";
import { upsertMaintenanceDispatch } from "~/modules/production";

export async function action({ request, params }: ActionFunctionArgs) {
  assertIsPost(request);
  const { client, userId } = await requirePermissions(request, {
    update: "production"
  });

  const { dispatchId } = params;
  if (!dispatchId) throw new Error("dispatchId not found");

  const formData = await request.formData();
  const field = formData.get("field") as string;
  const value = formData.get("value") as string | null;
  const status = formData.get("status") as string | null;

  // Handle status update from header buttons
  if (status) {
    const updateDispatch = await upsertMaintenanceDispatch(client, {
      id: dispatchId,
      status: status as
        | "Open"
        | "Assigned"
        | "In Progress"
        | "Completed"
        | "Cancelled",
      updatedBy: userId,
      ...(status === "In Progress" && {
        actualStartTime: new Date().toISOString()
      }),
      ...(status === "Completed" && { actualEndTime: new Date().toISOString() })
    });

    if (updateDispatch.error) {
      return data(
        { error: updateDispatch.error },
        await flash(
          request,
          error(updateDispatch.error, "Failed to update status")
        )
      );
    }

    return data(
      {},
      await flash(request, success(`Status updated to ${status}`))
    );
  }

  // Handle field update from properties sidebar
  if (!field) {
    return data(
      { error: { message: "Field is required" } },
      await flash(request, error(null, "Field is required"))
    );
  }

  const updateData: Record<string, unknown> = {
    id: dispatchId,
    updatedBy: userId
  };

  // Handle different field types
  switch (field) {
    case "priority":
    case "severity":
    case "source":
    case "suspectedFailureModeId":
    case "actualFailureModeId":
      updateData[field] = value || null;
      break;
    case "isFailure":
      updateData[field] = value === "true";
      break;
    default:
      return data(
        { error: { message: `Unknown field: ${field}` } },
        await flash(request, error(null, `Unknown field: ${field}`))
      );
  }

  const updateDispatch = await upsertMaintenanceDispatch(
    client,
    updateData as Parameters<typeof upsertMaintenanceDispatch>[1]
  );

  if (updateDispatch.error) {
    return data(
      { error: updateDispatch.error },
      await flash(request, error(updateDispatch.error, "Failed to update"))
    );
  }

  return data({}, await flash(request, success("Updated successfully")));
}

export default function MaintenanceDispatchPropertiesRoute() {
  return null;
}
