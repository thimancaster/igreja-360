import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MinistryStaff, useCreateMinistryStaff, useUpdateMinistryStaff } from "@/hooks/useMinistryStaff";
import { useClassroomSettings } from "@/hooks/useCapacityManagement";
import { useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";

const formSchema = z.object({
  full_name: z.string().min(1, "Nome é obrigatório"),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  phone: z.string().optional(),
  role: z.string().min(1, "Função é obrigatória"),
  trained_classrooms: z.array(z.string()).optional(),
  is_active: z.boolean().optional(),
  background_check_date: z.string().optional(),
  certifications: z.string().optional(),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface StaffDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  staff?: MinistryStaff;
}

export function StaffDialog({ open, onOpenChange, staff }: StaffDialogProps) {
  const createMutation = useCreateMinistryStaff();
  const updateMutation = useUpdateMinistryStaff();
  const { data: classrooms } = useClassroomSettings();
  const isEditing = !!staff;

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      full_name: "",
      email: "",
      phone: "",
      role: "assistant",
      trained_classrooms: [],
      is_active: true,
      background_check_date: "",
      certifications: "",
      notes: "",
    },
  });

  useEffect(() => {
    if (staff) {
      form.reset({
        full_name: staff.full_name,
        email: staff.email || "",
        phone: staff.phone || "",
        role: staff.role,
        trained_classrooms: staff.trained_classrooms || [],
        is_active: staff.is_active ?? true,
        background_check_date: staff.background_check_date || "",
        certifications: staff.certifications || "",
        notes: staff.notes || "",
      });
    } else {
      form.reset({
        full_name: "",
        email: "",
        phone: "",
        role: "assistant",
        trained_classrooms: [],
        is_active: true,
        background_check_date: "",
        certifications: "",
        notes: "",
      });
    }
  }, [staff, form]);

  const onSubmit = async (data: FormData) => {
    const submitData = {
      full_name: data.full_name,
      email: data.email || undefined,
      phone: data.phone || undefined,
      role: data.role,
      trained_classrooms: data.trained_classrooms,
      is_active: data.is_active,
      background_check_date: data.background_check_date || undefined,
      certifications: data.certifications || undefined,
      notes: data.notes || undefined,
    };
    
    if (isEditing && staff) {
      await updateMutation.mutateAsync({ id: staff.id, ...submitData });
    } else {
      await createMutation.mutateAsync(submitData);
    }
    onOpenChange(false);
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  const trainedClassrooms = form.watch("trained_classrooms") || [];

  const addClassroom = (classroom: string) => {
    if (!trainedClassrooms.includes(classroom)) {
      form.setValue("trained_classrooms", [...trainedClassrooms, classroom]);
    }
  };

  const removeClassroom = (classroom: string) => {
    form.setValue(
      "trained_classrooms",
      trainedClassrooms.filter((c) => c !== classroom)
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Editar Voluntário" : "Novo Voluntário"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="full_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome Completo</FormLabel>
                  <FormControl>
                    <Input placeholder="Nome do voluntário" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="email@exemplo.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Telefone</FormLabel>
                    <FormControl>
                      <Input placeholder="(00) 00000-0000" {...field} />
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
                  <FormLabel>Função</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a função" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="coordinator">Coordenador(a)</SelectItem>
                      <SelectItem value="teacher">Professor(a)</SelectItem>
                      <SelectItem value="assistant">Auxiliar</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-2">
              <FormLabel>Salas Habilitadas</FormLabel>
              <div className="flex flex-wrap gap-2 mb-2">
                {trainedClassrooms.map((classroom) => (
                  <Badge key={classroom} variant="secondary" className="gap-1">
                    {classroom}
                    <button
                      type="button"
                      onClick={() => removeClassroom(classroom)}
                      className="ml-1 hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
              <Select onValueChange={addClassroom}>
                <SelectTrigger>
                  <SelectValue placeholder="Adicionar sala" />
                </SelectTrigger>
                <SelectContent>
                  {classrooms
                    ?.filter((c) => !trainedClassrooms.includes(c.classroom_name))
                    .map((classroom) => (
                      <SelectItem key={classroom.id} value={classroom.classroom_name}>
                        {classroom.classroom_name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <FormField
              control={form.control}
              name="background_check_date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Data de Background Check</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="certifications"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Certificações</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Primeiros Socorros, Libras" {...field} />
                  </FormControl>
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
                    <Textarea placeholder="Observações adicionais..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="is_active"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-3">
                  <FormLabel className="cursor-pointer">Voluntário Ativo</FormLabel>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
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
              <Button type="submit" disabled={isPending}>
                {isPending ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
