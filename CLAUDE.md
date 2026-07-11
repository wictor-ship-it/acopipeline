# CLAUDE.md — A/CO Pipeline Intelligence (implementação)

Coloque este arquivo no root do repo. Leia `design_handoff_fase1/README.md` inteiro antes de qualquer código.

## O que é
CRM agent-first para corretor de imóveis de luxo (Miami, clientes PT/EN). O agente de IA opera; o humano aprova. A UI é feita de filas de aprovação, não de formulários.

## Fonte da verdade
`design_handoff_fase1/design-reference/Pipeline Intelligence v5.dc.html` — protótipo hi-fi em HTML. Recriar **pixel-perfect** no stack do repo; nunca copiar o HTML/JS do protótipo para produção. Copy da UI em inglês, exatamente como no protótipo. Dados de demo do protótipo = fixtures de seed.

## Leis invioláveis
1. Nada é enviado a cliente sem aprovação humana.
2. Toda mutação gera linha em `audit_log` — insert-only, nunca update/delete.
3. A última ação é sempre reversível (Undo).

## Regras de arquitetura
- R1 · Relacionamento pertence ao contato; a busca pertence à opportunity (MLS só no deal). Contato espelha a busca via link.
- R2 · Todo registro é timeline: NOW → PLAN → MEMORY.
- R3 · Transação nunca é criada manualmente — nasce do contrato assinado.
- R4 · O CRM se preenche sozinho; formulários são exceção; edição inline com auto-save.
- R5 · Hover revela ações; bulk approve em filas.
- R6 · Drafts sempre no idioma do contato (`language` — PT/EN/ES, auto-detectado da thread).

## Regras de tela (travadas — não "melhorar")
- Deal Detail: pinned hero + 5 vitals + menu segmentado → Now → Plan único → Memory único → File colapsado. ≤5 números above the fold; uma única fila; nada aparece duas vezes.
- Contact Detail: header status-select + tipo + vitals QTR/1YR + referral line; segmentos Profile · Now · Agent. Activities fora do nav.
- Documentos: drag-and-drop → pasta Google Drive do registro (adapter mock na Fase 1); o banco guarda só referência. Upload nunca fica no cliente.

## Visual (lei)
Fundo `#ECE9E2` · tinta `#0D0D0D` · cinzas `#5D5D5D`/`#8F8F8F`/`#B8B8B8` · bordas `#E3E3E3`/`#D9D9D9` · acentos só `#10A37F` (agente) e `#D0342C` (risco). Glass: `rgba(255,255,255,0.42)` + blur 22–26px, radius 12; pills 999px; tabelas canto reto. Syncopate só no logo/headers; resto system-ui. Sem gradientes, emojis, azul/roxo/laranja, ilustrações.

## Agente (spec: `design_handoff_fase1/design-reference/A-CO Agent Prompt Architecture.dc.html`)
Um agente, 4 skills (Chief of Staff · Senior Advisor · Transaction Coordinator · Compliance) sobre um System Core. Matriz de autonomia lida de **Settings §03 em runtime**, nunca hard-coded. Dúvida → fila *Needs Your Decision*. Agent Ledger: 7 anos de retenção, rollback 30 dias. Cofre privado visível só ao Principal — nenhum output do agente pode usá-lo. Voz sem superlativos proibidos, sem exclamação/emoji; convicção sinalizada. Na Fase 1 o agente é mock atrás de `AgentService` com itens tipados por skill; os prompts do doc entram na Fase 2+ via Claude API.

## Fase 1
Todas as telas do v5 funcionando com dados persistidos; integrações (Google auth, Drive, WhatsApp, Gmail/Calendar, MLS) **mockadas atrás de adapters**; agente simulado por fixtures passando pelas filas reais. O backlog da Fase 2 (auto-status, autonomia graduada, batch-apply, teclado ⏎/E/S, next-deal loop, heat por momentum, party→Contacts, cadências/tipos em Settings) está FORA — mas não pode ser bloqueado pela arquitetura.

## Critérios de aceite
Sort/filtro em todas as colunas · approve/edit/skip + Undo em todas as filas · toda mutação em audit_log · inline edit auto-save · file drop referencia Drive (mock) · QA visual tela a tela contra o v5.
