import { motion } from "framer-motion";
import { Calendar, CreditCard, AlertTriangle, CheckCircle2, Clock, TrendingUp, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useInstallmentStats } from "@/hooks/useInstallmentStats";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

const COLORS = {
  paid: "hsl(var(--chart-2))",
  pending: "hsl(var(--chart-4))",
  overdue: "hsl(var(--chart-1))",
};

export function InstallmentsDashboard() {
  const { data: stats, isLoading } = useInstallmentStats();

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const formatDate = (dateStr: string) => {
    return format(parseISO(dateStr), "dd/MM/yyyy", { locale: ptBR });
  };

  if (isLoading) {
    return (
      <Card className="mt-6">
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!stats || stats.totalGroups === 0) {
    return (
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            Dashboard de Parcelas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <CreditCard className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              Nenhuma transação parcelada encontrada.
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Ao criar despesas parceladas, elas aparecerão aqui.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const pieData = [
    { name: "Pagas", value: stats.paidVsPendingStats.paid, color: COLORS.paid },
    { name: "Pendentes", value: stats.paidVsPendingStats.pending, color: COLORS.pending },
    { name: "Vencidas", value: stats.paidVsPendingStats.overdue, color: COLORS.overdue },
  ].filter((d) => d.value > 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="mt-6 space-y-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <CreditCard className="h-5 w-5 text-primary" />
          Dashboard de Parcelas
        </h2>
        <Badge variant="outline" className="text-sm">
          {stats.totalGroups} grupo{stats.totalGroups !== 1 ? "s" : ""} de parcelas
        </Badge>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-l-4 border-l-emerald-500">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Parcelas Pagas</p>
                <p className="text-2xl font-bold text-emerald-600">
                  {formatCurrency(stats.totalPaidAmount)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {stats.paidVsPendingStats.paid} parcela{stats.paidVsPendingStats.paid !== 1 ? "s" : ""}
                </p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-emerald-500 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-amber-500">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Parcelas Pendentes</p>
                <p className="text-2xl font-bold text-amber-600">
                  {formatCurrency(stats.totalPendingAmount)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {stats.paidVsPendingStats.pending} parcela{stats.paidVsPendingStats.pending !== 1 ? "s" : ""}
                </p>
              </div>
              <Clock className="h-8 w-8 text-amber-500 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-rose-500">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Parcelas Vencidas</p>
                <p className="text-2xl font-bold text-rose-600">
                  {formatCurrency(stats.totalOverdueAmount)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {stats.paidVsPendingStats.overdue} parcela{stats.paidVsPendingStats.overdue !== 1 ? "s" : ""}
                </p>
              </div>
              <AlertTriangle className="h-8 w-8 text-rose-500 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Comprometido</p>
                <p className="text-2xl font-bold">
                  {formatCurrency(
                    stats.totalPaidAmount + stats.totalPendingAmount + stats.totalOverdueAmount
                  )}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {stats.totalGroups} compra{stats.totalGroups !== 1 ? "s" : ""} parcelada{stats.totalGroups !== 1 ? "s" : ""}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-blue-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Pie Chart - Paid vs Pending */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Status das Parcelas</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={2}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}`}
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Legend />
                <Tooltip formatter={(value) => `${value} parcela(s)`} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Bar Chart - Monthly Projection */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Projeção de Fluxo de Caixa (6 meses)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={stats.monthlyProjection}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="monthLabel" className="text-xs" />
                <YAxis
                  tickFormatter={(value) =>
                    new Intl.NumberFormat("pt-BR", {
                      notation: "compact",
                      compactDisplay: "short",
                    }).format(value)
                  }
                  className="text-xs"
                />
                <Tooltip
                  formatter={(value: number) => formatCurrency(value)}
                  labelFormatter={(label) => `Mês: ${label}`}
                />
                <Bar
                  dataKey="totalDue"
                  name="Parcelas a Vencer"
                  fill="hsl(var(--primary))"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Upcoming Installments */}
      {stats.upcomingInstallments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Próximas Parcelas (30 dias)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.upcomingInstallments.map((installment) => (
                <div
                  key={installment.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10">
                      <CreditCard className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{installment.description}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Badge variant="outline" className="text-xs">
                          {installment.installment_number}/{installment.total_installments}
                        </Badge>
                        <span>•</span>
                        <span>{formatDate(installment.due_date)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-rose-600">
                      {formatCurrency(installment.amount)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Installment Groups */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Compras Parceladas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {stats.installmentGroups.slice(0, 5).map((group) => {
              const progress =
                ((group.paid_installments) /
                  group.total_installments) *
                100;

              return (
                <div
                  key={group.installment_group_id}
                  className="p-4 rounded-lg border bg-card hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="font-medium">{group.description}</h4>
                      <p className="text-sm text-muted-foreground">
                        Total: {formatCurrency(group.total_amount)}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-2">
                        {group.overdue_installments > 0 && (
                          <Badge variant="destructive" className="text-xs">
                            {group.overdue_installments} vencida{group.overdue_installments !== 1 ? "s" : ""}
                          </Badge>
                        )}
                        <Badge variant="outline">
                          {group.paid_installments}/{group.total_installments}
                        </Badge>
                      </div>
                      {group.next_due_date && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Próxima: {formatDate(group.next_due_date)}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Progress value={progress} className="h-2" />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>
                        {group.first_due_date && formatDate(group.first_due_date)}
                      </span>
                      <span>
                        {group.last_due_date && formatDate(group.last_due_date)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
