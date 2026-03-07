import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { DatePicker } from "@/components/ui/date-picker";
import { CLASSROOMS } from "@/hooks/useChildrenMinistry";
import { Baby, Heart, Phone, FileText } from "lucide-react";

const childSchema = z.object({
  full_name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  birth_date: z.date({ required_error: "Data de nascimento é obrigatória" }),
  classroom: z.string().min(1, "Selecione uma turma"),
  allergies: z.string().optional(),
  medications: z.string().optional(),
  special_needs: z.string().optional(),
  emergency_contact: z.string().optional(),
  emergency_phone: z.string().optional(),
  image_consent: z.boolean().default(false),
  notes: z.string().optional(),
});

export type PortalChildFormData = z.infer<typeof childSchema>;

type PortalChildDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  child?: {
    id: string;
    full_name: string;
    birth_date: string;
    classroom: string;
    allergies?: string | null;
    medications?: string | null;
    special_needs?: string | null;
    emergency_contact?: string | null;
    emergency_phone?: string | null;
    image_consent?: boolean;
    notes?: string | null;
  } | null;
  onSubmit: (data: PortalChildFormData) => Promise<void>;
  isPending: boolean;
};

export function PortalChildDialog({ open, onOpenChange, child, onSubmit, isPending }: PortalChildDialogProps) {
  const form = useForm<PortalChildFormData>({
    resolver: zodResolver(childSchema),
    defaultValues: {
      full_name: "",
      classroom: "Berçário",
      allergies: "",
      medications: "",
      special_needs: "",
      emergency_contact: "",
      emergency_phone: "",
      image_consent: false,
      notes: "",
    },
  });

  useEffect(() => {
    if (child) {
      form.reset({
        full_name: child.full_name,
        birth_date: new Date(child.birth_date),
        classroom: child.classroom,
        allergies: child.allergies || "",
        medications: child.medications || "",
        special_needs: child.special_needs || "",
        emergency_contact: child.emergency_contact || "",
        emergency_phone: child.emergency_phone || "",
        image_consent: child.image_consent || false,
        notes: child.notes || "",
      });
    } else {
      form.reset({
        full_name: "",
        classroom: "Berçário",
        allergies: "",
        medications: "",
        special_needs: "",
        emergency_contact: "",
        emergency_phone: "",
        image_consent: false,
        notes: "",
      });
    }
  }, [child, form, open]);

  const handleSubmit = async (data: PortalChildFormData) => {
    await onSubmit(data);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto mx-4">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Baby className="h-5 w-5 text-primary" />
            {child ? "Editar Filho" : "Cadastrar Filho"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            {/* Basic Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="full_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome Completo *</FormLabel>
                    <FormControl>
                      <Input placeholder="Nome da criança" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="birth_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data de Nascimento *</FormLabel>
                    <FormControl>
                      <DatePicker
                        date={field.value}
                        setDate={field.onChange}
                        disabled={(date) => date > new Date()}
                        fromYear={2010}
                        toYear={new Date().getFullYear()}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="classroom"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Turma *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione a turma" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {CLASSROOMS.map((classroom) => (
                          <SelectItem key={classroom} value={classroom}>
                            {classroom}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Health Section */}
            <div className="rounded-lg border p-4 space-y-4">
              <h3 className="font-medium flex items-center gap-2 text-sm">
                <Heart className="h-4 w-4 text-destructive" />
                Saúde
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="allergies"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Alergias</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Ex: Amendoim, lactose..." className="resize-none h-20" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="medications"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Medicações</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Medicações em uso..." className="resize-none h-20" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="special_needs"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Necessidades Especiais</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Descreva se houver..." className="resize-none h-20" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            {/* Emergency Contact */}
            <div className="rounded-lg border p-4 space-y-4">
              <h3 className="font-medium flex items-center gap-2 text-sm">
                <Phone className="h-4 w-4 text-primary" />
                Contato de Emergência
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="emergency_contact"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome</FormLabel>
                      <FormControl>
                        <Input placeholder="Nome completo" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="emergency_phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Telefone</FormLabel>
                      <FormControl>
                        <Input placeholder="(00) 00000-0000" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Consents & Notes */}
            <FormField
              control={form.control}
              name="image_consent"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <FormLabel>Autorização de Imagem</FormLabel>
                    <p className="text-xs text-muted-foreground">
                      Autorizo o uso de imagem em fotos e vídeos
                    </p>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Observações
                  </FormLabel>
                  <FormControl>
                    <Textarea placeholder="Informações adicionais..." className="resize-none" {...field} />
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
                Cancelar
              </Button>
              <Button type="submit" disabled={isPending} className="flex-1">
                {isPending ? "Salvando..." : child ? "Salvar" : "Cadastrar"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
