export interface ColumnMapping {
  description: string;
  amount: string;
  type: string;
  status: string;
  due_date?: string;
  payment_date?: string;
  category_id?: string;
  ministry_id?: string;
  notes?: string;
}

export interface ImportPreviewRow {
  [key: string]: string | number | null;
}

export interface ProcessedTransaction {
  description: string;
  amount: number;
  type: "Receita" | "Despesa";
  status: "Pendente" | "Pago" | "Vencido";
  due_date: string | null;
  payment_date: string | null;
  category_id: string | null;
  ministry_id: string | null;
  church_id: string;
  created_by: string;
  notes: string | null;
  origin: string;
}
