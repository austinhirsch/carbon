import { Status } from "@carbon/react";
import type { maintenanceDispatchPriority } from "../../production.models";

type MaintenancePriorityProps = {
  priority?: (typeof maintenanceDispatchPriority)[number] | null;
  className?: string;
};

function MaintenancePriority({
  priority,
  className
}: MaintenancePriorityProps) {
  switch (priority) {
    case "Low":
      return (
        <Status color="gray" className={className}>
          {priority}
        </Status>
      );
    case "Medium":
      return (
        <Status color="yellow" className={className}>
          {priority}
        </Status>
      );
    case "High":
      return (
        <Status color="orange" className={className}>
          {priority}
        </Status>
      );
    case "Critical":
      return (
        <Status color="red" className={className}>
          {priority}
        </Status>
      );
    default:
      return null;
  }
}

export default MaintenancePriority;
