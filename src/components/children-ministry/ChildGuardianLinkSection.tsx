import { useState } from "react";
import { useGuardians, useChildWithGuardians, useChildMutations, Guardian } from "@/hooks/useChildrenMinistry";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { UserPlus, X, Shield, Star, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

type ChildGuardianLinkSectionProps = {
  childId: string | undefined;
};

export function ChildGuardianLinkSection({ childId }: ChildGuardianLinkSectionProps) {
  const [selectedGuardianId, setSelectedGuardianId] = useState("");
  const [isPrimary, setIsPrimary] = useState(false);
  const [canPickup, setCanPickup] = useState(true);

  const { data: allGuardians, isLoading: guardiansLoading } = useGuardians();
  const { data: childWithGuardians, isLoading: childLoading } = useChildWithGuardians(childId);
  const { linkGuardianToChild } = useChildMutations();
  const queryClient = useQueryClient();

  const unlinkGuardian = useMutation({
    mutationFn: async ({ childId, guardianId }: { childId: string; guardianId: string }) => {
      const { error } = await supabase
        .from("child_guardians")
        .delete()
        .eq("child_id", childId)
        .eq("guardian_id", guardianId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Vínculo removido!");
      queryClient.invalidateQueries({ queryKey: ["child-with-guardians"] });
    },
    onError: (error) => {
      toast.error(`Erro ao remover vínculo: ${error.message}`);
    },
  });

  const linkedGuardianIds = childWithGuardians?.guardians?.map((g) => g.id) || [];
  const availableGuardians = allGuardians?.filter((g) => !linkedGuardianIds.includes(g.id)) || [];

  const handleLink = async () => {
    if (!childId || !selectedGuardianId) {
      toast.error("Selecione um responsável");
      return;
    }

    try {
      await linkGuardianToChild.mutateAsync({
        childId,
        guardianId: selectedGuardianId,
        isPrimary,
        canPickup,
      });
      setSelectedGuardianId("");
      setIsPrimary(false);
      setCanPickup(true);
    } catch (error) {
      // Error handled in mutation
    }
  };

  const handleUnlink = async (guardianId: string) => {
    if (!childId) return;
    await unlinkGuardian.mutateAsync({ childId, guardianId });
  };

  if (!childId) {
    return (
      <div className="text-center py-6 text-muted-foreground">
        <p>Salve a criança primeiro para vincular responsáveis</p>
      </div>
    );
  }

  if (guardiansLoading || childLoading) {
    return (
      <div className="text-center py-4 text-muted-foreground">
        Carregando...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Linked Guardians List */}
      {childWithGuardians?.guardians && childWithGuardians.guardians.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-muted-foreground">Responsáveis Vinculados</h4>
          <div className="space-y-2">
            {childWithGuardians.guardians.map((guardian) => (
              <div
                key={guardian.id}
                className="flex items-center justify-between p-3 border rounded-lg bg-muted/30"
              >
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={guardian.photo_url || undefined} />
                    <AvatarFallback>
                      {guardian.full_name.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{guardian.full_name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">
                        {guardian.relationship}
                      </Badge>
                      {guardian.is_primary && (
                        <Badge variant="default" className="text-xs">
                          <Star className="h-3 w-3 mr-1" />
                          Principal
                        </Badge>
                      )}
                      {guardian.can_pickup && (
                        <Badge variant="secondary" className="text-xs">
                          <Shield className="h-3 w-3 mr-1" />
                          Pode buscar
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:text-destructive"
                  onClick={() => handleUnlink(guardian.id)}
                  disabled={unlinkGuardian.isPending}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add New Link */}
      {availableGuardians.length > 0 ? (
        <div className="space-y-3 p-4 border rounded-lg bg-muted/20">
          <h4 className="text-sm font-medium">Vincular Responsável</h4>
          
          <Select value={selectedGuardianId} onValueChange={setSelectedGuardianId}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione um responsável cadastrado" />
            </SelectTrigger>
            <SelectContent>
              {availableGuardians.map((guardian) => (
                <SelectItem key={guardian.id} value={guardian.id}>
                  <div className="flex items-center gap-2">
                    <span>{guardian.full_name}</span>
                    <span className="text-muted-foreground text-xs">
                      ({guardian.relationship})
                    </span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox
                checked={isPrimary}
                onCheckedChange={(checked) => setIsPrimary(checked === true)}
              />
              <span className="text-sm">Responsável principal</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox
                checked={canPickup}
                onCheckedChange={(checked) => setCanPickup(checked === true)}
              />
              <span className="text-sm">Pode retirar a criança</span>
            </label>
          </div>

          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={handleLink}
            disabled={!selectedGuardianId || linkGuardianToChild.isPending}
          >
            <UserPlus className="h-4 w-4 mr-2" />
            Vincular Responsável
          </Button>
        </div>
      ) : (
        <div className="text-center py-4 text-muted-foreground border rounded-lg">
          <p className="text-sm">Todos os responsáveis já estão vinculados</p>
          <p className="text-xs mt-1">Cadastre novos responsáveis na aba "Responsáveis"</p>
        </div>
      )}
    </div>
  );
}
