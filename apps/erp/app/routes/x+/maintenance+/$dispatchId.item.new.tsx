import { assertIsPost, error, success } from "@carbon/auth";
import { requirePermissions } from "@carbon/auth/auth.server";
import { flash } from "@carbon/auth/session.server";
import { validator } from "@carbon/form";
import type { ActionFunctionArgs } from "react-router";
import { redirect } from "react-router";
import {
  maintenanceDispatchItemValidator,
  upsertMaintenanceDispatchItem
} from "~/modules/production";
import { path, requestReferrer } from "~/utils/path";

export async function action({ request, params }: ActionFunctionArgs) {
  assertIsPost(request);
  const { client, companyId, userId } = await requirePermissions(request, {
    update: "production"
  });

  const { dispatchId } = params;
  if (!dispatchId) throw new Error("Could not find dispatchId");

  const formData = await request.formData();
  const validation = await validator(maintenanceDispatchItemValidator).validate(
    formData
  );

  if (validation.error) {
    throw redirect(
      requestReferrer(request) ?? path.to.maintenanceDispatch(dispatchId),
      await flash(request, error(validation.error, "Invalid form data"))
    );
  }

  const { itemId, quantity, unitOfMeasureCode, unitCost } = validation.data;

  const result = await upsertMaintenanceDispatchItem(client, {
    maintenanceDispatchId: dispatchId,
    itemId,
    quantity,
    unitOfMeasureCode,
    unitCost: unitCost ?? 0,
    companyId,
    createdBy: userId
  });

  if (result.error) {
    throw redirect(
      requestReferrer(request) ?? path.to.maintenanceDispatch(dispatchId),
      await flash(request, error(result.error, "Failed to add item"))
    );
  }

  throw redirect(
    requestReferrer(request) ?? path.to.maintenanceDispatch(dispatchId),
    await flash(request, success("Item added successfully"))
  );
}
