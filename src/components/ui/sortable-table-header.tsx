import React from "react";
import { ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";
import { TableHead } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { SortDirection } from "@/hooks/useTableFilters";

interface SortableTableHeaderProps {
  children: React.ReactNode;
  field: string;
  currentSortField: string | null;
  sortDirection: SortDirection;
  onSort: (field: string) => void;
  className?: string;
}

export const SortableTableHeader: React.FC<SortableTableHeaderProps> = ({
  children,
  field,
  currentSortField,
  sortDirection,
  onSort,
  className,
}) => {
  const isActive = currentSortField === field;

  return (
    <TableHead
      onClick={() => onSort(field)}
      className={cn(
        "cursor-pointer select-none transition-colors hover:bg-muted/50",
        isActive && "bg-muted/30",
        className
      )}
    >
      <div className="flex items-center gap-1">
        <span>{children}</span>
        {isActive ? (
          sortDirection === "asc" ? (
            <ArrowUp className="h-4 w-4" />
          ) : (
            <ArrowDown className="h-4 w-4" />
          )
        ) : (
          <ArrowUpDown className="h-4 w-4 text-muted-foreground/50" />
        )}
      </div>
    </TableHead>
  );
};
