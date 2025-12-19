import { error } from "@carbon/auth";
import { requirePermissions } from "@carbon/auth/auth.server";
import { flash } from "@carbon/auth/session.server";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  VStack
} from "@carbon/react";
import type { LoaderFunctionArgs } from "react-router";
import {
  Outlet,
  redirect,
  useLoaderData,
  useNavigate,
  useParams
} from "react-router";
import {
  getFailureModesList,
  getMaintenanceDispatch,
  getMaintenanceDispatchComments,
  getMaintenanceDispatchEvents,
  getMaintenanceDispatchItems,
  getMaintenanceDispatchWorkCenters
} from "~/modules/production";
import {
  MaintenanceDispatchHeader,
  MaintenanceDispatchProperties
} from "~/modules/production/ui/Maintenance";
import type { Handle } from "~/utils/handle";
import { path } from "~/utils/path";

export const handle: Handle = {
  breadcrumb: "Maintenance",
  to: path.to.maintenanceDispatches,
  module: "production"
};

export async function loader({ request, params }: LoaderFunctionArgs) {
  const { client, companyId } = await requirePermissions(request, {
    view: "production"
  });

  const { dispatchId } = params;
  if (!dispatchId) throw new Error("Could not find dispatchId");

  const [dispatch, events, items, workCenters, comments, failureModes] =
    await Promise.all([
      getMaintenanceDispatch(client, dispatchId),
      getMaintenanceDispatchEvents(client, dispatchId),
      getMaintenanceDispatchItems(client, dispatchId),
      getMaintenanceDispatchWorkCenters(client, dispatchId),
      getMaintenanceDispatchComments(client, dispatchId),
      getFailureModesList(client, companyId)
    ]);

  if (dispatch.error) {
    throw redirect(
      path.to.maintenanceDispatches,
      await flash(
        request,
        error(dispatch.error, "Failed to load maintenance dispatch")
      )
    );
  }

  return {
    dispatch: dispatch.data,
    events: events.data ?? [],
    items: items.data ?? [],
    workCenters: workCenters.data ?? [],
    comments: comments.data ?? [],
    failureModes: failureModes.data ?? []
  };
}

export default function MaintenanceDispatchRoute() {
  const { dispatchId } = useParams();
  const navigate = useNavigate();
  const { events, items, comments } = useLoaderData<typeof loader>();

  if (!dispatchId) throw new Error("Could not find dispatchId");

  const currentPath =
    typeof window !== "undefined" ? window.location.pathname : "";
  const currentTab = currentPath.includes("/events")
    ? "events"
    : currentPath.includes("/items")
      ? "items"
      : currentPath.includes("/comments")
        ? "comments"
        : "overview";

  return (
    <div className="flex flex-col h-[calc(100dvh-49px)] overflow-hidden w-full">
      <MaintenanceDispatchHeader />
      <div className="flex h-[calc(100dvh-99px)] overflow-hidden w-full">
        <div className="flex flex-grow overflow-hidden">
          <div className="flex-1 overflow-y-auto">
            <Tabs
              value={currentTab}
              onValueChange={(value) => {
                if (value === "overview") {
                  navigate(path.to.maintenanceDispatch(dispatchId));
                } else {
                  navigate(
                    `${path.to.maintenanceDispatch(dispatchId)}/${value}`
                  );
                }
              }}
              className="w-full"
            >
              <TabsList className="px-4 pt-2">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="events">
                  Events {events.length > 0 && `(${events.length})`}
                </TabsTrigger>
                <TabsTrigger value="items">
                  Items {items.length > 0 && `(${items.length})`}
                </TabsTrigger>
                <TabsTrigger value="comments">
                  Comments {comments.length > 0 && `(${comments.length})`}
                </TabsTrigger>
              </TabsList>
              <TabsContent value={currentTab} className="p-4">
                <VStack spacing={4}>
                  <Outlet />
                </VStack>
              </TabsContent>
            </Tabs>
          </div>
          <MaintenanceDispatchProperties />
        </div>
      </div>
    </div>
  );
}
