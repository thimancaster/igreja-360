import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Copy, Search, Trash2, RefreshCw, AlertTriangle, CheckCircle2 } from "lucide-react";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface DuplicateGroup {
  key: string;
  description: string;
  amount: number;
  dueDate: string | null;
  type: string;
  transactions: Array<{
    id: string;
    description: string;
    amount: number;
    due_date: string | null;
    type: string;
    status: string;
    created_at: string;
    origin: string | null;
    category_name: string | null;
    ministry_name: string | null;
  }>;
}

// Generate hash key for duplicate detection (mirrors backend logic)
function generateDuplicateKey(
  description: string,
  amount: number,
  dueDate: string | null,
  type: string
): string {
  const normalizedDescription = description.trim().toLowerCase();
  const normalizedAmount = Math.abs(amount).toFixed(2);
  const normalizedDate = dueDate || "no-date";
  const normalizedType = type.toLowerCase();
  return `${normalizedDescription}|${normalizedAmount}|${normalizedDate}|${normalizedType}`;
}

export function DuplicateCleanupSection() {
  const { profile, user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedForDeletion, setSelectedForDeletion] = useState<Set<string>>(new Set());
  const [isScanning, setIsScanning] = useState(false);

  // Fetch and analyze transactions for duplicates
  const { data: duplicateGroups, isLoading, refetch } = useQuery({
    queryKey: ["duplicate-transactions", profile?.church_id],
    queryFn: async (): Promise<DuplicateGroup[]> => {
      if (!profile?.church_id) return [];

      const { data: transactions, error } = await supabase
        .from("transactions")
        .select(`
          id,
          description,
          amount,
          due_date,
          type,
          status,
          created_at,
          origin,
          categories(name),
          ministries(name)
        `)
        .eq("church_id", profile.church_id)
        .order("created_at", { ascending: true });

      if (error) throw error;
      if (!transactions) return [];

      // Group by duplicate key
      const groups = new Map<string, DuplicateGroup>();
      
      for (const tx of transactions) {
        const key = generateDuplicateKey(
          tx.description,
          tx.amount,
          tx.due_date,
          tx.type
        );

        if (!groups.has(key)) {
          groups.set(key, {
            key,
            description: tx.description,
            amount: tx.amount,
            dueDate: tx.due_date,
            type: tx.type,
            transactions: [],
          });
        }

        groups.get(key)!.transactions.push({
          id: tx.id,
          description: tx.description,
          amount: tx.amount,
          due_date: tx.due_date,
          type: tx.type,
          status: tx.status,
          created_at: tx.created_at,
          origin: tx.origin,
          category_name: tx.categories?.name || null,
          ministry_name: tx.ministries?.name || null,
        });
      }

      // Only return groups with more than 1 transaction (duplicates)
      return Array.from(groups.values()).filter(g => g.transactions.length > 1);
    },
    enabled: !!profile?.church_id,
    staleTime: 0, // Always fetch fresh data
  });

  // Log audit action
  const logAuditAction = async (action: string, entityType: string, entityCount: number, details?: Record<string, unknown>) => {
    if (!profile?.church_id || !user?.id) return;

    const { data: userProfile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .single();

    await supabase.from("audit_logs").insert({
      church_id: profile.church_id,
      user_id: user.id,
      user_name: userProfile?.full_name || user.email || "Desconhecido",
      action,
      entity_type: entityType,
      entity_count: entityCount,
      details: details ? JSON.parse(JSON.stringify(details)) : null,
    });
  };

  // Delete selected duplicates
  const deleteDuplicatesMutation = useMutation({
    mutationFn: async (transactionIds: string[]) => {
      if (!profile?.church_id) throw new Error("Igreja não encontrada");
      if (transactionIds.length === 0) throw new Error("Nenhuma transação selecionada");

      const { error } = await supabase
        .from("transactions")
        .delete()
        .in("id", transactionIds);

      if (error) throw error;

      // Log audit
      await logAuditAction("DELETE_DUPLICATES", "transactions", transactionIds.length, {
        deleted_ids: transactionIds,
      });

      return transactionIds.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["duplicate-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["audit-logs"] });
      setSelectedForDeletion(new Set());
      toast.success(`${count} transação(ões) duplicada(s) excluída(s)!`);
    },
    onError: (error) => {
      toast.error("Erro ao excluir duplicatas: " + error.message);
    },
  });

  // Auto-select duplicates (keep the oldest one in each group)
  const autoSelectDuplicates = () => {
    if (!duplicateGroups) return;

    const toDelete = new Set<string>();
    
    for (const group of duplicateGroups) {
      // Sort by created_at, keep the oldest (first)
      const sorted = [...group.transactions].sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
      
      // Mark all except the first (oldest) for deletion
      for (let i = 1; i < sorted.length; i++) {
        toDelete.add(sorted[i].id);
      }
    }

    setSelectedForDeletion(toDelete);
    toast.info(`${toDelete.size} transações selecionadas para exclusão`);
  };

  // Toggle individual transaction selection
  const toggleTransaction = (transactionId: string) => {
    setSelectedForDeletion(prev => {
      const next = new Set(prev);
      if (next.has(transactionId)) {
        next.delete(transactionId);
      } else {
        next.add(transactionId);
      }
      return next;
    });
  };

  // Handle scan button click
  const handleScan = async () => {
    setIsScanning(true);
    setSelectedForDeletion(new Set());
    await refetch();
    setIsScanning(false);
  };

  const totalDuplicates = duplicateGroups?.reduce((sum, g) => sum + g.transactions.length - 1, 0) || 0;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Sem data";
    try {
      return format(new Date(dateString), "dd/MM/yyyy", { locale: ptBR });
    } catch {
      return dateString;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Copy className="h-5 w-5" />
          Limpeza de Duplicatas
        </CardTitle>
        <CardDescription>
          Identifique e remova transações duplicadas do banco de dados. 
          Duplicatas são detectadas por descrição, valor, data de vencimento e tipo.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Action buttons */}
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={handleScan}
            disabled={isLoading || isScanning}
            variant="outline"
          >
            {isScanning ? (
              <LoadingSpinner size="sm" className="mr-2" />
            ) : (
              <Search className="h-4 w-4 mr-2" />
            )}
            Buscar Duplicatas
          </Button>

          {duplicateGroups && duplicateGroups.length > 0 && (
            <>
              <Button
                onClick={autoSelectDuplicates}
                variant="outline"
                disabled={deleteDuplicatesMutation.isPending}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Auto-Selecionar (manter mais antigo)
              </Button>

              <Button
                onClick={() => setSelectedForDeletion(new Set())}
                variant="ghost"
                disabled={selectedForDeletion.size === 0}
              >
                Limpar Seleção
              </Button>
            </>
          )}
        </div>

        {/* Results summary */}
        {duplicateGroups !== undefined && (
          <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
            {duplicateGroups.length === 0 ? (
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle2 className="h-5 w-5" />
                <span className="font-medium">Nenhuma duplicata encontrada!</span>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-amber-500" />
                  <span className="font-medium">
                    {duplicateGroups.length} grupo(s) de duplicatas encontrado(s)
                  </span>
                </div>
                <Badge variant="secondary">
                  {totalDuplicates} transações duplicadas
                </Badge>
                {selectedForDeletion.size > 0 && (
                  <Badge variant="destructive">
                    {selectedForDeletion.size} selecionada(s) para exclusão
                  </Badge>
                )}
              </>
            )}
          </div>
        )}

        {/* Delete button */}
        {selectedForDeletion.size > 0 && (
          <div className="flex items-center justify-between p-4 border border-destructive/50 rounded-lg bg-destructive/5">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <span className="text-sm">
                {selectedForDeletion.size} transação(ões) selecionada(s) para exclusão
              </span>
            </div>
            <Button
              variant="destructive"
              onClick={() => deleteDuplicatesMutation.mutate(Array.from(selectedForDeletion))}
              disabled={deleteDuplicatesMutation.isPending}
            >
              {deleteDuplicatesMutation.isPending ? (
                <LoadingSpinner size="sm" className="mr-2" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              Excluir Selecionadas
            </Button>
          </div>
        )}

        {/* Loading state */}
        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <LoadingSpinner size="lg" />
          </div>
        )}

        {/* Duplicate groups list */}
        {duplicateGroups && duplicateGroups.length > 0 && (
          <ScrollArea className="h-[400px] rounded-lg border">
            <div className="p-4 space-y-4">
              {duplicateGroups.map((group, groupIndex) => (
                <div key={group.key} className="space-y-2">
                  {groupIndex > 0 && <Separator className="my-4" />}
                  
                  {/* Group header */}
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge variant={group.type === "Receita" ? "default" : "secondary"}>
                          {group.type}
                        </Badge>
                        <span className="font-medium">{group.description}</span>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {formatCurrency(group.amount)} • {formatDate(group.dueDate)}
                      </div>
                    </div>
                    <Badge variant="outline">
                      {group.transactions.length} cópias
                    </Badge>
                  </div>

                  {/* Individual transactions */}
                  <div className="ml-4 space-y-2">
                    {group.transactions.map((tx, txIndex) => (
                      <div
                        key={tx.id}
                        className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                          selectedForDeletion.has(tx.id)
                            ? "bg-destructive/10 border-destructive/50"
                            : "bg-muted/30"
                        }`}
                      >
                        <Checkbox
                          checked={selectedForDeletion.has(tx.id)}
                          onCheckedChange={() => toggleTransaction(tx.id)}
                        />
                        
                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            {txIndex === 0 && (
                              <Badge variant="outline" className="text-green-600 border-green-600">
                                Original
                              </Badge>
                            )}
                            <Badge variant="outline">{tx.status}</Badge>
                            {tx.origin && (
                              <Badge variant="secondary" className="text-xs">
                                {tx.origin}
                              </Badge>
                            )}
                          </div>
                          
                          <div className="text-xs text-muted-foreground">
                            Criado em: {format(new Date(tx.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                            {tx.category_name && ` • Categoria: ${tx.category_name}`}
                            {tx.ministry_name && ` • Ministério: ${tx.ministry_name}`}
                          </div>
                        </div>

                        <div className="text-sm font-medium">
                          {formatCurrency(tx.amount)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
