import { z } from 'zod';
import { Database } from '@/integrations/supabase/types';

// Define o tipo diretamente do Supabase para inserção
export type ProcessedTransaction = Database["public"]["Tables"]["transactions"]["Insert"];

// Zod schema for a single transaction, used for validation
export const transactionImportSchema = z.object({
  description: z.string().trim().min(1, 'Descrição é obrigatória.').max(500, 'Descrição pode ter no máximo 500 caracteres.'),
  amount: z.number().positive('Valor deve ser positivo.').max(999999999, 'O valor máximo é 999.999.999.'),
  type: z.enum(['Receita', 'Despesa']),
  status: z.enum(['Pendente', 'Pago', 'Vencido']).nullable().optional(), // Match Supabase type: string | null
  due_date: z.string().nullable().optional(), // Match Supabase type: string | null
  payment_date: z.string().nullable().optional(), // Match Supabase type: string | null
  category_id: z.string().uuid().nullable().optional(), // Match Supabase type: string | null
  ministry_id: z.string().uuid().nullable().optional(), // Match Supabase type: string | null
  church_id: z.string().uuid(),
  created_by: z.string().uuid().nullable().optional(), // Match Supabase type: string | null
  notes: z.string().max(2000, 'Notas podem ter no máximo 2000 caracteres.').nullable().optional(), // Match Supabase type: string | null
  origin: z.string().nullable().optional(), // Add origin field
  created_at: z.string().nullable().optional(), // Add created_at field
  updated_at: z.string().nullable().optional(), // Add updated_at field
  id: z.string().uuid().nullable().optional(), // Add id field
}).refine(data => !(data.status === 'Pago' && !data.payment_date), {
  message: 'Data de pagamento é obrigatória se o status for "Pago".',
  path: ['payment_date'],
});

// Interface for the column mapping state
export interface ColumnMapping {
  description: string;
  amount: string;
  type: string;
  status: string;
  due_date: string;
  payment_date: string;
  category_id: string;
  ministry_id: string;
  notes: string;
}

// Interface for a row in the preview table
export interface ImportPreviewRow {
  [key: string]: string | number | null;
}