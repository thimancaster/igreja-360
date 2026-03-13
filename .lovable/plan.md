

# Plano: Sistema de Eventos Integrado para a Igreja

## Contexto Atual

- Tabela `ministry_events` existe, com 1 evento ("Tarde Kids") com `registration_required=true`
- Tabela `event_registrations` existe mas e limitada a criancas (child_id + guardian_id)
- O check-in do ministerio infantil usa opcoes hardcoded ("Culto Matutino", "Culto Noturno", etc.) e nao e vinculado ao calendario de eventos
- Eventos sao criados apenas dentro do Ministerio Infantil, sem pagina propria

## Arquitetura Proposta

### 1. Schema de Banco de Dados - Novas Tabelas e Alteracoes

**Alterar `ministry_events`** para ser a tabela central de eventos da igreja:
- Adicionar: `ticket_price` (numeric), `is_paid_event` (boolean), `registration_deadline` (timestamptz), `cover_image_url` (text), `status` (varchar: draft/published/cancelled/completed), `visibility` (varchar: public/members/ministry), `tags` (text[])

**Nova tabela `event_registrations_v2`** (ou alterar a existente):
- `id`, `event_id`, `church_id`, `profile_id` (uuid - qualquer membro, nao apenas criancas), `member_id` (uuid nullable - ref members), `child_id` (uuid nullable - para criancas), `guardian_id` (uuid nullable), `status` (registered/waitlisted/cancelled/checked_in/checked_out), `payment_status` (pending/paid/refunded/free), `payment_amount` (numeric), `payment_date` (timestamptz), `check_in_at` (timestamptz), `check_out_at` (timestamptz), `ticket_number` (varchar), `notes` (text), `registered_at`, `created_at`

**Nova tabela `event_attendance`** (log de presenca para metricas):
- `id`, `event_id`, `church_id`, `registration_id`, `check_in_at`, `check_out_at`, `checked_in_by` (uuid), `method` (varchar: manual/qr), `notes`

### 2. Frontend - Nova Pagina de Eventos (`/app/eventos`)

Nova pagina principal no sidebar com sub-abas:

**Aba Calendario**: Calendario visual com todos os eventos da igreja (reutilizar o componente existente, adaptado)

**Aba Dashboard de Eventos**:
- Cards: Total de eventos no mes, Total de inscritos, Taxa de presenca media, Receita de eventos
- Grafico de barras: Publico por evento (ultimos 10)
- Grafico de pizza: Distribuicao por tipo de evento
- Grafico de linha: Evolucao de publico mensal
- Grafico de barras empilhadas: Receita por evento/ministerio
- Top 5 eventos com mais publico
- Taxa de conversao inscricao -> presenca

**Aba Lista de Eventos**: Tabela com filtros (ministerio, tipo, status, periodo), acoes rapidas (editar, cancelar, ver inscritos, duplicar evento)

**Aba Inscricoes**: Visao geral de todas as inscricoes com status de pagamento

### 3. Pagina de Evento Individual (`/app/eventos/:id`)

- Detalhes do evento com banner
- Painel de inscritos com busca e filtros
- Check-in/Check-out direto na pagina do evento
- Metricas do evento especifico (inscritos vs capacidade, presentes, receita)
- Exportacao da lista de inscritos (PDF/Excel)

### 4. Pagina Publica de Inscricao (`/inscricao/:eventId`)

Quando `registration_required=true`, gerar link publico:
- Formulario de inscricao com campos configurados pelo evento
- Exibicao de vagas disponiveis
- Suporte a pagamento (integracao futura com Stripe/PIX)
- Confirmacao de inscricao com QR code

### 5. Integracao Check-in Ministerio Infantil com Eventos

- No select de eventos do CheckInPanel, popular automaticamente com eventos do dia vindos de `ministry_events` (tipo "service", "special" com ministry_id do infantil)
- Ao selecionar um evento do calendario, registrar o check-in vinculado ao `event_id`
- Adicionar coluna `event_id` a `child_check_ins` para vincular

