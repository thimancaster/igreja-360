import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Area, AreaChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer, ReferenceLine } from 'recharts';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Wallet, Calendar } from 'lucide-react';
import { type PeriodFilter } from '@/hooks/useEvolutionData';

interface DataPoint {
  month: string;
  monthLabel: string;
  balance: number;
}

interface BalanceAreaChartProps {
  data: DataPoint[];
  isLoading?: boolean;
  period: PeriodFilter;
  onPeriodChange: (period: PeriodFilter) => void;
}

const chartConfig = {
  balance: {
    label: 'Saldo',
    color: 'hsl(221, 83%, 53%)',
  },
};

const PERIOD_LABELS: Record<PeriodFilter, string> = {
  '3m': 'Últimos 3 meses',
  '6m': 'Últimos 6 meses',
  '12m': 'Últimos 12 meses',
  'quarter': 'Este trimestre',
  'year': 'Este ano',
};

export const BalanceAreaChart = ({ data, isLoading, period, onPeriodChange }: BalanceAreaChartProps) => {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Evolução do Saldo
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

  const lastBalance = data[data.length - 1]?.balance || 0;
  const isPositive = lastBalance >= 0;

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.6, delay: 0.5 }}
    >
      <Card className="h-full overflow-hidden border-border/50 bg-gradient-to-br from-card to-card/80">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <motion.div
                initial={{ scale: 0, rotate: -90 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.7, type: 'spring' }}
              >
                <Wallet className="h-5 w-5 text-primary" />
              </motion.div>
              Evolução do Saldo
            </CardTitle>
            <Select value={period} onValueChange={(value) => onPeriodChange(value as PeriodFilter)}>
              <SelectTrigger className="w-[160px] h-8 text-xs">
                <Calendar className="h-3 w-3 mr-1" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(PERIOD_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="balanceGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop 
                      offset="5%" 
                      stopColor={isPositive ? 'hsl(221, 83%, 53%)' : 'hsl(0, 84%, 60%)'} 
                      stopOpacity={0.4} 
                    />
                    <stop 
                      offset="95%" 
                      stopColor={isPositive ? 'hsl(221, 83%, 53%)' : 'hsl(0, 84%, 60%)'} 
                      stopOpacity={0} 
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
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
                <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" />
                <ChartTooltip 
                  content={
                    <ChartTooltipContent 
                      formatter={(value) => 
                        new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value))
                      }
                    />
                  } 
                />
                <Area
                  type="monotone"
                  dataKey="balance"
                  stroke={isPositive ? 'hsl(221, 83%, 53%)' : 'hsl(0, 84%, 60%)'}
                  strokeWidth={2}
                  fill="url(#balanceGradient)"
                  animationDuration={1800}
                  animationBegin={500}
                />
              </AreaChart>
            </ResponsiveContainer>
          </ChartContainer>
          <motion.div 
            className="mt-4 text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
          >
            <p className="text-sm text-muted-foreground">Saldo atual</p>
            <p className={`text-2xl font-bold ${isPositive ? 'text-primary' : 'text-rose-500'}`}>
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(lastBalance)}
            </p>
          </motion.div>
        </CardContent>
      </Card>
    </motion.div>
  );
};
