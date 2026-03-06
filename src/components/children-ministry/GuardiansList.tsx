import { useState } from "react";
import { useGuardianManagement, Guardian, RELATIONSHIPS } from "@/hooks/useChildrenMinistry";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, Search, Users, Phone, Mail, Trash2, Baby, Link2 } from "lucide-react";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { GuardianDialog } from "./GuardianDialog";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export function GuardiansList() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterPortal, setFilterPortal] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedGuardian, setSelectedGuardian] = useState<Guardian | null>(null);
  const [deleteGuardianId, setDeleteGuardianId] = useState<string | null>(null);
  const { profile } = useAuth();
  const queryClient = useQueryClient();

  const { data: guardians, isLoading } = useGuardianManagement();

  // Fetch child counts per guardian
  const { data: childCounts } = useQuery({
    queryKey: ["guardian-child-counts", profile?.church_id],
    queryFn: async () => {
      if (!profile?.church_id) return {};
      const { data, error } = await supabase
        .from("child_guardians")
        .select("guardian_id");
      if (error) throw error;
      const counts: Record<string, number> = {};
      data?.forEach(cg => {
        counts[cg.guardian_id] = (counts[cg.guardian_id] || 0) + 1;
      });
      return counts;
    },
    enabled: !!profile?.church_id,
  });

  const deleteGuardian = useMutation({
    mutationFn: async (id: string) => {
      // First remove all child_guardians links
      const { error: linkError } = await supabase
        .from("child_guardians")
        .delete()
        .eq("guardian_id", id);
      if (linkError) throw linkError;

      const { error } = await supabase
        .from("guardians")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Responsável removido com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["guardians"] });
      queryClient.invalidateQueries({ queryKey: ["guardians-management"] });
      queryClient.invalidateQueries({ queryKey: ["guardian-child-counts"] });
      setDeleteGuardianId(null);
    },
    onError: (error) => {
      toast.error(`Erro ao remover: ${error.message}`);
    },
  });

  const filteredGuardians = guardians?.filter((guardian) => {
    const matchesSearch =
      guardian.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      guardian.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      guardian.phone?.includes(searchTerm);

    const matchesFilter =
      filterPortal === "all" ||
      (filterPortal === "linked" && guardian.profile_id) ||
      (filterPortal === "unlinked" && !guardian.profile_id);

    return matchesSearch && matchesFilter;
  });

  const handleEdit = (guardian: Guardian) => {
    setSelectedGuardian(guardian);
    setDialogOpen(true);
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setSelectedGuardian(null);
  };

  const guardianToDelete = guardians?.find(g => g.id === deleteGuardianId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <>
      <Card variant="glass">
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <Users className="h-6 w-6" />
              <div>
                <CardTitle>Responsáveis Cadastrados</CardTitle>
                <CardDescription>
                  {guardians?.length || 0} responsáveis no sistema
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-3 w-full sm:w-auto flex-wrap">
              <div className="relative flex-1 sm:flex-initial sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar responsável..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={filterPortal} onValueChange={setFilterPortal}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="linked">Com Portal</SelectItem>
                  <SelectItem value="unlinked">Sem Portal</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={() => setDialogOpen(true)} className="shrink-0">
                <Plus className="h-4 w-4 mr-2" />
                Novo Responsável
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredGuardians && filteredGuardians.length > 0 ? (
            <div className="border rounded-lg overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Responsável</TableHead>
                    <TableHead>Parentesco</TableHead>
                    <TableHead>Contato</TableHead>
                    <TableHead className="text-center">Crianças</TableHead>
                    <TableHead>Portal</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredGuardians.map((guardian) => (
                    <TableRow
                      key={guardian.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleEdit(guardian)}
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar>
                            <AvatarImage src={guardian.photo_url || undefined} />
                            <AvatarFallback>
                              {guardian.full_name.substring(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <p className="font-medium">{guardian.full_name}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{guardian.relationship}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {guardian.phone && (
                            <div className="flex items-center gap-2 text-sm">
                              <Phone className="h-3 w-3 text-muted-foreground" />
                              {guardian.phone}
                            </div>
                          )}
                          {guardian.email && (
                            <div className="flex items-center gap-2 text-sm">
                              <Mail className="h-3 w-3 text-muted-foreground" />
                              {guardian.email}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Baby className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="font-medium">{childCounts?.[guardian.id] || 0}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {guardian.profile_id ? (
                          <Badge variant="default" className="gap-1">
                            <Link2 className="h-3 w-3" />
                            Vinculado
                          </Badge>
                        ) : (
                          <Badge variant="secondary">Sem acesso</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteGuardianId(guardian.id);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-12">
              <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">Nenhum responsável cadastrado</h3>
              <p className="text-muted-foreground mb-4">
                Cadastre o primeiro responsável
              </p>
              <Button onClick={() => setDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Cadastrar Responsável
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <GuardianDialog
        open={dialogOpen}
        onOpenChange={handleDialogClose}
        guardian={selectedGuardian}
      />

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteGuardianId} onOpenChange={() => setDeleteGuardianId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover Responsável</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover <strong>{guardianToDelete?.full_name}</strong>?
              {(childCounts?.[deleteGuardianId || ""] || 0) > 0 && (
                <span className="block mt-2 text-destructive">
                  Este responsável está vinculado a {childCounts?.[deleteGuardianId || ""]} criança(s). Os vínculos serão removidos.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteGuardianId && deleteGuardian.mutate(deleteGuardianId)}
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}