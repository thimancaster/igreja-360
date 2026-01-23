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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Copy, Search, Trash2, RefreshCw, AlertTriangle, CheckCircle2, Receipt, Users, Wallet, Merge, Info } from "lucide-react";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
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

type EntityType = "transactions" | "members" | "contributions";

interface DuplicateTransactionGroup {
  key: string;
  description: string;
  amount: number;
  dueDate: string | null;
  type: string;
  items: Array<{
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

interface DuplicateMemberGroup {
  key: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  items: Array<{
    id: string;
    full_name: string;
    email: string | null;
    phone: string | null;
    status: string | null;
    created_at: string;
    member_since: string | null;
  }>;
}

interface DuplicateContributionGroup {
  key: string;
  memberName: string | null;
  amount: number;
  contributionDate: string;
  contributionType: string;
  items: Array<{
    id: string;
    member_name: string | null;
    amount: number;
    contribution_date: string;
    contribution_type: string;
    receipt_number: string | null;
    created_at: string;
  }>;
}

// Generate hash keys for duplicate detection
function generateTransactionKey(description: string, amount: number, dueDate: string | null, type: string): string {
  const normalizedDescription = description.trim().toLowerCase();
  const normalizedAmount = Math.abs(amount).toFixed(2);
  const normalizedDate = dueDate || "no-date";
  const normalizedType = type.toLowerCase();
  return `${normalizedDescription}|${normalizedAmount}|${normalizedDate}|${normalizedType}`;
}

function generateMemberKey(fullName: string, email: string | null, phone: string | null): string {
  const normalizedName = fullName.trim().toLowerCase();
  const normalizedEmail = (email || "").trim().toLowerCase();
  const normalizedPhone = (phone || "").replace(/\D/g, "");
  return `${normalizedName}|${normalizedEmail}|${normalizedPhone}`;
}

function generateContributionKey(
  memberId: string | null,
  amount: number,
  contributionDate: string,
  contributionType: string
): string {
  const normalizedMember = memberId || "no-member";
  const normalizedAmount = Math.abs(amount).toFixed(2);
  const normalizedType = contributionType.toLowerCase();
  return `${normalizedMember}|${normalizedAmount}|${contributionDate}|${normalizedType}`;
}

export function DuplicateCleanupSection() {
  const { profile, user } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<EntityType>("transactions");
  const [selectedForDeletion, setSelectedForDeletion] = useState<Set<string>>(new Set());
  const [isScanning, setIsScanning] = useState(false);
  
  // Merge-specific state
  const [selectedMasterMembers, setSelectedMasterMembers] = useState<Record<string, string>>({});
  const [mergeDialogOpen, setMergeDialogOpen] = useState(false);
  const [pendingMergeGroup, setPendingMergeGroup] = useState<DuplicateMemberGroup | null>(null);

  // Fetch transactions duplicates
  const { data: transactionGroups, isLoading: loadingTransactions, refetch: refetchTransactions } = useQuery({
    queryKey: ["duplicate-transactions", profile?.church_id],
    queryFn: async (): Promise<DuplicateTransactionGroup[]> => {
      if (!profile?.church_id) return [];

      const { data: transactions, error } = await supabase
        .from("transactions")
        .select(`
          id, description, amount, due_date, type, status, created_at, origin,
          categories(name), ministries(name)
        `)
        .eq("church_id", profile.church_id)
        .order("created_at", { ascending: true });

      if (error) throw error;
      if (!transactions) return [];

      const groups = new Map<string, DuplicateTransactionGroup>();
      
      for (const tx of transactions) {
        const key = generateTransactionKey(tx.description, tx.amount, tx.due_date, tx.type);

        if (!groups.has(key)) {
          groups.set(key, {
            key,
            description: tx.description,
            amount: tx.amount,
            dueDate: tx.due_date,
            type: tx.type,
            items: [],
          });
        }

        groups.get(key)!.items.push({
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

      return Array.from(groups.values()).filter(g => g.items.length > 1);
    },
    enabled: !!profile?.church_id && activeTab === "transactions",
    staleTime: 0,
  });

  // Fetch members duplicates
  const { data: memberGroups, isLoading: loadingMembers, refetch: refetchMembers } = useQuery({
    queryKey: ["duplicate-members", profile?.church_id],
    queryFn: async (): Promise<DuplicateMemberGroup[]> => {
      if (!profile?.church_id) return [];

      const { data: members, error } = await supabase
        .from("members")
        .select("id, full_name, email, phone, status, created_at, member_since")
        .eq("church_id", profile.church_id)
        .order("created_at", { ascending: true });

      if (error) throw error;
      if (!members) return [];

      const groups = new Map<string, DuplicateMemberGroup>();
      
      for (const member of members) {
        const key = generateMemberKey(member.full_name, member.email, member.phone);

        if (!groups.has(key)) {
          groups.set(key, {
            key,
            fullName: member.full_name,
            email: member.email,
            phone: member.phone,
            items: [],
          });
        }

        groups.get(key)!.items.push({
          id: member.id,
          full_name: member.full_name,
          email: member.email,
          phone: member.phone,
          status: member.status,
          created_at: member.created_at,
          member_since: member.member_since,
        });
      }

      return Array.from(groups.values()).filter(g => g.items.length > 1);
    },
    enabled: !!profile?.church_id && activeTab === "members",
    staleTime: 0,
  });

  // Fetch contributions duplicates
  const { data: contributionGroups, isLoading: loadingContributions, refetch: refetchContributions } = useQuery({
    queryKey: ["duplicate-contributions", profile?.church_id],
    queryFn: async (): Promise<DuplicateContributionGroup[]> => {
      if (!profile?.church_id) return [];

      const { data: contributions, error } = await supabase
        .from("contributions")
        .select(`
          id, member_id, amount, contribution_date, contribution_type, 
          receipt_number, created_at, members(full_name)
        `)
        .eq("church_id", profile.church_id)
        .order("created_at", { ascending: true });

      if (error) throw error;
      if (!contributions) return [];

      const groups = new Map<string, DuplicateContributionGroup>();
      
      for (const c of contributions) {
        const key = generateContributionKey(c.member_id, c.amount, c.contribution_date, c.contribution_type);

        if (!groups.has(key)) {
          groups.set(key, {
            key,
            memberName: c.members?.full_name || null,
            amount: c.amount,
            contributionDate: c.contribution_date,
            contributionType: c.contribution_type,
            items: [],
          });
        }

        groups.get(key)!.items.push({
          id: c.id,
          member_name: c.members?.full_name || null,
          amount: Number(c.amount),
          contribution_date: c.contribution_date,
          contribution_type: c.contribution_type,
          receipt_number: c.receipt_number,
          created_at: c.created_at,
        });
      }

      return Array.from(groups.values()).filter(g => g.items.length > 1);
    },
    enabled: !!profile?.church_id && activeTab === "contributions",
    staleTime: 0,
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

  // Delete mutation factory
  const createDeleteMutation = (tableName: EntityType) => {
    return useMutation({
      mutationFn: async (ids: string[]) => {
        if (!profile?.church_id) throw new Error("Igreja não encontrada");
        if (ids.length === 0) throw new Error("Nenhum item selecionado");

        const { error } = await supabase
          .from(tableName)
          .delete()
          .in("id", ids);

        if (error) throw error;

        await logAuditAction("DELETE_DUPLICATES", tableName, ids.length, { deleted_ids: ids });
        return ids.length;
      },
      onSuccess: (count) => {
        queryClient.invalidateQueries({ queryKey: [tableName] });
        queryClient.invalidateQueries({ queryKey: [`duplicate-${tableName}`] });
        queryClient.invalidateQueries({ queryKey: ["dashboard"] });
        queryClient.invalidateQueries({ queryKey: ["audit-logs"] });
        setSelectedForDeletion(new Set());
        
        const labels: Record<EntityType, string> = {
          transactions: "transação(ões)",
          members: "membro(s)",
          contributions: "contribuição(ões)",
        };
        toast.success(`${count} ${labels[tableName]} duplicada(s) excluída(s)!`);
      },
      onError: (error) => {
        toast.error("Erro ao excluir duplicatas: " + error.message);
      },
    });
  };

  // Merge members mutation
  const mergeMembersMutation = useMutation({
    mutationFn: async ({ masterId, duplicateIds }: { masterId: string; duplicateIds: string[] }) => {
      if (!profile?.church_id) throw new Error("Igreja não encontrada");
      if (duplicateIds.length === 0) throw new Error("Nenhuma duplicata para mesclar");

      // 1. Transfer all contributions from duplicates to master
      const { error: contribError } = await supabase
        .from("contributions")
        .update({ member_id: masterId })
        .in("member_id", duplicateIds);

      if (contribError) throw new Error("Erro ao transferir contribuições: " + contribError.message);

      // 2. Transfer all transactions from duplicates to master
      const { error: txError } = await supabase
        .from("transactions")
        .update({ member_id: masterId })
        .in("member_id", duplicateIds);

      if (txError) throw new Error("Erro ao transferir transações: " + txError.message);

      // 3. Get existing ministry links for master to avoid duplicates
      const { data: masterMinistries } = await supabase
        .from("member_ministries")
        .select("ministry_id")
        .eq("member_id", masterId);

      const masterMinistryIds = new Set(masterMinistries?.map(m => m.ministry_id) || []);

      // 4. Get ministry links from duplicates
      const { data: duplicateMinistries } = await supabase
        .from("member_ministries")
        .select("ministry_id, role, joined_at")
        .in("member_id", duplicateIds);

      // 5. Add unique ministry links to master
      if (duplicateMinistries && duplicateMinistries.length > 0) {
        const newMinistryLinks = duplicateMinistries
          .filter(m => !masterMinistryIds.has(m.ministry_id))
          .map(m => ({
            member_id: masterId,
            ministry_id: m.ministry_id,
            role: m.role,
            joined_at: m.joined_at,
          }));

        if (newMinistryLinks.length > 0) {
          const { error: ministryInsertError } = await supabase
            .from("member_ministries")
            .insert(newMinistryLinks);

          if (ministryInsertError) {
            console.error("Erro ao transferir ministérios:", ministryInsertError);
            // Continue even if this fails - not critical
          }
        }
      }

      // 6. Delete ministry links from duplicates
      const { error: deleteMinistryError } = await supabase
        .from("member_ministries")
        .delete()
        .in("member_id", duplicateIds);

      if (deleteMinistryError) {
        console.error("Erro ao remover vínculos de ministério:", deleteMinistryError);
      }

      // 7. Delete duplicate members
      const { error: deleteError } = await supabase
        .from("members")
        .delete()
        .in("id", duplicateIds);

      if (deleteError) throw new Error("Erro ao excluir duplicatas: " + deleteError.message);

      // 8. Log audit action
      await logAuditAction("MERGE_MEMBERS", "members", duplicateIds.length + 1, {
        master_id: masterId,
        merged_ids: duplicateIds,
      });

      return duplicateIds.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ["members"] });
      queryClient.invalidateQueries({ queryKey: ["duplicate-members"] });
      queryClient.invalidateQueries({ queryKey: ["contributions"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["audit-logs"] });
      setSelectedMasterMembers({});
      toast.success(`${count} membro(s) mesclado(s) com sucesso! Contribuições e vínculos foram transferidos.`);
    },
    onError: (error) => {
      toast.error("Erro ao mesclar membros: " + error.message);
    },
  });

  const deleteTransactionsMutation = createDeleteMutation("transactions");
  const deleteMembersMutation = createDeleteMutation("members");
  const deleteContributionsMutation = createDeleteMutation("contributions");

  // Get current data based on active tab
  const getCurrentData = () => {
    switch (activeTab) {
      case "transactions": return transactionGroups;
      case "members": return memberGroups;
      case "contributions": return contributionGroups;
    }
  };

  const getCurrentLoading = () => {
    switch (activeTab) {
      case "transactions": return loadingTransactions;
      case "members": return loadingMembers;
      case "contributions": return loadingContributions;
    }
  };

  const getCurrentDeleteMutation = () => {
    switch (activeTab) {
      case "transactions": return deleteTransactionsMutation;
      case "members": return deleteMembersMutation;
      case "contributions": return deleteContributionsMutation;
    }
  };

  // Auto-select duplicates (keep the oldest one in each group)
  const autoSelectDuplicates = () => {
    const data = getCurrentData();
    if (!data) return;

    const toDelete = new Set<string>();
    
    for (const group of data) {
      const sorted = [...group.items].sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
      
      for (let i = 1; i < sorted.length; i++) {
        toDelete.add(sorted[i].id);
      }
    }

    setSelectedForDeletion(toDelete);
    toast.info(`${toDelete.size} itens selecionados para exclusão`);
  };

  // Toggle individual item selection
  const toggleItem = (itemId: string) => {
    setSelectedForDeletion(prev => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
  };

  // Handle scan button click
  const handleScan = async () => {
    setIsScanning(true);
    setSelectedForDeletion(new Set());
    setSelectedMasterMembers({});
    
    switch (activeTab) {
      case "transactions": await refetchTransactions(); break;
      case "members": await refetchMembers(); break;
      case "contributions": await refetchContributions(); break;
    }
    
    setIsScanning(false);
  };

  // Handle tab change
  const handleTabChange = (value: string) => {
    setActiveTab(value as EntityType);
    setSelectedForDeletion(new Set());
    setSelectedMasterMembers({});
  };

  // Handle merge button click for a group
  const handleMergeClick = (group: DuplicateMemberGroup) => {
    const masterId = selectedMasterMembers[group.key];
    if (!masterId) {
      toast.error("Selecione o membro principal antes de mesclar");
      return;
    }
    setPendingMergeGroup(group);
    setMergeDialogOpen(true);
  };

  // Confirm merge
  const confirmMerge = () => {
    if (!pendingMergeGroup) return;
    
    const masterId = selectedMasterMembers[pendingMergeGroup.key];
    const duplicateIds = pendingMergeGroup.items
      .filter(m => m.id !== masterId)
      .map(m => m.id);

    mergeMembersMutation.mutate({ masterId, duplicateIds });
    setMergeDialogOpen(false);
    setPendingMergeGroup(null);
  };

  const currentData = getCurrentData();
  const currentLoading = getCurrentLoading();
  const currentMutation = getCurrentDeleteMutation();
  const totalDuplicates = currentData?.reduce((sum, g) => sum + g.items.length - 1, 0) || 0;

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

  const formatDateTime = (dateString: string) => {
    return format(new Date(dateString), "dd/MM/yyyy HH:mm", { locale: ptBR });
  };

  const contributionTypeLabels: Record<string, string> = {
    dizimo: "Dízimo",
    oferta: "Oferta",
    campanha: "Campanha",
    voto: "Voto",
    outro: "Outro",
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Copy className="h-5 w-5" />
            Limpeza de Duplicatas
          </CardTitle>
          <CardDescription>
            Identifique e remova registros duplicados do banco de dados em transações, membros e contribuições.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Tabs value={activeTab} onValueChange={handleTabChange}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="transactions" className="flex items-center gap-2">
                <Wallet className="h-4 w-4" />
                <span className="hidden sm:inline">Transações</span>
              </TabsTrigger>
              <TabsTrigger value="members" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                <span className="hidden sm:inline">Membros</span>
              </TabsTrigger>
              <TabsTrigger value="contributions" className="flex items-center gap-2">
                <Receipt className="h-4 w-4" />
                <span className="hidden sm:inline">Contribuições</span>
              </TabsTrigger>
            </TabsList>

            {/* Action buttons (shared across all tabs) */}
            <div className="flex flex-wrap gap-2 mt-4">
              <Button
                onClick={handleScan}
                disabled={currentLoading || isScanning}
                variant="outline"
              >
                {isScanning ? (
                  <LoadingSpinner size="sm" className="mr-2" />
                ) : (
                  <Search className="h-4 w-4 mr-2" />
                )}
                Buscar Duplicatas
              </Button>

              {currentData && currentData.length > 0 && (
                <>
                  <Button
                    onClick={autoSelectDuplicates}
                    variant="outline"
                    disabled={currentMutation.isPending}
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Auto-Selecionar
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

            {/* Merge info for members tab */}
            {activeTab === "members" && memberGroups && memberGroups.length > 0 && (
              <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg mt-4">
                <Info className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
                <div className="text-sm text-blue-800 dark:text-blue-200">
                  <strong>Mesclar membros:</strong> Selecione o membro "principal" em cada grupo usando o botão de rádio. 
                  Ao mesclar, todas as contribuições, transações e vínculos de ministérios dos duplicados serão 
                  transferidos para o membro principal antes de excluí-los.
                </div>
              </div>
            )}

            {/* Results summary */}
            {currentData !== undefined && (
              <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg mt-4">
                {currentData.length === 0 ? (
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle2 className="h-5 w-5" />
                    <span className="font-medium">Nenhuma duplicata encontrada!</span>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-amber-500" />
                      <span className="font-medium">
                        {currentData.length} grupo(s) de duplicatas
                      </span>
                    </div>
                    <Badge variant="secondary">
                      {totalDuplicates} duplicata(s)
                    </Badge>
                    {selectedForDeletion.size > 0 && (
                      <Badge variant="destructive">
                        {selectedForDeletion.size} selecionada(s)
                      </Badge>
                    )}
                  </>
                )}
              </div>
            )}

            {/* Delete button */}
            {selectedForDeletion.size > 0 && (
              <div className="flex items-center justify-between p-4 border border-destructive/50 rounded-lg bg-destructive/5 mt-4">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                  <span className="text-sm">
                    {selectedForDeletion.size} item(ns) selecionado(s) para exclusão
                  </span>
                </div>
                <Button
                  variant="destructive"
                  onClick={() => currentMutation.mutate(Array.from(selectedForDeletion))}
                  disabled={currentMutation.isPending}
                >
                  {currentMutation.isPending ? (
                    <LoadingSpinner size="sm" className="mr-2" />
                  ) : (
                    <Trash2 className="h-4 w-4 mr-2" />
                  )}
                  Excluir Selecionadas
                </Button>
              </div>
            )}

            {/* Loading state */}
            {currentLoading && (
              <div className="flex items-center justify-center py-8">
                <LoadingSpinner size="lg" />
              </div>
            )}

            {/* Transactions Tab */}
            <TabsContent value="transactions" className="mt-4">
              {transactionGroups && transactionGroups.length > 0 && (
                <ScrollArea className="h-[400px] rounded-lg border">
                  <div className="p-4 space-y-4">
                    {transactionGroups.map((group, groupIndex) => (
                      <div key={group.key} className="space-y-2">
                        {groupIndex > 0 && <Separator className="my-4" />}
                        
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
                          <Badge variant="outline">{group.items.length} cópias</Badge>
                        </div>

                        <div className="ml-4 space-y-2">
                          {group.items.map((tx, txIndex) => (
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
                                onCheckedChange={() => toggleItem(tx.id)}
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
                                    <Badge variant="secondary" className="text-xs">{tx.origin}</Badge>
                                  )}
                                </div>
                                
                                <div className="text-xs text-muted-foreground">
                                  Criado em: {formatDateTime(tx.created_at)}
                                  {tx.category_name && ` • ${tx.category_name}`}
                                  {tx.ministry_name && ` • ${tx.ministry_name}`}
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
            </TabsContent>

            {/* Members Tab with Merge functionality */}
            <TabsContent value="members" className="mt-4">
              {memberGroups && memberGroups.length > 0 && (
                <ScrollArea className="h-[400px] rounded-lg border">
                  <div className="p-4 space-y-4">
                    {memberGroups.map((group, groupIndex) => (
                      <div key={group.key} className="space-y-2">
                        {groupIndex > 0 && <Separator className="my-4" />}
                        
                        <div className="flex items-center justify-between">
                          <div className="space-y-1">
                            <span className="font-medium">{group.fullName}</span>
                            <div className="text-sm text-muted-foreground">
                              {group.email || "Sem email"} • {group.phone || "Sem telefone"}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">{group.items.length} cópias</Badge>
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => handleMergeClick(group)}
                              disabled={!selectedMasterMembers[group.key] || mergeMembersMutation.isPending}
                            >
                              {mergeMembersMutation.isPending ? (
                                <LoadingSpinner size="sm" className="mr-2" />
                              ) : (
                                <Merge className="h-4 w-4 mr-2" />
                              )}
                              Mesclar
                            </Button>
                          </div>
                        </div>

                        <RadioGroup
                          value={selectedMasterMembers[group.key] || ""}
                          onValueChange={(value) => 
                            setSelectedMasterMembers(prev => ({ ...prev, [group.key]: value }))
                          }
                          className="ml-4 space-y-2"
                        >
                          {group.items.map((member, idx) => (
                            <div
                              key={member.id}
                              className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                                selectedMasterMembers[group.key] === member.id
                                  ? "bg-primary/10 border-primary/50"
                                  : selectedForDeletion.has(member.id)
                                  ? "bg-destructive/10 border-destructive/50"
                                  : "bg-muted/30"
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <RadioGroupItem value={member.id} id={`master-${member.id}`} />
                                <Label htmlFor={`master-${member.id}`} className="text-xs text-muted-foreground cursor-pointer">
                                  Principal
                                </Label>
                              </div>

                              <Checkbox
                                checked={selectedForDeletion.has(member.id)}
                                onCheckedChange={() => toggleItem(member.id)}
                              />
                              
                              <div className="flex-1 min-w-0 space-y-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  {idx === 0 && (
                                    <Badge variant="outline" className="text-green-600 border-green-600">
                                      Mais antigo
                                    </Badge>
                                  )}
                                  {selectedMasterMembers[group.key] === member.id && (
                                    <Badge variant="default" className="text-xs">
                                      Será mantido
                                    </Badge>
                                  )}
                                  <Badge variant="outline">{member.status || "Ativo"}</Badge>
                                </div>
                                
                                <div className="text-xs text-muted-foreground">
                                  Criado em: {formatDateTime(member.created_at)}
                                  {member.member_since && ` • Membro desde: ${formatDate(member.member_since)}`}
                                </div>
                              </div>
                            </div>
                          ))}
                        </RadioGroup>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </TabsContent>

            {/* Contributions Tab */}
            <TabsContent value="contributions" className="mt-4">
              {contributionGroups && contributionGroups.length > 0 && (
                <ScrollArea className="h-[400px] rounded-lg border">
                  <div className="p-4 space-y-4">
                    {contributionGroups.map((group, groupIndex) => (
                      <div key={group.key} className="space-y-2">
                        {groupIndex > 0 && <Separator className="my-4" />}
                        
                        <div className="flex items-center justify-between">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <Badge variant="default">
                                {contributionTypeLabels[group.contributionType] || group.contributionType}
                              </Badge>
                              <span className="font-medium">{group.memberName || "Membro anônimo"}</span>
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {formatCurrency(group.amount)} • {formatDate(group.contributionDate)}
                            </div>
                          </div>
                          <Badge variant="outline">{group.items.length} cópias</Badge>
                        </div>

                        <div className="ml-4 space-y-2">
                          {group.items.map((c, idx) => (
                            <div
                              key={c.id}
                              className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                                selectedForDeletion.has(c.id)
                                  ? "bg-destructive/10 border-destructive/50"
                                  : "bg-muted/30"
                              }`}
                            >
                              <Checkbox
                                checked={selectedForDeletion.has(c.id)}
                                onCheckedChange={() => toggleItem(c.id)}
                              />
                              
                              <div className="flex-1 min-w-0 space-y-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  {idx === 0 && (
                                    <Badge variant="outline" className="text-green-600 border-green-600">
                                      Original
                                    </Badge>
                                  )}
                                  {c.receipt_number && (
                                    <Badge variant="secondary" className="text-xs">
                                      Recibo: {c.receipt_number}
                                    </Badge>
                                  )}
                                </div>
                                
                                <div className="text-xs text-muted-foreground">
                                  Criado em: {formatDateTime(c.created_at)}
                                </div>
                              </div>

                              <div className="text-sm font-medium">
                                {formatCurrency(c.amount)}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Merge Confirmation Dialog */}
      <AlertDialog open={mergeDialogOpen} onOpenChange={setMergeDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Merge className="h-5 w-5" />
              Confirmar Mesclagem de Membros
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                Você está prestes a mesclar <strong>{pendingMergeGroup?.items.length}</strong> registros de membro em um único registro.
              </p>
              <p className="text-sm">
                As seguintes ações serão realizadas:
              </p>
              <ul className="list-disc list-inside text-sm space-y-1 ml-2">
                <li>Todas as contribuições serão transferidas para o membro principal</li>
                <li>Todas as transações vinculadas serão transferidas</li>
                <li>Vínculos de ministérios únicos serão preservados</li>
                <li>Os registros duplicados serão permanentemente excluídos</li>
              </ul>
              <p className="text-destructive font-medium mt-2">
                Esta ação não pode ser desfeita!
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmMerge}>
              Confirmar Mesclagem
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
