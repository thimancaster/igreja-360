import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format, setHours, setMinutes } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useMinistryStaff, useCreateStaffSchedule } from "@/hooks/useMinistryStaff";
import { useClassroomSettings } from "@/hooks/useCapacityManagement";
import { useEffect } from "react";

const formSchema = z.object({
  staff_id: z.string().min(1, "Voluntário é obrigatório"),
  classroom: z.string().optional(),
  shift_start_time: z.string().min(1, "Horário de início é obrigatório"),
  shift_end_time: z.string().min(1, "Horário de término é obrigatório"),
  role: z.string().min(1, "Tipo de escala é obrigatório"),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface ScheduleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedDate?: Date;
}

export function ScheduleDialog({ open, onOpenChange, selectedDate }: ScheduleDialogProps) {
  const createMutation = useCreateStaffSchedule();
  const { data: staffList } = useMinistryStaff(true);
  const { data: classrooms } = useClassroomSettings();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      staff_id: "",
      classroom: "",
      shift_start_time: "09:00",
      shift_end_time: "12:00",
      role: "primary",
      notes: "",
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        staff_id: "",
        classroom: "",
        shift_start_time: "09:00",
        shift_end_time: "12:00",
        role: "primary",
        notes: "",
      });
    }
  }, [open, form]);

  const onSubmit = async (data: FormData) => {
    if (!selectedDate) return;

    const [startHour, startMinute] = data.shift_start_time.split(":").map(Number);
    const [endHour, endMinute] = data.shift_end_time.split(":").map(Number);

    const shiftStart = setMinutes(setHours(selectedDate, startHour), startMinute);
    const shiftEnd = setMinutes(setHours(selectedDate, endHour), endMinute);

    await createMutation.mutateAsync({
      staff_id: data.staff_id,
      classroom: data.classroom || undefined,
      shift_start: shiftStart.toISOString(),
      shift_end: shiftEnd.toISOString(),
      role: data.role,
      notes: data.notes || undefined,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            Nova Escala - {selectedDate ? format(selectedDate, "dd/MM/yyyy") : ""}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="staff_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Voluntário</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o voluntário" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {staffList?.map((staff) => (
                        <SelectItem key={staff.id} value={staff.id}>
                          {staff.full_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="classroom"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Sala (opcional)</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a sala" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="">Todas as salas</SelectItem>
                      {classrooms?.map((classroom) => (
                        <SelectItem key={classroom.id} value={classroom.classroom_name}>
                          {classroom.classroom_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="shift_start_time"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Início</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="shift_end_time"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Término</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de Escala</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o tipo" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="primary">Principal</SelectItem>
                      <SelectItem value="backup">Reserva</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observações</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Observações sobre a escala..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
