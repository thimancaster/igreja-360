import { useClassroomOccupancy } from "@/hooks/useCapacityManagement";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface CapacityIndicatorProps {
  classroom: string;
  eventDate?: string;
  showText?: boolean;
}

export function CapacityIndicator({ classroom, eventDate, showText = true }: CapacityIndicatorProps) {
  const { data: occupancy, isLoading } = useClassroomOccupancy(classroom, eventDate);

  if (isLoading || !occupancy) {
    return <Badge variant="outline" className="animate-pulse">...</Badge>;
  }

  const { current, max } = occupancy;
  const percentage = max > 0 ? (current / max) * 100 : 0;
  
  const getVariant = () => {
    if (percentage >= 100) return "destructive";
    if (percentage >= 80) return "warning";
    return "secondary";
  };

  const getColorClass = () => {
    if (percentage >= 100) return "bg-destructive text-destructive-foreground";
    if (percentage >= 80) return "bg-yellow-500 text-white";
    return "bg-green-500 text-white";
  };

  return (
    <Badge className={cn("font-medium", getColorClass())}>
      {current}/{max}
      {showText && (
        <span className="ml-1 text-xs opacity-80">
          {percentage >= 100 ? "(Lotado)" : percentage >= 80 ? "(Quase cheio)" : ""}
        </span>
      )}
    </Badge>
  );
}
