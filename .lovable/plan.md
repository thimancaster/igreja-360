
# Plano: Sistema de Escalas Inteligente para Voluntários

## Visão Geral

Implementar um sistema completo de gestão de voluntários e escalas que:
1. Permite que **líderes** convidem membros para serem voluntários em seus departamentos
2. Exige que voluntários **aceitem um Termo de Compromisso** antes de acessar funcionalidades
3. Voluntários visualizam escalas, comunicados e convocações do departamento
4. Membros comuns não têm acesso às áreas de voluntariado

---

## Fluxo Completo do Voluntário

```text
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  Líder convida  │───▸│ Notificação +   │───▸│ Aceitar Termo   │───▸│ Acesso liberado │
│  membro como    │    │ Email enviado   │    │ de Compromisso  │    │ às escalas e    │
│  voluntário     │    │ ao convidado    │    │ e Ciência       │    │ comunicados     │
└─────────────────┘    └─────────────────┘    └─────────────────┘    └─────────────────┘
                              │                        │
                              │                        │
                              ▼                        ▼
                       Pendente aceite           Status: "active"
                       Status: "pending"         term_accepted_at: data
```

---

## Fase 1: Migração de Banco de Dados

### 1.1 Nova tabela `department_volunteers`
Centraliza todos os voluntários de qualquer ministério com controle de aceite do termo.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | UUID | Chave primária |
| `church_id` | UUID | FK para churches |
| `ministry_id` | UUID | FK para ministries |
| `profile_id` | UUID | FK para profiles (usuário) |
| `full_name` | VARCHAR | Nome do voluntário |
| `email` | VARCHAR | Email para notificações |
| `phone` | VARCHAR | Telefone |
| `role` | VARCHAR | Função: membro, coordenador, líder |
| `skills` | TEXT[] | Habilidades específicas |
| `status` | VARCHAR | pending, active, inactive |
| `invited_by` | UUID | Quem convidou |
| `invited_at` | TIMESTAMPTZ | Data do convite |
| `term_accepted_at` | TIMESTAMPTZ | Data aceite do termo |
| `term_version` | VARCHAR | Versão do termo aceito |
| `is_active` | BOOLEAN | Se está ativo |
| `notes` | TEXT | Observações |

### 1.2 Nova tabela `volunteer_schedules`
Escalas dos voluntários.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | UUID | Chave primária |
| `church_id` | UUID | FK para churches |
| `ministry_id` | UUID | FK para ministries |
| `volunteer_id` | UUID | FK para department_volunteers |
| `schedule_date` | DATE | Data da escala |
| `shift_start` | TIME | Hora início |
| `shift_end` | TIME | Hora fim |
| `schedule_type` | VARCHAR | primary, backup |
| `confirmed` | BOOLEAN | Confirmado pelo voluntário |
| `confirmed_at` | TIMESTAMPTZ | Data confirmação |
| `notes` | TEXT | Observações |
| `created_by` | UUID | Quem criou |

### 1.3 Nova tabela `volunteer_commitment_terms`
Armazena as versões dos termos de compromisso.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | UUID | Chave primária |
| `church_id` | UUID | FK para churches |
| `version` | VARCHAR | Ex: "1.0", "2.0" |
| `title` | VARCHAR | Título do termo |
| `content` | TEXT | Conteúdo completo (HTML/Markdown) |
| `is_active` | BOOLEAN | Versão ativa atual |
| `created_at` | TIMESTAMPTZ | Data criação |
| `created_by` | UUID | Quem criou |

### 1.4 Nova tabela `volunteer_announcements`
Comunicados específicos por departamento.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | UUID | Chave primária |
| `church_id` | UUID | FK para churches |
| `ministry_id` | UUID | FK para ministries |
| `title` | VARCHAR | Título |
| `content` | TEXT | Conteúdo |
| `priority` | VARCHAR | normal, urgent, meeting |
| `meeting_date` | TIMESTAMPTZ | Data da reunião (se aplicável) |
| `is_published` | BOOLEAN | Se está publicado |
| `created_by` | UUID | Quem criou |

### 1.5 Políticas RLS

**Voluntários (department_volunteers):**
- Líderes/Admin: CRUD completo no ministério que lideram
- Voluntários ativos: Visualizar apenas seu próprio registro

