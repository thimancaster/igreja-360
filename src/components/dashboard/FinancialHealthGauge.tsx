import React, { useMemo } from "react";
import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Minus, Info } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useTransactionStats } from "@/hooks/useTransactions";
import { Skeleton } from "@/components/ui/skeleton";

interface HealthScore {
  score: number;
  label: string;
  color: string;
  bgColor: string;
  icon: React.ReactNode;
}

const calculateHealthScore = (stats: {
  balance: number;
  totalOverdue: number;
  totalPaid: number;
  totalPayable: number;
}): HealthScore => {
  let score = 50; // Base score

  // Balance factor (40 points)
  if (stats.balance > 0) {
    const balanceRatio = Math.min(stats.balance / (stats.totalPaid || 1), 1);
    score += balanceRatio * 30;
  } else {
    score -= 20;
  }

  // Overdue factor (-30 points max)
  if (stats.totalOverdue > 0) {
    const overdueRatio = Math.min(stats.totalOverdue / ((stats.totalPayable || 1) + stats.totalOverdue), 1);
    score -= overdueRatio * 30;
  } else {
    score += 10;
  }

  // Revenue vs Expense ratio (20 points)
  const totalRevenue = stats.totalPaid;
  const totalExpense = stats.totalPayable + stats.totalOverdue;
  if (totalRevenue > totalExpense) {
    score += 10;
  } else if (totalExpense > totalRevenue * 1.5) {
    score -= 10;
  }

  // Normalize to 0-100
  score = Math.max(0, Math.min(100, score));

  if (score >= 70) {
    return {
      score,
      label: "Saudável",
      color: "hsl(var(--success))",
      bgColor: "bg-success/10",
      icon: <TrendingUp className="h-4 w-4 text-success" />,
    };
  } else if (score >= 40) {
    return {
      score,
      label: "Atenção",
      color: "hsl(var(--warning))",
      bgColor: "bg-warning/10",
      icon: <Minus className="h-4 w-4 text-warning" />,
    };
  } else {
    return {
      score,
      label: "Crítico",
      color: "hsl(var(--destructive))",
      bgColor: "bg-destructive/10",
      icon: <TrendingDown className="h-4 w-4 text-destructive" />,
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
      <Card>
        <CardHeader className="pb-2">
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-32 w-32 rounded-full mx-auto" />
        </CardContent>
      </Card>
    );
  }

  if (!health) return null;

  const circumference = 2 * Math.PI * 45;
  const strokeDashoffset = circumference - (health.score / 100) * circumference;

  return (
    <Card className={`${health.bgColor} border-0`}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-lg">
          <span className="flex items-center gap-2">
            Saúde Financeira
            {health.icon}
          </span>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <Info className="h-4 w-4 text-muted-foreground" />
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
      <CardContent className="flex flex-col items-center">
        <div className="relative w-32 h-32">
          <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 100 100">
            {/* Background circle */}
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke="currentColor"
              strokeWidth="8"
              className="text-muted/30"
            />
            {/* Progress circle */}
            <motion.circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke={health.color}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={circumference}
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset }}
              transition={{ duration: 1.5, ease: "easeOut" }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <motion.span
              className="text-3xl font-bold"
              style={{ color: health.color }}
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5 }}
            >
              {Math.round(health.score)}
            </motion.span>
            <span className="text-xs text-muted-foreground">pontos</span>
          </div>
        </div>
        <motion.div
          className="mt-3 text-center"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
        >
          <span
            className="font-semibold text-lg"
            style={{ color: health.color }}
          >
            {health.label}
          </span>
        </motion.div>
      </CardContent>
    </Card>
  );
};
