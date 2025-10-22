import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface ChartData {
  name: string;
  value: number;
  color: string;
}

interface ExpensesByCategoryChartProps {
  data: ChartData[];
}

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-card p-2 border rounded-lg shadow-sm">
        <p className="font-bold">{`${data.name}`}</p>
        <p>{`Valor: ${new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(data.value)}`}</p>
      </div>
    );
  }
  return null;
};

export function ExpensesByCategoryChart({ data }: ExpensesByCategoryChartProps) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          labelLine={false}
          outerRadius={100}
          fill="#8884d8"
          dataKey="value"
          nameKey="name"
        >
          {data.map((entry) => (
            <Cell key={`cell-${entry.name}`} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}