**Escalas (volunteer_schedules):**
- Líderes/Admin: CRUD completo
- Voluntários ativos: Visualizar escalas do seu departamento + confirmar presença

**Termos (volunteer_commitment_terms):**
- Admin: CRUD completo
- Líderes: Visualizar
- Voluntários: Visualizar (para aceitar)

**Comunicados (volunteer_announcements):**
- Líderes/Admin: CRUD completo
- Voluntários ativos: Visualizar

---

## Fase 2: Edge Function para Convite de Voluntário

### `invite-volunteer/index.ts`

Responsabilidades:
1. Validar que o chamador é líder do ministério ou admin
2. Verificar se o usuário já é voluntário do ministério
3. Criar registro em `department_volunteers` com status "pending"
4. Criar notificação no sistema
5. Enviar email via Resend com link para aceitar

**Email enviado:**
```
Assunto: Você foi convidado para ser voluntário em [Nome do Ministério]

Olá [Nome],

Você foi convidado por [Nome do Líder] para fazer parte da equipe de 
voluntários do ministério [Nome do Ministério] na igreja [Nome da Igreja].

Para aceitar o convite, acesse o sistema e revise o Termo de Compromisso 
de Voluntariado.

[Botão: Aceitar Convite]
```

---

## Fase 3: Termo de Compromisso de Voluntariado

### 3.1 Conteúdo Padrão do Termo

O sistema criará automaticamente um termo padrão para cada igreja, contendo:

```markdown
# TERMO DE COMPROMISSO DE VOLUNTARIADO

## 1. NATUREZA DO TRABALHO VOLUNTÁRIO
Declaro que minha participação como voluntário(a) junto a [NOME DA IGREJA] 
é de livre e espontânea vontade, sem qualquer expectativa de remuneração 
ou vínculo empregatício, nos termos da Lei nº 9.608/98 (Lei do Voluntariado).

## 2. RESPONSABILIDADES DO VOLUNTÁRIO
Comprometo-me a:
- Cumprir as escalas designadas, comunicando com antecedência eventuais 
  ausências
- Respeitar as normas e diretrizes do ministério
- Manter conduta ética e respeitosa com todos os membros e visitantes
- Preservar o sigilo de informações confidenciais
- Participar dos treinamentos e reuniões quando convocado

## 3. ISENÇÃO DE RESPONSABILIDADE
Declaro estar ciente de que:

### 3.1 Ausência de Vínculo Trabalhista
Não existe e não existirá vínculo empregatício entre mim e a igreja, 
não fazendo jus a salário, férias, 13º salário, FGTS, INSS ou qualquer 
outro benefício trabalhista.

### 3.2 Isenção Fiscal
A atividade voluntária não gera obrigação tributária para a igreja, 
não caracterizando prestação de serviços remunerados.

### 3.3 Responsabilidade Civil
A igreja não se responsabiliza por eventuais despesas pessoais 
decorrentes da atividade voluntária (transporte, alimentação, etc.), 
salvo quando expressamente acordado.

## 4. VIGÊNCIA E DESLIGAMENTO
Este termo tem validade por tempo indeterminado, podendo ser encerrado:
- Por vontade do voluntário, mediante comunicação prévia
- Por decisão da liderança, respeitando os princípios da igreja

## 5. ACEITE ELETRÔNICO
Ao clicar em "Aceitar e Continuar", declaro que li, compreendi e 
concordo integralmente com os termos acima descritos.

Data do aceite: [DATA AUTOMÁTICA]
IP do aceite: [IP REGISTRADO]
```

### 3.2 Tela de Aceite do Termo

Quando o voluntário com status "pending" faz login, o sistema:
1. Detecta que há convites pendentes
2. Redireciona para `/app/voluntario/aceitar-termo`
3. Exibe o termo completo com scroll obrigatório
4. Checkbox: "Li e aceito integralmente os termos acima"
5. Botão: "Aceitar e Começar"
6. Ao aceitar: atualiza `term_accepted_at` e `status = 'active'`

---

## Fase 4: Hooks e Lógica de Negócio

### 4.1 `useDepartmentVolunteers.tsx`
- Lista voluntários do ministério
- Convida novos voluntários (cria pendentes)
- Ativa/desativa voluntários
- Verifica se usuário atual é voluntário

