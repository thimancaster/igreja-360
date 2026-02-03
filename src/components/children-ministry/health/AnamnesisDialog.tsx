import { useState, useEffect } from "react";
import { useChildAnamnesis, useAnamnesisMutations, BLOOD_TYPES, ChildAnamnesis } from "@/hooks/useHealthSafety";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { FileHeart, ShieldCheck, Phone, ClipboardList } from "lucide-react";

interface AnamnesisDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  childId: string;
  childName: string;
}

const defaultForm = {
  blood_type: "",
  chronic_conditions: "",
  previous_surgeries: "",
  hospitalizations: "",
  current_medications: "",
  vaccination_up_to_date: true,
  vaccination_notes: "",
  dietary_restrictions: "",
  physical_restrictions: "",
  behavioral_notes: "",
  pediatrician_name: "",
  pediatrician_phone: "",
  health_insurance: "",
  health_insurance_number: "",
  photo_consent: false,
  medical_treatment_consent: false,
  emergency_transport_consent: false,
};

export function AnamnesisDialog({ open, onOpenChange, childId, childName }: AnamnesisDialogProps) {
  const { data: anamnesis, isLoading } = useChildAnamnesis(childId);
  const { upsertAnamnesis } = useAnamnesisMutations();
  const [formData, setFormData] = useState(defaultForm);

  useEffect(() => {
    if (anamnesis) {
      setFormData({
        blood_type: anamnesis.blood_type || "",
        chronic_conditions: anamnesis.chronic_conditions || "",
        previous_surgeries: anamnesis.previous_surgeries || "",
        hospitalizations: anamnesis.hospitalizations || "",
        current_medications: anamnesis.current_medications || "",
        vaccination_up_to_date: anamnesis.vaccination_up_to_date ?? true,
        vaccination_notes: anamnesis.vaccination_notes || "",
        dietary_restrictions: anamnesis.dietary_restrictions || "",
        physical_restrictions: anamnesis.physical_restrictions || "",
        behavioral_notes: anamnesis.behavioral_notes || "",
        pediatrician_name: anamnesis.pediatrician_name || "",
        pediatrician_phone: anamnesis.pediatrician_phone || "",
        health_insurance: anamnesis.health_insurance || "",
        health_insurance_number: anamnesis.health_insurance_number || "",
        photo_consent: anamnesis.photo_consent ?? false,
        medical_treatment_consent: anamnesis.medical_treatment_consent ?? false,
        emergency_transport_consent: anamnesis.emergency_transport_consent ?? false,
      });
    } else {
      setFormData(defaultForm);
    }
  }, [anamnesis]);

  const handleSave = async () => {
    await upsertAnamnesis.mutateAsync({
      child_id: childId,
      blood_type: formData.blood_type || null,
      chronic_conditions: formData.chronic_conditions || null,
      previous_surgeries: formData.previous_surgeries || null,
      hospitalizations: formData.hospitalizations || null,
      current_medications: formData.current_medications || null,
      vaccination_up_to_date: formData.vaccination_up_to_date,
      vaccination_notes: formData.vaccination_notes || null,
      dietary_restrictions: formData.dietary_restrictions || null,
      physical_restrictions: formData.physical_restrictions || null,
      behavioral_notes: formData.behavioral_notes || null,
      pediatrician_name: formData.pediatrician_name || null,
      pediatrician_phone: formData.pediatrician_phone || null,
      health_insurance: formData.health_insurance || null,
      health_insurance_number: formData.health_insurance_number || null,
      photo_consent: formData.photo_consent,
      medical_treatment_consent: formData.medical_treatment_consent,
      emergency_transport_consent: formData.emergency_transport_consent,
    });
    onOpenChange(false);
  };

  if (isLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <div className="flex items-center justify-center p-8">
            <LoadingSpinner size="lg" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileHeart className="h-5 w-5" />
            Ficha de Anamnese - {childName}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto pr-2">
          <Accordion type="multiple" defaultValue={["medical", "restrictions", "emergency", "consents"]} className="space-y-2">
            {/* Medical History */}
            <AccordionItem value="medical">
              <AccordionTrigger className="text-sm font-medium">
                <div className="flex items-center gap-2">
                  <ClipboardList className="h-4 w-4" />
                  Histórico Médico
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-4 pt-2">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Tipo Sanguíneo</Label>
                    <Select
                      value={formData.blood_type}
                      onValueChange={(v) => setFormData({ ...formData, blood_type: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {BLOOD_TYPES.map((type) => (
                          <SelectItem key={type} value={type}>
                            {type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={formData.vaccination_up_to_date}
                      onCheckedChange={(v) => setFormData({ ...formData, vaccination_up_to_date: v })}
                    />
                    <Label>Vacinação em dia</Label>
                  </div>
                </div>
                {!formData.vaccination_up_to_date && (
                  <div>
                    <Label>Observações sobre Vacinação</Label>
                    <Textarea
                      value={formData.vaccination_notes}
                      onChange={(e) => setFormData({ ...formData, vaccination_notes: e.target.value })}
                      placeholder="Quais vacinas estão pendentes..."
                    />
                  </div>
                )}
                <div>
                  <Label>Condições Crônicas</Label>
                  <Textarea
                    value={formData.chronic_conditions}
                    onChange={(e) => setFormData({ ...formData, chronic_conditions: e.target.value })}
                    placeholder="Ex: Asma, diabetes, epilepsia..."
                  />
                </div>
                <div>
                  <Label>Cirurgias Anteriores</Label>
                  <Textarea
                    value={formData.previous_surgeries}
                    onChange={(e) => setFormData({ ...formData, previous_surgeries: e.target.value })}
                    placeholder="Descreva cirurgias anteriores..."
                  />
                </div>
                <div>
                  <Label>Internações</Label>
                  <Textarea
                    value={formData.hospitalizations}
                    onChange={(e) => setFormData({ ...formData, hospitalizations: e.target.value })}
                    placeholder="Histórico de internações..."
                  />
                </div>
                <div>
                  <Label>Medicamentos de Uso Contínuo</Label>
                  <Textarea
                    value={formData.current_medications}
                    onChange={(e) => setFormData({ ...formData, current_medications: e.target.value })}
                    placeholder="Lista de medicamentos atuais..."
                  />
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Restrictions */}
            <AccordionItem value="restrictions">
              <AccordionTrigger className="text-sm font-medium">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4" />
                  Restrições e Observações
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-4 pt-2">
                <div>
                  <Label>Restrições Alimentares</Label>
                  <Textarea
                    value={formData.dietary_restrictions}
                    onChange={(e) => setFormData({ ...formData, dietary_restrictions: e.target.value })}
                    placeholder="Ex: Intolerância à lactose, alergia a amendoim..."
                  />
                </div>
                <div>
                  <Label>Restrições Físicas</Label>
                  <Textarea
                    value={formData.physical_restrictions}
                    onChange={(e) => setFormData({ ...formData, physical_restrictions: e.target.value })}
                    placeholder="Ex: Não pode correr, usar óculos..."
                  />
                </div>
                <div>
                  <Label>Observações Comportamentais</Label>
                  <Textarea
                    value={formData.behavioral_notes}
                    onChange={(e) => setFormData({ ...formData, behavioral_notes: e.target.value })}
                    placeholder="Ex: Dificuldade de socialização, TDAH..."
                  />
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Emergency Contacts */}
            <AccordionItem value="emergency">
              <AccordionTrigger className="text-sm font-medium">
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  Contatos de Emergência
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-4 pt-2">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Nome do Pediatra</Label>
                    <Input
                      value={formData.pediatrician_name}
                      onChange={(e) => setFormData({ ...formData, pediatrician_name: e.target.value })}
                      placeholder="Dr(a). Nome"
                    />
                  </div>
                  <div>
                    <Label>Telefone do Pediatra</Label>
                    <Input
                      value={formData.pediatrician_phone}
                      onChange={(e) => setFormData({ ...formData, pediatrician_phone: e.target.value })}
                      placeholder="(00) 00000-0000"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Plano de Saúde</Label>
                    <Input
                      value={formData.health_insurance}
                      onChange={(e) => setFormData({ ...formData, health_insurance: e.target.value })}
                      placeholder="Nome do plano"
                    />
                  </div>
                  <div>
                    <Label>Número do Plano</Label>
                    <Input
                      value={formData.health_insurance_number}
                      onChange={(e) => setFormData({ ...formData, health_insurance_number: e.target.value })}
                      placeholder="Número da carteirinha"
                    />
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Consents */}
            <AccordionItem value="consents">
              <AccordionTrigger className="text-sm font-medium">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4" />
                  Autorizações
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-4 pt-2">
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium text-sm">Autorização de Imagem</p>
                    <p className="text-xs text-muted-foreground">
                      Permito que fotos e vídeos sejam feitos durante as atividades
                    </p>
                  </div>
                  <Switch
                    checked={formData.photo_consent}
                    onCheckedChange={(v) => setFormData({ ...formData, photo_consent: v })}
                  />
                </div>
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium text-sm">Autorização de Tratamento Médico</p>
                    <p className="text-xs text-muted-foreground">
                      Autorizo tratamento de emergência se necessário
                    </p>
                  </div>
                  <Switch
                    checked={formData.medical_treatment_consent}
                    onCheckedChange={(v) => setFormData({ ...formData, medical_treatment_consent: v })}
                  />
                </div>
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium text-sm">Autorização de Transporte de Emergência</p>
                    <p className="text-xs text-muted-foreground">
                      Autorizo transporte para hospital em caso de emergência
                    </p>
                  </div>
                  <Switch
                    checked={formData.emergency_transport_consent}
                    onCheckedChange={(v) => setFormData({ ...formData, emergency_transport_consent: v })}
                  />
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>

        <DialogFooter className="pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={upsertAnamnesis.isPending}>
            Salvar Ficha
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
