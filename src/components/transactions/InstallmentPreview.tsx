import { format, addMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Info, Calendar, CreditCard } from "lucide-react";

interface InstallmentPreviewProps {
  totalAmount: number;
  installmentCount: number;
  firstDueDate: Date;
}

export function InstallmentPreview({ 
  totalAmount, 
  installmentCount, 
  firstDueDate 
}: InstallmentPreviewProps) {
  const installmentValue = totalAmount / installmentCount;
  const lastDueDate = addMonths(firstDueDate, installmentCount - 1);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  return (
    <div className="bg-muted/50 border border-border rounded-lg p-4 space-y-3">
      <div className="flex items-center gap-2 text-primary">
        <Info className="h-4 w-4" />
        <span className="font-medium text-sm">Resumo do Parcelamento</span>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="flex items-center gap-2">
          <CreditCard className="h-4 w-4 text-muted-foreground" />
          <div>
            <p className="text-xs text-muted-foreground">Valor por parcela</p>
            <p className="font-semibold text-foreground">{formatCurrency(installmentValue)}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <div>
            <p className="text-xs text-muted-foreground">Primeira parcela</p>
            <p className="font-medium text-foreground">
              {format(firstDueDate, "dd/MM/yyyy", { locale: ptBR })}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <div>
            <p className="text-xs text-muted-foreground">Última parcela</p>
            <p className="font-medium text-foreground">
              {format(lastDueDate, "dd/MM/yyyy", { locale: ptBR })}
            </p>
          </div>
        </div>
      </div>

      <div className="pt-2 border-t border-border">
        <div className="flex justify-between items-center text-sm">
          <span className="text-muted-foreground">
            {installmentCount}x de {formatCurrency(installmentValue)}
          </span>
          <span className="font-medium text-foreground">
            Total: {formatCurrency(totalAmount)}
          </span>
        </div>
      </div>
    </div>
  );
}
