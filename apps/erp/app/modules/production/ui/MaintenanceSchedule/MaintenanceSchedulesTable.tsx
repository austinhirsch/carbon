import { HStack, MenuIcon, MenuItem, Status } from "@carbon/react";
import type { ColumnDef } from "@tanstack/react-table";
import { memo, useCallback, useMemo } from "react";
import { LuPencil, LuTrash } from "react-icons/lu";
import { useNavigate } from "react-router";
import { Hyperlink, New, Table } from "~/components";
import { Enumerable } from "~/components/Enumerable";
import { usePermissions, useUrlParams } from "~/hooks";
import { path } from "~/utils/path";
import {
  maintenanceDispatchPriority,
  maintenanceFrequency
} from "../../production.models";
import type { MaintenanceSchedule } from "../../types";
import { MaintenancePriority } from "../Maintenance";

type MaintenanceSchedulesTableProps = {
  data: MaintenanceSchedule[];
  count: number;
};

const MaintenanceSchedulesTable = memo(
  ({ data, count }: MaintenanceSchedulesTableProps) => {
    const [params] = useUrlParams();
    const navigate = useNavigate();
    const permissions = usePermissions();

    const columns = useMemo<ColumnDef<MaintenanceSchedule>[]>(() => {
      return [
        {
          accessorKey: "name",
          header: "Schedule Name",
          cell: ({ row }) => (
            <Hyperlink to={row.original.id}>
              <Enumerable value={row.original.name} />
            </Hyperlink>
          )
        },
        {
          accessorKey: "workCenter",
          header: "Work Center",
          cell: ({ row }) => row.original.workCenter?.name ?? "-"
        },
        {
          accessorKey: "frequency",
          header: "Frequency",
          cell: (item) => {
            const frequency =
              item.getValue<(typeof maintenanceFrequency)[number]>();
            return <Enumerable value={frequency} />;
          },
          meta: {
            filter: {
              type: "static",
              options: maintenanceFrequency.map((freq) => ({
                value: freq,
                label: freq
              }))
            },
            pluralHeader: "Frequencies"
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
          accessorKey: "estimatedDuration",
          header: "Est. Duration",
          cell: ({ row }) =>
            row.original.estimatedDuration
              ? `${row.original.estimatedDuration} min`
              : "-"
        },
        {
          accessorKey: "active",
          header: "Status",
          cell: ({ row }) =>
            row.original.active ? (
              <Status color="green">Active</Status>
            ) : (
              <Status color="gray">Inactive</Status>
            )
        },
        {
          accessorKey: "nextDueAt",
          header: "Next Due",
          cell: ({ row }) =>
            row.original.nextDueAt
              ? new Date(row.original.nextDueAt).toLocaleDateString()
              : "-"
        }
      ];
    }, []);

    const renderContextMenu = useCallback(
      (row: MaintenanceSchedule) => {
        return (
          <>
            <MenuItem
              onClick={() => {
                navigate(
                  `${path.to.maintenanceSchedule(row.id)}?${params.toString()}`
                );
              }}
            >
              <MenuIcon icon={<LuPencil />} />
              Edit Schedule
            </MenuItem>
            <MenuItem
              destructive
              disabled={!permissions.can("delete", "production")}
              onClick={() => {
                navigate(
                  `${path.to.deleteMaintenanceSchedule(row.id)}?${params.toString()}`
                );
              }}
            >
              <MenuIcon icon={<LuTrash />} />
              Delete Schedule
            </MenuItem>
          </>
        );
      },
      [navigate, params, permissions]
    );

    return (
      <Table<MaintenanceSchedule>
        data={data}
        columns={columns}
        count={count}
        primaryAction={
          permissions.can("create", "production") && (
            <New
              label="Maintenance Schedule"
              to={`${path.to.newMaintenanceSchedule}?${params.toString()}`}
            />
          )
        }
        renderContextMenu={renderContextMenu}
        title="Maintenance Schedules"
      />
    );
  }
);

MaintenanceSchedulesTable.displayName = "MaintenanceSchedulesTable";
export default MaintenanceSchedulesTable;
