import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
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
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Building2, Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Tables } from "@/integrations/supabase/types";
import { LoadingSpinner } from "@/components/LoadingSpinner"; // Importar LoadingSpinner

type Ministry = Tables<'ministries'>;

const ministrySchema = z.object({
  name: z.string().min(1, "Nome do ministério é obrigatório").max(100, "Nome muito longo"),
  description: z.string().max(500, "Descrição muito longa").optional().or(z.literal("")),
});

type MinistryFormValues = z.infer<typeof ministrySchema>;

export default function GerenciarMinisterios() {
  const { user, profile, loading: authLoading } = useAuth();
  const queryClient = useQueryClient();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedMinistry, setSelectedMinistry] = useState<Ministry | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [ministryToDelete, setMinistryToDelete] = useState<string | null>(null);

  const form = useForm<MinistryFormValues>({
    resolver: zodResolver(ministrySchema),
    defaultValues: {
      name: "",
      description: "",
    },
  });

  // Fetch ministries
  const { data: ministries, isLoading: ministriesLoading } = useQuery({
    queryKey: ["ministries", profile?.church_id],
    queryFn: async () => {
      if (!profile?.church_id) return [];
      const { data, error } = await supabase
        .from("ministries")
        .select("*")
        .eq("church_id", profile.church_id)
        .order("name", { ascending: true });

      if (error) throw error;
      return data as Ministry[];
    },
    enabled: !!profile?.church_id && !!user?.id, // Enable query only if user is logged in and has a church
  });

  // Create/Update ministry mutation
  const saveMinistryMutation = useMutation({
    mutationFn: async (data: MinistryFormValues) => {
      if (!user?.id || !profile?.church_id) throw new Error("Usuário ou igreja não encontrados.");

      const ministryData = {
        name: data.name,
        description: data.description || null,
        church_id: profile.church_id,
      };

      if (selectedMinistry) {
        const { error } = await supabase
          .from("ministries")
          .update(ministryData)
          .eq("id", selectedMinistry.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("ministries")
          .insert(ministryData);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ministries", profile?.church_id] });
      queryClient.invalidateQueries({ queryKey: ["report-filters-data"] }); // Invalidate for reports
      toast.success(`Ministério ${selectedMinistry ? "atualizado" : "criado"} com sucesso!`);
      setDialogOpen(false);
      setSelectedMinistry(null);
      form.reset();
    },
    onError: (error: any) => {
      toast.error(`Erro ao ${selectedMinistry ? "atualizar" : "criar"} ministério: ${error.message}`);
    },
  });

  // Delete ministry mutation
  const deleteMinistryMutation = useMutation({
    mutationFn: async (ministryId: string) => {
      const { error } = await supabase
        .from("ministries")
        .delete()
        .eq("id", ministryId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ministries", profile?.church_id] });
      queryClient.invalidateQueries({ queryKey: ["report-filters-data"] }); // Invalidate for reports
      toast.success("Ministério excluído com sucesso!");
      setDeleteDialogOpen(false);
      setMinistryToDelete(null);
    },
    onError: (error: any) => {
      toast.error(`Erro ao excluir ministério: ${error.message}`);
    },
  });

  useEffect(() => {
    if (selectedMinistry) {
      form.reset({
        name: selectedMinistry.name,
        description: selectedMinistry.description || "",
      });
    } else {
      form.reset({
        name: "",
        description: "",
      });
    }
  }, [selectedMinistry, form, dialogOpen]);

  const handleAddMinistry = () => {
    setSelectedMinistry(null);
    setDialogOpen(true);
  };

  const handleEditMinistry = (ministry: Ministry) => {
    setSelectedMinistry(ministry);
    setDialogOpen(true);
  };

  const handleDeleteMinistry = (id: string) => {
    setMinistryToDelete(id);
    setDeleteDialogOpen(true);
  };

  if (authLoading || ministriesLoading) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // Removido o bloco `if (!user)` que exibia "Acesso Negado"
  // A query já é desabilitada se não houver usuário.

  if (!profile?.church_id) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <CardTitle>Nenhuma Igreja Associada</CardTitle>
            <CardDescription>Seu perfil não está associado a nenhuma igreja. Por favor, crie uma igreja primeiro.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Gerenciar Ministérios</h1>
          <p className="text-muted-foreground mt-1">Adicione, edite e remova os ministérios da sua igreja.</p>
        </div>
        <Button onClick={handleAddMinistry} className="gap-2">
          <Plus className="h-4 w-4" />
          Novo Ministério
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Ministérios Cadastrados</CardTitle>
          <CardDescription>Lista de todos os ministérios da sua igreja.</CardDescription>
        </CardHeader>
        <CardContent>
          {ministries && ministries.length > 0 ? (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ministries.map((ministry) => (
                    <TableRow key={ministry.id}>
                      <TableCell className="font-medium">{ministry.name}</TableCell>
                      <TableCell className="text-muted-foreground">{ministry.description || "N/A"}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => handleEditMinistry(ministry)}
                            disabled={saveMinistryMutation.isPending}
                          >
                            {saveMinistryMutation.isPending ? <LoadingSpinner size="sm" /> : <Pencil className="h-4 w-4" />}
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => handleDeleteMinistry(ministry.id)}
                            disabled={deleteMinistryMutation.isPending}
                          >
                            {deleteMinistryMutation.isPending ? <LoadingSpinner size="sm" /> : <Trash2 className="h-4 w-4" />}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <p>Nenhum ministério cadastrado ainda. Clique em "Novo Ministério" para começar.</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{selectedMinistry ? "Editar Ministério" : "Novo Ministério"}</DialogTitle>
            <DialogDescription>
              {selectedMinistry ? "Faça alterações no ministério existente." : "Adicione um novo ministério à sua igreja."}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit((values) => saveMinistryMutation.mutate(values))} className="space-y-4 py-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome do Ministério</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Louvor, Missões, Jovens" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descrição (Opcional)</FormLabel>
                    <FormControl>
                      <Input placeholder="Breve descrição do ministério" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={saveMinistryMutation.isPending}>
                  {saveMinistryMutation.isPending && <LoadingSpinner size="sm" className="mr-2" />}
                  {selectedMinistry ? "Salvar Alterações" : "Criar Ministério"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O ministério será permanentemente excluído.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => ministryToDelete && deleteMinistryMutation.mutate(ministryToDelete)}>
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}