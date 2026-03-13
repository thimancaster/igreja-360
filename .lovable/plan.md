

# Varredura Cirúrgica: Correção de Edição e Consistência do Sistema

## Problema Principal Identificado

O **MemberDialog** é o maior culprit: usa `defaultValues` no `useForm` mas **não tem `useEffect`** para resetar o formulário quando o `member` muda. Quando se abre para editar, o formulário mantém valores antigos ou vazios. Além disso, usa `defaultValue` nos `Select` em vez de `value`, o que impede a atualização reativa.

## Diagnóstico Completo

| Componente | Tem useEffect reset? | Usa `value` nos Select? | Status |
|---|---|---|---|
| **MemberDialog** | **NÃO** | **NÃO** (7x `defaultValue`) | **QUEBRADO** |
| GuardianDialog | Sim | Sim | OK |
| ChildDialog | Sim | Sim | OK |
| PortalChildDialog | Sim | Sim | OK |
| TransactionDialog | Sim (useState) | Sim | OK |
| ChurchEventDialog | Sim | N/A | OK |
| ContributionDialog | N/A (só cria) | **NÃO** (1x `defaultValue`) | Menor |
| UserDialog | Usa useState sem reset | N/A | **BUG** - não reseta ao trocar user |
| ScheduleDialog | Usa useState sem reset | N/A | **BUG** - não reseta ao trocar schedule |

## Correções Necessárias

### 1. MemberDialog.tsx (CRÍTICO)
- Adicionar `useEffect` para `form.reset()` quando `member` ou `open` mudar
- Trocar todos `defaultValue={field.value}` por `value={field.value}` nos 7 `Select` components
- Resetar `selectedMinistries` no useEffect também

### 2. UserDialog.tsx
- Adicionar `useEffect` para resetar `email`, `fullName`, `role` quando `user` prop muda

### 3. ScheduleDialog.tsx
- Adicionar `useEffect` para resetar estados quando `selectedSchedule` muda

### 4. ContributionDialog.tsx (menor)
- Trocar `defaultValue` por `value` no Select de tipo de contribuição

## Arquivos a Modificar

| Arquivo | Mudança |
|---|---|
| `src/components/members/MemberDialog.tsx` | useEffect + 7x defaultValue→value |
| `src/components/users/UserDialog.tsx` | useEffect para reset |
| `src/components/schedules/ScheduleDialog.tsx` | useEffect para reset |
| `src/components/contributions/ContributionDialog.tsx` | 1x defaultValue→value |

## Ordem de Execução
1. MemberDialog (impacto maior, bug reportado pelo usuário)
2. UserDialog
3. ScheduleDialog
4. ContributionDialog

