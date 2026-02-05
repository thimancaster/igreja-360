import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { DepartmentVolunteer } from "@/hooks/useDepartmentVolunteers";
import { VolunteerSchedule, CreateScheduleData } from "@/hooks/useVolunteerSchedules";
import { Loader2 } from "lucide-react";

interface ScheduleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  volunteers: DepartmentVolunteer[];
  selectedDate: Date | null;
  selectedSchedule?: VolunteerSchedule | null;
  ministryId: string;
  onSave: (data: CreateScheduleData) => Promise<any>;
  onUpdate?: (data: Partial<VolunteerSchedule> & { id: string }) => Promise<any>;
  onDelete?: (id: string) => Promise<any>;
  isLoading: boolean;
  hasConflict: (volunteerId: string, date: string, start: string, end: string, excludeId?: string) => boolean;
}

export function ScheduleDialog({
  open,
  onOpenChange,
  volunteers,
  selectedDate,
  selectedSchedule,
  ministryId,
  onSave,
  onUpdate,
  onDelete,
  isLoading,
  hasConflict,
}: ScheduleDialogProps) {
  const isEditing = !!selectedSchedule;
  
  const [volunteerId, setVolunteerId] = useState(selectedSchedule?.volunteer_id || "");
  const [shiftStart, setShiftStart] = useState(selectedSchedule?.shift_start?.slice(0, 5) || "09:00");
  const [shiftEnd, setShiftEnd] = useState(selectedSchedule?.shift_end?.slice(0, 5) || "12:00");
  const [scheduleType, setScheduleType] = useState<'primary' | 'backup'>(
    selectedSchedule?.schedule_type || "primary"
  );
  const [notes, setNotes] = useState(selectedSchedule?.notes || "");
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (!volunteerId) {
      setError("Selecione um voluntário");
      return;
    }

    if (!selectedDate) {
      setError("Data não selecionada");
      return;
    }

    const dateStr = format(selectedDate, "yyyy-MM-dd");

    // Check for conflicts
    if (hasConflict(volunteerId, dateStr, shiftStart, shiftEnd, selectedSchedule?.id)) {
      setError("Este voluntário já está escalado neste horário");
      return;
    }

    setError("");

    try {
      if (isEditing && onUpdate) {
        await onUpdate({
          id: selectedSchedule.id,
          volunteer_id: volunteerId,
          shift_start: shiftStart,
          shift_end: shiftEnd,
          schedule_type: scheduleType,
          notes: notes || null,
        });
      } else {
        await onSave({
          ministry_id: ministryId,
          volunteer_id: volunteerId,
          schedule_date: dateStr,
          shift_start: shiftStart,
          shift_end: shiftEnd,
          schedule_type: scheduleType,
          notes: notes || undefined,
        });
      }
      onOpenChange(false);
      resetForm();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async () => {
    if (!selectedSchedule || !onDelete) return;
    
    try {
      await onDelete(selectedSchedule.id);
      onOpenChange(false);
      resetForm();
    } catch (err) {
      console.error(err);
    }
  };

  const resetForm = () => {
    setVolunteerId("");
    setShiftStart("09:00");
    setShiftEnd("12:00");
    setScheduleType("primary");
    setNotes("");
    setError("");
  };

  // Reset form when dialog opens with new data
  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen) {
      setVolunteerId(selectedSchedule?.volunteer_id || "");
      setShiftStart(selectedSchedule?.shift_start?.slice(0, 5) || "09:00");
      setShiftEnd(selectedSchedule?.shift_end?.slice(0, 5) || "12:00");
      setScheduleType(selectedSchedule?.schedule_type || "primary");
      setNotes(selectedSchedule?.notes || "");
      setError("");
    }
    onOpenChange(newOpen);
  };

  const activeVolunteers = volunteers.filter(v => v.status === 'active');

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Editar Escala" : "Nova Escala"}
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {selectedDate && (
            <div className="text-sm text-muted-foreground">
              Data: <span className="font-medium text-foreground">
                {format(selectedDate, "EEEE, d 'de' MMMM", { locale: ptBR })}
              </span>
            </div>
          )}

          <div className="grid gap-2">
            <Label htmlFor="volunteer">Voluntário</Label>
            <Select value={volunteerId} onValueChange={setVolunteerId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o voluntário" />
              </SelectTrigger>
              <SelectContent>
                {activeVolunteers.map((volunteer) => (
                  <SelectItem key={volunteer.id} value={volunteer.id}>
                    {volunteer.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="shift-start">Início</Label>
              <Input
                id="shift-start"
                type="time"
                value={shiftStart}
                onChange={(e) => setShiftStart(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="shift-end">Término</Label>
              <Input
                id="shift-end"
                type="time"
                value={shiftEnd}
                onChange={(e) => setShiftEnd(e.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="schedule-type">Tipo</Label>
            <Select value={scheduleType} onValueChange={(v: 'primary' | 'backup') => setScheduleType(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="primary">Titular</SelectItem>
                <SelectItem value="backup">Reserva</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="notes">Observações (opcional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Alguma observação..."
              rows={2}
            />
          </div>

          {error && (
            <div className="text-sm text-destructive">{error}</div>
          )}
        </div>

        <DialogFooter className="gap-2">
          {isEditing && onDelete && (
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isLoading}
            >
              Excluir
            </Button>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEditing ? "Salvar" : "Criar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
