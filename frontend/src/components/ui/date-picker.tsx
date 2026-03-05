/**
 * DatePicker with text input + calendar popover + Today button.
 *
 * Users can type dates manually or pick from the calendar.
 * The calendar supports year/month drill-down navigation.
 */

import * as React from "react"
import { format, parse, isValid } from "date-fns"
import { CalendarIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface DatePickerProps {
  /** Date value as YYYY-MM-DD string */
  value?: string
  /** Called with YYYY-MM-DD string or undefined when cleared */
  onChange: (date: string | undefined) => void
  placeholder?: string
  disabled?: boolean
  className?: string
}

const INPUT_FORMAT = "yyyy-MM-dd"

function DatePicker({
  value,
  onChange,
  placeholder = "YYYY-MM-DD",
  disabled,
  className,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false)
  const [inputValue, setInputValue] = React.useState(value || "")
  const [inputError, setInputError] = React.useState(false)

  const selected = React.useMemo(() => {
    if (!value) return undefined
    const d = parse(value, INPUT_FORMAT, new Date())
    return isValid(d) ? d : undefined
  }, [value])

  // Sync input text when value prop changes externally
  React.useEffect(() => {
    setInputValue(value || "")
    setInputError(false)
  }, [value])

  const handleCalendarSelect = (date: Date | undefined) => {
    if (date) {
      const formatted = format(date, INPUT_FORMAT)
      onChange(formatted)
      setInputValue(formatted)
    } else {
      onChange(undefined)
      setInputValue("")
    }
    setInputError(false)
    setOpen(false)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value
    setInputValue(raw)
    setInputError(false)

    // If cleared, emit undefined
    if (!raw.trim()) {
      onChange(undefined)
      return
    }

    // Try to parse as YYYY-MM-DD
    const parsed = parse(raw, INPUT_FORMAT, new Date())
    if (isValid(parsed) && raw.length === 10) {
      onChange(format(parsed, INPUT_FORMAT))
    }
  }

  const handleInputBlur = () => {
    if (!inputValue.trim()) {
      onChange(undefined)
      setInputError(false)
      return
    }
    const parsed = parse(inputValue, INPUT_FORMAT, new Date())
    if (isValid(parsed)) {
      const formatted = format(parsed, INPUT_FORMAT)
      onChange(formatted)
      setInputValue(formatted)
      setInputError(false)
    } else {
      setInputError(true)
    }
  }

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault()
      handleInputBlur()
    }
  }

  const handleToday = () => {
    const today = format(new Date(), INPUT_FORMAT)
    onChange(today)
    setInputValue(today)
    setInputError(false)
    setOpen(false)
  }

  return (
    <div className={cn("flex items-center gap-0", className)}>
      <Input
        value={inputValue}
        onChange={handleInputChange}
        onBlur={handleInputBlur}
        onKeyDown={handleInputKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        className={cn(
          "rounded-r-none border-r-0 font-mono text-sm",
          inputError && "border-destructive focus-visible:ring-destructive/50"
        )}
      />
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            disabled={disabled}
            className="rounded-l-none border-l-0 shrink-0"
            aria-label="Open calendar"
          >
            <CalendarIcon className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          data-portal-ignore-click-outside
          className="w-auto p-0"
          align="end"
        >
          <Calendar
            mode="single"
            selected={selected}
            onSelect={handleCalendarSelect}
            defaultMonth={selected}
          />
          <div className="border-t border-border px-3 py-2">
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-xs"
              onClick={handleToday}
            >
              Today
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}

export { DatePicker }
export type { DatePickerProps }
