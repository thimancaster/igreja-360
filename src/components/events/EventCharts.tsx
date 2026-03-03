import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend } from "recharts";

const EVENT_TYPE_LABELS: Record<string, string> = {
  service: "Culto",
  special: "Especial",
  activity: "Atividade",
  meeting: "Reunião",
};

const COLORS = ["hsl(var(--primary))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))"];

interface EventChartsProps {
  byType: Array<{ name: string; value: number }>;
  audienceByEvent: Array<{ name: string; inscritos: number; presentes: number }>;
  monthlyEvolution: Array<{ month: string; events: number; registrations: number; revenue: number }>;
}

export function EventCharts({ byType, audienceByEvent, monthlyEvolution }: EventChartsProps) {
  const typePieData = byType.map(d => ({
    ...d,
    name: EVENT_TYPE_LABELS[d.name] || d.name,
  }));

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Audience per Event */}
      <Card variant="glass">
        <CardHeader>
          <CardTitle className="text-lg">Público por Evento</CardTitle>
        </CardHeader>
        <CardContent>
          {audienceByEvent.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={audienceByEvent} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                <Legend />
                <Bar dataKey="inscritos" fill="hsl(var(--primary))" name="Inscritos" radius={[0, 4, 4, 0]} />
                <Bar dataKey="presentes" fill="hsl(var(--chart-2))" name="Presentes" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-center text-muted-foreground py-12">Sem dados de eventos</p>
          )}
        </CardContent>
      </Card>

      {/* Events by Type */}
      <Card variant="glass">
        <CardHeader>
          <CardTitle className="text-lg">Distribuição por Tipo</CardTitle>
        </CardHeader>
        <CardContent>
          {typePieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={typePieData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  {typePieData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-center text-muted-foreground py-12">Sem dados de tipos</p>
          )}
        </CardContent>
      </Card>

      {/* Monthly Evolution */}
      <Card variant="glass" className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="text-lg">Evolução Mensal</CardTitle>
        </CardHeader>
        <CardContent>
          {monthlyEvolution.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={monthlyEvolution}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                <Legend />
                <Line yAxisId="left" type="monotone" dataKey="events" stroke="hsl(var(--primary))" name="Eventos" strokeWidth={2} />
                <Line yAxisId="left" type="monotone" dataKey="registrations" stroke="hsl(var(--chart-2))" name="Inscrições" strokeWidth={2} />
                <Line yAxisId="right" type="monotone" dataKey="revenue" stroke="hsl(var(--chart-4))" name="Receita (R$)" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-center text-muted-foreground py-12">Sem dados de evolução</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
