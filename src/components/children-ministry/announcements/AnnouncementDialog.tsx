import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Loader2, Send, Save, X } from "lucide-react";
import { Announcement, AnnouncementFormData } from "@/hooks/useAnnouncements";

const CLASSROOMS = [
  "Berçário",
  "Maternal",
  "Jardim I",
  "Jardim II",
  "Pré I",
  "Pré II",
  "Fundamental I",
  "Fundamental II",
];

const formSchema = z.object({
  title: z.string().min(3, "Título deve ter pelo menos 3 caracteres"),
  content: z.string().min(10, "Conteúdo deve ter pelo menos 10 caracteres"),
  priority: z.enum(["normal", "urgent"]),
  target_audience: z.enum(["all", "classroom", "specific_children"]),
  target_classrooms: z.array(z.string()).optional(),
  publish_now: z.boolean().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface AnnouncementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  announcement?: Announcement | null;
  onSubmit: (data: AnnouncementFormData) => void;
  isLoading?: boolean;
}

export function AnnouncementDialog({
  open,
  onOpenChange,
  announcement,
  onSubmit,
  isLoading,
}: AnnouncementDialogProps) {
  const isEditing = !!announcement;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      content: "",
      priority: "normal",
      target_audience: "all",
      target_classrooms: [],
      publish_now: false,
    },
  });

  useEffect(() => {
    if (announcement) {
      form.reset({
        title: announcement.title,
        content: announcement.content,
        priority: announcement.priority,
        target_audience: announcement.target_audience,
        target_classrooms: announcement.target_classrooms || [],
        publish_now: false,
      });
    } else {
      form.reset({
        title: "",
        content: "",
        priority: "normal",
        target_audience: "all",
        target_classrooms: [],
        publish_now: false,
      });
    }
  }, [announcement, form]);

  const targetAudience = form.watch("target_audience");
  const selectedClassrooms = form.watch("target_classrooms") || [];

  const handleSubmit = (values: FormValues) => {
    onSubmit({
      title: values.title,
      content: values.content,
      priority: values.priority,
      target_audience: values.target_audience,
      target_classrooms: values.target_classrooms || [],
      publish_now: values.publish_now,
    });
    onOpenChange(false);
    form.reset();
  };

  const toggleClassroom = (classroom: string) => {
    const current = selectedClassrooms;
    const updated = current.includes(classroom)
      ? current.filter((c) => c !== classroom)
      : [...current, classroom];
    form.setValue("target_classrooms", updated);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Editar Comunicado" : "Novo Comunicado"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Atualize as informações do comunicado"
              : "Crie um novo comunicado para os pais"}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Título</FormLabel>
                  <FormControl>
                    <Input placeholder="Título do comunicado" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Conteúdo</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Escreva o conteúdo do comunicado..."
                      className="min-h-[120px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Prioridade</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="normal">Normal</SelectItem>
                        <SelectItem value="urgent">Urgente</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="target_audience"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Destinatários</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        <SelectItem value="classroom">Por Turma</SelectItem>
                        <SelectItem value="specific_children">
                          Crianças Específicas
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {targetAudience === "classroom" && (
              <FormItem>
                <FormLabel>Selecione as Turmas</FormLabel>
                <div className="flex flex-wrap gap-2">
                  {CLASSROOMS.map((classroom) => (
                    <Badge
                      key={classroom}
                      variant={
                        selectedClassrooms.includes(classroom)
                          ? "default"
                          : "outline"
                      }
                      className="cursor-pointer"
                      onClick={() => toggleClassroom(classroom)}
                    >
                      {classroom}
                      {selectedClassrooms.includes(classroom) && (
                        <X className="ml-1 h-3 w-3" />
                      )}
                    </Badge>
                  ))}
                </div>
                <FormDescription>
                  Clique para selecionar/desselecionar turmas
                </FormDescription>
              </FormItem>
            )}

            {!announcement?.published_at && (
              <FormField
                control={form.control}
                name="publish_now"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Publicar imediatamente</FormLabel>
                      <FormDescription>
                        O comunicado será visível para os pais assim que salvo
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : form.watch("publish_now") ? (
                  <Send className="h-4 w-4 mr-2" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                {form.watch("publish_now") ? "Publicar" : "Salvar"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
