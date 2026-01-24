import React, { useState, useMemo } from 'react';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion } from 'framer-motion';
import {
  Heart, Plus, Search, Filter, FileText, Download, Calendar,
  MoreHorizontal, Trash2, Receipt
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { pageAnimation, itemAnimation } from '@/lib/pageAnimations';
import {
  useContributions, useDeleteContribution, Contribution, ContributionType,
  useMarkReceiptGenerated
} from '@/hooks/useContributions';
import { ContributionDialog } from '@/components/contributions/ContributionDialog';
import { ContributionStats } from '@/components/contributions/ContributionStats';
// Dynamic import for PDF generation - loaded only when needed
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

const CONTRIBUTION_TYPE_LABELS: Record<ContributionType, string> = {
  dizimo: 'Dízimo',
  oferta: 'Oferta',
  campanha: 'Campanha',
  voto: 'Voto',
  outro: 'Outro',
};

export default function Contribuicoes() {
  const { profile } = useAuth();
  const [periodFilter, setPeriodFilter] = useState<'month' | '3months' | '6months' | 'year'>('month');
  const [typeFilter, setTypeFilter] = useState<ContributionType | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [contributionToDelete, setContributionToDelete] = useState<Contribution | null>(null);

  const deleteContribution = useDeleteContribution();
  const markReceiptGenerated = useMarkReceiptGenerated();

  // Calculate date range based on filter
  const dateRange = useMemo(() => {
    const now = new Date();
    let startDate: Date;
    
    switch (periodFilter) {
      case '3months':
        startDate = subMonths(startOfMonth(now), 2);
        break;
      case '6months':
        startDate = subMonths(startOfMonth(now), 5);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        startDate = startOfMonth(now);
    }
    
    return {
      startDate: format(startDate, 'yyyy-MM-dd'),
      endDate: format(endOfMonth(now), 'yyyy-MM-dd'),
    };
  }, [periodFilter]);

  const { data: contributions, isLoading } = useContributions({
    ...dateRange,
    type: typeFilter === 'all' ? undefined : typeFilter,
  });

  const filteredContributions = useMemo(() => {
    if (!contributions) return [];
    if (!searchTerm) return contributions;
    
    return contributions.filter(c =>
      c.member?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.receipt_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.campaign_name?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [contributions, searchTerm]);

  const handleDelete = (contribution: Contribution) => {
    setContributionToDelete(contribution);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (contributionToDelete) {
      await deleteContribution.mutateAsync(contributionToDelete.id);
      setDeleteDialogOpen(false);
      setContributionToDelete(null);
    }
  };

  const handleGenerateReceipt = async (contribution: Contribution) => {
    try {
      // Get church data
      const { data: church } = await supabase
        .from('churches')
        .select('name, cnpj, address')
        .eq('id', profile?.church_id)
        .maybeSingle();

      // Dynamic import - PDF library loaded only when user clicks
      const { generateContributionReceipt } = await import('@/utils/receiptGenerator');
      generateContributionReceipt({
        contribution,
        churchName: church?.name || 'Igreja',
        churchCnpj: church?.cnpj || undefined,
        churchAddress: church?.address || undefined,
        memberName: contribution.member?.full_name || 'Anônimo',
      });

      // Mark as generated
      await markReceiptGenerated.mutateAsync(contribution.id);
      toast.success('Recibo gerado com sucesso!');
    } catch (error) {
      toast.error('Erro ao gerar recibo');
    }
  };

  return (
    <motion.main
      className="flex-1 p-4 md:p-6 space-y-6 overflow-auto"
      variants={pageAnimation}
      initial="initial"
      animate="animate"
    >
      {/* Header */}
      <motion.div variants={itemAnimation} className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
            <Heart className="h-7 w-7 text-primary" />
            Dízimos e Ofertas
          </h1>
          <p className="text-muted-foreground mt-1">
            Registre e acompanhe as contribuições da sua igreja
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Nova Contribuição
        </Button>
      </motion.div>

      {/* Stats */}
      <motion.div variants={itemAnimation}>
        <ContributionStats period={dateRange} />
      </motion.div>

      {/* Contributions List */}
      <motion.div variants={itemAnimation}>
        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-col md:flex-row md:items-center gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por membro, recibo ou campanha..."
                  className="pl-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <Select value={periodFilter} onValueChange={(v) => setPeriodFilter(v as any)}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Período" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="month">Este mês</SelectItem>
                    <SelectItem value="3months">3 meses</SelectItem>
                    <SelectItem value="6months">6 meses</SelectItem>
                    <SelectItem value="year">Este ano</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as any)}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="dizimo">Dízimo</SelectItem>
                    <SelectItem value="oferta">Oferta</SelectItem>
                    <SelectItem value="campanha">Campanha</SelectItem>
                    <SelectItem value="voto">Voto</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[500px]">
              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : filteredContributions.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
                  <Heart className="h-10 w-10 mb-2 opacity-50" />
                  <p>Nenhuma contribuição encontrada</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Membro</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                      <TableHead>Recibo</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredContributions.map((contribution) => (
                      <TableRow key={contribution.id}>
                        <TableCell>
                          {format(new Date(contribution.contribution_date), 'dd/MM/yyyy', { locale: ptBR })}
                        </TableCell>
                        <TableCell>
                          {contribution.member?.full_name || (
                            <span className="text-muted-foreground italic">Anônimo</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {CONTRIBUTION_TYPE_LABELS[contribution.contribution_type]}
                          </Badge>
                          {contribution.campaign_name && (
                            <span className="text-xs text-muted-foreground ml-2">
                              {contribution.campaign_name}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(Number(contribution.amount))}
                        </TableCell>
                        <TableCell>
                          <span className="text-xs text-muted-foreground">
                            {contribution.receipt_number}
                          </span>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleGenerateReceipt(contribution)}>
                                <Receipt className="h-4 w-4 mr-2" />
                                Gerar Recibo PDF
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => handleDelete(contribution)}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Excluir
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </motion.div>

      {/* Dialogs */}
      <ContributionDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta contribuição? 
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.main>
  );
}
