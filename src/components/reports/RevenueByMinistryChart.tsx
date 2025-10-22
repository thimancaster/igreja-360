import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface ChartData {
  name: string;
  value: number;
}

interface RevenueByMinistryChartProps {
  data: ChartData[];
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-card p-2 border rounded-lg shadow-sm">
        <p className="font-bold">{`${label}`}</p>
        <p>{`Receita: ${new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(payload[0].value)}`}</p>
      </div>
    );
  }
  return null;
};

export function RevenueByMinistryChart({ data }: RevenueByMinistryChartProps) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{
          top: 5,
          right: 30,
          left: 20,
          bottom: 5,
        }}
      >
        <XAxis type="number" tickFormatter={(value) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", notation: "compact" }).format(value as number)} />
        <YAxis dataKey="name" type="category" width={80} />
        <Tooltip content={<CustomTooltip />} />
        <Legend />
        <Bar dataKey="value" name="Receita" fill="#16a34a" />
      </BarChart>
    </ResponsiveContainer>
  );
}