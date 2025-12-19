import { assertIsPost, error, success } from "@carbon/auth";
import { requirePermissions } from "@carbon/auth/auth.server";
import { flash } from "@carbon/auth/session.server";
import type { ActionFunctionArgs } from "react-router";
import { redirect } from "react-router";
import {
  maintenanceDispatchStatus,
  upsertMaintenanceDispatch
} from "~/modules/production";
import { path, requestReferrer } from "~/utils/path";

export async function action({ request, params }: ActionFunctionArgs) {
  assertIsPost(request);
  const { client, userId } = await requirePermissions(request, {
    update: "production"
  });

  const { dispatchId } = params;
  if (!dispatchId) throw new Error("Could not find dispatchId");

  const formData = await request.formData();
  const status = formData.get(
    "status"
  ) as (typeof maintenanceDispatchStatus)[number];

  if (!status || !maintenanceDispatchStatus.includes(status)) {
    throw redirect(
      requestReferrer(request) ?? path.to.maintenanceDispatch(dispatchId),
      await flash(request, error(null, "Invalid status"))
    );
  }

  const update = await upsertMaintenanceDispatch(client, {
    id: dispatchId,
    status,
    assignee: ["Completed", "Cancelled"].includes(status) ? null : undefined,
    updatedBy: userId
  });

  if (update.error) {
    throw redirect(
      requestReferrer(request) ?? path.to.maintenanceDispatch(dispatchId),
      await flash(
        request,
        error(update.error, "Failed to update dispatch status")
      )
    );
  }

  throw redirect(
    requestReferrer(request) ?? path.to.maintenanceDispatch(dispatchId),
    await flash(request, success("Updated dispatch status"))
  );
}
