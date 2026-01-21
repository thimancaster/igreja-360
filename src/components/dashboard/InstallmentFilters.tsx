import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { X, Filter, RotateCcw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export interface InstallmentFiltersState {
  period: "30" | "60" | "90" | "all";
  status: "all" | "paid" | "pending" | "overdue";
}

interface InstallmentFiltersProps {
  filters: InstallmentFiltersState;
  onFiltersChange: (filters: InstallmentFiltersState) => void;
}

export function InstallmentFilters({
  filters,
  onFiltersChange,
}: InstallmentFiltersProps) {
  const hasActiveFilters = filters.period !== "all" || filters.status !== "all";

  const handleReset = () => {
    onFiltersChange({ period: "all", status: "all" });
  };

  const handleRemoveFilter = (key: keyof InstallmentFiltersState) => {
    onFiltersChange({ ...filters, [key]: "all" });
  };

  const getPeriodLabel = (period: string) => {
    switch (period) {
      case "30":
        return "Próximos 30 dias";
      case "60":
        return "Próximos 60 dias";
      case "90":
        return "Próximos 90 dias";
      default:
        return "Todos os períodos";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "paid":
        return "Pagas";
      case "pending":
        return "Pendentes";
      case "overdue":
        return "Vencidas";
      default:
        return "Todos os status";
    }
  };

  return (
    <div className="space-y-3">
      {/* Filter Controls */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Filter className="h-4 w-4" />
          <span className="hidden sm:inline">Filtros:</span>
        </div>

        <Select
          value={filters.period}
          onValueChange={(value) =>
            onFiltersChange({ ...filters, period: value as InstallmentFiltersState["period"] })
          }
        >
          <SelectTrigger className="w-[140px] sm:w-[160px] h-9">
            <SelectValue placeholder="Período" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="30">Próx. 30 dias</SelectItem>
            <SelectItem value="60">Próx. 60 dias</SelectItem>
            <SelectItem value="90">Próx. 90 dias</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={filters.status}
          onValueChange={(value) =>
            onFiltersChange({ ...filters, status: value as InstallmentFiltersState["status"] })
          }
        >
          <SelectTrigger className="w-[120px] sm:w-[140px] h-9">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="paid">Pagas</SelectItem>
            <SelectItem value="pending">Pendentes</SelectItem>
            <SelectItem value="overdue">Vencidas</SelectItem>
          </SelectContent>
        </Select>

        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleReset}
            className="h-9 px-2 text-muted-foreground hover:text-foreground"
          >
            <RotateCcw className="h-4 w-4 mr-1" />
            <span className="hidden sm:inline">Limpar</span>
          </Button>
        )}
      </div>

      {/* Active Filter Chips */}
      <AnimatePresence>
        {hasActiveFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="flex flex-wrap gap-2"
          >
            {filters.period !== "all" && (
              <Badge
                variant="secondary"
                className="flex items-center gap-1 pl-2 pr-1 py-1"
              >
                {getPeriodLabel(filters.period)}
                <button
                  onClick={() => handleRemoveFilter("period")}
                  className="ml-1 rounded-full hover:bg-muted-foreground/20 p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
            {filters.status !== "all" && (
              <Badge
                variant="secondary"
                className="flex items-center gap-1 pl-2 pr-1 py-1"
              >
                {getStatusLabel(filters.status)}
                <button
                  onClick={() => handleRemoveFilter("status")}
                  className="ml-1 rounded-full hover:bg-muted-foreground/20 p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
