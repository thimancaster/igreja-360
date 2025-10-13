import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
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

interface TransactionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction?: Transaction | null;
}

interface Category {
  id: string;
  name: string;
  type: string;
}

interface Ministry {
  id: string;
  name: string;
}

export function TransactionDialog({ open, onOpenChange, transaction }: TransactionDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [ministries, setMinistries] = useState<Ministry[]>([]);
  
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

  useEffect(() => {
    const fetchData = async () => {
      const [categoriesRes, ministriesRes] = await Promise.all([
        supabase.from("categories").select("id, name, type"),
        supabase.from("ministries").select("id, name"),
      ]);

      if (categoriesRes.data) setCategories(categoriesRes.data);
      if (ministriesRes.data) setMinistries(ministriesRes.data);
    };

    if (open) {
      fetchData();
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("church_id")
        .eq("id", user?.id)
        .single();

      if (!profile?.church_id) {
        throw new Error("Church ID not found");
      }

      const dataToSave = {
        description: formData.description,
        category_id: formData.category_id || null,
        ministry_id: formData.ministry_id || null,
        type: formData.type,
        amount: parseFloat(formData.amount),
        due_date: formData.due_date || null,
        payment_date: formData.payment_date || null,
        status: formData.status,
        notes: formData.notes || null,
        church_id: profile.church_id,
        created_by: user?.id,
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
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
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
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category">Categoria</Label>
              <Select
                value={formData.category_id}
                onValueChange={(value) => setFormData({ ...formData, category_id: value })}
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
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="due_date">Data de Vencimento</Label>
              <Input
                id="due_date"
                type="date"
                value={formData.due_date}
                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
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
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Salvando..." : transaction ? "Atualizar" : "Criar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
