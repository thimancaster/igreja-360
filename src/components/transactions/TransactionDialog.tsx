import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
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

interface TransactionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction?: Transaction | null;
  categories: Tables<'categories'>[];
  ministries: Tables<'ministries'>[];
  canEdit: boolean; // Nova prop para controlar a edição
}

export function TransactionDialog({ open, onOpenChange, transaction, categories, ministries, canEdit }: TransactionDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    description: "",
    category_id: "",
    ministry_id: "",
    type: "Despesa",
    amount: "",
    due_date: "",
    payment_date: "",
    status: "Pendente",
    notes: "",
  });

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
    } else {
      setFormData({
        description: "",
        category_id: "",
        ministry_id: "",
        type: "Despesa",
        amount: "",
        due_date: "",
        payment_date: "",
        status: "Pendente",
        notes: "",
      });
    }
  }, [transaction, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) { // Impedir submissão se não puder editar
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

      // Validate input data
      const transactionSchema = z.object({
        description: z.string().trim().min(1, "Descrição é obrigatória").max(500, "Descrição muito longa"),
        amount: z.string().refine((val) => {
          const num = parseFloat(val);
          return !isNaN(num) && num > 0 && num <= 999999999;
        }, "Valor deve ser positivo e menor que 999.999.999"),
        type: z.enum(["Receita", "Despesa"]),
        status: z.enum(["Pendente", "Pago", "Vencido"]),
        due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal("")),
        payment_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal("")),
        notes: z.string().max(2000, "Notas muito longas").optional().or(z.literal("")),
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
      };

      if (transaction) {
        const { error } = await supabase
          .from("transactions")
          .update(dataToSave)
          .eq("id", transaction.id);

        if (error) throw error;

        toast({
          title: "Sucesso",
          description: "Transação atualizada com sucesso!",
        });
      } else {
        const { error } = await supabase
          .from("transactions")
          .insert([dataToSave]);

        if (error) throw error;

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {transaction ? "Editar Transação" : "Nova Transação"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="type">Tipo</Label>
              <Select
                value={formData.type}
                onValueChange={(value) => setFormData({ ...formData, type: value, category_id: "" })}
                disabled={!canEdit} // Desabilitar se não puder editar
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Receita">Receita</SelectItem>
                  <SelectItem value="Despesa">Despesa</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => setFormData({ ...formData, status: value })}
                disabled={!canEdit} // Desabilitar se não puder editar
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Pendente">Pendente</SelectItem>
                  <SelectItem value="Pago">Pago</SelectItem>
                  <SelectItem value="Vencido">Vencido</SelectItem>
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
              disabled={!canEdit} // Desabilitar se não puder editar
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category">Categoria</Label>
              <Select
                value={formData.category_id}
                onValueChange={(value) => setFormData({ ...formData, category_id: value })}
                disabled={!canEdit} // Desabilitar se não puder editar
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
                disabled={!canEdit} // Desabilitar se não puder editar
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
                disabled={!canEdit} // Desabilitar se não puder editar
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="due_date">Data de Vencimento</Label>
              <Input
                id="due_date"
                type="date"
                value={formData.due_date}
                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                disabled={!canEdit} // Desabilitar se não puder editar
              />
            </div>
          </div>

          {formData.status === "Pago" && (
            <div className="space-y-2">
              <Label htmlFor="payment_date">Data de Pagamento</Label>
              <Input
                id="payment_date"
                type="date"
                value={formData.payment_date}
                onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
                disabled={!canEdit} // Desabilitar se não puder editar
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="notes">Observações</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              disabled={!canEdit} // Desabilitar se não puder editar
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading || !canEdit}>
              {loading ? "Salvando..." : transaction ? "Atualizar" : "Criar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}