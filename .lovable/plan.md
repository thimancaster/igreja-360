

# Plano de Implementacao - Expansao do Ministerio Infantil

## Visao Geral

Este plano aborda a implementacao de **17 novas funcionalidades** para o modulo de Ministerio Infantil (Kids Ministry), organizadas em **5 Sprints** de desenvolvimento. As funcionalidades estao agrupadas por prioridade e dependencias tecnicas.

---

## Arquitetura Atual

O sistema ja possui:
- Modulo `MinisterioInfantil` com abas (Dashboard, Criancas, Responsaveis, Check-in, Check-out)
- Portal de Pais (`/parent/*`) com layout dedicado
- Sistema de autorizacoes temporarias (`pickup_authorizations`)
- Check-in/out com QR Code
- Hooks customizados (`useChildrenMinistry`, `useParentData`)
- PWA configurado com manifest e service worker
- Push notifications via VAPID keys

---

## Sprint 1: Comunicacao e Calendario (3-4 dias)

### 1.1 Comunicados para Pais

**Tabela `announcements`**
```text
id, church_id, ministry_id, title, content, 
priority (normal/urgent), target_audience (all/classroom/specific_children),
target_classrooms (text[]), scheduled_at, published_at, 
created_by, created_at, updated_at
```

**Tabela `announcement_reads`**
```text
id, announcement_id, user_id, read_at
```

**Componentes**
- `AnnouncementsPanel.tsx` - Lista/cria comunicados (staff)
- `AnnouncementDialog.tsx` - Modal de criacao/edicao
- `ParentAnnouncements.tsx` - Visualizacao para pais

**Integracao**
- Nova aba "Comunicados" no MinisterioInfantil
- Nova pagina `/parent/announcements`
- Edge function para enviar push notifications automaticas

### 1.2 Calendario de Eventos

**Tabela `ministry_events`**
```text
id, church_id, ministry_id, title, description,
event_type (service/special/activity/meeting),
start_datetime, end_datetime, all_day,
location, recurring (boolean), recurrence_rule,
max_capacity, registration_required,
created_by, created_at, updated_at
```

**Tabela `event_registrations`**
```text
id, event_id, child_id, guardian_id,
status (registered/waitlisted/cancelled),
registered_at, notes
```

**Componentes**
- `MinistryCalendar.tsx` - Visualizacao calendario mensal/semanal
- `EventDialog.tsx` - CRUD de eventos
- `EventDetails.tsx` - Detalhes e inscricoes
- Nova aba "Calendario" no MinisterioInfantil

---

## Sprint 2: Gestao de Capacidade e Equipe (3-4 dias)

### 2.1 Lista de Espera e Controle de Capacidade

**Tabela `classroom_settings`**
```text
id, church_id, classroom_name, 
max_capacity, min_age_months, max_age_months,
ratio_children_per_adult, is_active,
created_at, updated_at
```

**Tabela `waitlist`**
```text
id, church_id, child_id, classroom,
position, requested_at, status (waiting/notified/enrolled/expired),
notes, notified_at
```

**Componentes**
- `ClassroomCapacityManager.tsx` - Configuracao de salas
- `WaitlistPanel.tsx` - Gerenciamento de fila
- `CapacityIndicator.tsx` - Badge visual de ocupacao

**Logica**
- Check-in bloqueia quando sala atinge capacidade
- Notificacao automatica quando vaga disponivel

### 2.2 Escala de Professores/Auxiliares

**Tabela `ministry_staff`**
```text
id, church_id, profile_id, full_name, email, phone,
role (teacher/assistant/coordinator),
trained_classrooms (text[]), is_active,
background_check_date, certifications,
created_at, updated_at
```

**Tabela `staff_schedules`**
```text
id, church_id, staff_id, event_id,
classroom, shift_start, shift_end,
role (primary/backup),
confirmed (boolean), confirmed_at,
created_at, updated_at
```

**Componentes**
- `StaffList.tsx` - Cadastro de voluntarios
- `StaffScheduler.tsx` - Calendario de escalas
- `ScheduleConflictDetector.tsx` - Validacao de conflitos
- Nova aba "Equipe" no MinisterioInfantil

---

## Sprint 3: Saude e Documentacao (4-5 dias)

### 3.1 Controle de Medicacao

**Tabela `medication_records`**
```text
id, child_id, medication_name, dosage, 
frequency, instructions, 
authorized_by_guardian_id, authorization_date,
start_date, end_date, is_active,
prescription_url, 
created_at, updated_at
```

**Tabela `medication_logs`**
```text
id, medication_record_id, administered_at,
administered_by, dosage_given,
notes, witness_staff_id,
created_at
```

