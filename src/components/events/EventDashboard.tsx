import { useEventStats } from "@/hooks/useEventStats";
import { EventStatsCards } from "./EventStatsCards";
import { EventCharts } from "./EventCharts";
import { LoadingSpinner } from "@/components/LoadingSpinner";

export function EventDashboard() {
  const { stats, isLoading } = useEventStats();

  if (isLoading) {
    return <div className="flex items-center justify-center p-12"><LoadingSpinner size="lg" /></div>;
  }

  if (!stats) {
    return <p className="text-center text-muted-foreground py-12">Sem dados disponíveis</p>;
  }

  return (
    <div className="space-y-6">
      <EventStatsCards
        totalEvents={stats.totalEventsMonth}
        totalRegistered={stats.totalRegistered}
        avgAttendance={stats.avgAttendance}
        totalRevenue={stats.totalRevenue}
      />
      <EventCharts
        byType={stats.byType}
        audienceByEvent={stats.audienceByEvent}
        monthlyEvolution={stats.monthlyEvolution}
      />
    </div>
  );
}
