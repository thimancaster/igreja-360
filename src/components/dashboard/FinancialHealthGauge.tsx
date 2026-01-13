import React, { useMemo } from "react";
import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Minus, Info, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useTransactionStats } from "@/hooks/useTransactions";
import { Skeleton } from "@/components/ui/skeleton";

interface HealthScore {
  score: number;
  label: string;
  color: string;
  glowColor: string;
  bgGradient: string;
  icon: React.ReactNode;
}

const calculateHealthScore = (stats: {
  balance: number;
  totalOverdue: number;
  totalPaid: number;
  totalPayable: number;
}): HealthScore => {
  let score = 50;

  if (stats.balance > 0) {
    const balanceRatio = Math.min(stats.balance / (stats.totalPaid || 1), 1);
    score += balanceRatio * 30;
  } else {
    score -= 20;
  }

  if (stats.totalOverdue > 0) {
    const overdueRatio = Math.min(stats.totalOverdue / ((stats.totalPayable || 1) + stats.totalOverdue), 1);
    score -= overdueRatio * 30;
  } else {
    score += 10;
  }

  const totalRevenue = stats.totalPaid;
  const totalExpense = stats.totalPayable + stats.totalOverdue;
  if (totalRevenue > totalExpense) {
    score += 10;
  } else if (totalExpense > totalRevenue * 1.5) {
    score -= 10;
  }

  score = Math.max(0, Math.min(100, score));

  if (score >= 70) {
    return {
      score,
      label: "Saudável",
      color: "#10b981",
      glowColor: "rgba(16, 185, 129, 0.4)",
      bgGradient: "from-emerald-500/20 via-emerald-400/10 to-transparent",
      icon: <TrendingUp className="h-5 w-5 text-emerald-500" />,
    };
  } else if (score >= 40) {
    return {
      score,
      label: "Atenção",
      color: "#f59e0b",
      glowColor: "rgba(245, 158, 11, 0.4)",
      bgGradient: "from-amber-500/20 via-amber-400/10 to-transparent",
      icon: <Minus className="h-5 w-5 text-amber-500" />,
    };
  } else {
    return {
      score,
      label: "Crítico",
      color: "#ef4444",
      glowColor: "rgba(239, 68, 68, 0.4)",
      bgGradient: "from-rose-500/20 via-rose-400/10 to-transparent",
      icon: <TrendingDown className="h-5 w-5 text-rose-500" />,
    };
  }
};

export const FinancialHealthGauge: React.FC = () => {
  const { data: stats, isLoading } = useTransactionStats();

  const health = useMemo(() => {
    if (!stats) return null;
    return calculateHealthScore({
      balance: stats.balance,
      totalOverdue: stats.totalOverdue,
      totalPaid: stats.totalPaid,
      totalPayable: stats.totalPayable,
    });
  }, [stats]);

  if (isLoading) {
    return (
      <Card className="relative overflow-hidden">
        <CardHeader className="pb-2">
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-36 w-36 rounded-full mx-auto" />
        </CardContent>
      </Card>
    );
  }

  if (!health) return null;

  const circumference = 2 * Math.PI * 45;
  const strokeDashoffset = circumference - (health.score / 100) * circumference;

  return (
    <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-card via-card to-muted/30">
      {/* Animated background glow */}
      <motion.div
        className={`absolute inset-0 bg-gradient-to-br ${health.bgGradient} opacity-60`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.6 }}
        transition={{ duration: 1 }}
      />
      
      {/* Subtle particle effect */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 rounded-full"
            style={{ backgroundColor: health.color }}
            initial={{ 
              x: Math.random() * 100 + '%',
              y: '100%',
              opacity: 0.3
            }}
            animate={{ 
              y: '-20%',
              opacity: [0.3, 0.6, 0]
            }}
            transition={{
              duration: 4 + Math.random() * 2,
              repeat: Infinity,
              delay: i * 0.8,
              ease: "easeOut"
            }}
          />
        ))}
      </div>

      <CardHeader className="pb-2 relative z-10">
        <CardTitle className="flex items-center justify-between text-lg">
          <motion.span 
            className="flex items-center gap-2"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            Saúde Financeira
            {health.icon}
          </motion.span>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  className="p-1 rounded-full hover:bg-muted/50 transition-colors"
                >
                  <Info className="h-4 w-4 text-muted-foreground" />
                </motion.button>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p className="text-sm">
                  Score calculado com base no saldo atual, contas vencidas e relação receita/despesa.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="flex flex-col items-center relative z-10">
        <div className="relative w-36 h-36">
          {/* Glow effect behind the gauge */}
          <motion.div
            className="absolute inset-0 rounded-full blur-xl"
            style={{ backgroundColor: health.glowColor }}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 0.5, scale: 1 }}
            transition={{ duration: 1.2, delay: 0.3 }}
          />
          
          <svg className="w-36 h-36 transform -rotate-90 relative z-10" viewBox="0 0 100 100">
            {/* Background circle with gradient */}
            <defs>
              <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor={health.color} stopOpacity="1" />
                <stop offset="100%" stopColor={health.color} stopOpacity="0.6" />
              </linearGradient>
              <filter id="glow">
                <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                <feMerge>
                  <feMergeNode in="coloredBlur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
            </defs>
            
            {/* Background circle */}
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke="currentColor"
              strokeWidth="6"
              className="text-muted/20"
            />
            
            {/* Animated progress circle */}
            <motion.circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke="url(#gaugeGradient)"
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={circumference}
              filter="url(#glow)"
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset }}
              transition={{ 
                duration: 2, 
                ease: [0.34, 1.56, 0.64, 1],
                delay: 0.3
              }}
            />

            {/* Animated dot at the end of progress */}
            <motion.circle
              cx="50"
              cy="5"
              r="4"
              fill={health.color}
              filter="url(#glow)"
              initial={{ opacity: 0 }}
              animate={{ 
                opacity: 1,
                rotate: (health.score / 100) * 360
              }}
              transition={{ duration: 2, delay: 0.3 }}
              style={{ transformOrigin: '50px 50px' }}
            />
          </svg>
          
          {/* Center content */}
          <div className="absolute inset-0 flex flex-col items-center justify-center z-20">
            <motion.div
              className="flex items-center gap-1"
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ 
                delay: 0.8,
                type: "spring",
                stiffness: 200
              }}
            >
              <motion.span
                className="text-4xl font-bold"
                style={{ color: health.color }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1 }}
              >
                {Math.round(health.score)}
              </motion.span>
            </motion.div>
            <motion.span 
              className="text-xs text-muted-foreground mt-0.5"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.1 }}
            >
              pontos
            </motion.span>
          </div>
        </div>
        
        {/* Status label with animation */}
        <motion.div
          className="mt-4 text-center"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2, duration: 0.5 }}
        >
          <motion.div 
            className="flex items-center justify-center gap-2"
            whileHover={{ scale: 1.05 }}
          >
            <Sparkles className="h-4 w-4" style={{ color: health.color }} />
            <span
              className="font-bold text-xl tracking-wide"
              style={{ color: health.color }}
            >
              {health.label}
            </span>
          </motion.div>
        </motion.div>
      </CardContent>
    </Card>
  );
};