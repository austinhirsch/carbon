import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  HStack,
  VStack
} from "@carbon/react";
import { useParams } from "react-router";
import { EmployeeAvatar } from "~/components";
import { useRouteData } from "~/hooks";
import type { MaintenanceDispatchDetail } from "~/modules/production/types";
import {
  MaintenancePriority,
  MaintenanceStatus
} from "~/modules/production/ui/Maintenance";
import { path } from "~/utils/path";

export default function MaintenanceDispatchOverview() {
  const { dispatchId } = useParams();
  if (!dispatchId) throw new Error("dispatchId not found");

  const routeData = useRouteData<{
    dispatch: MaintenanceDispatchDetail;
  }>(path.to.maintenanceDispatch(dispatchId));

  const dispatch = routeData?.dispatch;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Status</CardTitle>
        </CardHeader>
        <CardContent>
          <VStack spacing={4}>
            <HStack className="justify-between w-full">
              <span className="text-muted-foreground">Status</span>
              <MaintenanceStatus status={dispatch?.status} />
            </HStack>
            <HStack className="justify-between w-full">
              <span className="text-muted-foreground">Priority</span>
              <MaintenancePriority priority={dispatch?.priority} />
            </HStack>
            <HStack className="justify-between w-full">
              <span className="text-muted-foreground">Severity</span>
              <span>{dispatch?.severity ?? "-"}</span>
            </HStack>
            <HStack className="justify-between w-full">
              <span className="text-muted-foreground">Source</span>
              <span>{dispatch?.source ?? "-"}</span>
            </HStack>
          </VStack>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Timing</CardTitle>
        </CardHeader>
        <CardContent>
          <VStack spacing={4}>
            <HStack className="justify-between w-full">
              <span className="text-muted-foreground">Planned Start</span>
              <span>
                {dispatch?.plannedStartTime
                  ? new Date(dispatch.plannedStartTime).toLocaleString()
                  : "-"}
              </span>
            </HStack>
            <HStack className="justify-between w-full">
              <span className="text-muted-foreground">Planned End</span>
              <span>
                {dispatch?.plannedEndTime
                  ? new Date(dispatch.plannedEndTime).toLocaleString()
                  : "-"}
              </span>
            </HStack>
            <HStack className="justify-between w-full">
              <span className="text-muted-foreground">Actual Start</span>
              <span>
                {dispatch?.actualStartTime
                  ? new Date(dispatch.actualStartTime).toLocaleString()
                  : "-"}
              </span>
            </HStack>
            <HStack className="justify-between w-full">
              <span className="text-muted-foreground">Actual End</span>
              <span>
                {dispatch?.actualEndTime
                  ? new Date(dispatch.actualEndTime).toLocaleString()
                  : "-"}
              </span>
            </HStack>
            <HStack className="justify-between w-full">
              <span className="text-muted-foreground">Duration</span>
              <span>
                {dispatch?.duration ? `${dispatch.duration} min` : "-"}
              </span>
            </HStack>
          </VStack>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Assignment</CardTitle>
        </CardHeader>
        <CardContent>
          <VStack spacing={4}>
            <HStack className="justify-between w-full">
              <span className="text-muted-foreground">Assignee</span>
              {dispatch?.assignee ? (
                <EmployeeAvatar employeeId={dispatch.assignee} size="xs" />
              ) : (
                <span>Unassigned</span>
              )}
            </HStack>
            <HStack className="justify-between w-full">
              <span className="text-muted-foreground">Created By</span>
              {dispatch?.createdBy ? (
                <EmployeeAvatar employeeId={dispatch.createdBy} size="xs" />
              ) : (
                <span>-</span>
              )}
            </HStack>
          </VStack>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Failure Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <VStack spacing={4}>
            <HStack className="justify-between w-full">
              <span className="text-muted-foreground">Is Failure</span>
              <span>{dispatch?.isFailure ? "Yes" : "No"}</span>
            </HStack>
            <HStack className="justify-between w-full">
              <span className="text-muted-foreground">
                Suspected Failure Mode
              </span>
              <span>{dispatch?.suspectedFailureMode?.name ?? "-"}</span>
            </HStack>
            <HStack className="justify-between w-full">
              <span className="text-muted-foreground">Actual Failure Mode</span>
              <span>{dispatch?.actualFailureMode?.name ?? "-"}</span>
            </HStack>
          </VStack>
        </CardContent>
      </Card>
    </div>
  );
}
