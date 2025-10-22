import { z } from 'zod';
import { Database } from '@/integrations/supabase/types';

// Define o tipo diretamente do Supabase para inserção
export type ProcessedTransaction = Database["public"]["Tables"]["transactions"]["Insert"];

// Define um esquema para a entrada bruta, onde os campos podem ser opcionais ou nulos
const rawImportSchema = z.object({
  description: z.string().trim().max(500, 'Descrição pode ter no máximo 500 caracteres.').nullable().optional(),
  amount: z.number().max(999999999, 'O valor máximo é 999.999.999.').nullable().optional(),
  type: z.enum(['Receita', 'Despesa']).nullable().optional(),
  status: z.enum(['Pendente', 'Pago', 'Vencido']).nullable().optional(),
  due_date: z.string().nullable().optional(),
  payment_date: z.string().nullable().optional(),
  category_id: z.string().uuid().nullable().optional(),
  ministry_id: z.string().uuid().nullable().optional(),
  church_id: z.string().uuid().nullable().optional(), // Tornar opcional para a entrada
  created_by: z.string().uuid().nullable().optional(),
  notes: z.string().max(2000, 'Notas podem ter no máximo 2000 caracteres.').nullable().optional(),
  origin: z.string().nullable().optional(),
  created_at: z.string().nullable().optional(),
  updated_at: z.string().nullable().optional(),
  id: z.string().uuid().nullable().optional(),
});

// Zod schema for a single transaction, used for validation and transformation
export const transactionImportSchema = rawImportSchema.transform((data, ctx) => {
  // Validar e garantir que os campos obrigatórios estejam presentes e válidos
  if (!data.description || data.description.length === 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Descrição é obrigatória.',
      path: ['description'],
    });
    return z.NEVER; // Retorna NEVER para indicar falha na transformação
  }
  if (data.amount === undefined || data.amount === null || data.amount <= 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Valor deve ser positivo e obrigatório.',
      path: ['amount'],
    });
    return z.NEVER;
  }
  if (!data.type) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Tipo é obrigatório.',
      path: ['type'],
    });
    return z.NEVER;
  }
  if (!data.church_id) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'ID da igreja é obrigatório.',
      path: ['church_id'],
    });
    return z.NEVER;
  }

  // Aplicar lógica de refinamento
  if (data.status === 'Pago' && !data.payment_date) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Data de pagamento é obrigatória se o status for "Pago".',
      path: ['payment_date'],
    });
    return z.NEVER;
  }

  // Retornar os dados processados, garantindo que correspondam a ProcessedTransaction
  return {
    ...data,
    description: data.description, // Agora garantido como string
    amount: data.amount, // Agora garantido como number > 0
    type: data.type, // Agora garantido como 'Receita' | 'Despesa'
    church_id: data.church_id, // Agora garantido como string (uuid)
    status: data.status || 'Pendente', // Padrão se não fornecido
    origin: data.origin || 'Importação de Planilha', // Padrão se não fornecido
    created_by: data.created_by || null,
    category_id: data.category_id || null,
    ministry_id: data.ministry_id || null,
    due_date: data.due_date || null,
    payment_date: data.payment_date || null,
    notes: data.notes || null,
    created_at: data.created_at || null,
    updated_at: data.updated_at || null,
    id: data.id || undefined, // id é opcional em Insert, então undefined está ok
  } as ProcessedTransaction; // Cast explícito para garantir o tipo de saída
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