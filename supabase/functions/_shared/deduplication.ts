/**
 * Shared Deduplication Module for Sync Operations
 * 
 * This module provides a unified approach to prevent duplicate transactions
 * during synchronization from Google Sheets (OAuth and Public).
 * 
 * Key Concept: We use CONTENT-BASED hashing instead of row position
 * to identify transactions. This ensures that reordering rows in the
 * spreadsheet doesn't create duplicates.
 */

export interface TransactionData {
  description: string;
  amount: number;
  type: string;
  due_date: string | null;
  payment_date: string | null;
  status: string;
  category_id: string | null;
  ministry_id: string | null;
  notes: string | null;
}

export interface ExistingTransaction extends TransactionData {
  id: string;
  external_id: string | null;
  church_id: string;
  created_at: string;
  updated_at: string;
}

export interface DeduplicationResult {
  action: 'insert' | 'update' | 'skip';
  existingId?: string;
  reason?: string;
  changes?: Record<string, { old: unknown; new: unknown }>;
}

export interface SyncStats {
  inserted: number;
  updated: number;
  skipped: number;
  errors: number;
  details: Array<{
    row: number;
    action: string;
    description: string;
    reason?: string;
  }>;
}

/**
 * Normalizes a string for consistent comparison
 */
export function normalizeString(str: string | null | undefined): string {
  if (!str) return '';
  return str
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .replace(/\s+/g, ' '); // Normalize whitespace
}

/**
 * Creates a content-based hash from transaction data
 * This hash is used to identify if a transaction already exists
 * regardless of its row position in the spreadsheet
 */
export function createContentHash(
  description: string,
  amount: number,
  dueDate: string | null,
  type: string
): string {
  const normalizedDesc = normalizeString(description);
  const normalizedAmount = Math.abs(Number(amount) || 0).toFixed(2);
  const normalizedDate = dueDate || '';
  const normalizedType = type.toLowerCase().trim();
  
  const content = `${normalizedDesc}|${normalizedAmount}|${normalizedDate}|${normalizedType}`;
  
  // Create a simple hash using base64 encoding
  // This is sufficient for deduplication purposes
  try {
    return btoa(unescape(encodeURIComponent(content)))
      .replace(/[+/=]/g, '') // Remove base64 special chars
      .substring(0, 20);
  } catch {
    // Fallback for edge cases
    return content.replace(/[^a-z0-9]/gi, '').substring(0, 20);
  }
}

/**
 * Creates a unique external_id based on content hash
 * Format: sheet_{sheetIdPrefix}_{contentHash}
 */
export function createExternalId(sheetId: string, contentHash: string): string {
  const sheetPrefix = sheetId.substring(0, 8);
  return `sheet_${sheetPrefix}_${contentHash}`;
}

/**
 * Creates an external_id directly from transaction data
 */
export function createExternalIdFromData(
  sheetId: string,
  description: string,
  amount: number,
  dueDate: string | null,
  type: string
): string {
  const hash = createContentHash(description, amount, dueDate, type);
  return createExternalId(sheetId, hash);
}

/**
 * Calculates string similarity using Levenshtein distance
 * Returns a value between 0 (completely different) and 1 (identical)
 */
