/**
 * Shared input validation utilities for edge functions
 */

// Email validation regex (RFC 5322 simplified)
const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

// Google Sheet ID format (alphanumeric, hyphens, underscores)
const SHEET_ID_REGEX = /^[a-zA-Z0-9_-]{20,60}$/;

// UUID format
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Password complexity: at least 8 chars, 1 uppercase, 1 lowercase, 1 number
const PASSWORD_COMPLEXITY_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

/**
 * Validates email format
 */
export function isValidEmail(email: string): boolean {
  if (!email || typeof email !== 'string') return false;
  if (email.length > 254) return false; // RFC 5321 max length
  return EMAIL_REGEX.test(email.trim());
}

/**
 * Validates Google Sheet ID format
 */
export function isValidSheetId(sheetId: string): boolean {
  if (!sheetId || typeof sheetId !== 'string') return false;
  return SHEET_ID_REGEX.test(sheetId.trim());
}

/**
 * Validates UUID format
 */
export function isValidUUID(uuid: string): boolean {
  if (!uuid || typeof uuid !== 'string') return false;
  return UUID_REGEX.test(uuid.trim());
}

/**
 * Validates password meets complexity requirements
 * - At least 8 characters
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one number
 */
export function isValidPassword(password: string): { valid: boolean; message?: string } {
  if (!password || typeof password !== 'string') {
    return { valid: false, message: 'Senha é obrigatória' };
  }
  
  if (password.length < 8) {
    return { valid: false, message: 'Senha deve ter no mínimo 8 caracteres' };
  }
  
  if (password.length > 128) {
    return { valid: false, message: 'Senha muito longa (máximo 128 caracteres)' };
  }
  
  if (!PASSWORD_COMPLEXITY_REGEX.test(password)) {
    return { 
      valid: false, 
      message: 'Senha deve conter pelo menos uma letra maiúscula, uma minúscula e um número' 
    };
  }
  
  return { valid: true };
}

/**
 * Sanitizes text input to prevent XSS
 * Removes HTML tags and trims whitespace
 */
export function sanitizeText(input: string): string {
  if (!input || typeof input !== 'string') return '';
  
  // Remove HTML tags
  return input
    .replace(/<[^>]*>/g, '')
    .replace(/[<>]/g, '')
    .trim()
    .substring(0, 500); // Limit length
}

/**
 * Validates and sanitizes a name field
 */
export function validateName(name: string): { valid: boolean; sanitized?: string; message?: string } {
  if (!name || typeof name !== 'string') {
    return { valid: false, message: 'Nome é obrigatório' };
  }
  
  const sanitized = sanitizeText(name);
  
  if (sanitized.length < 2) {
    return { valid: false, message: 'Nome deve ter no mínimo 2 caracteres' };
  }
  
  if (sanitized.length > 100) {
    return { valid: false, message: 'Nome muito longo (máximo 100 caracteres)' };
  }
  
  return { valid: true, sanitized };
}

/**
 * Validates role value against allowed roles
 */
export function isValidRole(role: string): boolean {
  const allowedRoles = ['admin', 'tesoureiro', 'pastor', 'lider', 'user', 'parent'];
  return allowedRoles.includes(role);
}

/**
 * Rate limiting helper - returns rate limit key for a given action and identifier
 */
export function getRateLimitKey(action: string, identifier: string): string {
  return `rate_limit:${action}:${identifier}`;
}
