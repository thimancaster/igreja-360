import { useEffect, useState } from "react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useChildMutations, Child, CLASSROOMS } from "@/hooks/useChildrenMinistry";
import { DatePicker } from "@/components/ui/date-picker";
import { ChildGuardianLinkSection } from "./ChildGuardianLinkSection";
import { AuthorizedPickupsPanel } from "./AuthorizedPickupsPanel";
import { User, Users, Shield } from "lucide-react";
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
  status: z.string().default("active"),
});

type ChildFormData = z.infer<typeof childSchema>;

type ChildDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  child: Child | null;
};

export function ChildDialog({ open, onOpenChange, child }: ChildDialogProps) {
  const { createChild, updateChild } = useChildMutations();
  const [activeTab, setActiveTab] = useState("dados");

  const form = useForm<ChildFormData>({
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
      status: "active",
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
        image_consent: child.image_consent,
        notes: child.notes || "",
        status: child.status,
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
        status: "active",
      });
      setActiveTab("dados");
    }
  }, [child, form]);

  const onSubmit = async (data: ChildFormData) => {
    try {
      const payload = {
        full_name: data.full_name,
        birth_date: data.birth_date.toISOString().split("T")[0],
        classroom: data.classroom,
        allergies: data.allergies || null,
        medications: data.medications || null,
        special_needs: data.special_needs || null,
        emergency_contact: data.emergency_contact || null,
        emergency_phone: data.emergency_phone || null,
        image_consent: data.image_consent,
        notes: data.notes || null,
        status: data.status,
        photo_url: null,
      };

      if (child) {
        await updateChild.mutateAsync({ id: child.id, ...payload });
      } else {
        await createChild.mutateAsync(payload);
      }
      onOpenChange(false);
    } catch (error) {
      // Error handled in mutation
    }
  };

  const renderFormContent = () => (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

        <FormField
          control={form.control}
          name="status"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Status</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="active">Ativo</SelectItem>
                  <SelectItem value="inactive">Inativo</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <div className="border-t pt-4">
        <h3 className="font-medium mb-3">Informações de Saúde</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="allergies"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Alergias</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Descreva alergias conhecidas..."
                    className="resize-none"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
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
                  <Textarea
                    placeholder="Medicações em uso..."
                    className="resize-none"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="special_needs"
            render={({ field }) => (
              <FormItem className="md:col-span-2">
                <FormLabel>Necessidades Especiais</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Descreva necessidades especiais..."
                    className="resize-none"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </div>

      <div className="border-t pt-4">
        <h3 className="font-medium mb-3">Contato de Emergência</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="emergency_contact"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nome do Contato</FormLabel>
                <FormControl>
                  <Input placeholder="Nome completo" {...field} />
                </FormControl>
                <FormMessage />
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
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </div>

      <div className="border-t pt-4">
        <div className="grid grid-cols-1 gap-4">
          <FormField
            control={form.control}
            name="image_consent"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                <div className="space-y-0.5">
                  <FormLabel>Autorização de Imagem</FormLabel>
                  <p className="text-sm text-muted-foreground">
                    Autorizo o uso de imagem da criança em fotos e vídeos da igreja
                  </p>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
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
                  <Textarea
                    placeholder="Observações adicionais..."
                    className="resize-none"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </div>
    </>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {child ? "Editar Criança" : "Nova Criança"}
          </DialogTitle>
        </DialogHeader>

        {child ? (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="dados" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                <span className="hidden sm:inline">Dados</span>
              </TabsTrigger>
              <TabsTrigger value="responsaveis" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                <span className="hidden sm:inline">Responsáveis</span>
              </TabsTrigger>
              <TabsTrigger value="autorizados" className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                <span className="hidden sm:inline">Autorizados</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="dados" className="mt-4">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  {renderFormContent()}
                  <div className="flex justify-end gap-3 pt-4">
                    <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                      Cancelar
                    </Button>
                    <Button
                      type="submit"
                      disabled={createChild.isPending || updateChild.isPending}
                    >
                      Salvar Alterações
                    </Button>
                  </div>
                </form>
              </Form>
            </TabsContent>

            <TabsContent value="responsaveis" className="mt-4">
              <ChildGuardianLinkSection childId={child.id} />
            </TabsContent>

            <TabsContent value="autorizados" className="mt-4">
              <AuthorizedPickupsPanel childId={child.id} childName={child.full_name} />
            </TabsContent>
          </Tabs>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {renderFormContent()}
              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={createChild.isPending || updateChild.isPending}
                >
                  Cadastrar
                </Button>
              </div>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
