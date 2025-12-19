import {
  Count,
  cn,
  HStack,
  IconButton,
  Input,
  InputGroup,
  InputLeftElement,
  ScrollArea,
  Skeleton,
  VStack
} from "@carbon/react";
import { useState } from "react";
import {
  LuBox,
  LuChevronRight,
  LuClock,
  LuCog,
  LuSearch
} from "react-icons/lu";
import { Link } from "react-router";
import { EmployeeAvatar } from "~/components";
import { LevelLine } from "~/components/TreeView";
import { path } from "~/utils/path";
import type {
  MaintenanceDispatchEvent,
  MaintenanceDispatchItem,
  MaintenanceDispatchWorkCenter
} from "../../types";

export type MaintenanceExplorerNode = {
  key: "items" | "events" | "workCenters";
  name: string;
  pluralName: string;
  children: MaintenanceExplorerChild[];
};

export type MaintenanceExplorerChild =
  | (MaintenanceDispatchItem & { type: "item" })
  | (MaintenanceDispatchEvent & { type: "event" })
  | (MaintenanceDispatchWorkCenter & { type: "workCenter" });

export function MaintenanceDispatchExplorerSkeleton() {
  return (
    <div className="flex flex-col gap-1 w-full">
      <Skeleton className="h-7 w-full" />
      <Skeleton className="h-7 w-full" />
      <Skeleton className="h-7 w-3/4" />
    </div>
  );
}

export function MaintenanceDispatchExplorer({
  items,
  events,
  workCenters
}: {
  items: MaintenanceDispatchItem[];
  events: MaintenanceDispatchEvent[];
  workCenters: MaintenanceDispatchWorkCenter[];
}) {
  const [filterText, setFilterText] = useState("");

  const tree: MaintenanceExplorerNode[] = [
    {
      key: "items",
      name: "Item",
      pluralName: "Items",
      children: items.map((item) => ({ ...item, type: "item" as const }))
    },
    {
      key: "events",
      name: "Timecard",
      pluralName: "Timecards",
      children: events.map((event) => ({ ...event, type: "event" as const }))
    },
    {
      key: "workCenters",
      name: "Work Center",
      pluralName: "Work Centers",
      children: workCenters.map((wc) => ({
        ...wc,
        type: "workCenter" as const
      }))
    }
  ];

  return (
    <ScrollArea className="h-full">
      <VStack className="px-2">
        <HStack className="w-full py-2">
          <InputGroup size="sm" className="flex flex-grow">
            <InputLeftElement>
              <LuSearch className="h-4 w-4" />
            </InputLeftElement>
            <Input
              placeholder="Search..."
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
            />
          </InputGroup>
        </HStack>
        <VStack spacing={0}>
          {tree.map((node) => (
            <MaintenanceExplorerItem
              key={node.key}
              node={node}
              filterText={filterText}
            />
          ))}
        </VStack>
      </VStack>
    </ScrollArea>
  );
}

function MaintenanceExplorerItem({
  node,
  filterText
}: {
  node: MaintenanceExplorerNode;
  filterText: string;
}) {
  const [isExpanded, setIsExpanded] = useState(
    node.children.length > 0 && node.children.length < 10
  );

  const filteredChildren = node.children.filter((child) => {
    const searchText = getChildSearchText(child);
    return searchText.toLowerCase().includes(filterText.toLowerCase());
  });

  return (
    <>
      <div className="flex h-8 items-center overflow-hidden rounded-sm px-2 gap-2 text-sm w-full hover:bg-muted/90">
        <button
          className="flex flex-grow cursor-pointer items-center overflow-hidden font-medium"
          onClick={(e) => {
            e.stopPropagation();
            setIsExpanded(!isExpanded);
          }}
        >
          <div className="h-8 w-4 flex items-center justify-center">
            <LuChevronRight
              className={cn("size-4", isExpanded && "rotate-90")}
            />
          </div>
          <div className="flex flex-grow items-center justify-between gap-2">
            <span>{node.pluralName}</span>
            {filteredChildren.length > 0 && (
              <Count count={filteredChildren.length} />
            )}
          </div>
        </button>
      </div>

      {isExpanded && (
        <div className="flex flex-col w-full px-2">
          {node.children.length === 0 ? (
            <div className="flex h-8 items-center overflow-hidden rounded-sm px-2 gap-4">
              <LevelLine isSelected={false} />
              <div className="text-xs text-muted-foreground">
                No {node.name.toLowerCase()} found
              </div>
            </div>
          ) : (
            filteredChildren.map((child, index) => (
              <MaintenanceExplorerChildItem
                key={child.id}
                child={child}
                nodeKey={node.key}
              />
            ))
          )}
        </div>
      )}
    </>
  );
}

function MaintenanceExplorerChildItem({
  child,
  nodeKey
}: {
  child: MaintenanceExplorerChild;
  nodeKey: MaintenanceExplorerNode["key"];
}) {
  const link = getChildLink(child);
  const icon = getNodeIcon(nodeKey);
  const label = getChildLabel(child);

  const content = (
    <div className="flex pr-7 h-8 cursor-pointer items-center overflow-hidden rounded-sm px-1 gap-2 text-sm hover:bg-muted/90 w-full font-medium whitespace-nowrap">
      <LevelLine isSelected={false} />
      <div className="flex flex-grow items-center gap-2">
        {icon}
        <span className="truncate">{label}</span>
      </div>
      {child.type === "item" && <Count count={child.quantity ?? 0} />}
    </div>
  );

  if (link) {
    return (
      <Link to={link} className="flex w-full">
        {content}
      </Link>
    );
  }

  return <div className="flex w-full">{content}</div>;
}

function getNodeIcon(key: MaintenanceExplorerNode["key"]) {
  switch (key) {
    case "items":
      return <LuBox className="text-blue-500" />;
    case "events":
      return <LuClock className="text-green-500" />;
    case "workCenters":
      return <LuCog className="text-amber-500" />;
    default:
      return null;
  }
}

function getChildLabel(child: MaintenanceExplorerChild): string {
  switch (child.type) {
    case "item":
      return child.item?.name ?? child.itemId;
    case "event":
      return child.startTime
        ? new Date(child.startTime).toLocaleString()
        : "Event";
    case "workCenter":
      return child.workCenter?.name ?? child.workCenterId;
    default:
      return "";
  }
}

function getChildSearchText(child: MaintenanceExplorerChild): string {
  switch (child.type) {
    case "item":
      return child.item?.name ?? child.itemId;
    case "event":
      return child.notes ?? new Date(child.startTime).toLocaleString();
    case "workCenter":
      return child.workCenter?.name ?? child.workCenterId;
    default:
      return "";
  }
}

function getChildLink(child: MaintenanceExplorerChild): string | null {
  switch (child.type) {
    case "item":
      return path.to.item(child.itemId);
    case "workCenter":
      return path.to.workCenter(child.workCenterId);
    default:
      return null;
  }
}

export default MaintenanceDispatchExplorer;
