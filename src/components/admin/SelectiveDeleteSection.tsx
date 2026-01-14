import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Filter, Trash2, Eye, Download } from "lucide-react";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { exportToExcel } from "@/utils/exportHelpers";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface SelectiveDeleteFilters {
  dateFrom: string;
  dateTo: string;
  type: string;
  origin: string;
  status: string;
  ministry_id: string;
  category_id: string;
  searchDescription: string;
}

const initialFilters: SelectiveDeleteFilters = {
  dateFrom: "",
  dateTo: "",
  type: "all",
  origin: "all",
  status: "all",
  ministry_id: "all",
  category_id: "all",
  searchDescription: "",
};

export function SelectiveDeleteSection() {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<SelectiveDeleteFilters>(initialFilters);
  const [previewData, setPreviewData] = useState<any[] | null>(null);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [exportBackup, setExportBackup] = useState(true);
  const [confirmText, setConfirmText] = useState("");

  // Fetch categories
  const { data: categories = [] } = useQuery({
    queryKey: ["categories", profile?.church_id],
    queryFn: async () => {
      if (!profile?.church_id) return [];
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .eq("church_id", profile.church_id)
        .order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.church_id,
  });

  // Fetch ministries
  const { data: ministries = [] } = useQuery({
    queryKey: ["ministries", profile?.church_id],
    queryFn: async () => {
      if (!profile?.church_id) return [];
      const { data, error } = await supabase
        .from("ministries")
        .select("*")
        .eq("church_id", profile.church_id)
        .order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.church_id,
  });

  // Build query with filters
  const buildFilteredQuery = () => {
    if (!profile?.church_id) return null;
    
    let query = supabase
      .from("transactions")
      .select("*, categories(name), ministries(name)")
      .eq("church_id", profile.church_id);

    if (filters.dateFrom) {
      query = query.gte("due_date", filters.dateFrom);
    }
    if (filters.dateTo) {
      query = query.lte("due_date", filters.dateTo);
    }
    if (filters.type && filters.type !== "all") {
      query = query.eq("type", filters.type);
    }
    if (filters.origin && filters.origin !== "all") {
      query = query.eq("origin", filters.origin);
    }
    if (filters.status && filters.status !== "all") {
      query = query.eq("status", filters.status);
    }
    if (filters.ministry_id && filters.ministry_id !== "all") {
      query = query.eq("ministry_id", filters.ministry_id);
    }
    if (filters.category_id && filters.category_id !== "all") {
      query = query.eq("category_id", filters.category_id);
    }
    if (filters.searchDescription && filters.searchDescription.trim()) {
      query = query.ilike("description", `%${filters.searchDescription.trim()}%`);
    }

    return query;
  };

  // Preview mutation
  const previewMutation = useMutation({
    mutationFn: async () => {
      const query = buildFilteredQuery();
      if (!query) throw new Error("Filtros inválidos");
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      setPreviewData(data);
      setPreviewDialogOpen(true);
    },
    onError: (error) => {
      toast.error("Erro ao carregar preview: " + error.message);
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!profile?.church_id || !user?.id) throw new Error("Usuário não autenticado");
      if (!previewData || previewData.length === 0) throw new Error("Nenhum registro para excluir");

      // Export backup if requested
      if (exportBackup && previewData.length > 0) {
        const exportData = previewData.map(t => ({
          ...t,
          categoria: t.categories?.name || "",
          ministerio: t.ministries?.name || "",
        }));
        exportToExcel(exportData, `backup_seletivo_${new Date().toISOString().split('T')[0]}`, "Backup");
      }

      // Delete by IDs
      const ids = previewData.map(t => t.id);
      const { error } = await supabase
        .from("transactions")
        .delete()
        .in("id", ids);

      if (error) throw error;

      // Log audit
      const { data: userProfile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .single();

      await supabase.from("audit_logs").insert([{
        church_id: profile.church_id,
        user_id: user.id,
        user_name: userProfile?.full_name || user.email || "Desconhecido",
        action: "DELETE_SELECTIVE",
        entity_type: "transactions",
        entity_count: previewData.length,
        details: JSON.parse(JSON.stringify(filters)),
      }]);

      return previewData.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["audit-logs"] });
      toast.success(`${count} transação(ões) excluída(s)!`);
      setPreviewDialogOpen(false);
      setPreviewData(null);
      setConfirmText("");
      setFilters(initialFilters);
    },
    onError: (error) => {
      toast.error("Erro ao excluir: " + error.message);
    },
  });

  const handlePreview = () => {
    const hasFilter = 
      filters.dateFrom || 
      filters.dateTo || 
      (filters.type && filters.type !== "all") ||
      (filters.origin && filters.origin !== "all") ||
      (filters.status && filters.status !== "all") ||
      (filters.ministry_id && filters.ministry_id !== "all") ||
      (filters.category_id && filters.category_id !== "all") ||
      (filters.searchDescription && filters.searchDescription.trim());

    if (!hasFilter) {
      toast.error("Selecione pelo menos um filtro");
      return;
    }

    previewMutation.mutate();
  };

  const handleConfirmDelete = () => {
    if (confirmText !== "EXCLUIR") {
      toast.error('Digite "EXCLUIR" para confirmar');
      return;
    }
    deleteMutation.mutate();
  };

  const totalValue = previewData?.reduce((sum, t) => sum + Number(t.amount), 0) || 0;

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Exclusão Seletiva
          </CardTitle>
          <CardDescription>
            Exclua transações específicas usando filtros. Útil para remover importações duplicadas ou dados de períodos específicos.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search by Description */}
          <div className="space-y-2">
            <Label>Buscar por Descrição</Label>
            <Input
              type="text"
              placeholder="Ex: Dízimo, Aluguel, Salário..."
              value={filters.searchDescription}
              onChange={(e) => setFilters({ ...filters, searchDescription: e.target.value })}
            />
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Data Inicial (Vencimento)</Label>
              <Input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Data Final (Vencimento)</Label>
              <Input
                type="date"
                value={filters.dateTo}
                onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
              />
            </div>
          </div>

          {/* Type and Origin */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={filters.type} onValueChange={(v) => setFilters({ ...filters, type: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="Receita">Receitas</SelectItem>
                  <SelectItem value="Despesa">Despesas</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Origem</Label>
              <Select value={filters.origin} onValueChange={(v) => setFilters({ ...filters, origin: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="Manual">Manual</SelectItem>
                  <SelectItem value="Planilha">Importação (Arquivo)</SelectItem>
                  <SelectItem value="Planilha Pública">Planilha Pública</SelectItem>
                  <SelectItem value="Google Sheets">Google Sheets</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Status and Ministry */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={filters.status} onValueChange={(v) => setFilters({ ...filters, status: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="Pendente">Pendente</SelectItem>
                  <SelectItem value="Pago">Pago</SelectItem>
                  <SelectItem value="Vencido">Vencido</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Ministério</Label>
              <Select value={filters.ministry_id} onValueChange={(v) => setFilters({ ...filters, ministry_id: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {ministries.map((m) => (
                    <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label>Categoria</Label>
            <Select value={filters.category_id} onValueChange={(v) => setFilters({ ...filters, category_id: v })}>
              <SelectTrigger>
                <SelectValue placeholder="Todas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name} ({c.type})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              onClick={handlePreview}
              disabled={previewMutation.isPending}
            >
              {previewMutation.isPending ? (
                <LoadingSpinner size="sm" className="mr-2" />
              ) : (
                <Eye className="h-4 w-4 mr-2" />
              )}
              Visualizar
            </Button>
            <Button
              variant="ghost"
              onClick={() => setFilters(initialFilters)}
            >
              Limpar Filtros
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Preview Dialog */}
      <Dialog open={previewDialogOpen} onOpenChange={setPreviewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-destructive">Confirmar Exclusão Seletiva</DialogTitle>
            <DialogDescription>
              {previewData?.length || 0} transações serão excluídas permanentemente.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Summary */}
            <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
              <div>
                <p className="text-sm text-muted-foreground">Quantidade</p>
                <p className="text-2xl font-bold">{previewData?.length || 0}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Valor Total</p>
                <p className="text-2xl font-bold">
                  {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(totalValue)}
                </p>
              </div>
            </div>

            {/* Sample of records */}
            {previewData && previewData.length > 0 && (
              <div className="max-h-48 overflow-y-auto border rounded-lg">
                <table className="w-full text-sm">
                  <thead className="bg-muted sticky top-0">
                    <tr>
                      <th className="p-2 text-left">Descrição</th>
                      <th className="p-2 text-right">Valor</th>
                      <th className="p-2 text-center">Tipo</th>
                      <th className="p-2 text-center">Origem</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewData.slice(0, 10).map((t) => (
                      <tr key={t.id} className="border-t">
                        <td className="p-2 truncate max-w-[200px]">{t.description}</td>
                        <td className="p-2 text-right">
                          {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(t.amount)}
                        </td>
                        <td className="p-2 text-center">{t.type}</td>
                        <td className="p-2 text-center">{t.origin || "Manual"}</td>
                      </tr>
                    ))}
                    {previewData.length > 10 && (
                      <tr className="border-t">
                        <td colSpan={4} className="p-2 text-center text-muted-foreground">
                          ... e mais {previewData.length - 10} registros
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* Backup option */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="exportBackup"
                checked={exportBackup}
                onCheckedChange={(checked) => setExportBackup(checked as boolean)}
              />
              <label htmlFor="exportBackup" className="text-sm flex items-center gap-1">
                <Download className="h-4 w-4" />
                Exportar backup antes de excluir
              </label>
            </div>

            {/* Confirmation input */}
            <div className="space-y-2">
              <Label>Digite "EXCLUIR" para confirmar</Label>
              <Input
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value.toUpperCase())}
                placeholder="EXCLUIR"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={confirmText !== "EXCLUIR" || deleteMutation.isPending}
            >
              {deleteMutation.isPending ? (
                <LoadingSpinner size="sm" className="mr-2" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              Excluir {previewData?.length || 0} Registros
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