### 6. Portal do Membro - Aba Eventos

- Adicionar aba "Eventos" no portal do membro
- Listar eventos abertos para inscricao
- Mostrar "Meus Eventos" (inscritos)
- Permitir inscricao direto do portal

### 7. Ideias Adicionais de Integracao Inteligente

- **Recorrencia Inteligente**: Eventos recorrentes (todo domingo, toda quarta) gerando automaticamente no calendario
- **Notificacoes Push**: Lembrete 24h antes do evento para inscritos
- **Certificados**: Gerar certificado de participacao para eventos de treinamento
- **Feedback pos-evento**: Formulario de avaliacao enviado apos o evento
- **QR Code de Presenca**: Gerar QR code unico por evento para check-in rapido via celular
- **Historico do Membro**: No perfil do membro, timeline de todos os eventos participados
- **Relatorios Automaticos**: Relatorio pos-evento gerado automaticamente com metricas
- **Comparativo Anual**: Dashboard comparando eventos ano a ano
- **Previsao de Publico**: Baseado em historico, sugerir capacidade ideal
- **Integracao Financeira**: Receitas de eventos aparecendo no dashboard financeiro como categoria "Eventos"

## Arquivos a Criar

| Arquivo | Descricao |
|---------|-----------|
| `src/pages/Eventos.tsx` | Pagina principal com tabs (Dashboard, Calendario, Lista, Inscricoes) |
| `src/components/events/EventDashboard.tsx` | Dashboard com graficos e metricas |
| `src/components/events/EventCalendar.tsx` | Calendario adaptado do MinistryCalendar |
| `src/components/events/EventList.tsx` | Lista com filtros e acoes |
| `src/components/events/EventDetail.tsx` | Detalhe do evento com inscritos e check-in |
| `src/components/events/EventDialog.tsx` | Dialog de criacao/edicao expandido (com preco, imagem, visibilidade) |
| `src/components/events/EventRegistrationForm.tsx` | Formulario de inscricao |
| `src/components/events/EventStatsCards.tsx` | Cards de estatisticas |
| `src/components/events/EventCharts.tsx` | Graficos de metricas |
| `src/hooks/useEvents.tsx` | Hook principal de eventos |
| `src/hooks/useEventRegistrations.tsx` | Hook de inscricoes |
| `src/hooks/useEventStats.tsx` | Hook de estatisticas |
| `src/pages/EventRegistration.tsx` | Pagina publica de inscricao |
| `src/pages/portal/PortalEvents.tsx` | Eventos no portal do membro |

## Arquivos a Modificar

| Arquivo | Alteracao |
|---------|-----------|
| `src/App.tsx` | Novas rotas `/app/eventos`, `/app/eventos/:id`, `/inscricao/:eventId`, `/portal/eventos` |
| `src/components/AppSidebar.tsx` | Adicionar "Eventos" no menu |
| `src/components/children-ministry/CheckInPanel.tsx` | Popular select com eventos do dia do banco |
| `src/components/portal/PortalLayout.tsx` | Adicionar aba Eventos |
| `src/pages/MinisterioInfantil.tsx` | Remover aba Calendario (agora e centralizado em Eventos) |

## Migracao SQL

1. Adicionar colunas a `ministry_events` (price, status, visibility, tags, etc.)
2. Alterar `event_registrations` para suportar membros alem de criancas (profile_id, payment)
3. Adicionar `event_id` a `child_check_ins`
4. Criar RLS policies adequadas
5. Criar indice em `ministry_events(church_id, start_datetime)`

## Ordem de Execucao

1. Migracao SQL (schema + RLS)
2. Hooks (`useEvents`, `useEventRegistrations`, `useEventStats`)
3. Pagina de Eventos com Dashboard + Calendario + Lista
4. Dialog de criacao expandido
5. Pagina de detalhe do evento com check-in
6. Pagina publica de inscricao
7. Integracao com CheckInPanel do infantil
8. Portal do Membro - aba Eventos
9. Sidebar e rotas

