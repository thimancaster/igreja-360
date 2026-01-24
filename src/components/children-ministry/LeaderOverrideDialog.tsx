import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AlertTriangle, Shield } from "lucide-react";
import { useLeaderOverrideMutations } from "@/hooks/useParentData";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const overrideSchema = z.object({
  pickup_person_name: z.string().min(3, "Nome é obrigatório"),
  pickup_person_document: z.string().optional(),
  reason: z.string().min(10, "Motivo deve ter no mínimo 10 caracteres"),
});

type OverrideFormData = z.infer<typeof overrideSchema>;

interface LeaderOverrideDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  checkInId: string;
  childName: string;
  onSuccess?: () => void;
}

export function LeaderOverrideDialog({
  open,
  onOpenChange,
  checkInId,
  childName,
  onSuccess,
}: LeaderOverrideDialogProps) {
  const { createOverride } = useLeaderOverrideMutations();

  const form = useForm<OverrideFormData>({
    resolver: zodResolver(overrideSchema),
    defaultValues: {
      pickup_person_name: "",
      pickup_person_document: "",
      reason: "",
    },
  });

  const onSubmit = async (data: OverrideFormData) => {
    await createOverride.mutateAsync({
      check_in_id: checkInId,
      pickup_person_name: data.pickup_person_name,
      pickup_person_document: data.pickup_person_document,
      reason: data.reason,
    });
    onOpenChange(false);
    form.reset();
    onSuccess?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-amber-600">
            <Shield className="h-5 w-5" />
            Check-out de Emergência
          </DialogTitle>
          <DialogDescription>
            Liberação de checkout pelo líder para <strong>{childName}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-start gap-3 rounded-lg border border-amber-500/50 bg-amber-500/10 p-3">
          <AlertTriangle className="h-5 w-5 flex-shrink-0 text-amber-500" />
          <div className="space-y-1 text-sm">
            <p className="font-medium text-amber-600">Atenção!</p>
            <p className="text-muted-foreground">
              Esta ação será registrada no log de auditoria e os responsáveis serão notificados.
              Use apenas em casos de emergência quando nenhum responsável autorizado está disponível.
            </p>
          </div>
        </div>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="pickup_person_name">Nome de quem está retirando *</Label>
            <Input
              id="pickup_person_name"
              {...form.register("pickup_person_name")}
              placeholder="Nome completo"
            />
            {form.formState.errors.pickup_person_name && (
              <p className="text-sm text-destructive">{form.formState.errors.pickup_person_name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="pickup_person_document">Documento (RG/CPF)</Label>
            <Input
              id="pickup_person_document"
              {...form.register("pickup_person_document")}
              placeholder="Documento de identificação"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">Motivo da liberação *</Label>
            <Textarea
              id="reason"
              {...form.register("reason")}
              placeholder="Descreva o motivo da liberação de emergência..."
              rows={3}
            />
            {form.formState.errors.reason && (
              <p className="text-sm text-destructive">{form.formState.errors.reason.message}</p>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button 
              type="submit" 
              variant="destructive"
              disabled={createOverride.isPending}
            >
              {createOverride.isPending ? "Processando..." : "Confirmar Check-out"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