**Componentes**
- `MedicationPanel.tsx` - Lista de medicacoes por crianca
- `MedicationDialog.tsx` - Cadastro com upload de receita
- `MedicationScheduleCard.tsx` - Alertas de horarios
- `MedicationLogDialog.tsx` - Registro de administracao

**Seguranca**
- Requer assinatura digital do responsavel
- Armazenamento seguro de receitas (storage bucket `prescriptions`)
- Log de auditoria para cada administracao

### 3.2 Fichas de Anamnese

**Tabela `medical_history`**
```text
id, child_id, blood_type, 
chronic_conditions, past_surgeries,
immunizations_up_to_date, immunization_notes,
pediatrician_name, pediatrician_phone,
hospital_preference, health_insurance,
additional_notes, 
last_updated_by, last_updated_at,
created_at, updated_at
```

**Componentes**
- `MedicalHistoryForm.tsx` - Formulario completo de anamnese
- `MedicalHistoryView.tsx` - Visualizacao rapida para staff
- `HealthAlertsCard.tsx` - Resumo de alertas medicos

### 3.3 Registro de Incidentes

**Tabela `incident_reports`**
```text
id, church_id, child_id, check_in_id,
incident_type (injury/behavior/illness/other),
severity (minor/moderate/severe),
description, location, 
witnesses (text[]), actions_taken,
first_aid_given, medical_attention_needed,
reported_by, reported_at,
guardian_notified, guardian_notified_at, notified_by,
guardian_signature_url, guardian_acknowledged_at,
follow_up_required, follow_up_notes, follow_up_date,
created_at, updated_at
```

**Componentes**
- `IncidentReportDialog.tsx` - Formulario de registro
- `IncidentsList.tsx` - Historico de ocorrencias
- `IncidentDetails.tsx` - Visualizacao completa
- `ParentIncidentNotification.tsx` - Notificacao para pais

**Fluxo**
1. Staff registra incidente
2. Sistema envia push notification ao responsavel
3. Responsavel visualiza e assina digitalmente
4. Registro fica no historico da crianca

### 3.4 Notificacoes de Emergencia

**Edge Function `emergency-notification`**
- Disparo em massa para todos os responsaveis de criancas presentes
- Integracao com push notifications
- Preparacao para WhatsApp (Sprint 5)

**Componentes**
- `EmergencyAlertButton.tsx` - Botao de emergencia (staff)
- `EmergencyAlertDialog.tsx` - Configuracao de mensagem
- `EmergencyStatusBanner.tsx` - Indicador visual

---

## Sprint 4: PWA Separado para Pais (3-4 dias)

### 4.1 Manifest Dedicado

**Arquivo `public/parent-manifest.json`**
- Nome: "Igreja360 Pais"
- Start URL: `/parent`
- Cores e icones diferenciados
- Shortcuts para acoes rapidas

### 4.2 Service Worker Otimizado

**Arquivo `public/parent-sw.js`**
- Cache offline das paginas do portal
- Background sync para autorizacoes
- Gerenciamento de push notifications

### 4.3 Pagina de Instalacao

**Componente `ParentInstallPage.tsx`**
- Rota `/parent/install`
- Instrucoes visuais para iOS e Android
- QR Code para compartilhar link

### 4.4 Experiencia Otimizada

**Melhorias no Portal**
- Gestos de swipe para navegacao
- Pull-to-refresh nos dados
- Skeleton loading states
- Modo offline com dados cacheados
- Deep links para autorizacoes

---

## Sprint 5: Integracoes Avancadas (5-7 dias)

### 5.1 Integracao WhatsApp

**Arquitetura**
- Conector via Twilio API ou Meta Business API
- Secret: `WHATSAPP_API_KEY`

**Edge Function `send-whatsapp`**
```text
- Valida autenticacao e rate limiting
- Envia mensagem template aprovada
- Registra log de envio
```

**Tabela `whatsapp_message_logs`**
```text
id, church_id, recipient_phone, template_name,
status (sent/delivered/read/failed),
external_message_id, sent_at, 
error_message, created_at
```

**Casos de Uso**
- Check-in/out confirmacao
- Incidentes (notificacao imediata)
- Comunicados urgentes
- Lembretes de eventos

### 5.2 Reconhecimento Facial (Preparacao)

**Arquitetura**
- Integracao com AWS Rekognition ou Google Cloud Vision
- Armazenamento seguro de face encodings

**Tabela `face_encodings`**
```text
id, person_type (child/guardian),
person_id, encoding_data (bytea),
created_at, updated_at
```

**Componentes**
- `FaceRegistrationCamera.tsx` - Captura de faces
- `FaceValidationPanel.tsx` - Validacao biometrica
- `FaceSecuritySettings.tsx` - Configuracoes (admin)

**Fluxo**
1. Cadastro: captura e armazena encoding
2. Check-out: camera compara face ao vivo
3. Match com threshold de seguranca

