import { z } from 'zod';

// Zod schema for a single transaction, used for validation
export const transactionImportSchema = z.object({
  description: z.string({ required_error: 'Descrição é obrigatória.' }).trim().min(1, 'Descrição é obrigatória.').max(500, 'Descrição pode ter no máximo 500 caracteres.'),
  amount: z.number({ required_error: 'Valor é obrigatório.', invalid_type_error: 'Valor deve ser um número.' }).positive('Valor deve ser positivo.').max(999999999, 'O valor máximo é 999.999.999.'),
  type: z.enum(['Receita', 'Despesa'], { required_error: 'Tipo é obrigatório (Receita ou Despesa).' }),
  status: z.enum(['Pendente', 'Pago', 'Vencido'], { required_error: 'Status é obrigatório (Pendente, Pago, ou Vencido).' }),
  due_date: z.string().nullable(),
  payment_date: z.string().nullable(),
  category_id: z.string().uuid().nullable(),
  ministry_id: z.string().uuid().nullable(),
  church_id: z.string().uuid(),
  created_by: z.string().uuid(),
  notes: z.string().max(2000, 'Notas podem ter no máximo 2000 caracteres.').nullable(),
}).refine(data => !(data.status === 'Pago' && !data.payment_date), {
  message: 'Data de pagamento é obrigatória se o status for "Pago".',
  path: ['payment_date'],
});

// Type derived from the Zod schema
export type ProcessedTransaction = z.infer<typeof transactionImportSchema>;

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