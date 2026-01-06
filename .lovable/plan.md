# Plano de Correcao: Unificacao do Ecossistema Igreja/Perfil/Roles

## Resumo do Problema

O sistema apresenta pontas soltas no fluxo de criacao e vinculo de igreja ao perfil do usuario:

1. **Perfil nao criado automaticamente**: A trigger `on_auth_user_created` existe, mas o perfil do usuario atual nao foi criado (0 registros em `profiles` apesar de 1 usuario em `auth.users`).
2. **Igrejas duplicadas sem vinculo**: Existem 2 igrejas criadas pelo mesmo usuario (`owner_user_id`), mas nenhuma esta vinculada ao `profile.church_id`.
3. **Codigo consulta `profile.church_id` que e `null`**: Todas as paginas (Configuracoes, GerenciarIgreja, GerenciarUsuarios) dependem de `profile.church_id`, que esta nulo.
4. **Fallbacks inconsistentes**: Algumas paginas usam fallback por `owner_user_id`, outras nao.
5. **Falta de tela de escolha de igreja**: O usuario nao pode escolher qual igreja vincular quando existem multiplas.
6. **Acesso Admin nao restrito**: Atualmente qualquer logado acessa /app/admin.

## Arquitetura Proposta

```
auth.users (Supabase Auth)
    |
    v  (trigger on_auth_user_created)
profiles (id = auth.uid)
    |
    +-- church_id --> churches (id)
    |
    +-- user_roles (user_id = profiles.id)
```

## Plano de Implementacao

### FASE 1: Correcao no Banco de Dados

**1.1 Garantir que o perfil seja criado para o usuario atual**

Executar SQL para criar o perfil faltante e vincular a igreja mais recente (temporario, ate a tela de escolha):

```sql
-- Criar profile se nao existir
INSERT INTO public.profiles (id, full_name)
SELECT u.id, COALESCE(u.raw_user_meta_data->>'full_name', u.email)
FROM auth.users u
WHERE NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = u.id);

-- Vincular church_id (mais recente) temporariamente
UPDATE public.profiles p
SET church_id = (
  SELECT c.id FROM public.churches c
  WHERE c.owner_user_id = p.id
  ORDER BY c.created_at DESC LIMIT 1
)
WHERE p.church_id IS NULL
  AND EXISTS (SELECT 1 FROM public.churches c WHERE c.owner_user_id = p.id);
```

**1.2 Garantir role admin para donos de igreja**

```sql
INSERT INTO public.user_roles (user_id, role)
SELECT DISTINCT c.owner_user_id, 'admin'::app_role
FROM public.churches c
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_roles r
  WHERE r.user_id = c.owner_user_id AND r.role = 'admin'
)
ON CONFLICT (user_id, role) DO NOTHING;
```

### FASE 2: Criar Componente de Deteccao e Correcao de Vinculo

**2.1 Criar `ProfileLinkChecker.tsx`**

Componente que:
- Verifica se `profile` existe
- Verifica se `profile.church_id` esta preenchido
- Se nao, mostra botao "Corrigir Vinculo" que abre modal/tela de escolha de igreja

Arquivo: `src/components/ProfileLinkChecker.tsx`

**2.2 Criar pagina `SelectChurch.tsx`**

Pagina que:
- Lista todas as igrejas onde o usuario e `owner_user_id`
- Permite selecionar qual igreja vincular ao perfil
- Atualiza `profiles.church_id` com a igreja escolhida
- Redireciona para `/app/dashboard`

Arquivo: `src/pages/SelectChurch.tsx`

**2.3 Adicionar rota `/select-church`**

Em `App.tsx`, adicionar:
```tsx
<Route path="/select-church" element={<ProtectedRoute><SelectChurch /></ProtectedRoute>} />
```

### FASE 3: Modificar AuthContext para Deteccao

**3.1 Atualizar `AuthContext.tsx`**

- Apos carregar profile, verificar se `profile === null` (nao existe)
- Se nao existe, criar profile automaticamente via insert (fallback de seguranca)
- Expor flag `profileNeedsChurch: boolean` para indicar se `church_id` esta nulo

### FASE 4: Modificar AuthRedirect para Novo Fluxo

**4.1 Atualizar `AuthRedirect.tsx`**

Logica:
1. Se `!session` -> `/auth`
2. Se `!profile` -> mostrar erro ou criar perfil
3. Se `!profile.church_id`:
   - Verificar se existem igrejas do usuario
   - Se existir 1 -> vincular automaticamente
   - Se existir mais de 1 -> redirecionar para `/select-church`
   - Se nao existir nenhuma -> `/create-church`
4. Se tudo ok -> `/app/dashboard`

### FASE 5: Restricao de Acesso ao Menu Admin

**5.1 Criar componente `AdminRoute.tsx`**

Componente wrapper que:
- Verifica se usuario tem role `admin` ou `tesoureiro`
- Se nao, redireciona para `/app/dashboard` com toast de erro

Arquivo: `src/components/AdminRoute.tsx`