### 5.3 Edge Function para AI Vision

**Edge Function `face-recognition`**
```text
- Recebe imagem base64
- Chama API de reconhecimento
- Retorna match confidence
```

---

## Resumo de Componentes por Sprint

### Sprint 1
```text
src/components/children-ministry/
  announcements/
    AnnouncementsPanel.tsx
    AnnouncementDialog.tsx
  calendar/
    MinistryCalendar.tsx
    EventDialog.tsx
    EventDetails.tsx

src/pages/parent/
  ParentAnnouncements.tsx
```

### Sprint 2
```text
src/components/children-ministry/
  capacity/
    ClassroomCapacityManager.tsx
    WaitlistPanel.tsx
    CapacityIndicator.tsx
  staff/
    StaffList.tsx
    StaffDialog.tsx
    StaffScheduler.tsx
    ScheduleConflictDetector.tsx
```

### Sprint 3
```text
src/components/children-ministry/
  health/
    MedicationPanel.tsx
    MedicationDialog.tsx
    MedicationScheduleCard.tsx
    MedicationLogDialog.tsx
    MedicalHistoryForm.tsx
    MedicalHistoryView.tsx
    HealthAlertsCard.tsx
  incidents/
    IncidentReportDialog.tsx
    IncidentsList.tsx
    IncidentDetails.tsx
    ParentIncidentNotification.tsx
  emergency/
    EmergencyAlertButton.tsx
    EmergencyAlertDialog.tsx
    EmergencyStatusBanner.tsx
```

### Sprint 4
```text
src/components/parent/
  ParentInstallPage.tsx
  OfflineIndicator.tsx
  PullToRefresh.tsx

public/
  parent-manifest.json
  parent-sw.js
```

### Sprint 5
```text
src/components/children-ministry/
  whatsapp/
    WhatsAppSettings.tsx
    MessageTemplateManager.tsx
  biometrics/
    FaceRegistrationCamera.tsx
    FaceValidationPanel.tsx
    FaceSecuritySettings.tsx

supabase/functions/
  send-whatsapp/
  face-recognition/
```

---

## Novas Tabelas (Resumo)

| Sprint | Tabela | Proposito |
|--------|--------|-----------|
| 1 | announcements | Comunicados |
| 1 | announcement_reads | Leitura de comunicados |
| 1 | ministry_events | Calendario de eventos |
| 1 | event_registrations | Inscricoes em eventos |
| 2 | classroom_settings | Capacidade por sala |
| 2 | waitlist | Lista de espera |
| 2 | ministry_staff | Equipe/voluntarios |
| 2 | staff_schedules | Escalas |
| 3 | medication_records | Medicacoes |
| 3 | medication_logs | Administracao de medicamentos |
| 3 | medical_history | Anamnese |
| 3 | incident_reports | Ocorrencias |
| 5 | whatsapp_message_logs | Logs de WhatsApp |
| 5 | face_encodings | Dados biometricos |

---

## Novas Abas no MinisterioInfantil

```text
Apos implementacao completa:
1. Dashboard (existente)
2. Criancas (existente)
3. Responsaveis (existente)
4. Equipe (Sprint 2) - staff e escalas
5. Calendario (Sprint 1) - eventos
6. Comunicados (Sprint 1) - anuncios
7. Saude (Sprint 3) - medicacoes e anamnese
8. Incidentes (Sprint 3) - ocorrencias
9. Check-in (existente)
10. Check-out (existente)
```

---

## Novas Rotas

```text
# Staff
/app/ministerio-infantil (abas expandidas)

# Parent Portal
/parent/announcements
/parent/events
/parent/install
/parent/children/:id/health
/parent/children/:id/incidents
```

---

## Dependencias Externas

| Funcionalidade | Servico | Custo Estimado |
|----------------|---------|----------------|
| WhatsApp | Twilio/Meta Business | ~$0.005-0.05/msg |
| Face Recognition | AWS Rekognition | ~$1/1000 imagens |

---

## Consideracoes de Seguranca

1. **Dados de Saude (LGPD)**
   - Criptografia em repouso
   - RLS restritivo (admin/pastor/tesoureiro + guardian proprio)
   - Logs de acesso

2. **Dados Biometricos**
   - Consentimento explicito
   - Armazenamento criptografado
   - Direito a exclusao

3. **WhatsApp**
   - Templates pre-aprovados
   - Opt-in do usuario
   - Rate limiting

---

## Ordem de Implementacao Sugerida

1. **Sprint 1** - Base de comunicacao
2. **Sprint 2** - Operacional (escalas/capacidade)
3. **Sprint 3** - Seguranca e saude (critico para operacao)
4. **Sprint 4** - UX para pais
5. **Sprint 5** - Integracoes avancadas

Tempo total estimado: **18-24 dias de desenvolvimento**

