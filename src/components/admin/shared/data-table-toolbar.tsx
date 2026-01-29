"use client";

import * as React from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface DataTableToolbarProps {
  globalFilter: string;
  onGlobalFilterChange: (value: string) => void;
  placeholder?: string;
  filterSlot?: React.ReactNode;
  actionSlot?: React.ReactNode;
  debounceMs?: number;
}

export function DataTableToolbar({
  globalFilter,
  onGlobalFilterChange,
  placeholder = "Search...",
  filterSlot,
  actionSlot,
  debounceMs = 300,
}: DataTableToolbarProps) {
  const [internalValue, setInternalValue] = React.useState(globalFilter);
  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync internal value when external globalFilter changes
  React.useEffect(() => {
    setInternalValue(globalFilter);
  }, [globalFilter]);

  // Debounce the filter change
  const handleInputChange = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setInternalValue(value);

      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }

      debounceRef.current = setTimeout(() => {
        onGlobalFilterChange(value);
      }, debounceMs);
    },
    [onGlobalFilterChange, debounceMs]
  );

  // Cleanup timeout on unmount
  React.useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  const handleClear = React.useCallback(() => {
    setInternalValue("");
    onGlobalFilterChange("");
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
  }, [onGlobalFilterChange]);

  return (
    <div className="flex items-center justify-between">
      <div className="flex flex-1 items-center space-x-2">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
          <Input
            placeholder={placeholder}
            value={internalValue}
            onChange={handleInputChange}
            className="pl-8 pr-8"
          />
          {internalValue && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-0 top-0 h-full w-8 hover:bg-transparent"
              onClick={handleClear}
            >
              <X className="h-4 w-4 text-slate-400" />
              <span className="sr-only">Clear search</span>
            </Button>
          )}
        </div>

        {/* Slot for additional filter dropdowns */}
        {filterSlot}
      </div>

      {/* Slot for action buttons (e.g., Export, Add New) */}
      {actionSlot && <div className="flex items-center space-x-2">{actionSlot}</div>}
    </div>
  );
}
