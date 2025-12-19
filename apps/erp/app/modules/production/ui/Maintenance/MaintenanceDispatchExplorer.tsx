import {
  DateTimePicker,
  Hidden,
  Number,
  Submit,
  ValidatedForm
} from "@carbon/form";
import {
  Button,
  Count,
  cn,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuIcon,
  DropdownMenuItem,
  DropdownMenuTrigger,
  HStack,
  IconButton,
  Input,
  InputGroup,
  InputLeftElement,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalTitle,
  ScrollArea,
  Skeleton,
  Textarea,
  useDisclosure,
  VStack
} from "@carbon/react";
import { useEffect, useState } from "react";
import { flushSync } from "react-dom";
import {
  LuBox,
  LuChevronRight,
  LuCirclePlus,
  LuClock,
  LuEllipsisVertical,
  LuSearch,
  LuTrash
} from "react-icons/lu";
import { Link, useFetcher, useParams } from "react-router";
import { Employee, Item, UnitOfMeasure, WorkCenter } from "~/components/Form";
import { ConfirmDelete } from "~/components/Modals";
import { LevelLine } from "~/components/TreeView";
import { usePermissions } from "~/hooks";
import { path } from "~/utils/path";
import {
  maintenanceDispatchEventValidator,
  maintenanceDispatchItemValidator
} from "../../production.models";
import type {
  MaintenanceDispatchEvent,
  MaintenanceDispatchItem
} from "../../types";

export type MaintenanceExplorerNode = {
  key: "items" | "events";
  name: string;
  pluralName: string;
  children: MaintenanceExplorerChild[];
};

export type MaintenanceExplorerChild =
  | (MaintenanceDispatchItem & { type: "item" })
  | (MaintenanceDispatchEvent & { type: "event" });

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
  events
}: {
  items: MaintenanceDispatchItem[];
  events: MaintenanceDispatchEvent[];
}) {
  const { dispatchId } = useParams();
  if (!dispatchId) throw new Error("dispatchId not found");

  const [filterText, setFilterText] = useState("");
  const deleteDisclosure = useDisclosure();
  const [selectedChild, setSelectedChild] =
    useState<MaintenanceExplorerChild | null>(null);

  const onDelete = (child: MaintenanceExplorerChild) => {
    flushSync(() => {
      setSelectedChild(child);
    });
    deleteDisclosure.onOpen();
  };

  const onDeleteCancel = () => {
    setSelectedChild(null);
    deleteDisclosure.onClose();
  };

  const getDeleteAction = () => {
    if (!selectedChild) return "";
    if (selectedChild.type === "item") {
      return path.to.deleteMaintenanceDispatchItem(
        dispatchId,
        selectedChild.id
      );
    }
    return path.to.deleteMaintenanceDispatchEvent(dispatchId, selectedChild.id);
  };

  const getDeleteName = () => {
    if (!selectedChild) return "";
    if (selectedChild.type === "item") {
      return selectedChild.item?.name ?? "Item";
    }
    return selectedChild.startTime
      ? new Date(selectedChild.startTime).toLocaleString()
      : "Timecard";
  };

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
              dispatchId={dispatchId}
              onDelete={onDelete}
            />
          ))}
        </VStack>
      </VStack>
      {deleteDisclosure.isOpen && selectedChild?.id && (
        <ConfirmDelete
          action={getDeleteAction()}
          name={getDeleteName()}
          text={`Are you sure you want to remove this ${selectedChild.type === "item" ? "item" : "timecard"}?`}
          isOpen={deleteDisclosure.isOpen}
          onCancel={onDeleteCancel}
          onSubmit={onDeleteCancel}
        />
      )}
    </ScrollArea>
  );
}

function MaintenanceExplorerItem({
  node,
  filterText,
  dispatchId,
  onDelete
}: {
  node: MaintenanceExplorerNode;
  filterText: string;
  dispatchId: string;
  onDelete: (child: MaintenanceExplorerChild) => void;
}) {
  const [isExpanded, setIsExpanded] = useState(
    node.children.length > 0 && node.children.length < 10
  );
  const newModal = useDisclosure();
  const permissions = usePermissions();

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
        {permissions.can("update", "production") && (
          <IconButton
            aria-label="Add"
            size="sm"
            variant="ghost"
            icon={<LuCirclePlus />}
            className="ml-auto"
            onClick={() => {
              newModal.onOpen();
            }}
          />
        )}
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
            filteredChildren.map((child) => (
              <MaintenanceExplorerChildItem
                key={child.id}
                child={child}
                nodeKey={node.key}
                onDelete={onDelete}
              />
            ))
          )}
        </div>
      )}

      {newModal.isOpen && node.key === "items" && (
        <NewItemModal
          open={newModal.isOpen}
          onClose={newModal.onClose}
          dispatchId={dispatchId}
        />
      )}
      {newModal.isOpen && node.key === "events" && (
        <NewTimecardModal
          open={newModal.isOpen}
          onClose={newModal.onClose}
          dispatchId={dispatchId}
        />
      )}
    </>
  );
}

