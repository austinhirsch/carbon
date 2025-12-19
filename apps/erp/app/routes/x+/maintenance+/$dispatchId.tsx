import { error } from "@carbon/auth";
import { requirePermissions } from "@carbon/auth/auth.server";
import { flash } from "@carbon/auth/session.server";
import { type JSONContent, VStack } from "@carbon/react";
import type { LoaderFunctionArgs } from "react-router";
import { Outlet, redirect, useLoaderData, useParams } from "react-router";
import { PanelProvider, ResizablePanels } from "~/components/Layout/Panels";
import {
  getFailureModesList,
  getMaintenanceDispatch,
  getMaintenanceDispatchComments,
  getMaintenanceDispatchEvents,
  getMaintenanceDispatchItems,
  getMaintenanceDispatchWorkCenters
} from "~/modules/production";
import {
  MaintenanceDispatchExplorer,
  MaintenanceDispatchHeader,
  MaintenanceDispatchNotes,
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
  const { dispatch, events, items, workCenters } =
    useLoaderData<typeof loader>();

  if (!dispatchId) throw new Error("Could not find dispatchId");

  const isCompleted = dispatch?.status === "Completed";

  return (
    <PanelProvider>
      <div className="flex flex-col h-[calc(100dvh-49px)] overflow-hidden w-full">
        <MaintenanceDispatchHeader />
        <div className="flex h-[calc(100dvh-99px)] overflow-hidden w-full">
          <div className="flex flex-grow overflow-hidden">
            <ResizablePanels
              explorer={
                <MaintenanceDispatchExplorer
                  items={items}
                  events={events}
                  workCenters={workCenters}
                />
              }
              content={
                <div className="h-[calc(100dvh-99px)] overflow-y-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-accent w-full">
                  <VStack spacing={2} className="p-2">
                    <MaintenanceDispatchNotes
                      id={dispatchId}
                      content={(dispatch?.content ?? {}) as JSONContent}
                      isDisabled={isCompleted}
                    />
                    <Outlet />
                  </VStack>
                </div>
              }
              properties={<MaintenanceDispatchProperties />}
            />
          </div>
        </div>
      </div>
    </PanelProvider>
  );
}
