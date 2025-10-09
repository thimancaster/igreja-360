import { DollarSign, TrendingUp, TrendingDown, Wallet } from "lucide-react";
import { StatsCard } from "@/components/dashboard/StatsCard";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default function Dashboard() {
  // Mock data para demonstração
  const mockTransactions = [
    { id: 1, description: "Dízimo - Janeiro", category: "Receita", type: "Receita", amount: "R$ 12.500,00", date: "2025-01-15", status: "Pago" },
    { id: 2, description: "Aluguel - Sede", category: "Despesa", type: "Despesa", amount: "R$ 3.500,00", date: "2025-01-10", status: "Pago" },
    { id: 3, description: "Conta de Luz", category: "Despesa", type: "Despesa", amount: "R$ 850,00", date: "2025-01-20", status: "Pendente" },
    { id: 4, description: "Ofertas Especiais", category: "Receita", type: "Receita", amount: "R$ 4.200,00", date: "2025-01-18", status: "Pago" },
    { id: 5, description: "Material de Escritório", category: "Despesa", type: "Despesa", amount: "R$ 420,00", date: "2025-01-05", status: "Vencido" },
  ];

  return (
    <div className="flex-1 space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard Financeiro</h1>
        <p className="text-muted-foreground mt-1">Visão geral das finanças da sua igreja</p>
      </div>

      {/* Cards de Destaque */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Contas a Pagar (Mês Atual)"
          value="R$ 5.270,00"
          icon={DollarSign}
          variant="warning"
          trend={{ value: "+12% vs mês anterior", isPositive: false }}
        />
        <StatsCard
          title="Contas Pagas (Mês Atual)"
          value="R$ 16.850,00"
          icon={TrendingUp}
          variant="success"
          trend={{ value: "+8% vs mês anterior", isPositive: true }}
        />
        <StatsCard
          title="Contas Vencidas"
          value="R$ 420,00"
          icon={TrendingDown}
          variant="destructive"
          trend={{ value: "1 transação pendente", isPositive: false }}
        />
        <StatsCard
          title="Saldo Total"
          value="R$ 11.160,00"
          icon={Wallet}
          variant="default"
          trend={{ value: "+15% vs mês anterior", isPositive: true }}
        />
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-4">
        <Select defaultValue="mes-atual">
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Período" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="mes-atual">Mês Atual</SelectItem>
            <SelectItem value="trimestre">Último Trimestre</SelectItem>
            <SelectItem value="ano">Ano Atual</SelectItem>
            <SelectItem value="customizado">Customizado</SelectItem>
          </SelectContent>
        </Select>

        <Select defaultValue="todos">
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Ministério" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os Ministérios</SelectItem>
            <SelectItem value="louvor">Louvor</SelectItem>
            <SelectItem value="missoes">Missões</SelectItem>
            <SelectItem value="jovens">Jovens</SelectItem>
          </SelectContent>
        </Select>

        <Select defaultValue="todos-status">
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos-status">Todos os Status</SelectItem>
            <SelectItem value="pendente">Pendente</SelectItem>
            <SelectItem value="pago">Pago</SelectItem>
            <SelectItem value="vencido">Vencido</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Tabela de Transações Recentes */}
      <div className="rounded-lg border border-border bg-card">
        <div className="p-6">
          <h2 className="text-xl font-semibold mb-4">Transações Recentes</h2>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Descrição</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockTransactions.map((transaction) => (
                <TableRow key={transaction.id} className="hover:bg-muted/50">
                  <TableCell className="font-medium">{transaction.description}</TableCell>
                  <TableCell>{transaction.category}</TableCell>
                  <TableCell>
                    <Badge variant={transaction.type === "Receita" ? "default" : "secondary"}>
                      {transaction.type}
                    </Badge>
                  </TableCell>
                  <TableCell className={transaction.type === "Receita" ? "text-success" : "text-destructive"}>
                    {transaction.amount}
                  </TableCell>
                  <TableCell>{transaction.date}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        transaction.status === "Pago"
                          ? "default"
                          : transaction.status === "Pendente"
                          ? "secondary"
                          : "destructive"
                      }
                    >
                      {transaction.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
