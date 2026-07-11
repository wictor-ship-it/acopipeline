# Handoff · A/CO Pipeline Intelligence — Fase 1 (Claude Code)

**Data:** 10 Jul 2026 · **Design aprovado:** `design-reference/Pipeline Intelligence v5.dc.html` (Sistema Claro / glass)

---

## 1 · Overview

A/CO Pipeline Intelligence é um CRM **agent-first** para corretores de imóveis de luxo (Miami, clientes PT/EN). O agente de IA opera — redige mensagens, agenda follow-ups, arquiva documentos, aprende campos — e o humano só **aprova**. A UI é construída em torno de filas de aprovação, não de formulários.

**As 3 leis do produto (invioláveis):**
1. Nada é enviado a um cliente sem aprovação humana.
2. Toda ação (do agente ou do usuário) gera linha imutável em `audit_log` — insert-only, nunca update/delete.
3. A última ação é sempre reversível (Undo).

**Regras de arquitetura (R1–R6):**
- **R1** — Relacionamento pertence ao **contato** (cadência, idioma, datas, mandate, preferências); a busca pertence à **opportunity** (MLS, tours, ofertas, milestones). O contato apenas espelha a busca via link. MLS vive só no deal.
- **R2** — Todo registro é uma timeline: **NOW** (o que precisa de decisão agora) → **PLAN** (playbook à frente) → **MEMORY** (o que já aconteceu).
- **R3** — Transação nunca é criada manualmente — nasce do contrato assinado.
- **R4** — O CRM se preenche sozinho (learning loop); formulários são exceção; edição é inline com auto-save.
- **R5** — Interação padrão: hover revela ações contextuais; bulk approve em filas.
- **R6** — Todo draft é gerado no idioma do contato (campo `language` — PT, EN ou ES, auto-detectado da thread).

---

## 2 · Sobre os arquivos de design

Os arquivos em `design-reference/` são **referências de design construídas em HTML** — protótipos que mostram aparência e comportamento pretendidos. **Não são código de produção para copiar.** A tarefa é **recriar estas telas em um codebase real**. Não existe codebase ainda: escolha o stack mais adequado (sugestão: React + TypeScript + Vite ou Next.js, estado local + camada de dados própria; sem UI kit de terceiros — o visual é 100% custom).

Para visualizar as referências: abra `Pipeline Intelligence v5.dc.html` no browser (o `support.js` ao lado é o runtime do protótipo — irrelevante para a implementação). Todo o markup/estilo está inline no HTML e a lógica de demo está no `<script data-dc-script>` no fim do arquivo — use-o para extrair valores exatos, copy e dados seed.

## 3 · Fidelidade

**Hi-fi.** Cores, tipografia, espaçamento, copy e interações são finais. Recrie pixel-perfect a partir do HTML de referência. A copy da UI é em inglês (exatamente como está nos arquivos).

---

## 4 · Escopo da Fase 1

Implementar o produto **como desenhado no v5**, funcionando de ponta a ponta com dados reais persistidos e integrações **mockadas atrás de adapters**.

**Dentro:**
- Todas as telas da seção 6, com navegação, filtros, sorts, filas de aprovação, inline edit + auto-save, Undo e audit log funcionais.
- Modelo de dados da seção 8, persistido (DB real ou local; decisão do dev — mas atrás de um repositório/camada de dados trocável).
- Agente **simulado**: drafts, sinais, campos aprendidos e briefs vêm de fixtures/seed (os dados do protótipo), fluindo pelas mesmas filas que o agente real usará. A interface do agente (fila de aprovação, chat, file drop) é real; o cérebro é stub — **atrás de uma interface `AgentService` que respeita o contrato da seção 12** (skills, autonomia, outcomes), para o swap pelo agente real (Claude API) ser plug-in na Fase 2.
- Integrações como **adapters com mock**: Google Workspace auth, Google Drive (1 pasta por deal/contato — registros só referenciam; uploads nunca ficam na máquina local), WhatsApp, Gmail/Calendar, IDX/MLS.
- Seed: usar os dados de demonstração do protótipo (contatos, deals, threads, transações, referrals) como fixtures.

**Fora (não bloquear na arquitetura, não implementar):**
1. Auto-status: agente move Hot/Warm/Nurturing/Won/Lost a partir de sinais e notifica com undo.
2. Autonomia graduada: após N aprovações consistentes de um tipo de ação low-risk, agente propõe regra "send without asking" (liga com Settings · Agent Autonomy).
3. Batch-apply de campos aprendidos ("5 fields learned this week — apply all ›").
4. Fluxo de teclado na fila: ⏎ approve · E edit · S skip, com auto-advance.
5. Loop real de "Next deal in line ›" (abre o próximo deal com pendências; Welcome agrega a mesma fila — aprovar lá some em todo lugar).
6. Deal heat computado por momentum (sem seed manual).
7. "Add party" cria/linka registro real em Contacts (hoje: só toast).
8. Cadências de status e tipos de contato lidos de Settings como fonte única (hoje ambos são locais na tela de contato).
9. Integrações reais, multiusuário real (além do view-as), mobile app.

