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
import { ClassroomSettings, useCreateClassroomSettings, useUpdateClassroomSettings } from "@/hooks/useCapacityManagement";
import { useEffect } from "react";

const formSchema = z.object({
  classroom_name: z.string().min(1, "Nome da sala é obrigatório"),
  max_capacity: z.coerce.number().min(1, "Capacidade mínima é 1"),
  min_age_months: z.coerce.number().min(0).optional(),
  max_age_months: z.coerce.number().min(0).optional(),
  ratio_children_per_adult: z.coerce.number().min(1).optional(),
  is_active: z.boolean().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface ClassroomDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  classroom?: ClassroomSettings;
}

export function ClassroomDialog({ open, onOpenChange, classroom }: ClassroomDialogProps) {
  const createMutation = useCreateClassroomSettings();
  const updateMutation = useUpdateClassroomSettings();
  const isEditing = !!classroom;

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      classroom_name: "",
      max_capacity: 20,
      min_age_months: 0,
      max_age_months: 144,
      ratio_children_per_adult: 5,
      is_active: true,
    },
  });

  useEffect(() => {
    if (classroom) {
      form.reset({
        classroom_name: classroom.classroom_name,
        max_capacity: classroom.max_capacity,
        min_age_months: classroom.min_age_months ?? 0,
        max_age_months: classroom.max_age_months ?? 144,
        ratio_children_per_adult: classroom.ratio_children_per_adult ?? 5,
        is_active: classroom.is_active ?? true,
      });
    } else {
      form.reset({
        classroom_name: "",
        max_capacity: 20,
        min_age_months: 0,
        max_age_months: 144,
        ratio_children_per_adult: 5,
        is_active: true,
      });
    }
  }, [classroom, form]);

  const onSubmit = async (data: FormData) => {
    const formData = {
      classroom_name: data.classroom_name,
      max_capacity: data.max_capacity,
      min_age_months: data.min_age_months,
      max_age_months: data.max_age_months,
      ratio_children_per_adult: data.ratio_children_per_adult,
      is_active: data.is_active,
    };
    
    if (isEditing && classroom) {
      await updateMutation.mutateAsync({ id: classroom.id, ...formData });
    } else {
      await createMutation.mutateAsync(formData);
    }
    onOpenChange(false);
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Editar Sala" : "Nova Sala"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="classroom_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome da Sala</FormLabel>
                  <FormControl>
                    <Input placeholder="Berçário" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="max_capacity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Capacidade Máxima</FormLabel>
                    <FormControl>
                      <Input type="number" min={1} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="ratio_children_per_adult"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Crianças/Adulto</FormLabel>
                    <FormControl>
                      <Input type="number" min={1} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="min_age_months"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Idade Mínima (meses)</FormLabel>
                    <FormControl>
                      <Input type="number" min={0} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="max_age_months"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Idade Máxima (meses)</FormLabel>
                    <FormControl>
                      <Input type="number" min={0} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="is_active"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-3">
                  <FormLabel className="cursor-pointer">Sala Ativa</FormLabel>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2">
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
