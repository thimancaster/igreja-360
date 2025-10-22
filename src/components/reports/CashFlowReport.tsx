import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface CashFlowData {
  date: string | null;
  description: string;
  type: string;
  value: number;
  balance: number;
}

interface CashFlowReportProps {
  data: CashFlowData[];
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
};

const formatDate = (date: string | null) => {
  if (!date) return "-";
  return new Date(date + 'T00:00:00').toLocaleDateString("pt-BR");
};

export function CashFlowReport({ data }: CashFlowReportProps) {
  return (
    <div className="border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Data</TableHead>
            <TableHead>Descrição</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead className="text-right">Valor</TableHead>
            <TableHead className="text-right">Saldo</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((item, index) => (
            <TableRow key={index}>
              <TableCell>{formatDate(item.date)}</TableCell>
              <TableCell className="font-medium">{item.description}</TableCell>
              <TableCell>
                <Badge variant={item.type === "Receita" ? "default" : "secondary"}>
                  {item.type}
                </Badge>
              </TableCell>
              <TableCell className={cn("text-right", item.type === "Receita" ? "text-success" : "text-destructive")}>
                {formatCurrency(item.value)}
              </TableCell>
              <TableCell className="text-right font-mono">{formatCurrency(item.balance)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}