---

## 5 · Shell da aplicação

- **Sidebar fixa 230px** (glass: `rgba(255,255,255,0.30)` + blur, border-right `#E3E3E3`), logo "A/CO" em Syncopate no topo. Itens: **Welcome · Intelligence · Contacts · Opportunities · Inbox · Marketing · Reports · Settings**. Item ativo = pill glass com sombra; navegação também no hover. Badge de não-lidas no Inbox. (Página Activities existe mas está **fora do nav** — acessível por links contextuais.)
- **View as (role switch)** filtra o nav: Sales Agent, Admin, Transaction Coordinator, Marketing, Referral Partner (nav vira Dashboard · Pipeline · New Referral · Collaterals).
- **Top bar** clara em toda tela (título da página; em telas de registro o título é breadcrumb "‹ voltar"). Oculta no Inbox.
- **Login:** card glass central — "Continue with Google Workspace" + email/senha, "Access is invitation-only", nota 2FA. Tagline: "Discretion is equity."
- Responsivo: sidebar vira drawer no mobile (≤ tablet: 198px). Hit targets ≥ 44px no mobile.

## 6 · Telas

Referência pixel: cada tela está no v5 sob comentários `<!-- ===== SCREEN ... ===== -->`. Resumo do papel de cada uma:

| Tela | Rota/estado | Papel |
|---|---|---|
| **Welcome** (command) | `command` | Abertura do dia: hero com stats (HOT leads, overdue, win rate…), fila agregada de aprovações e lembretes. |
| **Intelligence** | `intel` | Morning Brief do agente + sinais, aprendizados e recomendações. |
| **Contacts** | `contacts` | Diretório: tabela sort/filtro por coluna + segmentos (All/Clients/Prospects/Sphere/Partners/Vendors). |
| **Contact Detail** | `contact` | Gramática travada — ver 6.1. |
| **Opportunities** | `pipeline` | Pipeline: lista com filtros por pipeline (purchases/listings/rentals/investments/off-market) + board kanban por stage; peek lateral de deal. |
| **Deal Detail** | `deal` | Estrutura aprovada — ver 6.2. |
| **Deal Record** | `dealpage` | Ficha completa editável do deal (record/path/docs/acts, + seller quando listing): inline edit + auto-save, drop de documentos → Drive. |
| **Transactions** | `tc` | Em contrato → close: tabela In Contract (sort/filtro), detalhe com milestones. |
| **Inbox** | `inbox` | Threads (WhatsApp/e-mail) com drafts do agente na fila; modo Activity. Enviar = aprovar. |
| **Activities** | `activities` | Log/agenda (fora do nav); modal "Log" contextual de qualquer tela. |
| **Marketing** | `marketing` | Hub de campanhas/colaterais do agente. |
| **Reports** | `reports` | GCI, funil, origem de pipeline, performance. |
| **Settings** | `settings` | Perfil, equipe/roles (view-as), Agent Autonomy, cadências de status, tipos de contato, integrações. |
| **Partner Portal** | `ptdash / partner / partnernew / ptrecord / ptcollat` | Portal do parceiro de referral: dashboard, board de referrals, novo referral, registro do referral, collaterals. |
| **Partner onboarding** | modais | Registro por convite (identity, address, docs §8, licença) → criação de login. Alimenta agreement, verificação de licença e payouts — nada além. |

### 6.1 · Contact Detail — gramática travada
- **Header:** status-select (arma a cadência) + tipo + vitals com deltas **QTR/1YR** + linha de referral.
- **Segmentos:** `Profile · Now · Agent` (pills).
  - **Now** — fila do contato (itens somem ao concluir) + relationship signals + plan + memory.
  - **Agent** — chat com o agente + file drop → pasta do Drive do contato.
  - **Profile** — mandate no topo; classification com cadências preset + custom (com link "manage in Settings ›"); identity file com edit-mode que esconde campos vazios; preferences.
- Contato = relacionamento; opportunity = busca (MLS só no deal). Layout alternável "sections / full file · one scroll".

### 6.2 · Deal Detail — estrutura aprovada
Pinned hero + **5 vitals** + menu segmentado → **Now** (fila; itens somem quando resolvidos) → **Plan** único (playbook + critical path, filtros por owner) → **Memory** único (filtros) → **File** (referência, nasce colapsada).
**Regras:** ≤ 5 números above the fold · uma única fila de aprovação · nada aparece duas vezes · referência nasce colapsada.

## 7 · Interações e comportamento

