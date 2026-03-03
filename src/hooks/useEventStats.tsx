import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { startOfMonth, endOfMonth, format } from "date-fns";

export function useEventStats() {
  const { user, profile } = useAuth();
  const churchId = profile?.church_id;

  const { data: stats, isLoading } = useQuery({
    queryKey: ["event-stats", churchId],
    queryFn: async () => {
      if (!churchId) return null;

      const now = new Date();
      const monthStart = startOfMonth(now).toISOString();
      const monthEnd = endOfMonth(now).toISOString();

      // Events this month
      const { data: monthEvents, error: evError } = await supabase
        .from("ministry_events")
        .select("id, title, start_datetime, event_type, max_capacity, is_paid_event, ticket_price")
        .eq("church_id", churchId)
        .gte("start_datetime", monthStart)
        .lte("start_datetime", monthEnd);
      if (evError) throw evError;

      // All registrations for these events
      const eventIds = (monthEvents || []).map(e => e.id);
      let registrations: any[] = [];
      if (eventIds.length > 0) {
        const { data: regs } = await supabase
          .from("event_registrations")
          .select("event_id, status, payment_status, payment_amount, check_in_at")
          .in("event_id", eventIds);
        registrations = regs || [];
      }

      // All events for charts (last 6 months)
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      const { data: allEvents } = await supabase
        .from("ministry_events")
        .select("id, title, start_datetime, event_type, max_capacity, is_paid_event, ticket_price")
        .eq("church_id", churchId)
        .gte("start_datetime", sixMonthsAgo.toISOString())
        .order("start_datetime", { ascending: true });

      let allRegs: any[] = [];
      const allEventIds = (allEvents || []).map(e => e.id);
      if (allEventIds.length > 0) {
        const { data: regs } = await supabase
          .from("event_registrations")
          .select("event_id, status, payment_status, payment_amount, check_in_at")
          .in("event_id", allEventIds);
        allRegs = regs || [];
      }

      const totalEventsMonth = monthEvents?.length || 0;
      const totalRegistered = registrations.filter(r => r.status !== "cancelled").length;
      const totalCheckedIn = registrations.filter(r => r.check_in_at).length;
      const avgAttendance = totalEventsMonth > 0 ? Math.round((totalCheckedIn / Math.max(totalRegistered, 1)) * 100) : 0;
      const totalRevenue = registrations
        .filter(r => r.payment_status === "paid")
        .reduce((sum, r) => sum + (r.payment_amount || 0), 0);

      // Events by type
      const byType: Record<string, number> = {};
      (allEvents || []).forEach(e => {
        byType[e.event_type] = (byType[e.event_type] || 0) + 1;
      });

      // Audience per event (top 10)
      const audienceByEvent = (allEvents || []).map(e => {
        const eventRegs = allRegs.filter(r => r.event_id === e.id && r.status !== "cancelled");
        return {
          name: e.title.length > 20 ? e.title.substring(0, 20) + "..." : e.title,
          inscritos: eventRegs.length,
          presentes: eventRegs.filter(r => r.check_in_at).length,
        };
      }).sort((a, b) => b.inscritos - a.inscritos).slice(0, 10);

      // Monthly evolution
      const monthlyData: Record<string, { events: number; registrations: number; revenue: number }> = {};
      (allEvents || []).forEach(e => {
        const month = format(new Date(e.start_datetime), "yyyy-MM");
        if (!monthlyData[month]) monthlyData[month] = { events: 0, registrations: 0, revenue: 0 };
        monthlyData[month].events += 1;
        const eventRegs = allRegs.filter(r => r.event_id === e.id && r.status !== "cancelled");
        monthlyData[month].registrations += eventRegs.length;
        monthlyData[month].revenue += eventRegs
          .filter(r => r.payment_status === "paid")
          .reduce((s, r) => s + (r.payment_amount || 0), 0);
      });

      const monthlyEvolution = Object.entries(monthlyData)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([month, data]) => ({
          month: format(new Date(month + "-01"), "MMM/yy"),
          ...data,
        }));

      return {
        totalEventsMonth,
        totalRegistered,
        avgAttendance,
        totalRevenue,
        byType: Object.entries(byType).map(([name, value]) => ({ name, value })),
        audienceByEvent,
        monthlyEvolution,
      };
    },
    enabled: !!churchId && !!user,
  });

  return { stats, isLoading };
}
