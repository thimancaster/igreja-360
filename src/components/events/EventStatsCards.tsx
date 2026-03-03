import { Card, CardContent } from "@/components/ui/card";
import { CalendarDays, Users, TrendingUp, DollarSign } from "lucide-react";

interface EventStatsCardsProps {
  totalEvents: number;
  totalRegistered: number;
  avgAttendance: number;
  totalRevenue: number;
}

export function EventStatsCards({ totalEvents, totalRegistered, avgAttendance, totalRevenue }: EventStatsCardsProps) {
  const cards = [
    { title: "Eventos no Mês", value: totalEvents, icon: CalendarDays, color: "text-blue-500" },
    { title: "Total de Inscritos", value: totalRegistered, icon: Users, color: "text-green-500" },
    { title: "Taxa de Presença", value: `${avgAttendance}%`, icon: TrendingUp, color: "text-purple-500" },
    { title: "Receita de Eventos", value: `R$ ${totalRevenue.toFixed(2)}`, icon: DollarSign, color: "text-amber-500" },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.title} variant="glass">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{card.title}</p>
                <p className="text-2xl font-bold mt-1">{card.value}</p>
              </div>
              <card.icon className={`h-8 w-8 ${card.color} opacity-80`} />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
