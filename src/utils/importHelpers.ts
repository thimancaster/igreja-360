import * as XLSX from 'xlsx';
import { z } from 'zod';
import { transactionImportSchema, ProcessedTransaction } from '@/types/import';

/**
 * Reads an Excel or CSV file and returns its headers and rows.
 * @param file The file to read.
 * @returns A promise that resolves to an object with headers and rows.
 */
export const readSpreadsheet = (file: File): Promise<{ headers: string[]; rows: any[][] }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = event.target?.result;
        if (!data) {
          throw new Error('Could not read file data.');
        }
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        const headers = json[0] || [];
        const rows = json.slice(1);

        resolve({ headers, rows });
      } catch (error) {
        reject(new Error('Failed to parse the spreadsheet file.'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read the file.'));
    reader.readAsBinaryString(file);
  });
};

/**
 * Parses a currency string (e.g., "R$ 1.234,56" or "1234.56") into a number.
 * @param value The value to parse.
 * @returns The parsed number or null if invalid.
 */
export const parseAmount = (value: any): number | null => {
  if (typeof value === 'number') {
    return value;
  }
  if (typeof value !== 'string') {
    return null;
  }
  const cleaned = value.replace(/[^0-9,.-]/g, '').trim();
  const standardized = cleaned.replace(/\./g, '').replace(',', '.');
  const number = parseFloat(standardized);
  return isNaN(number) ? null : number;
};

/**
 * Parses a date from various formats (DD/MM/YYYY, YYYY-MM-DD, Excel serial) into an ISO string (YYYY-MM-DD).
 * @param value The value to parse.
 * @returns The ISO date string or null if invalid.
 */
export const parseDate = (value: any): string | null => {
  if (!value) return null;

  if (typeof value === 'number') {
    // Handle Excel serial date
    const excelEpoch = new Date(1899, 11, 30);
    const date = new Date(excelEpoch.getTime() + value * 86400000);
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0];
    }
  }

  if (typeof value === 'string') {
    const date = new Date(value);
    // Check if it's a valid date string that JS can parse
    if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0];
    }
    
    // Handle DD/MM/YYYY and DD-MM-YYYY
    const parts = value.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
    if (parts) {
      const isoDate = `${parts[3]}-${parts[2].padStart(2, '0')}-${parts[1].padStart(2, '0')}`;
      const parsedDate = new Date(isoDate);
      if (!isNaN(parsedDate.getTime())) {
        return isoDate;
      }
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
  if (['receita', 'entrada', 'crédito', 'credit'].includes(lower)) {
    return 'Receita';
  }
  if (['despesa', 'saída', 'débito', 'debit'].includes(lower)) {
    return 'Despesa';
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
  if (['pendente', 'pending', 'aberto'].includes(lower)) {
    return 'Pendente';
  }
  if (['pago', 'paid', 'concluído', 'concluido'].includes(lower)) {
    return 'Pago';
  }
  if (['vencido', 'overdue', 'atrasado'].includes(lower)) {
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