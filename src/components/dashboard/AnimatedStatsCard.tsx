import { motion, useSpring, useTransform } from 'framer-motion';
import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Sparkline } from './Sparkline';

interface AnimatedStatsCardProps {
  title: string;
  value: number;
  trend?: number;
  icon: React.ReactNode;
  variant?: 'default' | 'success' | 'danger' | 'warning';
  delay?: number;
  formatAsCurrency?: boolean;
  sparklineData?: number[];
  sparklineColor?: string;
}

const AnimatedCounter = ({ value, formatAsCurrency = true }: { value: number; formatAsCurrency?: boolean }) => {
  const spring = useSpring(0, { duration: 1500 });
  const display = useTransform(spring, (current) => {
    if (formatAsCurrency) {
      return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
      }).format(current);
    }
    return Math.round(current).toLocaleString('pt-BR');
  });

  const [displayValue, setDisplayValue] = useState('R$ 0,00');

  useEffect(() => {
    spring.set(value);
    const unsubscribe = display.on('change', (v) => setDisplayValue(v));
    return () => unsubscribe();
  }, [value, spring, display]);

  return <span>{displayValue}</span>;
};

const variantStyles = {
  default: 'bg-card border-border',
  success: 'bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border-emerald-500/20',
  danger: 'bg-gradient-to-br from-rose-500/10 to-rose-600/5 border-rose-500/20',
  warning: 'bg-gradient-to-br from-amber-500/10 to-amber-600/5 border-amber-500/20',
};

const iconStyles = {
  default: 'bg-primary/10 text-primary',
  success: 'bg-emerald-500/20 text-emerald-600',
  danger: 'bg-rose-500/20 text-rose-600',
  warning: 'bg-amber-500/20 text-amber-600',
};

const sparklineColors = {
  default: 'hsl(var(--primary))',
  success: '#10b981',
  danger: '#ef4444',
  warning: '#f59e0b',
};

export const AnimatedStatsCard = ({
  title,
  value,
  trend,
  icon,
  variant = 'default',
  delay = 0,
  formatAsCurrency = true,
  sparklineData,
  sparklineColor,
}: AnimatedStatsCardProps) => {
  const TrendIcon = trend === undefined || trend === 0 ? Minus : trend > 0 ? TrendingUp : TrendingDown;
  const trendColor = trend === undefined || trend === 0 
    ? 'text-muted-foreground' 
    : trend > 0 
      ? 'text-emerald-600' 
      : 'text-rose-600';

  const effectiveSparklineColor = sparklineColor || sparklineColors[variant];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ 
        duration: 0.5, 
        delay: delay * 0.1,
        ease: [0.25, 0.46, 0.45, 0.94]
      }}
      whileHover={{ 
        scale: 1.02,
        transition: { duration: 0.2 }
      }}
    >
      <Card className={cn(
        'overflow-hidden border transition-all duration-300 hover:shadow-lg',
        variantStyles[variant]
      )}>
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div className="space-y-2 flex-1">
              <p className="text-sm font-medium text-muted-foreground">{title}</p>
              <motion.p 
                className="text-2xl font-bold tracking-tight"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: delay * 0.1 + 0.3 }}
              >
                <AnimatedCounter value={value} formatAsCurrency={formatAsCurrency} />
              </motion.p>
              
              {/* Trend and Sparkline row */}
              <div className="flex items-center justify-between gap-4">
                {trend !== undefined && (
                  <motion.div 
                    className={cn('flex items-center gap-1 text-sm font-medium', trendColor)}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: delay * 0.1 + 0.5 }}
                  >
                    <TrendIcon className="h-4 w-4" />
                    <span>{Math.abs(trend).toFixed(1)}%</span>
                    <span className="text-muted-foreground font-normal text-xs">vs mês</span>
                  </motion.div>
                )}
                
                {/* Sparkline */}
                {sparklineData && sparklineData.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: delay * 0.1 + 0.6 }}
                    className="flex-shrink-0"
                  >
                    <Sparkline 
                      data={sparklineData} 
                      color={effectiveSparklineColor}
                      width={80}
                      height={32}
                      strokeWidth={1.5}
                    />
                  </motion.div>
                )}
              </div>
            </div>
            
            <motion.div 
              className={cn('p-3 rounded-xl ml-4', iconStyles[variant])}
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ 
                delay: delay * 0.1 + 0.2,
                type: 'spring',
                stiffness: 200
              }}
            >
              {icon}
            </motion.div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};