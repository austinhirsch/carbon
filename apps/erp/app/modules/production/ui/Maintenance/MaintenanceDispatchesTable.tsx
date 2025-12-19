import { HStack, MenuIcon, MenuItem } from "@carbon/react";
import { formatDate } from "@carbon/utils";
import type { ColumnDef } from "@tanstack/react-table";
import { memo, useCallback, useMemo } from "react";
import {
  LuBookMarked,
  LuBuilding,
  LuCalendar,
  LuChartNoAxesColumnIncreasing,
  LuDna,
  LuPencil,
  LuStar,
  LuTrash,
  LuUser
} from "react-icons/lu";
import { useNavigate } from "react-router";
import { EmployeeAvatar, Hyperlink, New, Table } from "~/components";
import { useWorkCenters } from "~/components/Form/WorkCenters";
import { usePermissions, useUrlParams } from "~/hooks";
import { path } from "~/utils/path";
import {
  maintenanceDispatchPriority,
  maintenanceDispatchStatus,
  maintenanceSource
} from "../../production.models";
import type { MaintenanceDispatch } from "../../types";
import MaintenancePriority from "./MaintenancePriority";
import MaintenanceSource from "./MaintenanceSource";
import MaintenanceStatus from "./MaintenanceStatus";

type MaintenanceDispatchesTableProps = {
  data: MaintenanceDispatch[];
  count: number;
};

const MaintenanceDispatchesTable = memo(
  ({ data, count }: MaintenanceDispatchesTableProps) => {
    const [params] = useUrlParams();
    const navigate = useNavigate();
    const permissions = usePermissions();
    const workCenters = useWorkCenters();

    const columns = useMemo<ColumnDef<MaintenanceDispatch>[]>(() => {
      return [
        {
          accessorKey: "maintenanceDispatchId",
          header: "Dispatch ID",
          cell: ({ row }) => (
            <Hyperlink to={path.to.maintenanceDispatch(row.original.id)}>
              {row.original.maintenanceDispatchId}
            </Hyperlink>
          ),
          meta: {
            icon: <LuBookMarked />
          }
        },
        {
          accessorKey: "source",
          header: "Source",
          cell: (item) => {
            const source = item.getValue<(typeof maintenanceSource)[number]>();
            return <MaintenanceSource source={source} />;
          },
          meta: {
            icon: <LuDna />,
            filter: {
              type: "static",
              options: maintenanceSource.map((source) => ({
                value: source,
                label: <MaintenanceSource source={source} />
              }))
            }
          }
        },
        {
          accessorKey: "status",
          header: "Status",
          cell: (item) => {
            const status =
              item.getValue<(typeof maintenanceDispatchStatus)[number]>();
            return <MaintenanceStatus status={status} />;
          },
          meta: {
            icon: <LuStar />,
            filter: {
              type: "static",
              options: maintenanceDispatchStatus.map((status) => ({
                value: status,
                label: <MaintenanceStatus status={status} />
              }))
            },
            pluralHeader: "Statuses"
          }
        },
        {
          accessorKey: "priority",
          header: "Priority",
          cell: (item) => {
            const priority =
              item.getValue<(typeof maintenanceDispatchPriority)[number]>();
            return <MaintenancePriority priority={priority} />;
          },
          meta: {
            icon: <LuChartNoAxesColumnIncreasing />,
            filter: {
              type: "static",
              options: maintenanceDispatchPriority.map((priority) => ({
                value: priority,
                label: <MaintenancePriority priority={priority} />
              }))
            },
            pluralHeader: "Priorities"
          }
        },
        {
          accessorKey: "assignee",
          header: "Assignee",
          cell: ({ row }) => {
            const assignee = row.original.assignee;
            if (!assignee?.id) {
              return <span className="text-muted-foreground">Unassigned</span>;
            }
            return (
              <HStack>
                <EmployeeAvatar employeeId={assignee.id} size="xs" />
              </HStack>
            );
          },
          meta: {
            icon: <LuUser />
          }
        },
        {
          accessorKey: "workCenterId",
          header: "Work Center",
          cell: ({ row }) => {
            const workCenterId = row.original.workCenterId;
            if (!workCenterId) {
              return <span className="text-muted-foreground">Unassigned</span>;
            }
            const workCenter = workCenters.find(
              (workCenter) => workCenter.value === workCenterId
            );
            if (!workCenter) {
              return <span className="text-muted-foreground">Unknown</span>;
            }
            return (
              <Hyperlink to={path.to.workCenter(workCenterId)}>
                {workCenter.label}
              </Hyperlink>
            );
          },
          meta: {
            icon: <LuBuilding />
          }
        },
        {
          accessorKey: "plannedStartTime",
          header: "Planned Start",
          cell: ({ row }) => {
            const date = row.original.plannedStartTime;
            return date ? formatDate(date) : "-";
          },
          meta: {
            icon: <LuCalendar />
          }
        },
        {
          accessorKey: "createdAt",
          header: "Created",
          cell: ({ row }) => {
            const date = row.original.createdAt;
            return date ? formatDate(date) : "-";
          },
          meta: {
            icon: <LuCalendar />
          }
        }
      ];
    }, [workCenters]);

    const renderContextMenu = useCallback(
      (row: MaintenanceDispatch) => {
        return (
          <>
            <MenuItem
              onClick={() => {
                navigate(path.to.maintenanceDispatch(row.id));
              }}
            >
              <MenuIcon icon={<LuPencil />} />
              Edit Dispatch
            </MenuItem>
            <MenuItem
              destructive
              disabled={!permissions.can("delete", "production")}
              onClick={() => {
                navigate(
                  `${path.to.deleteMaintenanceDispatch(row.id)}?${params.toString()}`
                );
              }}
            >
              <MenuIcon icon={<LuTrash />} />
              Delete Dispatch
            </MenuItem>
          </>
        );
      },
      [navigate, params, permissions]
    );

    return (
      <Table<MaintenanceDispatch>
        data={data}
        columns={columns}
        count={count}
        primaryAction={
          permissions.can("create", "production") && (
            <New
              label="Dispatch"
              to={`${path.to.newMaintenanceDispatch}?${params.toString()}`}
            />
          )
        }
        renderContextMenu={renderContextMenu}
        title="Maintenance Dispatches"
      />
    );
  }
);

MaintenanceDispatchesTable.displayName = "MaintenanceDispatchesTable";
export default MaintenanceDispatchesTable;
