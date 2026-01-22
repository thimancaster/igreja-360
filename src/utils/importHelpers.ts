import ExcelJS from 'exceljs';
import { z } from 'zod';
import { transactionImportSchema, ProcessedTransaction } from '@/types/import';

/**
 * Normalizes a string for consistent comparison
 */
function normalizeForHash(str: string | null | undefined): string {
  if (!str) return '';
  return str
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .replace(/\s+/g, ' ');
}

/**
 * Creates a content-based hash from transaction data
 * This is the same algorithm used in the Edge Functions for consistency
 */
export function createContentHash(
  description: string,
  amount: number,
  dueDate: string | null,
  type: string
): string {
  const normalizedDesc = normalizeForHash(description);
  const normalizedAmount = Math.abs(Number(amount) || 0).toFixed(2);
  const normalizedDate = dueDate || '';
  const normalizedType = type.toLowerCase().trim();
  
  const content = `${normalizedDesc}|${normalizedAmount}|${normalizedDate}|${normalizedType}`;
  
  try {
    return btoa(unescape(encodeURIComponent(content)))
      .replace(/[+/=]/g, '')
      .substring(0, 20);
  } catch {
    return content.replace(/[^a-z0-9]/gi, '').substring(0, 20);
  }
}

/**
 * Creates an external_id for imported transactions
 * Format: import_{contentHash}
 */
export function createImportExternalId(
  description: string,
  amount: number,
  dueDate: string | null,
  type: string
): string {
  const hash = createContentHash(description, amount, dueDate, type);
  return `import_${hash}`;
}

/**
 * Checks if two amounts are effectively equal (handles floating point issues)
 */
export function amountsAreEqual(a: number, b: number): boolean {
  return Math.abs(Number(a) - Number(b)) < 0.01;
}

/**
 * Interface for existing transaction when checking duplicates
 */
export interface ExistingTransactionForDupe {
  id: string;
  description: string;
  amount: number;
  type: string;
  due_date: string | null;
  payment_date: string | null;
  external_id: string | null;
}

/**
 * Checks if an incoming transaction is a duplicate of an existing one
 * Uses content hash as the primary deduplication method
 */
export function isTransactionDuplicate(
  incoming: {
    description: string;
    amount: number;
    type: string;
    due_date: string | null;
  },
  existingHashes: Set<string>,
  existingByExternalId: Set<string>
): boolean {
  const hash = createContentHash(
    incoming.description,
    incoming.amount,
    incoming.due_date,
    incoming.type
  );
  
  const externalId = createImportExternalId(
    incoming.description,
    incoming.amount,
    incoming.due_date,
    incoming.type
  );
  
  return existingHashes.has(hash) || existingByExternalId.has(externalId);
}

/**
 * Builds lookup sets from existing transactions for efficient deduplication
 */
export function buildDeduplicationSets(
  existingTransactions: ExistingTransactionForDupe[]
): {
  existingHashes: Set<string>;
  existingByExternalId: Set<string>;
} {
  const existingHashes = new Set<string>();
  const existingByExternalId = new Set<string>();
  
  for (const tx of existingTransactions) {
    const hash = createContentHash(tx.description, tx.amount, tx.due_date, tx.type);
    existingHashes.add(hash);
    
    if (tx.external_id) {
      existingByExternalId.add(tx.external_id);
    }
  }
  
  return { existingHashes, existingByExternalId };
}

/**
 * Filters out duplicate transactions from import batch
 * Also detects intra-batch duplicates
 */
export function filterDuplicateTransactions<T extends {
  description: string;
  amount: number;
  type: string;
  due_date: string | null;
}>(
  incoming: T[],
  existingHashes: Set<string>,
  existingByExternalId: Set<string>
): {
  toImport: T[];
  duplicates: T[];
  batchDuplicates: T[];
} {
  const toImport: T[] = [];
  const duplicates: T[] = [];
  const batchDuplicates: T[] = [];
  const batchHashes = new Set<string>();
  
  for (const tx of incoming) {
    const hash = createContentHash(tx.description, tx.amount, tx.due_date, tx.type);
    const externalId = createImportExternalId(tx.description, tx.amount, tx.due_date, tx.type);
    
    // Check if already exists in database
    if (existingHashes.has(hash) || existingByExternalId.has(externalId)) {
      duplicates.push(tx);
      continue;
    }
    
    // Check if duplicate within this batch
    if (batchHashes.has(hash)) {
      batchDuplicates.push(tx);
      continue;
    }
    
    batchHashes.add(hash);
    toImport.push(tx);
  }
  
  return { toImport, duplicates, batchDuplicates };
}

/**
 * Reads an Excel or CSV file and returns its headers and rows.
 * @param file The file to read.
 * @returns A promise that resolves to an object with headers and rows.
 */
