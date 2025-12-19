import { requirePermissions } from "@carbon/auth/auth.server";
import { VStack } from "@carbon/react";
import type { LoaderFunctionArgs } from "react-router";
import { Outlet, useLoaderData } from "react-router";
import { getMaintenanceDispatches } from "~/modules/production";
import MaintenanceDispatchesTable from "~/modules/production/ui/Maintenance/MaintenanceDispatchesTable";
import type { Handle } from "~/utils/handle";
import { path } from "~/utils/path";
import { getGenericQueryFilters } from "~/utils/query";

export const handle: Handle = {
  breadcrumb: "Maintenance",
  to: path.to.maintenanceDispatches
};

export async function loader({ request }: LoaderFunctionArgs) {
  const { client, companyId } = await requirePermissions(request, {
    view: "production",
    role: "employee"
  });

  const url = new URL(request.url);
  const searchParams = new URLSearchParams(url.search);
  const search = searchParams.get("search");
  const status = searchParams.get("status") ?? undefined;
  const { limit, offset, sorts, filters } =
    getGenericQueryFilters(searchParams);

  return await getMaintenanceDispatches(client, companyId, {
    search,
    status,
    limit,
    offset,
    sorts,
    filters
  });
}

export default function MaintenanceRoute() {
  const { data, count } = useLoaderData<typeof loader>();

  return (
    <VStack spacing={0} className="h-full">
      <MaintenanceDispatchesTable data={data ?? []} count={count ?? 0} />
      <Outlet />
    </VStack>
  );
}
