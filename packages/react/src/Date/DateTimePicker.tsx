import type { DateValue } from "@internationalized/date";
import { useDatePicker } from "@react-aria/datepicker";
import { useDatePickerState } from "@react-stately/datepicker";
import type { DatePickerProps } from "@react-types/datepicker";
import { useRef } from "react";
import { LuBan } from "react-icons/lu";
import { cn } from "..";
import { HStack } from "../HStack";
import { InputGroup } from "../Input";
import { Popover, PopoverContent, PopoverTrigger } from "../Popover";
import { FieldButton } from "./components/Button";
import { Calendar } from "./components/Calendar";
import DateField from "./components/DateField";
import TimeField from "./TimePicker";

const DateTimePicker = (
  props: DatePickerProps<DateValue> & {
    className?: string;
    withButton?: boolean;
  }
) => {
  const state = useDatePickerState({
    ...props,
    shouldCloseOnSelect: false
  });
  const ref = useRef<HTMLDivElement>(null);
  const { groupProps, fieldProps, buttonProps, dialogProps, calendarProps } =
    useDatePicker(props, state, ref);

  return (
    <Popover open={state.isOpen} onOpenChange={state.setOpen}>
      <div className="relative inline-flex flex-col w-full">
        <HStack className="w-full" spacing={0}>
          <InputGroup
            {...groupProps}
            ref={ref}
            className={cn("w-full inline-flex", props.className)}
          >
            <div className="flex w-full px-4 py-2">
              <DateField {...fieldProps} />
              {state.isInvalid && (
                <LuBan className="!text-destructive-foreground absolute right-[12px] top-[12px]" />
              )}
            </div>
            {props.withButton !== false && (
              <div className="flex-shrink-0 -mt-px">
                <PopoverTrigger tabIndex={-1}>
                  <FieldButton {...buttonProps} isPressed={state.isOpen} />
                </PopoverTrigger>
              </div>
            )}
          </InputGroup>
        </HStack>
        <PopoverContent align="end" {...dialogProps}>
          <Calendar {...calendarProps} />
          <TimeField
            label="Time"
            value={state.timeValue}
            onChange={state.setTimeValue}
          />
        </PopoverContent>
      </div>
    </Popover>
  );
};

export default DateTimePicker;