function MaintenanceExplorerChildItem({
  child,
  nodeKey,
  onDelete
}: {
  child: MaintenanceExplorerChild;
  nodeKey: MaintenanceExplorerNode["key"];
  onDelete: (child: MaintenanceExplorerChild) => void;
}) {
  const link = getChildLink(child);
  const icon = getNodeIcon(nodeKey);
  const label = getChildLabel(child);
  const permissions = usePermissions();

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

  return (
    <div className="group/child relative flex w-full">
      {link ? (
        <Link to={link} className="flex w-full">
          {content}
        </Link>
      ) : (
        <div className="flex w-full">{content}</div>
      )}
      {permissions.can("delete", "production") && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <IconButton
              aria-label="Options"
              icon={<LuEllipsisVertical />}
              variant="ghost"
              size="sm"
              className="absolute right-1 top-0 flex-shrink-0 opacity-0 group-hover/child:opacity-100 data-[state=open]:opacity-100 text-foreground/70 hover:text-foreground"
            />
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem
              destructive
              onSelect={() => {
                onDelete(child);
              }}
            >
              <DropdownMenuIcon icon={<LuTrash />} />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}

function NewItemModal({
  open,
  onClose,
  dispatchId
}: {
  open: boolean;
  onClose: () => void;
  dispatchId: string;
}) {
  const fetcher = useFetcher();

  useEffect(() => {
    if (fetcher.state === "idle" && fetcher.data) {
      onClose();
    }
  }, [fetcher.state, fetcher.data, onClose]);

  return (
    <Modal
      open={open}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <ModalContent>
        <ValidatedForm
          method="post"
          action={path.to.newMaintenanceDispatchItem(dispatchId)}
          validator={maintenanceDispatchItemValidator}
          fetcher={fetcher}
        >
          <ModalHeader>
            <ModalTitle>Add Item</ModalTitle>
          </ModalHeader>
          <ModalBody>
            <Hidden name="maintenanceDispatchId" value={dispatchId} />
            <VStack spacing={4}>
              <Item name="itemId" label="Item" type="Item" />
              <Number name="quantity" label="Quantity" minValue={1} />
              <UnitOfMeasure name="unitOfMeasureCode" label="Unit of Measure" />
              <Number name="unitCost" label="Unit Cost" minValue={0} />
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Submit>Add</Submit>
          </ModalFooter>
        </ValidatedForm>
      </ModalContent>
    </Modal>
  );
}

function NewTimecardModal({
  open,
  onClose,
  dispatchId
}: {
  open: boolean;
  onClose: () => void;
  dispatchId: string;
}) {
  const fetcher = useFetcher();

  useEffect(() => {
    if (fetcher.state === "idle" && fetcher.data) {
      onClose();
    }
  }, [fetcher.state, fetcher.data, onClose]);

  return (
    <Modal
      open={open}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <ModalContent>
        <ValidatedForm
          method="post"
          action={path.to.newMaintenanceDispatchEvent(dispatchId)}
          validator={maintenanceDispatchEventValidator}
          fetcher={fetcher}
        >
          <ModalHeader>
            <ModalTitle>Add Timecard</ModalTitle>
          </ModalHeader>
          <ModalBody>
            <Hidden name="maintenanceDispatchId" value={dispatchId} />
            <VStack spacing={4}>
              <Employee name="employeeId" label="Employee" />
              <WorkCenter name="workCenterId" label="Work Center" />
              <DateTimePicker name="startTime" label="Start Time" />
              <DateTimePicker name="endTime" label="End Time" />
              <Textarea name="notes" label="Notes" />
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Submit>Add</Submit>
          </ModalFooter>
        </ValidatedForm>
      </ModalContent>
    </Modal>
  );
}

function getNodeIcon(key: MaintenanceExplorerNode["key"]) {
  switch (key) {
    case "items":
      return <LuBox className="text-blue-500" />;
    case "events":
      return <LuClock className="text-green-500" />;
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
        : "Timecard";
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
    default:
      return "";
  }
}

function getChildLink(child: MaintenanceExplorerChild): string | null {
  switch (child.type) {
    case "item":
      return path.to.part(child.itemId);
    default:
      return null;
  }
}

export default MaintenanceDispatchExplorer;