### 4.2 `useVolunteerSchedules.tsx`
- CRUD de escalas
- Filtro por mês/semana
- Confirmação de presença
- Detecção de conflitos

### 4.3 `useVolunteerStatus.tsx`
- Verifica status do voluntário atual
- Lista ministérios em que é voluntário
- Verifica se tem termo pendente

### 4.4 `useVolunteerAnnouncements.tsx`
- Lista comunicados do departamento
- Marca como lido
- Filtra por prioridade

---

## Fase 5: Componentes de UI

### 5.1 Estrutura de Arquivos
```
src/
├── pages/
│   ├── Escalas.tsx                 # Página principal de escalas
│   └── AceitarTermoVoluntario.tsx  # Tela de aceite do termo
├── hooks/
│   ├── useDepartmentVolunteers.tsx
│   ├── useVolunteerSchedules.tsx
│   ├── useVolunteerStatus.tsx
│   └── useVolunteerAnnouncements.tsx
├── components/
│   └── schedules/
│       ├── index.ts
│       ├── DepartmentSelector.tsx
│       ├── VolunteerList.tsx
│       ├── InviteVolunteerDialog.tsx
│       ├── ScheduleCalendar.tsx
│       ├── ScheduleDialog.tsx
│       ├── MySchedulesCard.tsx
│       ├── VolunteerAnnouncementsPanel.tsx
│       └── CommitmentTermDialog.tsx
```

### 5.2 Página `/app/escalas`

**Para Líderes/Admin:**
- Seletor de ministério (dropdown)
- Calendário com escalas visuais
- Lista de voluntários com status
- Botão "Convidar Voluntário"
- Painel de comunicados

**Para Voluntários:**
- Apenas seus ministérios aparecem
- Visualização read-only do calendário
- "Minhas Escalas" em destaque
- Botão de confirmação de presença
- Comunicados e convocações

---

## Fase 6: Controle de Acesso Atualizado

```
┌──────────────────┬──────────────────────────────────┬─────────────────────────────┐
│ Role             │ Permissão                        │ Escopo                      │
├──────────────────┼──────────────────────────────────┼─────────────────────────────┤
│ admin            │ CRUD completo + gerenciar termos │ Todos os ministérios        │
│ tesoureiro       │ Visualizar escalas               │ Todos os ministérios        │
│ pastor           │ CRUD completo                    │ Todos os ministérios        │
│ lider            │ CRUD escalas + convidar          │ Ministérios atribuídos      │
│ user (voluntário)│ Visualizar + confirmar           │ Ministérios onde é vol.     │
│ user (normal)    │ Sem acesso                       │ N/A                         │
│ parent           │ Sem acesso                       │ N/A                         │
└──────────────────┴──────────────────────────────────┴─────────────────────────────┘
```

---

## Fase 7: Integração com Sidebar

Adicionar item "Escalas" no menu:
- Visível apenas para usuários que são voluntários ativos OU têm role lider/pastor/admin
- Badge de notificação para escalas não confirmadas
- Badge de notificação para comunicados não lidos

---

## Fase 8: Edge Function para Envio de Email

### `send-volunteer-invite/index.ts`

Usa Resend API (já configurada com `RESEND_API_KEY`) para enviar:
1. Email de convite inicial
2. Lembrete de escala (futuro)
3. Convocação para reunião (futuro)

---

## Detalhes Técnicos da Migração SQL

A migração criará:
1. 4 novas tabelas com índices otimizados
2. RLS policies granulares por role e status
3. Trigger para atualizar `updated_at`
4. Função helper `is_volunteer_of_ministry(user_id, ministry_id)`
5. Termo padrão inicial para igrejas existentes

---

## Benefícios para a Igreja

1. **Organização**: Escalas centralizadas e acessíveis
2. **Comunicação**: Avisos direcionados por departamento
3. **Proteção Legal**: Termo de compromisso com aceite eletrônico documentado
4. **Engajamento**: Voluntários confirmam presença pelo app
5. **Controle**: Líderes gerenciam apenas seus ministérios

---

## Próximos Passos Após Aprovação

1. Executar migração de banco de dados
2. Criar Edge Function `send-volunteer-invite`
3. Implementar hooks de voluntários
4. Criar componentes de UI
5. Integrar com navegação existente
6. Testar fluxo completo ponta a ponta
