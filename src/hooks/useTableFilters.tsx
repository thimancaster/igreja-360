import { useState, useMemo, useCallback } from "react";

export type SortDirection = "asc" | "desc" | null;

interface UseTableFiltersOptions<T> {
  data: T[];
  searchFields: (keyof T)[];
  initialSortField?: keyof T;
  initialSortDirection?: SortDirection;
}

export function useTableFilters<T extends Record<string, any>>({
  data,
  searchFields,
  initialSortField,
  initialSortDirection = null,
}: UseTableFiltersOptions<T>) {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState<keyof T | null>(initialSortField || null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(initialSortDirection);

  const handleSort = useCallback((field: keyof T) => {
    if (sortField === field) {
      // Cycle: asc -> desc -> null
      if (sortDirection === "asc") {
        setSortDirection("desc");
      } else if (sortDirection === "desc") {
        setSortDirection(null);
        setSortField(null);
      } else {
        setSortDirection("asc");
      }
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  }, [sortField, sortDirection]);

  const filteredAndSortedData = useMemo(() => {
    let result = [...data];

    // Apply search filter
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter((item) =>
        searchFields.some((field) => {
          const value = item[field];
          if (value === null || value === undefined) return false;
          return String(value).toLowerCase().includes(term);
        })
      );
    }

    // Apply sorting
    if (sortField && sortDirection) {
      result.sort((a, b) => {
        const aVal = a[sortField];
        const bVal = b[sortField];

        if (aVal === null || aVal === undefined) return 1;
        if (bVal === null || bVal === undefined) return -1;

        let comparison = 0;
        if (typeof aVal === "number" && typeof bVal === "number") {
          comparison = aVal - bVal;
        } else if (typeof aVal === "string" && typeof bVal === "string") {
          comparison = aVal.localeCompare(bVal, "pt-BR");
        } else {
          comparison = String(aVal).localeCompare(String(bVal), "pt-BR");
        }

        return sortDirection === "asc" ? comparison : -comparison;
      });
    }

    return result;
  }, [data, searchTerm, searchFields, sortField, sortDirection]);

  return {
    searchTerm,
    setSearchTerm,
    sortField,
    sortDirection,
    handleSort,
    filteredData: filteredAndSortedData,
  };
}
