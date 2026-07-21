"use client"

import * as React from "react"
import { CalendarIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { dateKey } from "@/lib/cycle"
import { buttonVariants } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

function keyToLocalDate(key: string | undefined): Date | undefined {
  if (!key) return undefined
  const [y, m, d] = key.split("-").map(Number)
  if (!y || !m || !d) return undefined
  return new Date(y, m - 1, d)
}

/** A "YYYY-MM-DD" date field backed by a themed popover calendar instead of
 * the browser's native <input type="date"> picker — the native picker's
 * open/close behavior is inconsistent across Chrome/Firefox/Safari, which is
 * exactly what this replaces (see the onboarding first-period-date field). */
export function DatePicker({
  value,
  onChange,
  max,
  min,
  placeholder = "Pick a date",
  className,
  disabled,
}: {
  value: string
  onChange: (value: string) => void
  max?: string
  min?: string
  placeholder?: string
  className?: string
  disabled?: boolean
}) {
  const [open, setOpen] = React.useState(false)
  const selected = keyToLocalDate(value)
  const maxDate = keyToLocalDate(max)
  const minDate = keyToLocalDate(min)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        disabled={disabled}
        className={cn(
          buttonVariants({ variant: "outline" }),
          "h-10 w-full justify-start gap-2 px-2.5 font-normal",
          !selected && "text-muted-foreground",
          className
        )}
      >
        <CalendarIcon className="size-4 shrink-0" />
        <span className="truncate">
          {selected
            ? selected.toLocaleDateString(undefined, {
                year: "numeric",
                month: "long",
                day: "numeric",
              })
            : placeholder}
        </span>
      </PopoverTrigger>
      <PopoverContent align="start">
        <Calendar
          mode="single"
          selected={selected}
          defaultMonth={selected}
          onSelect={(date) => {
            if (!date) return
            onChange(dateKey(date.getFullYear(), date.getMonth(), date.getDate()))
            setOpen(false)
          }}
          disabled={(date) =>
            (maxDate ? date > maxDate : false) || (minDate ? date < minDate : false)
          }
          autoFocus
        />
      </PopoverContent>
    </Popover>
  )
}
