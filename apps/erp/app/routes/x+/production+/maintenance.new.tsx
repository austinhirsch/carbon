import { assertIsPost, error, success } from "@carbon/auth";
import { requirePermissions } from "@carbon/auth/auth.server";
import { flash } from "@carbon/auth/session.server";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { redirect } from "react-router";
import { upsertMaintenanceDispatch } from "~/modules/production";
import { getParams, path } from "~/utils/path";

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

  const insertDispatch = await upsertMaintenanceDispatch(client, {
    status: "Open",
    priority: "Medium",
    source: "reactive",
    companyId,
    createdBy: userId
  });

  if (insertDispatch.error) {
    throw redirect(
      `${path.to.maintenanceDispatches}?${getParams(request)}`,
      await flash(
        request,
        error(insertDispatch.error, "Failed to create maintenance dispatch")
      )
    );
  }

  const newId = insertDispatch.data?.id;
  if (!newId) {
    throw redirect(
      `${path.to.maintenanceDispatches}?${getParams(request)}`,
      await flash(request, error(null, "Failed to get new dispatch ID"))
    );
  }

  throw redirect(
    path.to.maintenanceDispatch(newId),
    await flash(request, success("Created maintenance dispatch"))
  );
}

export default function NewMaintenanceDispatchRoute() {
  return null;
}
