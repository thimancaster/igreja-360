import { useState } from "react";
import {
  useIncidentReports,
  useOpenIncidents,
  useIncidentMutations,
  INCIDENT_TYPES,
  SEVERITY_LEVELS,
  INCIDENT_STATUS,
  IncidentReport,
} from "@/hooks/useHealthSafety";
import { useChildren, Child } from "@/hooks/useChildrenMinistry";
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
import { AlertTriangle, Plus, FileText, Bell, Check } from "lucide-react";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

type IncidentWithChild = IncidentReport & {
  children: { id: string; full_name: string; photo_url: string | null; classroom: string } | null;
};

export function IncidentReportPanel() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState<IncidentWithChild | null>(null);

  const { data: openIncidents, isLoading: loadingOpen } = useOpenIncidents();
  const { data: allIncidents, isLoading: loadingAll } = useIncidentReports();
  const { data: children } = useChildren();
  const { createIncident, updateIncident, notifyParent } = useIncidentMutations();

  const [formData, setFormData] = useState({
    child_id: "",
    incident_type: "accident" as string,
    severity: "low" as string,
    location: "",
    description: "",
    immediate_action_taken: "",
    first_aid_administered: false,
    first_aid_details: "",
    medical_attention_required: false,
  });

  const handleCreate = async () => {
    if (!formData.child_id || !formData.description) return;

    const now = new Date();
    await createIncident.mutateAsync({
      child_id: formData.child_id,
      incident_type: formData.incident_type,
      severity: formData.severity,
      incident_date: now.toISOString().split("T")[0],
      incident_time: now.toTimeString().split(" ")[0],
      location: formData.location || null,
      description: formData.description,
      immediate_action_taken: formData.immediate_action_taken || null,
      first_aid_administered: formData.first_aid_administered,
      first_aid_details: formData.first_aid_details || null,
      medical_attention_required: formData.medical_attention_required,
      medical_attention_details: null,
      witnesses: null,
      staff_present: null,
      parent_notified_at: null,
      parent_notified_by: null,
      parent_response: null,
      follow_up_required: false,
      follow_up_notes: null,
      follow_up_completed_at: null,
      reviewed_by: null,
      reviewed_at: null,
      status: "open",
      check_in_id: null,
    });

    setDialogOpen(false);
    setFormData({
      child_id: "",
      incident_type: "accident",
      severity: "low",
      location: "",
      description: "",
      immediate_action_taken: "",
      first_aid_administered: false,
      first_aid_details: "",
      medical_attention_required: false,
    });
  };

  const handleNotifyParent = async () => {
    if (!selectedIncident) return;
    await notifyParent.mutateAsync({ incidentId: selectedIncident.id });
  };

  const handleResolve = async () => {
    if (!selectedIncident) return;
    await updateIncident.mutateAsync({
      id: selectedIncident.id,
      status: "resolved",
    });
    setDetailDialogOpen(false);
    setSelectedIncident(null);
  };

  const getSeverityBadge = (severity: string) => {
    const level = SEVERITY_LEVELS.find((l) => l.value === severity);
    return (
      <Badge className={cn("text-white", level?.color || "bg-gray-500")}>
        {level?.label || severity}
      </Badge>
    );
  };

  const getStatusBadge = (status: string) => {
    const s = INCIDENT_STATUS.find((st) => st.value === status);
    const colors: Record<string, string> = {
      open: "bg-red-500",
      in_review: "bg-yellow-500",
      resolved: "bg-green-500",
      closed: "bg-gray-500",
    };
    return (
      <Badge className={cn("text-white", colors[status] || "bg-gray-500")}>
        {s?.label || status}
      </Badge>
    );
  };

  const isLoading = loadingOpen || loadingAll;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <>
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Open Incidents */}
        <Card variant="glass">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-6 w-6 text-orange-500" />
                <div>
                  <CardTitle>Incidentes Abertos</CardTitle>
                  <CardDescription>
                    {openIncidents?.length || 0} incidentes pendentes
                  </CardDescription>
                </div>
              </div>
              <Button onClick={() => setDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Registrar
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {openIncidents && openIncidents.length > 0 ? (
              <div className="space-y-3">
                {(openIncidents as IncidentWithChild[]).map((incident) => (
                  <div
                    key={incident.id}
                    className="p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => {
                      setSelectedIncident(incident);
                      setDetailDialogOpen(true);
                    }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={incident.children?.photo_url || undefined} />
                          <AvatarFallback className="text-xs">
                            {incident.children?.full_name?.substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium text-sm">
                          {incident.children?.full_name}
                        </span>
                      </div>
                      {getSeverityBadge(incident.severity)}
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {incident.description}
                    </p>
                    <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                      <span>
                        {format(new Date(incident.incident_date), "dd/MM/yyyy", { locale: ptBR })}
                      </span>
                      <span>•</span>
                      <span>{INCIDENT_TYPES.find((t) => t.value === incident.incident_type)?.label}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Check className="h-12 w-12 mx-auto text-green-500 mb-4" />
                <p className="text-muted-foreground">Nenhum incidente aberto</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent History */}
        <Card variant="glass">
          <CardHeader>
            <div className="flex items-center gap-3">
              <FileText className="h-6 w-6" />
              <div>
                <CardTitle>Histórico Recente</CardTitle>
                <CardDescription>Últimos registros</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {allIncidents && allIncidents.length > 0 ? (
              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                {(allIncidents as IncidentWithChild[]).slice(0, 10).map((incident) => (
                  <div
                    key={incident.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => {
                      setSelectedIncident(incident);
                      setDetailDialogOpen(true);
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={incident.children?.photo_url || undefined} />
                        <AvatarFallback className="text-xs">
                          {incident.children?.full_name?.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">{incident.children?.full_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(incident.incident_date), "dd/MM/yyyy", { locale: ptBR })}
                        </p>
                      </div>
                    </div>
                    {getStatusBadge(incident.status)}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-4">Nenhum registro</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* New Incident Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Registrar Incidente</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto">
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
                <Label>Tipo</Label>
                <Select
                  value={formData.incident_type}
                  onValueChange={(v) => setFormData({ ...formData, incident_type: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {INCIDENT_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Gravidade</Label>
                <Select
                  value={formData.severity}
                  onValueChange={(v) => setFormData({ ...formData, severity: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SEVERITY_LEVELS.map((level) => (
                      <SelectItem key={level.value} value={level.value}>
                        {level.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Local</Label>
              <Input
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="Ex: Sala do Maternal, Pátio..."
              />
            </div>
            <div>
              <Label>Descrição do Incidente</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Descreva o que aconteceu..."
                rows={3}
              />
            </div>
            <div>
              <Label>Ação Imediata Tomada</Label>
              <Textarea
                value={formData.immediate_action_taken}
                onChange={(e) => setFormData({ ...formData, immediate_action_taken: e.target.value })}
                placeholder="O que foi feito imediatamente..."
                rows={2}
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={formData.first_aid_administered}
                onCheckedChange={(v) => setFormData({ ...formData, first_aid_administered: v })}
              />
              <Label>Primeiros socorros administrados</Label>
            </div>
            {formData.first_aid_administered && (
              <div>
                <Label>Detalhes dos Primeiros Socorros</Label>
                <Textarea
                  value={formData.first_aid_details}
                  onChange={(e) => setFormData({ ...formData, first_aid_details: e.target.value })}
                  placeholder="Descreva os cuidados prestados..."
                />
              </div>
            )}
            <div className="flex items-center gap-2">
              <Switch
                checked={formData.medical_attention_required}
                onCheckedChange={(v) => setFormData({ ...formData, medical_attention_required: v })}
              />
              <Label>Requer atendimento médico</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreate} disabled={createIncident.isPending}>
              Registrar Incidente
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Detalhes do Incidente</DialogTitle>
          </DialogHeader>
          {selectedIncident && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarImage src={selectedIncident.children?.photo_url || undefined} />
                    <AvatarFallback>
                      {selectedIncident.children?.full_name?.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{selectedIncident.children?.full_name}</p>
                    <p className="text-sm text-muted-foreground">
                      {selectedIncident.children?.classroom}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  {getSeverityBadge(selectedIncident.severity)}
                  {getStatusBadge(selectedIncident.status)}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Data/Hora</p>
                  <p>
                    {format(new Date(selectedIncident.incident_date), "dd/MM/yyyy", { locale: ptBR })}
                    {" "}às {selectedIncident.incident_time}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Tipo</p>
                  <p>{INCIDENT_TYPES.find((t) => t.value === selectedIncident.incident_type)?.label}</p>
                </div>
                {selectedIncident.location && (
                  <div>
                    <p className="text-muted-foreground">Local</p>
                    <p>{selectedIncident.location}</p>
                  </div>
                )}
              </div>

              <div>
                <p className="text-sm text-muted-foreground mb-1">Descrição</p>
                <p className="text-sm bg-muted p-3 rounded-lg">{selectedIncident.description}</p>
              </div>

              {selectedIncident.immediate_action_taken && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Ação Imediata</p>
                  <p className="text-sm bg-muted p-3 rounded-lg">{selectedIncident.immediate_action_taken}</p>
                </div>
              )}

              {selectedIncident.first_aid_administered && (
                <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                  <p className="text-sm font-medium text-blue-600">Primeiros Socorros Administrados</p>
                  {selectedIncident.first_aid_details && (
                    <p className="text-sm mt-1">{selectedIncident.first_aid_details}</p>
                  )}
                </div>
              )}

              {selectedIncident.parent_notified_at ? (
                <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                  <p className="text-sm font-medium text-green-600">
                    Pais notificados em {format(new Date(selectedIncident.parent_notified_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                  </p>
                </div>
              ) : (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={handleNotifyParent}
                  disabled={notifyParent.isPending}
                >
                  <Bell className="h-4 w-4 mr-2" />
                  Notificar Pais
                </Button>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailDialogOpen(false)}>
              Fechar
            </Button>
            {selectedIncident?.status !== "resolved" && selectedIncident?.status !== "closed" && (
              <Button onClick={handleResolve} disabled={updateIncident.isPending}>
                <Check className="h-4 w-4 mr-2" />
                Marcar como Resolvido
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
