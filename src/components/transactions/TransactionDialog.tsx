import { useState, useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { sanitizeText } from "@/lib/sanitize";
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
import { Transaction } from "@/hooks/useTransactions";
import { Tables } from "@/integrations/supabase/types";
import { Upload, FileText, X, Camera } from "lucide-react";

interface TransactionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction?: Transaction | null;
  categories: Tables<'categories'>[];
  ministries: Tables<'ministries'>[];
  canEdit: boolean;
  restrictToRevenue?: boolean; // Nova prop para restringir apenas a receitas
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
    installment_number: "1",
    total_installments: "1",
  });

  const [formData, setFormData] = useState(getInitialFormData(restrictToRevenue));

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
        installment_number: String(transaction.installment_number || 1),
        total_installments: String(transaction.total_installments || 1),
      });
      setInvoiceUrl(transaction.invoice_url || null);
      setSelectedFile(null);
    } else {
      setFormData(getInitialFormData(restrictToRevenue));
      setInvoiceUrl(null);
      setSelectedFile(null);
    }
  }, [transaction, open, restrictToRevenue]);

  // When type changes to Receita, auto-set status and payment_date
  const handleTypeChange = (value: string) => {
    if (value === "Receita") {
      setFormData({ 
        ...formData, 
        type: value, 
        category_id: "",
        status: "Pago",
        payment_date: new Date().toISOString().split('T')[0],
        due_date: "" // Clear due_date for revenue
      });
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

      const { data: urlData } = supabase.storage
        .from('invoices')
        .getPublicUrl(fileName);

      return urlData.publicUrl;
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
        church_id: profile.church_id,
        created_by: user.id,
        installment_number: parseInt(formData.installment_number) || 1,
        total_installments: parseInt(formData.total_installments) || 1,
      };

      if (transaction) {
        // Upload invoice if there's a new file
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
        // Create transaction first, then upload invoice
        const { data: newTransaction, error } = await supabase
          .from("transactions")
          .insert([dataToSave])
          .select()
          .single();

        if (error) throw error;

        // Upload invoice if there's a file
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

      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["transaction-stats"] });
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
                  // Auto-set payment_date when changing to Pago
                  if (value === "Pago" && !formData.payment_date) {
                    updates.payment_date = new Date().toISOString().split('T')[0];
                  }
                  setFormData({ ...formData, ...updates });
                }}
                disabled={!canEdit || formData.type === "Receita"} // Disable for Receita since it's always Pago
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
              <Label htmlFor="amount">Valor (R$)</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                required
                disabled={!canEdit}
              />
            </div>

            {/* Hide due_date for Receita since it's auto-confirmed */}
            {formData.type !== "Receita" && (
              <div className="space-y-2">
                <Label htmlFor="due_date">Data de Vencimento</Label>
                <Input
                  id="due_date"
                  type="date"
                  value={formData.due_date}
                  onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                  disabled={!canEdit}
                />
              </div>
            )}

            {/* For Receita, show Data de Entrada in the same grid */}
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

          {/* For Despesa, show payment_date only when status is Pago */}
          {formData.type !== "Receita" && formData.status === "Pago" && (
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

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="installment_number">Parcela Atual</Label>
              <Input
                id="installment_number"
                type="number"
                min="1"
                value={formData.installment_number}
                onChange={(e) => setFormData({ ...formData, installment_number: e.target.value })}
                disabled={!canEdit}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="total_installments">Total de Parcelas</Label>
              <Input
                id="total_installments"
                type="number"
                min="1"
                value={formData.total_installments}
                onChange={(e) => setFormData({ ...formData, total_installments: e.target.value })}
                disabled={!canEdit}
              />
            </div>
          </div>

          {/* Upload de Nota Fiscal */}
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
              {loading || uploadingFile ? "Salvando..." : transaction ? "Atualizar" : "Criar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
