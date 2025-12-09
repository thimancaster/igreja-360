import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer } from 'recharts';
import { BarChart3 } from 'lucide-react';

interface DataPoint {
  month: string;
  monthLabel: string;
  revenue: number;
  expenses: number;
}

interface MonthlyComparisonChartProps {
  data: DataPoint[];
  isLoading?: boolean;
}

const chartConfig = {
  revenue: {
    label: 'Receitas',
    color: 'hsl(142, 76%, 36%)',
  },
  expenses: {
    label: 'Despesas',
    color: 'hsl(0, 84%, 60%)',
  },
};

export const MonthlyComparisonChart = ({ data, isLoading }: MonthlyComparisonChartProps) => {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Comparativo Mensal
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[250px] flex items-center justify-center">
            <div className="animate-pulse bg-muted rounded-lg w-full h-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.6, delay: 0.4 }}
    >
      <Card className="h-full overflow-hidden border-border/50 bg-gradient-to-br from-card to-card/80">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.6, type: 'spring' }}
            >
              <BarChart3 className="h-5 w-5 text-primary" />
            </motion.div>
            Comparativo Mensal
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
                <XAxis 
                  dataKey="monthLabel" 
                  tickLine={false}
                  axisLine={false}
                  className="text-xs fill-muted-foreground"
                />
                <YAxis 
                  tickLine={false}
                  axisLine={false}
                  className="text-xs fill-muted-foreground"
                  tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                />
                <ChartTooltip 
                  content={
                    <ChartTooltipContent 
                      formatter={(value) => 
                        new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value))
                      }
                    />
                  } 
                />
                <Bar
                  dataKey="revenue"
                  fill="hsl(142, 76%, 36%)"
                  radius={[4, 4, 0, 0]}
                  animationDuration={1200}
                  animationBegin={400}
                />
                <Bar
                  dataKey="expenses"
                  fill="hsl(0, 84%, 60%)"
                  radius={[4, 4, 0, 0]}
                  animationDuration={1200}
                  animationBegin={600}
                />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>
    </motion.div>
  );
};
