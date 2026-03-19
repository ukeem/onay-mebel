"use client";

import { CheckIcon, ChevronDownIcon } from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export interface SearchableSelectOption {
  value: string;
  label: string;
}

interface SearchableSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SearchableSelectOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  disabled?: boolean;
  className?: string;
  error?: boolean;
}

export function SearchableSelect({
  value,
  onChange,
  options,
  placeholder = "Выберите…",
  searchPlaceholder = "Поиск…",
  emptyText = "Не найдено",
  disabled = false,
  className,
  error,
}: SearchableSelectProps) {
  const [open, setOpen] = React.useState(false);

  const sorted = React.useMemo(
    () =>
      [...options].sort((a, b) =>
        a.label.localeCompare(b.label, "ru", { sensitivity: "base" }),
      ),
    [options],
  );

  const selected = sorted.find((o) => o.value === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "h-9 w-full justify-between font-normal",
            !selected && "text-muted-foreground",
            error && "ring-2 ring-destructive/50 border-destructive",
            disabled && "opacity-50",
            className,
          )}
        >
          <span className="truncate min-w-0">
            {selected ? selected.label : placeholder}
          </span>
          <ChevronDownIcon className="ml-1 size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="min-w-[var(--radix-popover-trigger-width)] w-auto max-w-[min(400px,90vw)] p-0"
        align="start"
        side="bottom"
        avoidCollisions
      >
        <Command
          filter={(value, search) => {
            const opt = sorted.find((o) => o.value === value);
            if (!opt) return 0;
            return opt.label.toLowerCase().includes(search.toLowerCase())
              ? 1
              : 0;
          }}
        >
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList>
            <CommandEmpty>{emptyText}</CommandEmpty>
            <CommandGroup>
              {sorted.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.value}
                  onSelect={(v) => {
                    onChange(v === value ? "" : v);
                    setOpen(false);
                  }}
                >
                  <span className="flex-1">{option.label}</span>
                  {value === option.value && (
                    <CheckIcon className="size-4 shrink-0" />
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