- **Hover-first (R5):** ações contextuais ([+1d], [Copy], approve/edit/skip) só aparecem no hover da linha; hover de linha = `background rgba(255,255,255,0.62)`; transições 150ms.
- **Fila de aprovação:** cada item = draft do agente com Approve / Edit / Skip; aprovado ⇒ item some, entra no audit e (mock) envia; bulk approve em mensagens.
- **Undo:** toast/açāo persistente após qualquer ação destrutiva ou envio — desfaz a última ação (lei 3).
- **Inline edit + auto-save (R4):** clicar num campo edita no lugar; blur salva; sem botão "Save"; toda gravação → audit_log.
- **Audit log:** trilha visível (Settings/registro) — `actor(agent|user) · action · entity · before/after · timestamp`.
- **Documentos:** drag-and-drop em deal/contato/referral ⇒ upload para a pasta do Drive correspondente; o registro guarda só a referência (nome, tipo, tamanho, quem, quando, url). Nunca persistir no cliente.
- **Colapsos** (Now, mandates, seções File): ~300ms ease.
- **Foco de input:** `border-color #0D0D0D` — sem outline azul, sem glow.
- **Estados vazios:** frase curta + próxima ação; nunca ilustração.
- **Loading:** conteúdo aparece pronto (dados locais); skeleton só onde houver fetch real.

## 8 · Modelo de dados (mínimo Fase 1)

```
contacts(id, name, category[client|prospect|sphere|partner|vendor], status[hot|warm|nurturing|won|lost],
  phone, email, language[], spouse, company, title, linkedin, birthday,
  preferences json, pinned json, source, referral_of, since)
mandates(id, contact_id, text, active, updated_at)
opportunities(id, contact_id, pipeline[purchases|listings|rentals|investments|offmarket],
  stage, budget, probability, next_action, next_due, search_criteria json, heat)
transactions(id, opportunity_id, status, milestones json, close_date, gci)   -- só via contrato (R3)
activities(id, contact_id, opportunity_id, type[call|whatsapp|email|showing|note|task], body,
  outcome[advanced|neutral|cooled], due, done, source)
threads(id, contact_id, channel[whatsapp|email], unread) / messages(id, thread_id, dir, body, status, at)
drafts(id, target(contact|deal), channel, body, language, status[pending|approved|edited|skipped])
documents(id, entity(contact|deal|referral), drive_ref, name, type, size, uploaded_by, at)
referrals(id, partner_id, client, stage, fee_pct, agreement_status, payout_status)
audit_log(id, actor[agent|user], skill, action, entity, before json, after json, created_at)
  -- insert-only · retenção 7 anos · rollback de ação por 30 dias (Agent Ledger)
settings(cadences json, contact_types json, autonomy_rules json, team json)
  -- matriz de autonomia é lida daqui em runtime — nunca hard-coded (Settings §03)
vault(contact_id, fields json)  -- cofre privado: economia de comissões, notas sensíveis, docs de
  identidade — visível só ao Principal; nenhum output do agente pode usá-lo
```

- Estado de UI por tela: filtros/sorts, tab ativa, colapsos, fila (itens pendentes por registro), undo stack (última ação), toasts.
- Cadências por status e tipos de contato devem ser **modelados em Settings** desde já (mesmo que a tela de contato ainda use presets locais) — item 8 do backlog depende disso.

## 9 · Design tokens

**Cor** (nada fora desta lista):
- Fundo global `#ECE9E2` · tinta `#0D0D0D` · corpo `#303030`
- Cinzas `#5D5D5D` (secundário) · `#8F8F8F` (meta) · `#B8B8B8` (hint) · nav idle `#4A4A46`
- Bordas `#E3E3E3` (padrão 1px) · `#D9D9D9` (inputs/chips/scrollbar)
- Branco `#FFFFFF` só dentro de vidro/botões
- Acentos: verde agente `#10A37F` · risco `#D0342C` · overdue suave `#E0655C`
- Proibido: gradientes, sombras coloridas, emojis, azul/roxo/laranja, cores de status além dos acentos.

**Tipografia:**
- Marca: `'Syncopate'` (Google Fonts) — SÓ no logo "A/CO" e headers de página (uppercase, letter-spacing largo).
- Resto: `system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif`. Weights 400/500/600.
- Escala 8.5–15px (labels uppercase 8.5–11px com ls 0.06–0.28em); nada > 22px exceto números-hero. line-height corpo 1.55–1.65.

