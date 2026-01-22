import React, { useMemo } from 'react';
import { format, startOfYear, endOfYear, eachMonthOfInterval, isSameMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion } from 'framer-motion';
import { FileText, Download, Check, Clock, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { useContributions, Contribution } from '@/hooks/useContributions';
import { generateAnnualReport } from '@/utils/receiptGenerator';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ContributionBookletProps {
  memberId: string;
  memberName: string;
  year?: number;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

export function ContributionBooklet({ memberId, memberName, year = new Date().getFullYear() }: ContributionBookletProps) {
  const { profile } = useAuth();
  
  const startDate = format(startOfYear(new Date(year, 0, 1)), 'yyyy-MM-dd');
  const endDate = format(endOfYear(new Date(year, 0, 1)), 'yyyy-MM-dd');

  const { data: contributions, isLoading } = useContributions({
    startDate,
    endDate,
    memberId,
  });

  const months = eachMonthOfInterval({
    start: new Date(year, 0, 1),
    end: new Date(year, 11, 31),
  });

  const monthlyData = useMemo(() => {
    if (!contributions) return [];

    return months.map((month) => {
      const monthContributions = contributions.filter((c) =>
        isSameMonth(new Date(c.contribution_date), month)
      );

      const dizimos = monthContributions.filter(c => c.contribution_type === 'dizimo');
      const ofertas = monthContributions.filter(c => c.contribution_type === 'oferta');
      const outros = monthContributions.filter(c => !['dizimo', 'oferta'].includes(c.contribution_type));

      const totalDizimo = dizimos.reduce((sum, c) => sum + Number(c.amount), 0);
      const totalOferta = ofertas.reduce((sum, c) => sum + Number(c.amount), 0);
      const totalOutros = outros.reduce((sum, c) => sum + Number(c.amount), 0);

      const hasContribution = monthContributions.length > 0;
      const isPastMonth = month < new Date() && !isSameMonth(month, new Date());
      const isCurrentMonth = isSameMonth(month, new Date());

      return {
        month,
        monthName: format(month, 'MMMM', { locale: ptBR }),
        totalDizimo,
        totalOferta,
        totalOutros,
        total: totalDizimo + totalOferta + totalOutros,
        hasContribution,
        isPastMonth,
        isCurrentMonth,
        contributions: monthContributions,
      };
    });
  }, [contributions, months]);

  const annualTotal = useMemo(() => {
    return monthlyData.reduce((sum, m) => sum + m.total, 0);
  }, [monthlyData]);

  const handleExportAnnualReport = async () => {
    if (!contributions || contributions.length === 0) {
      toast.error('Não há contribuições para exportar');
      return;
    }

    try {
      const { data: church } = await supabase
        .from('churches')
        .select('name, cnpj')
        .eq('id', profile?.church_id)
        .maybeSingle();

      generateAnnualReport(
        contributions,
        memberName,
        church?.name || 'Igreja',
        church?.cnpj || undefined,
        year
      );
      
      toast.success('Relatório anual gerado com sucesso!');
    } catch (error) {
      toast.error('Erro ao gerar relatório');
    }
  };

  const getStatusIcon = (data: typeof monthlyData[0]) => {
    if (data.hasContribution) {
      return <Check className="h-4 w-4 text-green-500" />;
    }
    if (data.isPastMonth) {
      return <AlertCircle className="h-4 w-4 text-yellow-500" />;
    }
    if (data.isCurrentMonth) {
      return <Clock className="h-4 w-4 text-blue-500" />;
    }
    return <Clock className="h-4 w-4 text-muted-foreground" />;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-32" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
            {[...Array(12)].map((_, i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Carnê de Contribuições {year}
            </CardTitle>
            <CardDescription>
              {memberName} • Total: {formatCurrency(annualTotal)}
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={handleExportAnnualReport}
            disabled={!contributions || contributions.length === 0}
          >
            <Download className="h-4 w-4" />
            Exportar PDF
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
          {monthlyData.map((data, index) => (
            <motion.div
              key={data.monthName}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.05 }}
              className={`
                p-3 rounded-lg border text-center transition-colors
                ${data.hasContribution 
                  ? 'bg-green-500/10 border-green-500/30' 
                  : data.isPastMonth 
                    ? 'bg-yellow-500/10 border-yellow-500/30'
                    : 'bg-muted/50 border-muted'
                }
              `}
            >
              <div className="flex items-center justify-center gap-1 mb-1">
                {getStatusIcon(data)}
                <span className="text-xs font-medium capitalize">
                  {data.monthName.substring(0, 3)}
                </span>
              </div>
              {data.hasContribution ? (
                <div className="text-sm font-bold">
                  {formatCurrency(data.total)}
                </div>
              ) : (
                <div className="text-xs text-muted-foreground">
                  {data.isPastMonth ? 'Sem registro' : '-'}
                </div>
              )}
            </motion.div>
          ))}
        </div>

        <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <div className="h-3 w-3 rounded bg-green-500/30" />
            Contribuiu
          </span>
          <span className="flex items-center gap-1">
            <div className="h-3 w-3 rounded bg-yellow-500/30" />
            Sem registro (passado)
          </span>
          <span className="flex items-center gap-1">
            <div className="h-3 w-3 rounded bg-muted" />
            Pendente
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
