-- Criar índice único parcial para CNPJ (permitir NULL mas não duplicatas)
CREATE UNIQUE INDEX IF NOT EXISTS churches_cnpj_unique_idx 
ON public.churches (cnpj) 
WHERE cnpj IS NOT NULL AND cnpj != '';