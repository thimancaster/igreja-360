// Utilitários para validação e formatação de CNPJ

/**
 * Remove caracteres não numéricos do CNPJ
 */
export const cleanCNPJ = (cnpj: string): string => {
  return cnpj.replace(/\D/g, '');
};

/**
 * Formata CNPJ para exibição (XX.XXX.XXX/XXXX-XX)
 */
export const formatCNPJ = (value: string): string => {
  const cleaned = cleanCNPJ(value);
  return cleaned
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2')
    .substring(0, 18);
};

/**
 * Valida formato do CNPJ (14 dígitos)
 * Retorna true se vazio (opcional) ou se tem 14 dígitos
 */
export const validateCNPJFormat = (cnpj: string): boolean => {
  if (!cnpj || cnpj.trim() === '') return true; // Vazio é válido (opcional)
  
  const cleaned = cleanCNPJ(cnpj);
  return cleaned.length === 14;
};

/**
 * Valida CNPJ com dígitos verificadores (algoritmo completo)
 * Retorna true se vazio (opcional) ou se é válido
 */
export const validateCNPJ = (cnpj: string): boolean => {
  if (!cnpj || cnpj.trim() === '') return true; // Vazio é válido (opcional)
  
  const cleaned = cleanCNPJ(cnpj);
  
  if (cleaned.length !== 14) return false;
  
  // Verificar se todos os dígitos são iguais (inválido)
  if (/^(\d)\1+$/.test(cleaned)) return false;
  
  // Validar dígitos verificadores
  let size = cleaned.length - 2;
  let numbers = cleaned.substring(0, size);
  const digits = cleaned.substring(size);
  let sum = 0;
  let pos = size - 7;
  
  for (let i = size; i >= 1; i--) {
    sum += parseInt(numbers.charAt(size - i)) * pos--;
    if (pos < 2) pos = 9;
  }
  
  let result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (result !== parseInt(digits.charAt(0))) return false;
  
  size = size + 1;
  numbers = cleaned.substring(0, size);
  sum = 0;
  pos = size - 7;
  
  for (let i = size; i >= 1; i--) {
    sum += parseInt(numbers.charAt(size - i)) * pos--;
    if (pos < 2) pos = 9;
  }
  
  result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (result !== parseInt(digits.charAt(1))) return false;
  
  return true;
};
