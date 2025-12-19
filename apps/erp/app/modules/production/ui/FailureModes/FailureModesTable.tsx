import { MenuIcon, MenuItem } from "@carbon/react";
import type { ColumnDef } from "@tanstack/react-table";
import { memo, useCallback, useMemo } from "react";
import { LuPencil, LuTrash } from "react-icons/lu";
import { useNavigate } from "react-router";
import { Hyperlink, New, Table } from "~/components";
import { Enumerable } from "~/components/Enumerable";
import { usePermissions, useUrlParams } from "~/hooks";
import { useCustomColumns } from "~/hooks/useCustomColumns";
import { path } from "~/utils/path";
import type { FailureMode } from "../../types";

type FailureModesTableProps = {
  data: FailureMode[];
  count: number;
};

const FailureModesTable = memo(({ data, count }: FailureModesTableProps) => {
  const [params] = useUrlParams();
  const navigate = useNavigate();
  const permissions = usePermissions();

  const customColumns = useCustomColumns<FailureMode>("maintenanceFailureMode");
  const columns = useMemo<ColumnDef<FailureMode>[]>(() => {
    const defaultColumns: ColumnDef<FailureMode>[] = [
      {
        accessorKey: "name",
        header: "Failure Mode",
        cell: ({ row }) => (
          <Hyperlink to={row.original.id}>
            <Enumerable value={row.original.name} />
          </Hyperlink>
        )
      }
    ];
    return [...defaultColumns, ...customColumns];
  }, [customColumns]);

  const renderContextMenu = useCallback(
    (row: FailureMode) => {
      return (
        <>
          <MenuItem
            onClick={() => {
              navigate(`${path.to.failureMode(row.id)}?${params.toString()}`);
            }}
          >
            <MenuIcon icon={<LuPencil />} />
            Edit Failure Mode
          </MenuItem>
          <MenuItem
            destructive
            disabled={!permissions.can("delete", "production")}
            onClick={() => {
              navigate(
                `${path.to.deleteFailureMode(row.id)}?${params.toString()}`
              );
            }}
          >
            <MenuIcon icon={<LuTrash />} />
            Delete Failure Mode
          </MenuItem>
        </>
      );
    },
    [navigate, params, permissions]
  );

  return (
    <Table<FailureMode>
      data={data}
      columns={columns}
      count={count}
      primaryAction={
        permissions.can("create", "production") && (
          <New
            label="Failure Mode"
            to={`${path.to.newFailureMode}?${params.toString()}`}
          />
        )
      }
      renderContextMenu={renderContextMenu}
      title="Failure Modes"
    />
  );
});

FailureModesTable.displayName = "FailureModesTable";
export default FailureModesTable;
