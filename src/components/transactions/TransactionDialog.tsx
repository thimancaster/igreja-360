import { useState, useEffect, useRef, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { sanitizeText } from "@/lib/sanitize";
import { addMonths, format } from "date-fns";
import { invalidateAllTransactionQueries } from "@/lib/queryKeys";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Transaction } from "@/hooks/useTransactions";
import { Tables } from "@/integrations/supabase/types";
import { Upload, FileText, X, Camera } from "lucide-react";
import { InstallmentPreview } from "./InstallmentPreview";

interface TransactionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction?: Transaction | null;
  categories: Tables<'categories'>[];
  ministries: Tables<'ministries'>[];
  canEdit: boolean;
  restrictToRevenue?: boolean;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_FILE_TYPES = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];

export function TransactionDialog({ 
  open, 
  onOpenChange, 
  transaction, 
  categories, 
  ministries, 
  canEdit,
  restrictToRevenue = false 
}: TransactionDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [invoiceUrl, setInvoiceUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Installment state
  const [isInstallment, setIsInstallment] = useState(false);
  const [installmentCount, setInstallmentCount] = useState(2);
  
  const getInitialFormData = (isRevenue: boolean) => ({
    description: "",
    category_id: "",
    ministry_id: "",
    type: isRevenue ? "Receita" : "Despesa",
    amount: "",
    due_date: "",
    payment_date: isRevenue ? new Date().toISOString().split('T')[0] : "",
    status: isRevenue ? "Pago" : "Pendente",
    notes: "",
  });

  const [formData, setFormData] = useState(getInitialFormData(restrictToRevenue));

  // Calculate installment value in real-time
  const calculatedInstallmentValue = useMemo(() => {
    if (isInstallment && installmentCount > 1 && formData.amount) {
      const total = parseFloat(formData.amount);
      if (!isNaN(total) && total > 0) {
        return total / installmentCount;
      }
    }
    return 0;
  }, [formData.amount, installmentCount, isInstallment]);

  // Get first due date for preview
  const firstDueDate = useMemo(() => {
    if (formData.due_date) {
      return new Date(formData.due_date + 'T12:00:00');
    }
    return new Date();
  }, [formData.due_date]);

  useEffect(() => {
    if (transaction) {
      setFormData({
        description: transaction.description,
        category_id: transaction.category_id || "",
        ministry_id: transaction.ministry_id || "",
        type: transaction.type,
        amount: transaction.amount.toString(),
        due_date: transaction.due_date || "",
        payment_date: transaction.payment_date || "",
        status: transaction.status,
        notes: "",
      });
      setInvoiceUrl(transaction.invoice_url || null);
      setSelectedFile(null);
      setIsInstallment(false);
      setInstallmentCount(2);
    } else {
      setFormData(getInitialFormData(restrictToRevenue));
      setInvoiceUrl(null);
      setSelectedFile(null);
      setIsInstallment(false);
      setInstallmentCount(2);
    }
  }, [transaction, open, restrictToRevenue]);

  const handleTypeChange = (value: string) => {
    if (value === "Receita") {
      setFormData({ 
        ...formData, 
        type: value, 
        category_id: "",
        status: "Pago",
        payment_date: new Date().toISOString().split('T')[0],
        due_date: ""
      });
      setIsInstallment(false);
    } else {
      setFormData({ 
        ...formData, 
        type: value, 
        category_id: "",
        status: "Pendente",
        payment_date: "",
      });
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ACCEPTED_FILE_TYPES.includes(file.type)) {
      toast({
        title: "Tipo de arquivo inválido",
        description: "Aceitos: PDF, JPG, PNG",
        variant: "destructive",
      });
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      toast({
        title: "Arquivo muito grande",
        description: "O tamanho máximo é 5MB",
        variant: "destructive",
      });
      return;
    }

    setSelectedFile(file);
  };

  const uploadInvoice = async (transactionId: string): Promise<string | null> => {
    if (!selectedFile || !user?.id) return invoiceUrl;

    setUploadingFile(true);
    try {
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${user.id}/${transactionId}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('invoices')
        .upload(fileName, selectedFile);

      if (uploadError) throw uploadError;

      // Use signed URLs for private bucket access
      const { data: urlData, error: urlError } = await supabase.storage
        .from('invoices')
        .createSignedUrl(fileName, 86400); // 24 hour expiry

      if (urlError) throw urlError;
      return urlData.signedUrl;
    } catch (error: any) {
      console.error('Error uploading invoice:', error);
      toast({
        title: "Erro ao enviar arquivo",
        description: error.message,
        variant: "destructive",
      });
      return null;
    } finally {
      setUploadingFile(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) {
      toast({
        title: "Permissão Negada",
        description: "Você não tem permissão para criar ou editar transações.",
        variant: "destructive",
      });
      return;
    }
    setLoading(true);

    try {
      if (!user) {
        throw new Error("Usuário não autenticado");
      }

      // Validate and sanitize input data
      const transactionSchema = z.object({
        description: z.string().trim().transform(sanitizeText).pipe(
          z.string().min(1, "Descrição é obrigatória").max(500, "Descrição muito longa")
        ),
        amount: z.string().refine((val) => {
          const num = parseFloat(val);
          return !isNaN(num) && num > 0 && num <= 999999999;
        }, "Valor deve ser positivo e menor que 999.999.999"),
        type: z.enum(["Receita", "Despesa"]),
        status: z.enum(["Pendente", "Pago", "Vencido"]),
        due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal("")),
        payment_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal("")),
        notes: z.string().transform(sanitizeText).pipe(
          z.string().max(2000, "Notas muito longas")
        ).optional().or(z.literal("")),
      });

      const validated = transactionSchema.parse({
        description: formData.description,
        amount: formData.amount,
        type: formData.type,
        status: formData.status,
        due_date: formData.due_date,
        payment_date: formData.payment_date,
        notes: formData.notes,
      });

      const { data: profile } = await supabase
        .from("profiles")
        .select("church_id")
        .eq("id", user.id)
        .single();

      if (!profile?.church_id) {
        throw new Error("Igreja não encontrada");
      }

      if (transaction) {
        // EDITING: Update single transaction
        const dataToSave = {
          description: validated.description,
          category_id: formData.category_id || null,
          ministry_id: formData.ministry_id || null,
          type: validated.type,
          amount: parseFloat(validated.amount),
          due_date: validated.due_date || null,
          payment_date: validated.status === "Pago" ? validated.payment_date || null : null,
          status: validated.status,
          notes: validated.notes || null,
        };

        let finalInvoiceUrl = invoiceUrl;
        if (selectedFile) {
          finalInvoiceUrl = await uploadInvoice(transaction.id);
        }

        const { error } = await supabase
          .from("transactions")
          .update({ ...dataToSave, invoice_url: finalInvoiceUrl })
          .eq("id", transaction.id);

        if (error) throw error;

        toast({
          title: "Sucesso",
          description: "Transação atualizada com sucesso!",
        });
      } else {
        // CREATING: Check if installment mode
        const totalAmount = parseFloat(validated.amount);
        
        if (isInstallment && installmentCount > 1 && formData.type === "Despesa") {
          // Create multiple installments
          const groupId = crypto.randomUUID();
          const installmentValue = totalAmount / installmentCount;
          const baseDate = formData.due_date ? new Date(formData.due_date + 'T12:00:00') : new Date();
          
          const installments = [];
          for (let i = 0; i < installmentCount; i++) {
            const dueDate = addMonths(baseDate, i);
            installments.push({
              description: `${validated.description} (${i + 1}/${installmentCount})`,
              category_id: formData.category_id || null,
              ministry_id: formData.ministry_id || null,
              type: validated.type,
              amount: Math.round(installmentValue * 100) / 100, // Round to 2 decimal places
              due_date: format(dueDate, 'yyyy-MM-dd'),
              payment_date: null,
              status: "Pendente",
              notes: validated.notes || null,
              church_id: profile.church_id,
              created_by: user.id,
              installment_number: i + 1,
              total_installments: installmentCount,
              installment_group_id: groupId,
              origin: "Manual",
            });
          }

          // Handle rounding difference in last installment
          const totalCalculated = installmentValue * installmentCount;
          const difference = totalAmount - totalCalculated;
          if (Math.abs(difference) > 0.01) {
            installments[installmentCount - 1].amount = 
              Math.round((installmentValue + difference) * 100) / 100;
          }

          const { error } = await supabase
            .from("transactions")
            .insert(installments);

          if (error) throw error;

          toast({
            title: "Sucesso",
            description: `${installmentCount} parcelas criadas com sucesso!`,
          });
        } else {
          // Create single transaction
          const dataToSave = {
            description: validated.description,
            category_id: formData.category_id || null,
            ministry_id: formData.ministry_id || null,
            type: validated.type,
            amount: totalAmount,
            due_date: validated.due_date || null,
            payment_date: validated.status === "Pago" ? validated.payment_date || null : null,
            status: validated.status,
            notes: validated.notes || null,
            church_id: profile.church_id,
            created_by: user.id,
            installment_number: 1,
            total_installments: 1,
            origin: "Manual",
          };

          const { data: newTransaction, error } = await supabase
            .from("transactions")
            .insert([dataToSave])
            .select()
            .single();

          if (error) throw error;

          if (selectedFile && newTransaction) {
            const uploadedUrl = await uploadInvoice(newTransaction.id);
            if (uploadedUrl) {
              await supabase
                .from("transactions")
                .update({ invoice_url: uploadedUrl })
                .eq("id", newTransaction.id);
            }
          }

          toast({
            title: "Sucesso",
            description: "Transação criada com sucesso!",
          });
        }
      }

      invalidateAllTransactionQueries(queryClient);
      onOpenChange(false);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Erro de validação",
          description: error.errors[0].message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Erro",
          description: error.message,
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const filteredCategories = categories.filter(cat => cat.type === formData.type);

  const removeFile = () => {
    setSelectedFile(null);
    setInvoiceUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const showInstallmentOption = !transaction && formData.type === "Despesa" && canEdit;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {transaction ? "Editar Transação" : restrictToRevenue ? "Nova Receita" : "Nova Transação"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="type">Tipo</Label>
              <Select
                value={formData.type}
                onValueChange={handleTypeChange}
                disabled={!canEdit || restrictToRevenue}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Receita">Receita</SelectItem>
                  {!restrictToRevenue && (
                    <SelectItem value="Despesa">Despesa</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => {
                  const updates: any = { status: value };
                  if (value === "Pago" && !formData.payment_date) {
                    updates.payment_date = new Date().toISOString().split('T')[0];
                  }
                  setFormData({ ...formData, ...updates });
                }}
                disabled={!canEdit || formData.type === "Receita" || isInstallment}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {formData.type !== "Receita" && (
                    <>
                      <SelectItem value="Pendente">Pendente</SelectItem>
                      <SelectItem value="Vencido">Vencido</SelectItem>
                    </>
                  )}
                  <SelectItem value="Pago">{formData.type === "Receita" ? "Confirmado" : "Pago"}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Input
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder={isInstallment ? "Ex: Microfone Shure SM58" : "Descrição da transação"}
              required
              disabled={!canEdit}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category">Categoria</Label>
              <Select
                value={formData.category_id}
                onValueChange={(value) => setFormData({ ...formData, category_id: value })}
                disabled={!canEdit}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma categoria" />
                </SelectTrigger>
                <SelectContent>
                  {filteredCategories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="ministry">Ministério</Label>
              <Select
                value={formData.ministry_id}
                onValueChange={(value) => setFormData({ ...formData, ministry_id: value })}
                disabled={!canEdit}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um ministério" />
                </SelectTrigger>
                <SelectContent>
                  {ministries.map((ministry) => (
                    <SelectItem key={ministry.id} value={ministry.id}>
                      {ministry.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="amount">
                {isInstallment ? "Valor Total (R$)" : "Valor (R$)"}
              </Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                placeholder={isInstallment ? "Ex: 3500.00" : "0.00"}
                required
                disabled={!canEdit}
              />
            </div>

            {formData.type !== "Receita" && (
              <div className="space-y-2">
                <Label htmlFor="due_date">
                  {isInstallment ? "Data da 1ª Parcela" : "Data de Vencimento"}
                </Label>
                <Input
                  id="due_date"
                  type="date"
                  value={formData.due_date}
                  onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                  disabled={!canEdit}
                  required={isInstallment}
                />
              </div>
            )}

            {formData.type === "Receita" && (
              <div className="space-y-2">
                <Label htmlFor="payment_date">Data de Entrada</Label>
                <Input
                  id="payment_date"
                  type="date"
                  value={formData.payment_date}
                  onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
                  disabled={!canEdit}
                />
              </div>
            )}
          </div>

          {/* Installment Section - Only for new Despesa */}
          {showInstallmentOption && (
            <div className="border border-border rounded-lg p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="installment-toggle" className="text-base font-medium">
                    Parcelar esta despesa
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Divide o valor total em parcelas mensais
                  </p>
                </div>
                <Switch
                  id="installment-toggle"
                  checked={isInstallment}
                  onCheckedChange={(checked) => {
                    setIsInstallment(checked);
                    if (checked) {
                      setFormData({ ...formData, status: "Pendente" });
                    }
                  }}
                />
              </div>

              {isInstallment && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="installment_count">Número de Parcelas</Label>
                    <Input
                      id="installment_count"
                      type="number"
                      min="2"
                      max="60"
                      value={installmentCount}
                      onChange={(e) => {
                        const val = parseInt(e.target.value) || 2;
                        setInstallmentCount(Math.min(60, Math.max(2, val)));
                      }}
                    />
                  </div>

                  {formData.amount && parseFloat(formData.amount) > 0 && formData.due_date && (
                    <InstallmentPreview
                      totalAmount={parseFloat(formData.amount)}
                      installmentCount={installmentCount}
                      firstDueDate={firstDueDate}
                    />
                  )}
                </div>
              )}
            </div>
          )}

          {/* For Despesa, show payment_date only when status is Pago and not installment */}
          {formData.type !== "Receita" && formData.status === "Pago" && !isInstallment && (
            <div className="space-y-2">
              <Label htmlFor="payment_date">Data de Pagamento</Label>
              <Input
                id="payment_date"
                type="date"
                value={formData.payment_date}
                onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
                disabled={!canEdit}
              />
            </div>
          )}

          {/* Upload de Nota Fiscal - Only for non-installment */}
          {!isInstallment && (
            <div className="space-y-2">
              <Label>Nota Fiscal / Comprovante</Label>
              <div className="border-2 border-dashed rounded-lg p-4 transition-colors hover:border-primary/50">
                {selectedFile || invoiceUrl ? (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileText className="h-5 w-5 text-primary" />
                      <span className="text-sm truncate max-w-[200px]">
                        {selectedFile?.name || "Arquivo anexado"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {invoiceUrl && !selectedFile && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(invoiceUrl, '_blank')}
                        >
                          Ver
                        </Button>
                      )}
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={removeFile}
                        disabled={!canEdit}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={!canEdit}
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        Anexar Arquivo
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (fileInputRef.current) {
                            fileInputRef.current.setAttribute('capture', 'environment');
                            fileInputRef.current.click();
                            fileInputRef.current.removeAttribute('capture');
                          }
                        }}
                        disabled={!canEdit}
                      >
                        <Camera className="h-4 w-4 mr-2" />
                        Tirar Foto
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      PDF, JPG ou PNG (máx. 5MB)
                    </p>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="notes">Observações</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              disabled={!canEdit}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading || uploadingFile || !canEdit}>
              {loading || uploadingFile 
                ? "Salvando..." 
                : isInstallment 
                  ? `Criar ${installmentCount} Parcelas` 
                  : transaction 
                    ? "Atualizar" 
                    : "Criar"
              }
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
