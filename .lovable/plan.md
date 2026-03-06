
# Plano: Integração Completa Responsáveis ↔ Portal do Membro

## Problema Atual

1. **`profile_id` nunca é preenchido**: O `GuardianDialog` sempre envia `profile_id: null`, então nenhum responsável está vinculado a uma conta de usuário
2. **Portal "Meus Filhos" vazio**: O `useParentChildren` busca `guardians.profile_id = user.id` — como nunca é preenchido, nada aparece
3. **Sem busca de usuários no cadastro**: O form de responsável não oferece opção de vincular a um usuário existente do sistema
4. **Sem gestão completa no ChildDialog**: A aba "Responsáveis" permite vincular guardians existentes, mas não criar novos inline

## Mudanças Propostas

### 1. GuardianDialog — Vincular a Usuário do Sistema

- Adicionar campo **"Vincular a Usuário"** com select que busca `profiles` da mesma igreja
- Ao selecionar um perfil, preencher automaticamente nome/email e salvar `profile_id`
- Mostrar badge "Vinculado ao Portal" quando `profile_id` está preenchido
- Permitir desvincular (setar `profile_id = null`)

### 2. GuardiansList — Melhorias de Gestão

- Adicionar botão de **excluir** responsável (com confirmação)
- Mostrar **quantidade de crianças vinculadas** por responsável
- Filtro por status (com/sem acesso ao portal)
- Ação rápida para vincular ao portal

### 3. ChildDialog — Criar Responsável Inline

- Na aba "Responsáveis", além de vincular existentes, adicionar botão **"Cadastrar Novo Responsável"** que abre o GuardianDialog inline
- Após criação, vincular automaticamente à criança

### 4. Portal "Meus Filhos" — Links Corretos

- Atualizar links do `ParentDashboard` de `/parent/*` para `/portal/filhos?tab=*` (já que agora está dentro do portal unificado)
- Garantir que o hook `useParentChildren` funcione quando `profile_id` está corretamente preenchido

### 5. useRole — Detectar Pais Automaticamente

- Criar query que verifica se o usuário tem `guardians.profile_id = auth.uid()` 
- Se sim, considerar `isParent = true` automaticamente (sem precisar de role manual na tabela `user_roles`)

### 6. Melhorias Profissionais Adicionais

- **Foto do responsável**: Upload de foto no GuardianDialog
- **Histórico de check-ins por responsável**: Na lista de responsáveis, ver últimos check-ins/check-outs realizados
- **Notificação ao responsável**: Badge no portal quando criança faz check-in/check-out
- **QR Code do responsável**: Gerar QR pessoal para check-out rápido

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/components/children-ministry/GuardianDialog.tsx` | Adicionar campo profile_id com select de profiles, lógica de vinculação |
| `src/components/children-ministry/GuardiansList.tsx` | Excluir responsável, contagem de crianças, filtros |
| `src/components/children-ministry/ChildGuardianLinkSection.tsx` | Botão criar responsável inline |
| `src/hooks/useChildrenMinistry.tsx` | Mutation deleteGuardian, query guardians com contagem de filhos |
| `src/hooks/useRole.tsx` | Detectar isParent via guardians.profile_id automaticamente |
| `src/pages/parent/ParentDashboard.tsx` | Corrigir links `/parent/*` → `/portal/filhos` |
| `src/pages/portal/PortalChildren.tsx` | Passar tab via URL params |

## Ordem de Execução

1. Atualizar `GuardianDialog` com campo de vinculação a usuário
2. Melhorar `GuardiansList` com exclusão e contagem
3. Adicionar criação inline no `ChildGuardianLinkSection`
4. Atualizar `useRole` para detectar pais automaticamente
5. Corrigir links no `ParentDashboard`
6. Ajustar `PortalChildren` para receber tab params
