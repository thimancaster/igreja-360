import DOMPurify from 'dompurify';

/**
 * Sanitizes user input to prevent XSS attacks.
 * Removes all HTML tags and returns plain text only.
 */
export function sanitizeText(input: string): string {
  if (!input || typeof input !== 'string') {
    return '';
  }
  
  // Remove all HTML tags, keeping only text content
  return DOMPurify.sanitize(input, { 
    ALLOWED_TAGS: [], 
    ALLOWED_ATTR: [] 
  }).trim();
}

/**
 * Sanitizes user input while preserving basic formatting.
 * Allows only safe inline text elements.
 */
export function sanitizeRichText(input: string): string {
  if (!input || typeof input !== 'string') {
    return '';
  }
  
  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'br'],
    ALLOWED_ATTR: []
  }).trim();
}
