import { useState } from "react";
import { useActiveMedications, useMedicationMutations, MedicationSchedule } from "@/hooks/useHealthSafety";
import { useChildren, Child } from "@/hooks/useChildrenMinistry";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Pill, Plus, Clock, AlertTriangle, Snowflake, CheckCircle2 } from "lucide-react";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

type MedicationWithChild = MedicationSchedule & {
  children: { id: string; full_name: string; photo_url: string | null; classroom: string } | null;
};

export function MedicationPanel() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [adminDialogOpen, setAdminDialogOpen] = useState(false);
  const [selectedMed, setSelectedMed] = useState<MedicationWithChild | null>(null);

  const { data: medications, isLoading } = useActiveMedications();
  const { data: children } = useChildren();
  const { user, profile } = useAuth();
  const { createSchedule, logAdministration } = useMedicationMutations();

  const [formData, setFormData] = useState({
    child_id: "",
    medication_name: "",
    dosage: "",
    frequency: "",
    instructions: "",
    requires_refrigeration: false,
    start_date: new Date().toISOString().split("T")[0],
    end_date: "",
  });

  const [adminNotes, setAdminNotes] = useState("");

  const handleCreate = async () => {
    if (!formData.child_id || !formData.medication_name || !formData.dosage) return;

    await createSchedule.mutateAsync({
      child_id: formData.child_id,
      medication_name: formData.medication_name,
      dosage: formData.dosage,
      frequency: formData.frequency,
      instructions: formData.instructions || null,
      requires_refrigeration: formData.requires_refrigeration,
      start_date: formData.start_date,
      end_date: formData.end_date || null,
      administration_times: null,
      parent_authorization_date: null,
      authorized_by: null,
      is_active: true,
    });

    setDialogOpen(false);
    setFormData({
      child_id: "",
      medication_name: "",
      dosage: "",
      frequency: "",
      instructions: "",
      requires_refrigeration: false,
      start_date: new Date().toISOString().split("T")[0],
      end_date: "",
    });
  };

  const handleAdminister = async () => {
    if (!selectedMed || !user?.id || !profile?.church_id) return;

    await logAdministration.mutateAsync({
      schedule_id: selectedMed.id,
      child_id: selectedMed.child_id,
      church_id: profile.church_id,
      administered_at: new Date().toISOString(),
      administered_by: user.id,
      dosage_given: selectedMed.dosage,
      notes: adminNotes || null,
      witnessed_by: null,
    });

    setAdminDialogOpen(false);
    setSelectedMed(null);
    setAdminNotes("");
  };

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
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Pill className="h-6 w-6" />
              <div>
                <CardTitle>Controle de Medicação</CardTitle>
                <CardDescription>Medicações ativas para administrar hoje</CardDescription>
              </div>
            </div>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Nova Medicação
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {medications && medications.length > 0 ? (
            <div className="space-y-4">
              {(medications as MedicationWithChild[]).map((med) => (
                <div
                  key={med.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <Avatar>
                      <AvatarImage src={med.children?.photo_url || undefined} />
                      <AvatarFallback>
                        {med.children?.full_name?.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{med.children?.full_name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="secondary">{med.medication_name}</Badge>
                        <span className="text-sm text-muted-foreground">{med.dosage}</span>
                        {med.requires_refrigeration && (
                          <Snowflake className="h-4 w-4 text-blue-500" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        <Clock className="h-3 w-3 inline mr-1" />
                        {med.frequency}
                        {med.instructions && ` • ${med.instructions}`}
                      </p>
                    </div>
                  </div>
                  <Button
                    onClick={() => {
                      setSelectedMed(med);
                      setAdminDialogOpen(true);
                    }}
                  >
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Administrar
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Pill className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Nenhuma medicação ativa</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* New Medication Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nova Medicação</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Criança</Label>
              <Select
                value={formData.child_id}
                onValueChange={(v) => setFormData({ ...formData, child_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a criança" />
                </SelectTrigger>
                <SelectContent>
                  {children?.map((child: Child) => (
                    <SelectItem key={child.id} value={child.id}>
                      {child.full_name} - {child.classroom}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Medicamento</Label>
                <Input
                  value={formData.medication_name}
                  onChange={(e) => setFormData({ ...formData, medication_name: e.target.value })}
                  placeholder="Nome do medicamento"
                />
              </div>
              <div>
                <Label>Dosagem</Label>
                <Input
                  value={formData.dosage}
                  onChange={(e) => setFormData({ ...formData, dosage: e.target.value })}
                  placeholder="Ex: 5ml, 1 comprimido"
                />
              </div>
            </div>
            <div>
              <Label>Frequência</Label>
              <Input
                value={formData.frequency}
                onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
                placeholder="Ex: 1x ao dia, A cada 8 horas"
              />
            </div>
            <div>
              <Label>Instruções</Label>
              <Textarea
                value={formData.instructions}
                onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
                placeholder="Instruções adicionais..."
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Data Início</Label>
                <Input
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                />
              </div>
              <div>
                <Label>Data Fim (opcional)</Label>
                <Input
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={formData.requires_refrigeration}
                onCheckedChange={(v) => setFormData({ ...formData, requires_refrigeration: v })}
              />
              <Label>Requer refrigeração</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreate} disabled={createSchedule.isPending}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Administration Dialog */}
      <Dialog open={adminDialogOpen} onOpenChange={setAdminDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Registrar Administração</DialogTitle>
          </DialogHeader>
          {selectedMed && (
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <p className="font-medium">{selectedMed.children?.full_name}</p>
                <p className="text-sm text-muted-foreground">
                  {selectedMed.medication_name} - {selectedMed.dosage}
                </p>
              </div>
              <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg flex items-start gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-500 shrink-0 mt-0.5" />
                <p className="text-sm">
                  Confirme que está administrando a dosagem correta conforme prescrito pelos pais.
                </p>
              </div>
              <div>
                <Label>Observações (opcional)</Label>
                <Textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Ex: Criança aceitou bem..."
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdminDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAdminister} disabled={logAdministration.isPending}>
              Confirmar Administração
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
