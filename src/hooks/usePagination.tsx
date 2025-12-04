import { useState, useMemo } from "react";

interface UsePaginationOptions {
  initialPage?: number;
  initialPageSize?: number;
}

interface UsePaginationReturn<T> {
  currentPage: number;
  pageSize: number;
  totalPages: number;
  totalItems: number;
  paginatedData: T[];
  goToPage: (page: number) => void;
  nextPage: () => void;
  previousPage: () => void;
  setPageSize: (size: number) => void;
  startIndex: number;
  endIndex: number;
  canGoNext: boolean;
  canGoPrevious: boolean;
}

export function usePagination<T>(
  data: T[] | undefined,
  options: UsePaginationOptions = {}
): UsePaginationReturn<T> {
  const { initialPage = 1, initialPageSize = 10 } = options;
  
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [pageSize, setPageSizeState] = useState(initialPageSize);

  const totalItems = data?.length || 0;
  const totalPages = Math.ceil(totalItems / pageSize);

  // Reset to first page if current page is out of bounds
  const safePage = useMemo(() => {
    if (currentPage > totalPages && totalPages > 0) {
      return totalPages;
    }
    return Math.max(1, currentPage);
  }, [currentPage, totalPages]);

  const paginatedData = useMemo(() => {
    if (!data) return [];
    const start = (safePage - 1) * pageSize;
    const end = start + pageSize;
    return data.slice(start, end);
  }, [data, safePage, pageSize]);

  const startIndex = totalItems > 0 ? (safePage - 1) * pageSize + 1 : 0;
  const endIndex = Math.min(safePage * pageSize, totalItems);

  const goToPage = (page: number) => {
    const clampedPage = Math.max(1, Math.min(page, totalPages));
    setCurrentPage(clampedPage);
  };

  const nextPage = () => {
    if (safePage < totalPages) {
      setCurrentPage(safePage + 1);
    }
  };

  const previousPage = () => {
    if (safePage > 1) {
      setCurrentPage(safePage - 1);
    }
  };

  const setPageSize = (size: number) => {
    setPageSizeState(size);
    setCurrentPage(1); // Reset to first page when changing page size
  };

  return {
    currentPage: safePage,
    pageSize,
    totalPages,
    totalItems,
    paginatedData,
    goToPage,
    nextPage,
    previousPage,
    setPageSize,
    startIndex,
    endIndex,
    canGoNext: safePage < totalPages,
    canGoPrevious: safePage > 1,
  };
}
