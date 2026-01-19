import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { invalidateAllTransactionQueries } from "@/lib/queryKeys";
import { Button } from "@/components/ui/button";
import { Plus, Pencil, Trash2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import { useTransactions, Transaction } from "@/hooks/useTransactions";
import { TransactionDialog } from "@/components/transactions/TransactionDialog";
import { useCategoriesAndMinistries } from "@/hooks/useCategoriesAndMinistries";
import { useRole } from "@/hooks/useRole";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { usePagination } from "@/hooks/usePagination";
import { TablePagination } from "@/components/TablePagination";
import { useTableFilters } from "@/hooks/useTableFilters";
import { SearchInput } from "@/components/ui/search-input";
import { SortableTableHeader } from "@/components/ui/sortable-table-header";

export default function Transacoes() {
  const { user } = useAuth();
  const { data: transactions, isLoading } = useTransactions();
  const { data: categoriesAndMinistries, isLoading: filtersLoading } = useCategoriesAndMinistries();
  const { 
    isAdmin, 
    isTesoureiro, 
    isPastor, 
    isLider,
    canManageTransactions,
    canAddExpenses,
    canOnlyViewOwnTransactions,
    userMinistries,
    isLoading: roleLoading 
  } = useRole();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [transactionToDelete, setTransactionToDelete] = useState<string | null>(null);

  // Filtrar transações baseado nas permissões do usuário
  const filteredByPermission = (transactions || []).filter((t) => {
    // Admin, Tesoureiro e Pastor veem todas
    if (isAdmin || isTesoureiro || isPastor) return true;
    
    // Líder vê apenas do seu ministério
    if (isLider) {
      return userMinistries.includes(t.ministry_id || '');
    }
    
    // Usuário comum vê apenas o que ele criou
    if (canOnlyViewOwnTransactions) {
      return t.created_by === user?.id;
    }
    
    return true;
  });

  // Preparar dados para filtros (adicionando campos de categoria/ministério como strings)
  const transactionsWithSearchFields = filteredByPermission.map((t) => ({
    ...t,
    categoryName: t.categories?.name || "",
    ministryName: t.ministries?.name || "",
  }));

  const {
    searchTerm,
    setSearchTerm,
    sortField,
    sortDirection,
    handleSort,
    filteredData,
  } = useTableFilters({
    data: transactionsWithSearchFields,
    searchFields: ["description", "categoryName", "ministryName", "status", "type"],
    initialSortField: "created_at",
    initialSortDirection: "desc",
  });

  const pagination = usePagination(filteredData, { initialPageSize: 10 });

  // Filtrar ministérios disponíveis para líder
  const availableMinistries = isLider
    ? (categoriesAndMinistries?.ministries || []).filter(m => userMinistries.includes(m.id))
    : categoriesAndMinistries?.ministries || [];

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("pt-BR");
  };

  const getStatusVariant = (status: string): "default" | "secondary" | "destructive" => {
    switch (status) {
      case "Pago":
        return "default";
      case "Pendente":
        return "secondary";
      case "Vencido":
        return "destructive";
      default:
        return "secondary";
    }
  };

  const getTypeVariant = (type: string): "default" | "secondary" => {
    return type === "Receita" ? "default" : "secondary";
  };

  const handleEdit = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!transactionToDelete) return;

    try {
      const { error } = await supabase
        .from("transactions")
        .delete()
        .eq("id", transactionToDelete);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Transação excluída com sucesso!",
      });

      invalidateAllTransactionQueries(queryClient);
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setDeleteDialogOpen(false);
      setTransactionToDelete(null);
    }
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setSelectedTransaction(null);
  };

  // Determinar se o usuário pode adicionar transações
  const canAddTransactions = canManageTransactions || canOnlyViewOwnTransactions;
  
  // Usuário comum só pode adicionar receitas
  const restrictToRevenue = canOnlyViewOwnTransactions && !canAddExpenses;

  if (isLoading || filtersLoading || roleLoading) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Transações</h1>
          <p className="text-muted-foreground mt-1">
            {canOnlyViewOwnTransactions 
              ? "Visualize e adicione suas receitas" 
              : "Gerencie todas as transações financeiras"}
          </p>
        </div>
        <Button className="gap-2" onClick={() => setDialogOpen(true)} disabled={!canAddTransactions}>
          <Plus className="h-4 w-4" />
          {restrictToRevenue ? "Nova Receita" : "Nova Transação"}
        </Button>
      </div>

      {/* Barra de busca */}
      <div className="flex items-center gap-4">
        <SearchInput
          value={searchTerm}
          onChange={setSearchTerm}
          placeholder="Buscar por descrição, categoria, ministério..."
          className="max-w-md"
        />
        {searchTerm && (
          <span className="text-sm text-muted-foreground">
            {filteredData.length} resultado(s) encontrado(s)
          </span>
        )}
      </div>

      <div className="rounded-lg border border-border bg-card">
        <div className="p-6">
          <Table>
            <TableHeader>
              <TableRow>
                <SortableTableHeader
                  field="description"
                  currentSortField={sortField as string}
                  sortDirection={sortDirection}
                  onSort={handleSort}
                >
                  Descrição
                </SortableTableHeader>
                <SortableTableHeader
                  field="categoryName"
                  currentSortField={sortField as string}
                  sortDirection={sortDirection}
                  onSort={handleSort}
                >
                  Categoria
                </SortableTableHeader>
                <SortableTableHeader
                  field="ministryName"
                  currentSortField={sortField as string}
                  sortDirection={sortDirection}
                  onSort={handleSort}
                >
                  Ministério
                </SortableTableHeader>
                <SortableTableHeader
                  field="type"
                  currentSortField={sortField as string}
                  sortDirection={sortDirection}
                  onSort={handleSort}
                >
                  Tipo
                </SortableTableHeader>
                <SortableTableHeader
                  field="amount"
                  currentSortField={sortField as string}
                  sortDirection={sortDirection}
                  onSort={handleSort}
                >
                  Valor
                </SortableTableHeader>
                <SortableTableHeader
                  field="due_date"
                  currentSortField={sortField as string}
                  sortDirection={sortDirection}
                  onSort={handleSort}
                >
                  Data
                </SortableTableHeader>
                <SortableTableHeader
                  field="status"
                  currentSortField={sortField as string}
                  sortDirection={sortDirection}
                  onSort={handleSort}
                >
                  Status
                </SortableTableHeader>
                <th className="text-right p-4 font-medium">Ações</th>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pagination.paginatedData.length > 0 ? (
                pagination.paginatedData.map((transaction) => (
                  <TableRow key={transaction.id} className="hover:bg-muted/50">
                    <TableCell className="font-medium">{transaction.description}</TableCell>
                    <TableCell>{transaction.categories?.name || "-"}</TableCell>
                    <TableCell>{transaction.ministries?.name || "-"}</TableCell>
                    <TableCell>
                      <Badge variant={getTypeVariant(transaction.type)}>
                        {transaction.type}
                      </Badge>
                    </TableCell>
                    <TableCell className={transaction.type === "Receita" ? "text-success" : ""}>
                      {formatCurrency(Number(transaction.amount))}
                    </TableCell>
                    <TableCell>
                      {transaction.payment_date 
                        ? formatDate(transaction.payment_date)
                        : transaction.due_date 
                        ? formatDate(transaction.due_date)
                        : "-"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusVariant(transaction.status)}>
                        {transaction.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-2 justify-end">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleEdit(transaction)}
                          disabled={!canManageTransactions && transaction.created_by !== user?.id}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => {
                            setTransactionToDelete(transaction.id);
                            setDeleteDialogOpen(true);
                          }}
                          disabled={!canManageTransactions}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-12">
                    {searchTerm 
                      ? "Nenhuma transação encontrada para esta busca."
                      : "Nenhuma transação encontrada. Clique em \"Nova Transação\" para começar."}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          <TablePagination
            currentPage={pagination.currentPage}
            totalPages={pagination.totalPages}
            totalItems={pagination.totalItems}
            startIndex={pagination.startIndex}
            endIndex={pagination.endIndex}
            pageSize={pagination.pageSize}
            canGoNext={pagination.canGoNext}
            canGoPrevious={pagination.canGoPrevious}
            onPageChange={pagination.goToPage}
            onPageSizeChange={pagination.setPageSize}
          />
        </div>
      </div>

      <TransactionDialog
        open={dialogOpen}
        onOpenChange={handleDialogClose}
        transaction={selectedTransaction}
        categories={categoriesAndMinistries?.categories || []}
        ministries={availableMinistries}
        canEdit={canManageTransactions || (canOnlyViewOwnTransactions && !selectedTransaction)}
        restrictToRevenue={restrictToRevenue}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. A transação será permanentemente excluída.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={!canManageTransactions}>
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
