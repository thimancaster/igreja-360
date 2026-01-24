import { useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, Clock, Shield, AlertTriangle } from "lucide-react";
import { useParentChildren, usePickupAuthorizations, usePickupAuthorizationMutations } from "@/hooks/useParentData";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { useSearchParams } from "react-router-dom";
import { pageVariants, pageTransition } from "@/lib/pageAnimations";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const authorizationSchema = z.object({
  authorized_person_name: z.string().min(3, "Nome é obrigatório"),
  authorized_person_phone: z.string().optional(),
  authorized_person_document: z.string().optional(),
  authorization_type: z.enum(["one_time", "date_range", "permanent"]),
  valid_until: z.string().optional(),
  security_pin: z.string().min(4, "PIN deve ter no mínimo 4 dígitos").max(6, "PIN deve ter no máximo 6 dígitos"),
  reason: z.string().optional(),
  leader_approval_required: z.boolean().default(false),
});

type AuthorizationFormData = z.infer<typeof authorizationSchema>;

export default function ParentAuthorizations() {
  const [searchParams] = useSearchParams();
  const preselectedChildId = searchParams.get("childId");
  
  const [selectedChildId, setSelectedChildId] = useState<string>(preselectedChildId || "");
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: children, isLoading: loadingChildren } = useParentChildren();
  const { data: authorizations, isLoading: loadingAuth } = usePickupAuthorizations(selectedChildId || undefined);
  const { createAuthorization, cancelAuthorization } = usePickupAuthorizationMutations();

  const form = useForm<AuthorizationFormData>({
    resolver: zodResolver(authorizationSchema),
    defaultValues: {
      authorization_type: "one_time",
      leader_approval_required: false,
    },
  });

  const onSubmit = async (data: AuthorizationFormData) => {
    if (!selectedChildId) return;

    await createAuthorization.mutateAsync({
      child_id: selectedChildId,
      authorized_person_name: data.authorized_person_name,
      authorized_person_phone: data.authorized_person_phone,
      authorized_person_document: data.authorized_person_document,
      authorization_type: data.authorization_type,
      valid_until: data.valid_until,
      security_pin: data.security_pin,
      reason: data.reason,
      leader_approval_required: data.leader_approval_required,
    });
    setDialogOpen(false);
    form.reset();
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
      pending: { label: "Aguardando Aprovação", variant: "secondary" },
      approved: { label: "Aprovada", variant: "default" },
      active: { label: "Ativa", variant: "default" },
      used: { label: "Utilizada", variant: "outline" },
      expired: { label: "Expirada", variant: "destructive" },
      cancelled: { label: "Cancelada", variant: "destructive" },
    };
    const { label, variant } = statusMap[status] || { label: status, variant: "outline" };
    return <Badge variant={variant}>{label}</Badge>;
  };

  const getTypeBadge = (type: string) => {
    const typeMap: Record<string, string> = {
      one_time: "Uso Único",
      date_range: "Período",
      permanent: "Permanente",
    };
    return <Badge variant="outline">{typeMap[type] || type}</Badge>;
  };

  if (loadingChildren) {
    return (
      <div className="flex h-64 items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={pageTransition}
      className="flex-1 space-y-6 p-6"
    >
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Autorizações de Retirada</h1>
          <p className="text-muted-foreground">
            Autorize terceiros a buscar seus filhos com segurança
          </p>
        </div>
      </div>

      {/* Child selector */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Selecionar Filho</CardTitle>
          <CardDescription>Escolha para qual filho deseja gerenciar autorizações</CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={selectedChildId} onValueChange={setSelectedChildId}>
            <SelectTrigger className="w-full md:w-96">
              <SelectValue placeholder="Selecione um filho" />
            </SelectTrigger>
            <SelectContent>
              {children?.map((child: any) => (
                <SelectItem key={child.id} value={child.id}>
                  {child.full_name} - {child.classroom}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {selectedChildId && (
        <>
          {/* Add authorization button */}
          <div className="flex justify-end">
            <Button onClick={() => setDialogOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Nova Autorização
            </Button>
          </div>

          {/* Authorizations list */}
          {loadingAuth ? (
            <div className="flex h-32 items-center justify-center">
              <LoadingSpinner />
            </div>
          ) : authorizations && authorizations.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2">
              {authorizations.map((auth) => (
                <Card key={auth.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{auth.authorized_person_name}</CardTitle>
                        {auth.authorized_person_phone && (
                          <CardDescription>{auth.authorized_person_phone}</CardDescription>
                        )}
                      </div>
                      {getStatusBadge(auth.status)}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex flex-wrap gap-2">
                      {getTypeBadge(auth.authorization_type)}
                      {auth.leader_approval_required && (
                        <Badge variant="outline" className="gap-1">
                          <Shield className="h-3 w-3" />
                          Requer Líder
                        </Badge>
                      )}
                    </div>

                    {auth.valid_until && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        Válida até: {format(new Date(auth.valid_until), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                      </div>
                    )}

                    {auth.reason && (
                      <p className="text-sm text-muted-foreground">{auth.reason}</p>
                    )}

                    <div className="flex items-center justify-between rounded-lg bg-muted p-3">
                      <span className="text-sm font-medium">PIN de Segurança:</span>
                      <code className="rounded bg-background px-2 py-1 text-sm font-mono">
                        {auth.security_pin}
                      </code>
                    </div>

                    {auth.status !== 'used' && auth.status !== 'cancelled' && auth.status !== 'expired' && (
                      <Button
                        variant="destructive"
                        size="sm"
                        className="w-full gap-2"
                        onClick={() => cancelAuthorization.mutate(auth.id)}
                        disabled={cancelAuthorization.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                        Cancelar Autorização
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Shield className="h-16 w-16 text-muted-foreground/50" />
                <p className="mt-4 text-lg font-medium">Nenhuma autorização ativa</p>
                <p className="text-muted-foreground">
                  Crie uma autorização para permitir que terceiros busquem seu filho.
                </p>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Create authorization dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nova Autorização de Retirada</DialogTitle>
            <DialogDescription>
              Preencha os dados da pessoa autorizada a buscar seu filho
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="authorized_person_name">Nome Completo *</Label>
              <Input
                id="authorized_person_name"
                {...form.register("authorized_person_name")}
                placeholder="Nome da pessoa autorizada"
              />
              {form.formState.errors.authorized_person_name && (
                <p className="text-sm text-destructive">{form.formState.errors.authorized_person_name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="authorized_person_phone">Telefone</Label>
              <Input
                id="authorized_person_phone"
                {...form.register("authorized_person_phone")}
                placeholder="(00) 00000-0000"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="authorized_person_document">Documento (RG/CPF)</Label>
              <Input
                id="authorized_person_document"
                {...form.register("authorized_person_document")}
                placeholder="Documento de identificação"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="authorization_type">Tipo de Autorização</Label>
              <Select
                value={form.watch("authorization_type")}
                onValueChange={(value) => form.setValue("authorization_type", value as any)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="one_time">Uso Único</SelectItem>
                  <SelectItem value="date_range">Período Específico</SelectItem>
                  <SelectItem value="permanent">Permanente</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {form.watch("authorization_type") === "date_range" && (
              <div className="space-y-2">
                <Label htmlFor="valid_until">Válida Até</Label>
                <Input
                  id="valid_until"
                  type="datetime-local"
                  {...form.register("valid_until")}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="security_pin">PIN de Segurança *</Label>
              <Input
                id="security_pin"
                type="password"
                maxLength={6}
                {...form.register("security_pin")}
                placeholder="4-6 dígitos"
              />
              {form.formState.errors.security_pin && (
                <p className="text-sm text-destructive">{form.formState.errors.security_pin.message}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Este PIN será solicitado no momento da retirada
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reason">Motivo (opcional)</Label>
              <Textarea
                id="reason"
                {...form.register("reason")}
                placeholder="Ex: Buscar no culto de domingo"
                rows={2}
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border p-3">
              <div className="space-y-0.5">
                <Label className="text-sm font-medium">Requer aprovação do líder</Label>
                <p className="text-xs text-muted-foreground">
                  A autorização só será válida após aprovação
                </p>
              </div>
              <Switch
                checked={form.watch("leader_approval_required")}
                onCheckedChange={(checked) => form.setValue("leader_approval_required", checked)}
              />
            </div>

            <div className="flex items-start gap-2 rounded-lg bg-muted p-3">
              <AlertTriangle className="h-5 w-5 flex-shrink-0 text-amber-500" />
              <p className="text-xs text-muted-foreground">
                A pessoa autorizada deverá informar o PIN no momento da retirada. 
                Certifique-se de compartilhar este PIN apenas com ela.
              </p>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={createAuthorization.isPending}>
                {createAuthorization.isPending ? "Criando..." : "Criar Autorização"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
