import { useState } from "react";
import { useAuthorizedPickups, AuthorizedPickup } from "@/hooks/useChildrenMinistry";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Plus, Edit2, Trash2, Shield, ShieldOff, Phone } from "lucide-react";
import { AuthorizedPickupDialog } from "./AuthorizedPickupDialog";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
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

type AuthorizedPickupsPanelProps = {
  childId: string | undefined;
  childName: string | undefined;
};

export function AuthorizedPickupsPanel({ childId, childName }: AuthorizedPickupsPanelProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedPickup, setSelectedPickup] = useState<AuthorizedPickup | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [pickupToDelete, setPickupToDelete] = useState<AuthorizedPickup | null>(null);

  const { data: authorizedPickups, isLoading } = useAuthorizedPickups(childId);
  const queryClient = useQueryClient();

  const deleteAuthorizedPickup = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("authorized_pickups")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Autorizado removido com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["authorized-pickups", childId] });
      setDeleteDialogOpen(false);
      setPickupToDelete(null);
    },
    onError: (error) => {
      toast.error(`Erro ao remover: ${error.message}`);
    },
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from("authorized_pickups")
        .update({ is_active })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      toast.success(variables.is_active ? "Autorização ativada!" : "Autorização desativada!");
      queryClient.invalidateQueries({ queryKey: ["authorized-pickups", childId] });
    },
    onError: (error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });

  const handleEdit = (pickup: AuthorizedPickup) => {
    setSelectedPickup(pickup);
    setDialogOpen(true);
  };

  const handleAdd = () => {
    setSelectedPickup(null);
    setDialogOpen(true);
  };

  const handleDeleteClick = (pickup: AuthorizedPickup) => {
    setPickupToDelete(pickup);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (pickupToDelete) {
      deleteAuthorizedPickup.mutate(pickupToDelete.id);
    }
  };

  if (!childId) {
    return (
      <div className="text-center py-6 text-muted-foreground">
        <p>Salve a criança primeiro para cadastrar autorizados</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="text-center py-4 text-muted-foreground">
        Carregando...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-medium">Terceiros Autorizados</h4>
          <p className="text-xs text-muted-foreground">
            Pessoas autorizadas a retirar {childName || "a criança"}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleAdd}>
          <Plus className="h-4 w-4 mr-2" />
          Adicionar
        </Button>
      </div>

      {authorizedPickups && authorizedPickups.length > 0 ? (
        <div className="space-y-2">
          {authorizedPickups.map((pickup) => (
            <div
              key={pickup.id}
              className={`flex items-center justify-between p-3 border rounded-lg transition-colors ${
                pickup.is_active ? "bg-muted/30" : "bg-muted/10 opacity-60"
              }`}
            >
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarFallback>
                    {pickup.authorized_name.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{pickup.authorized_name}</p>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    {pickup.relationship && (
                      <Badge variant="outline" className="text-xs">
                        {pickup.relationship}
                      </Badge>
                    )}
                    {pickup.authorized_phone && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {pickup.authorized_phone}
                      </span>
                    )}
                    <Badge 
                      variant={pickup.is_active ? "default" : "secondary"} 
                      className="text-xs"
                    >
                      {pickup.is_active ? (
                        <>
                          <Shield className="h-3 w-3 mr-1" />
                          Ativo
                        </>
                      ) : (
                        <>
                          <ShieldOff className="h-3 w-3 mr-1" />
                          Inativo
                        </>
                      )}
                    </Badge>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => toggleActive.mutate({ 
                    id: pickup.id, 
                    is_active: !pickup.is_active 
                  })}
                  title={pickup.is_active ? "Desativar" : "Ativar"}
                >
                  {pickup.is_active ? (
                    <ShieldOff className="h-4 w-4" />
                  ) : (
                    <Shield className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => handleEdit(pickup)}
                >
                  <Edit2 className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:text-destructive"
                  onClick={() => handleDeleteClick(pickup)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-6 text-muted-foreground border rounded-lg border-dashed">
          <Shield className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Nenhum terceiro autorizado cadastrado</p>
          <p className="text-xs mt-1">
            Cadastre vizinhos, amigos ou motoristas autorizados
          </p>
        </div>
      )}

      {/* Add/Edit Dialog */}
      {childId && (
        <AuthorizedPickupDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          childId={childId}
          pickup={selectedPickup}
        />
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover Autorizado</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover "{pickupToDelete?.authorized_name}" da lista de autorizados?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
