import { HStack, MenuIcon, MenuItem } from "@carbon/react";
import type { ColumnDef } from "@tanstack/react-table";
import { memo, useCallback, useMemo } from "react";
import { LuPencil, LuTrash } from "react-icons/lu";
import { useNavigate } from "react-router";
import { EmployeeAvatar, Hyperlink, New, Table } from "~/components";
import { usePermissions, useUrlParams } from "~/hooks";
import { path } from "~/utils/path";
import {
  maintenanceDispatchPriority,
  maintenanceDispatchStatus
} from "../../production.models";
import type { MaintenanceDispatch } from "../../types";
import MaintenancePriority from "./MaintenancePriority";
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

    const columns = useMemo<ColumnDef<MaintenanceDispatch>[]>(() => {
      return [
        {
          accessorKey: "id",
          header: "Dispatch ID",
          cell: ({ row }) => (
            <Hyperlink to={path.to.maintenanceDispatch(row.original.id)}>
              {row.original.id}
            </Hyperlink>
          )
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
          }
        },
        {
          accessorKey: "plannedStartTime",
          header: "Planned Start",
          cell: ({ row }) => {
            const date = row.original.plannedStartTime;
            return date ? new Date(date).toLocaleDateString() : "-";
          }
        },
        {
          accessorKey: "createdAt",
          header: "Created",
          cell: ({ row }) => {
            const date = row.original.createdAt;
            return date ? new Date(date).toLocaleDateString() : "-";
          }
        }
      ];
    }, []);

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
              label="Maintenance Dispatch"
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