export const readSpreadsheet = (file: File): Promise<{ headers: string[]; rows: unknown[][] }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = event.target?.result;
        if (!data || !(data instanceof ArrayBuffer)) {
          throw new Error('Could not read file data.');
        }
        
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(data);
        
        const worksheet = workbook.worksheets[0];
        if (!worksheet) {
          throw new Error('No worksheet found in the file.');
        }
        
        const rows: unknown[][] = [];
        worksheet.eachRow((row) => {
          const rowValues = row.values as unknown[];
          // ExcelJS row.values starts at index 1, so we slice from index 1
          rows.push(rowValues.slice(1));
        });
        
        const headers = rows[0]?.map(h => String(h ?? '')) || [];
        const dataRows = rows.slice(1);

        resolve({ headers, rows: dataRows });
      } catch (error) {
        reject(new Error('Failed to parse the spreadsheet file.'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read the file.'));
    reader.readAsArrayBuffer(file);
  });
};

/**
 * Parses a currency string (e.g., "R$ 1.234,56" or "1234.56") into a number.
 * @param value The value to parse.
 * @returns The parsed number or null if invalid.
 */
export const parseAmount = (value: unknown): number | null => {
  if (typeof value === 'number') {
    return Math.abs(value);
  }
  if (typeof value !== 'string') {
    return null;
  }
  
  // Remove currency symbols and spaces
  let cleaned = value.replace(/[R$\s]/g, '').trim();
  
  // Handle Brazilian format (1.234,56 -> 1234.56)
  if (cleaned.includes(',') && cleaned.includes('.')) {
    cleaned = cleaned.replace(/\./g, '').replace(',', '.');
  } else if (cleaned.includes(',')) {
    cleaned = cleaned.replace(',', '.');
  }
  
  const number = parseFloat(cleaned);
  return isNaN(number) ? null : Math.abs(number);
};

/**
 * Parses a date from various formats (DD/MM/YYYY, YYYY-MM-DD, Excel serial) into an ISO string (YYYY-MM-DD).
 * @param value The value to parse.
 * @returns The ISO date string or null if invalid.
 */
export const parseDate = (value: unknown): string | null => {
  if (!value) return null;

  // Handle ExcelJS Date objects
  if (value instanceof Date) {
    if (!isNaN(value.getTime())) {
      return value.toISOString().split('T')[0];
    }
  }

  if (typeof value === 'number') {
    // Handle Excel serial date
    const excelEpoch = new Date(1899, 11, 30);
    const date = new Date(excelEpoch.getTime() + value * 86400000);
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0];
    }
  }

  if (typeof value === 'string') {
    // Try DD/MM/YYYY format first
    const brMatch = value.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
    if (brMatch) {
      const [, day, month, year] = brMatch;
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
    
    // Try YYYY-MM-DD format
    const isoMatch = value.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (isoMatch) {
      const [, year, month, day] = isoMatch;
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
    
    // Fallback to Date constructor
    const date = new Date(value);
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0];
    }
  }
  
  return null;
};

/**
 * Normalizes a string value to "Receita" or "Despesa".
 * @param value The string to normalize.
 * @returns The normalized type or null.
 */
export const normalizeType = (value: string): 'Receita' | 'Despesa' | null => {
  if (typeof value !== 'string') return null;
  const lower = value.toLowerCase().trim();
  
  const receitaTerms = ['receita', 'entrada', 'crédito', 'credito', 'credit', 'income', 'revenue'];
  const despesaTerms = ['despesa', 'saída', 'saida', 'débito', 'debito', 'debit', 'gasto', 'pagamento', 'expense'];
  
  for (const term of receitaTerms) {
    if (lower.includes(term)) return 'Receita';
  }
  
  for (const term of despesaTerms) {
    if (lower.includes(term)) return 'Despesa';
  }
  
  return null;
};

/**
 * Normalizes a string value to "Pendente", "Pago", or "Vencido".
 * @param value The string to normalize.
 * @returns The normalized status or null.
 */
export const normalizeStatus = (value: string): 'Pendente' | 'Pago' | 'Vencido' | null => {
  if (typeof value !== 'string') return null;
  const lower = value.toLowerCase().trim();
  
  if (['pendente', 'pending', 'aberto', 'a pagar', 'a receber'].includes(lower)) {
    return 'Pendente';
  }
  if (['pago', 'paid', 'concluído', 'concluido', 'recebido', 'quitado'].includes(lower)) {
    return 'Pago';
  }
  if (['vencido', 'overdue', 'atrasado', 'em atraso'].includes(lower)) {
    return 'Vencido';
  }
  return null;
};

/**
 * Validates a processed transaction object against the Zod schema.
 * @param transaction The transaction object to validate.
 * @returns An object with the validation result and potential errors.
 */
export const validateTransaction = (transaction: Partial<ProcessedTransaction>): z.SafeParseReturnType<Partial<ProcessedTransaction>, ProcessedTransaction> => {
  return transactionImportSchema.safeParse(transaction);
};