**5.2 Aplicar AdminRoute nas rotas de admin**

Em `App.tsx`:
```tsx
<Route path="admin" element={<AdminRoute><Admin /></AdminRoute>} />
<Route path="admin/usuarios" element={<AdminRoute><GerenciarUsuarios /></AdminRoute>} />
<Route path="admin/ministerios" element={<AdminRoute><GerenciarMinisterios /></AdminRoute>} />
<Route path="admin/igreja" element={<AdminRoute><GerenciarIgreja /></AdminRoute>} />
<Route path="admin/categorias" element={<AdminRoute><GerenciarCategorias /></AdminRoute>} />
```

**5.3 Ocultar menu Admin no Sidebar**

Em `AppSidebar.tsx`:
- Renderizar link "Administracao" apenas se `isAdmin || isTesoureiro`

### FASE 6: Unificar Consultas em Todo o Ecossistema

**6.1 Remover fallbacks por `owner_user_id` das paginas**

Apos corrigir o vinculo, todas as paginas devem usar apenas `profile.church_id`:
- `Configuracoes.tsx`
- `GerenciarIgreja.tsx`
- `GerenciarUsuarios.tsx`
- `ChurchConfirmation.tsx`
- `Integracoes.tsx`

Isso simplifica o codigo e garante uma unica fonte de verdade.

**6.2 Atualizar queries para usar `profile.church_id` diretamente**

Remover logica de fallback redundante em:
- `useQuery` de church em cada pagina
- Usar `enabled: !!profile?.church_id`

### FASE 7: Limpeza de Dados Duplicados

**7.1 Criar funcao de limpeza (opcional, via SQL)**

Deletar igrejas duplicadas mantendo apenas a mais recente:

```sql
-- Identificar duplicatas
WITH ranked AS (
  SELECT id, owner_user_id, name, created_at,
         ROW_NUMBER() OVER (PARTITION BY owner_user_id ORDER BY created_at DESC) as rn
  FROM public.churches
)
DELETE FROM public.churches
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);
```

> **Nota**: Executar apenas apos usuario confirmar qual igreja manter.

## Arquivos a Serem Modificados/Criados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `supabase/migrations/YYYYMMDD_fix_profiles.sql` | Criar | SQL para criar profile e vincular igreja |
| `src/components/ProfileLinkChecker.tsx` | Criar | Componente de deteccao de vinculo |
| `src/pages/SelectChurch.tsx` | Criar | Pagina de escolha de igreja |
| `src/components/AdminRoute.tsx` | Criar | Wrapper de protecao para admin |
| `src/contexts/AuthContext.tsx` | Modificar | Adicionar flag `profileNeedsChurch` |
| `src/components/AuthRedirect.tsx` | Modificar | Novo fluxo de redirecionamento |
| `src/App.tsx` | Modificar | Adicionar rota `/select-church` e AdminRoute |
| `src/components/AppSidebar.tsx` | Modificar | Ocultar menu Admin para nao-privilegiados |
| `src/pages/Configuracoes.tsx` | Modificar | Remover fallback por owner_user_id |
| `src/pages/admin/GerenciarIgreja.tsx` | Modificar | Remover fallback, simplificar |
| `src/pages/admin/GerenciarUsuarios.tsx` | Modificar | Remover verificacao redundante |
| `src/pages/ChurchConfirmation.tsx` | Modificar | Remover fallback |
| `src/pages/Integracoes.tsx` | Modificar | Remover fallback |

## Diagrama de Fluxo Corrigido

```
Login/Signup
     |
     v
AuthRedirect
     |
     +-- !session --> /auth
     |
     +-- !profile --> Criar profile automaticamente
     |
     +-- !profile.church_id
     |       |
     |       +-- Buscar igrejas do owner
     |       |
     |       +-- 0 igrejas --> /create-church
     |       +-- 1 igreja --> Vincular automaticamente --> /app/dashboard
     |       +-- 2+ igrejas --> /select-church
     |
     +-- profile.church_id OK --> /app/dashboard
```

## Ordem de Execucao Recomendada

1. Executar migration SQL (criar profile + vincular igreja temporariamente)
2. Criar `SelectChurch.tsx`
3. Criar `ProfileLinkChecker.tsx`
4. Criar `AdminRoute.tsx`
5. Modificar `AuthContext.tsx`
6. Modificar `AuthRedirect.tsx`
7. Modificar `App.tsx` (rotas)
8. Modificar `AppSidebar.tsx` (menu)
9. Simplificar paginas removendo fallbacks
10. Testar fluxo completo
11. Limpar igrejas duplicadas (opcional)

## Critical Files for Implementation

- `src/contexts/AuthContext.tsx` - Core do estado de autenticacao e perfil
- `src/components/AuthRedirect.tsx` - Logica de redirecionamento principal
- `src/App.tsx` - Definicao de todas as rotas
- `src/components/AppSidebar.tsx` - Menu lateral com controle de visibilidade
- `src/pages/admin/GerenciarIgreja.tsx` - Exemplo de pagina que precisa de church_id