export function calculateSimilarity(str1: string, str2: string): number {
  const s1 = normalizeString(str1);
  const s2 = normalizeString(str2);
  
  if (s1 === s2) return 1;
  if (s1.length === 0 || s2.length === 0) return 0;
  
  const matrix: number[][] = [];
  
  for (let i = 0; i <= s1.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= s2.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= s1.length; i++) {
    for (let j = 1; j <= s2.length; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }
  
  const distance = matrix[s1.length][s2.length];
  const maxLength = Math.max(s1.length, s2.length);
  return 1 - distance / maxLength;
}

/**
 * Checks if two amounts are effectively equal (handles floating point issues)
 */
export function amountsAreEqual(a: number, b: number): boolean {
  return Math.abs(Number(a) - Number(b)) < 0.01;
}

/**
 * Determines what action to take for an incoming transaction
 */
export function determineAction(
  incoming: TransactionData,
  incomingExternalId: string,
  existingByExternalId: Map<string, ExistingTransaction>,
  existingByHash: Map<string, ExistingTransaction>,
  similarityThreshold: number = 0.9
): DeduplicationResult {
  // 1. Check for exact match by external_id
  const exactMatch = existingByExternalId.get(incomingExternalId);
  if (exactMatch) {
    // Check if any data has changed
    const changes = detectChanges(incoming, exactMatch);
    if (Object.keys(changes).length > 0) {
      return {
        action: 'update',
        existingId: exactMatch.id,
        reason: 'Data changed since last sync',
        changes
      };
    }
    return {
      action: 'skip',
      existingId: exactMatch.id,
      reason: 'Already exists with same data'
    };
  }
  
  // 2. Check for match by content hash (handles legacy external_ids)
  const hash = createContentHash(
    incoming.description,
    incoming.amount,
    incoming.due_date,
    incoming.type
  );
  const hashMatch = existingByHash.get(hash);
  if (hashMatch) {
    // Update the external_id to the new format and check for changes
    const changes = detectChanges(incoming, hashMatch);
    return {
      action: 'update',
      existingId: hashMatch.id,
      reason: 'Found by content hash, updating external_id',
      changes: { ...changes, external_id: { old: hashMatch.external_id, new: incomingExternalId } }
    };
  }
  
  // 3. Check for similar transactions (fuzzy match)
  for (const [, existing] of existingByHash) {
    const similarity = calculateSimilarity(incoming.description, existing.description);
    const sameAmount = amountsAreEqual(incoming.amount, existing.amount);
    const sameDate = incoming.due_date === existing.due_date;
    const sameType = incoming.type.toLowerCase() === existing.type.toLowerCase();
    
    if (sameAmount && sameDate && sameType && similarity >= similarityThreshold) {
      return {
        action: 'skip',
        existingId: existing.id,
        reason: `Similar transaction found (${Math.round(similarity * 100)}% match)`
      };
    }
  }
  
  // 4. No match found, insert new transaction
  return {
    action: 'insert',
    reason: 'New transaction'
  };
}

/**
 * Detects changes between incoming and existing transaction data
 */
export function detectChanges(
  incoming: TransactionData,
  existing: ExistingTransaction
): Record<string, { old: unknown; new: unknown }> {
  const changes: Record<string, { old: unknown; new: unknown }> = {};
  
  // Check each field for changes
  if (normalizeString(incoming.description) !== normalizeString(existing.description)) {
    changes.description = { old: existing.description, new: incoming.description };
  }
  
  if (!amountsAreEqual(incoming.amount, existing.amount)) {
    changes.amount = { old: existing.amount, new: incoming.amount };
  }
  
  if (incoming.due_date !== existing.due_date) {
    changes.due_date = { old: existing.due_date, new: incoming.due_date };
  }
  
  if (incoming.payment_date !== existing.payment_date) {
    changes.payment_date = { old: existing.payment_date, new: incoming.payment_date };
  }
  
  if (incoming.status.toLowerCase() !== existing.status.toLowerCase()) {
    changes.status = { old: existing.status, new: incoming.status };
  }
  
  if (incoming.category_id !== existing.category_id) {
    changes.category_id = { old: existing.category_id, new: incoming.category_id };
  }
  
  if (incoming.ministry_id !== existing.ministry_id) {
    changes.ministry_id = { old: existing.ministry_id, new: incoming.ministry_id };
  }
  
  if (normalizeString(incoming.notes) !== normalizeString(existing.notes)) {
    changes.notes = { old: existing.notes, new: incoming.notes };
  }
  
  return changes;
}

/**
 * Builds lookup maps from existing transactions for efficient deduplication
 */
export function buildLookupMaps(
  existingTransactions: ExistingTransaction[]
): {
  byExternalId: Map<string, ExistingTransaction>;
  byContentHash: Map<string, ExistingTransaction>;
} {
  const byExternalId = new Map<string, ExistingTransaction>();
  const byContentHash = new Map<string, ExistingTransaction>();
  
  for (const tx of existingTransactions) {
    // Map by external_id if it exists
    if (tx.external_id) {
      byExternalId.set(tx.external_id, tx);
    }
    
    // Map by content hash for fallback matching
    const hash = createContentHash(
      tx.description,
      tx.amount,
      tx.due_date,
      tx.type
    );
    // Only keep the first occurrence (oldest) to avoid issues
    if (!byContentHash.has(hash)) {
      byContentHash.set(hash, tx);
    }
  }
  
  return { byExternalId, byContentHash };
}

/**
 * Creates initial sync stats object
 */
export function createSyncStats(): SyncStats {
  return {
    inserted: 0,
    updated: 0,
    skipped: 0,
    errors: 0,
    details: []
  };
}

/**
 * Logs sync action to stats
 */
export function logSyncAction(
  stats: SyncStats,
  row: number,
  action: 'insert' | 'update' | 'skip' | 'error',
  description: string,
  reason?: string
): void {
  switch (action) {
    case 'insert':
      stats.inserted++;
      break;
    case 'update':
      stats.updated++;
      break;
    case 'skip':
      stats.skipped++;
      break;
    case 'error':
      stats.errors++;
      break;
  }
  
  // Keep last 100 details for debugging
  if (stats.details.length < 100) {
    stats.details.push({ row, action, description, reason });
  }
}