**Superfícies (glass sobre claro):**
- Card: `rgba(255,255,255,0.42)` + `backdrop-filter: blur(22–26px) saturate(1.6–1.7)` + border `1px #E3E3E3` ou `rgba(255,255,255,0.7)` + radius 12px + `inset 0 1px 0 rgba(255,255,255,0.8)`.
- Sticky bars de registro: `rgba(252,252,251,0.82)` + blur(26px).
- Modal: `rgba(255,255,255,0.5–0.55)` + blur(26–30px), radius 20px, overlay escuro suave.
- Tabelas/listas: containers de canto reto, border `#E3E3E3`; header `rgba(236,236,236,0.55)`, uppercase 10px `#8F8F8F`; linha `padding 16px 22px` + border-bottom.
- Botões: pill 999px — primário `#0D0D0D`/branco (ou dark-glass `rgba(22,22,21,0.60)` + blur); secundário `#E9E8E4` border `#E0DFDA`; terciário outline `#E3E3E3`. Chips: pill border `#D9D9D9`, 11.5px.
- Avisos: border `#E3E3E3` + border-left 2px na cor semântica + dot 6px — nunca fundo colorido.
- Separador de metadados: `·` (meio-ponto). Scrollbar 8px thumb `#D9D9D9`.

## 10 · Assets

- Fonte Google `Syncopate` (400/700).
- Ícone Google (SVG oficial multicolor) no botão de login — única arte colorida permitida.
- Sem imagens/ilustrações; avatares = iniciais.

## 11 · Arquivos deste pacote

- `README.md` — este documento.
- `CLAUDE.md` — instruções prontas para o root do repo de implementação.
- `PROMPT-INICIAL.md` — prompt pronto para colar na primeira sessão do Claude Code.
- `design-reference/Pipeline Intelligence v5.dc.html` — **fonte da verdade** (todas as telas; abra no browser).
- `design-reference/Deal Detail v5 - Proposta.dc.html` — proposta aprovada do deal page (racional da estrutura Now/Plan/Memory/File).
- `design-reference/A-CO Agent Prompt Architecture.dc.html` — **spec do agente** (seção 12; abra no browser).
- `design-reference/support.js` — runtime do protótipo (só para abrir os HTML; não portar).
- `screenshots/` — capturas das telas principais do v5 (referência rápida; o pixel-perfect vem do HTML).

## 12 · Agente — spec de execução

Fonte: `design-reference/A-CO Agent Prompt Architecture.dc.html` (System Prompt Suite v1.0 — prompts prontos para Claude API). Resumo do contrato que a **Fase 1 já precisa respeitar** (mesmo com o agente mockado):

- **Um agente, quatro skills** sobre uma base comum: 01 System Core (sempre carregado) · 02 Chief of Staff (o dia: morning brief 6AM, Touch Today, one-tap day, sequences, aging escalation, end-of-day wrap) · 03 Senior Advisor (a relação: drafts em par soft/direct na voz do Principal, probability arbitrage, dossê pré-reunião, plays, MLS match) · 04 Transaction Coordinator (o contrato: milestones T-3, intake de documentos com fontes+confiança, grupos WhatsApp por transação, chase de vendors com escalação, vendor scorecard) · 05 Compliance (transversal, roda antes de qualquer ação: cofre privado, higiene de dados, relógios regulatórios 1031/escrow/licenças, dono do audit ledger, LGPD/CCPA export).
- **Roteamento por contexto**; conflito → base vence; dúvida → fila *Needs Your Decision*; Compliance pode bloquear qualquer skill.
- **Matriz de autonomia lida de Settings §03 em runtime** (nunca hard-coded). Default Fase 1 — autônomo: capturar/estruturar comunicação, higiene de dados, preparar drafts, cobrar vendors; aprovação obrigatória: qualquer envio a cliente, mudança de status de lead, compromissos em nome do Principal. Expansão de autonomia só por histórico auditado (90 dias sem erro).
- **Voz:** curta, declarativa, específica; palavras proibidas da Constitution ("ultra-luxury", "world-class", "exclusive", "iconic", "state-of-the-art", "best-in-class", "premier", "bespoke"); zero exclamação/emoji; idioma por contato (PT/EN/ES); toda afirmação referencia registro ou é marcada como inferência; convicção sinalizada (alta/média/baixa).
- **Audit:** toda ação de toda skill no Agent Ledger — 7 anos de retenção, rollback 30 dias; nunca apaga registro, arquiva. Toque inbound reseta o relógio de cadência automaticamente.
- **Implicação Fase 1:** o mock `AgentService` produz itens tipados por skill (brief, draft-par, milestone alert, learned field, compliance block) e consome os mesmos toggles de Settings; os prompts do doc só entram quando o agente real for ligado (Fase 2+). Governance: prompts versionados como release; deploy aprovado por Wictor + Senior AI Engineer.

**Critérios de aceite da Fase 1:** todas as telas navegáveis com dados seed persistidos; sort/filtro funcionam em todas as colunas; filas de aprovação com approve/edit/skip + Undo; toda mutação gera linha em audit_log; inline edit com auto-save; drop de arquivo referencia pasta Drive (mock); QA visual tela a tela contra o v5 (tokens da seção 9).
