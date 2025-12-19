import { assertIsPost, error, success } from "@carbon/auth";
import { requirePermissions } from "@carbon/auth/auth.server";
import { flash } from "@carbon/auth/session.server";
import { validationError, validator } from "@carbon/form";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  HStack,
  VStack
} from "@carbon/react";
import { LuPlay, LuSquare } from "react-icons/lu";
import type { ActionFunctionArgs } from "react-router";
import { data, useFetcher, useParams } from "react-router";
import { EmployeeAvatar } from "~/components";
import { usePermissions, useRouteData, useUser } from "~/hooks";
import {
  maintenanceDispatchEventValidator,
  upsertMaintenanceDispatchEvent
} from "~/modules/production";
import type { MaintenanceDispatchEvent } from "~/modules/production/types";
import { path } from "~/utils/path";

export async function action({ request, params }: ActionFunctionArgs) {
  assertIsPost(request);
  const { client, userId } = await requirePermissions(request, {
    update: "production"
  });

  const { dispatchId } = params;
  if (!dispatchId) throw new Error("dispatchId not found");

  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "start") {
    const insertEvent = await upsertMaintenanceDispatchEvent(client, {
      maintenanceDispatchId: dispatchId,
      employeeId: userId,
      startTime: new Date().toISOString(),
      createdBy: userId
    });

    if (insertEvent.error) {
      return data(
        {},
        await flash(request, error(insertEvent.error, "Failed to start event"))
      );
    }

    return data({}, await flash(request, success("Event started")));
  }

  if (intent === "stop") {
    const eventId = formData.get("eventId") as string;
    if (!eventId) throw new Error("eventId not found");

    const updateEvent = await upsertMaintenanceDispatchEvent(client, {
      id: eventId,
      endTime: new Date().toISOString(),
      updatedBy: userId
    });

    if (updateEvent.error) {
      return data(
        {},
        await flash(request, error(updateEvent.error, "Failed to stop event"))
      );
    }

    return data({}, await flash(request, success("Event stopped")));
  }

  const validation = await validator(
    maintenanceDispatchEventValidator
  ).validate(formData);

  if (validation.error) {
    return validationError(validation.error);
  }

  const upsertEvent = await upsertMaintenanceDispatchEvent(client, {
    ...validation.data,
    maintenanceDispatchId: dispatchId,
    createdBy: userId,
    updatedBy: validation.data.id ? userId : undefined
  });

  if (upsertEvent.error) {
    return data(
      {},
      await flash(request, error(upsertEvent.error, "Failed to save event"))
    );
  }

  return data({}, await flash(request, success("Event saved")));
}

export default function MaintenanceDispatchEventsRoute() {
  const { dispatchId } = useParams();
  if (!dispatchId) throw new Error("dispatchId not found");

  const user = useUser();
  const permissions = usePermissions();
  const fetcher = useFetcher();

  const routeData = useRouteData<{
    events: MaintenanceDispatchEvent[];
  }>(path.to.maintenanceDispatch(dispatchId));

  const events = routeData?.events ?? [];
  const activeEvent = events.find(
    (e) => e.employeeId === user.id && !e.endTime
  );

  return (
    <VStack spacing={4}>
      <HStack className="justify-between w-full">
        <h2 className="text-lg font-semibold">Time Events</h2>
        {permissions.can("update", "production") && (
          <fetcher.Form method="post">
            {activeEvent ? (
              <>
                <input type="hidden" name="intent" value="stop" />
                <input type="hidden" name="eventId" value={activeEvent.id} />
                <Button
                  type="submit"
                  variant="secondary"
                  leftIcon={<LuSquare />}
                  isLoading={fetcher.state !== "idle"}
                >
                  Stop Timer
                </Button>
              </>
            ) : (
              <>
                <input type="hidden" name="intent" value="start" />
                <Button
                  type="submit"
                  variant="primary"
                  leftIcon={<LuPlay />}
                  isLoading={fetcher.state !== "idle"}
                >
                  Start Timer
                </Button>
              </>
            )}
          </fetcher.Form>
        )}
      </HStack>

      {events.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No time events recorded yet. Click "Start Timer" to begin tracking
            time.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {events.map((event) => (
            <Card key={event.id}>
              <CardHeader className="pb-2">
                <HStack className="justify-between">
                  <HStack>
                    <EmployeeAvatar employeeId={event.employeeId} size="xs" />
                    <span className="text-sm font-medium">
                      {event.employee?.fullName ?? "Unknown"}
                    </span>
                  </HStack>
                  {!event.endTime && (
                    <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                      In Progress
                    </span>
                  )}
                </HStack>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Start:</span>{" "}
                    {new Date(event.startTime).toLocaleString()}
                  </div>
                  <div>
                    <span className="text-muted-foreground">End:</span>{" "}
                    {event.endTime
                      ? new Date(event.endTime).toLocaleString()
                      : "-"}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Duration:</span>{" "}
                    {event.duration ? `${event.duration} min` : "-"}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Work Center:</span>{" "}
                    {event.workCenter?.name ?? "-"}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </VStack>
  );
}
