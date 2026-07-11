# Prompt inicial — cole isto na primeira sessão do Claude Code

Copie tudo abaixo da linha e cole no Claude Code (com a pasta do projeto aberta).

---

Leia primeiro, sem escrever código:
1. `CLAUDE.md` (raiz do repo)
2. `design_handoff_fase1/README.md` — inteiro

Contexto: este repo está vazio exceto pelo pacote de handoff. A tarefa é implementar a **Fase 1** do A/CO Pipeline Intelligence conforme o README (seções 4–12). A fonte da verdade visual é `design_handoff_fase1/design-reference/Pipeline Intelligence v5.dc.html` — protótipo HTML para recriar pixel-perfect; **nunca** copiar seu código para produção.

## Passo 1 — Plano (não codar ainda)
- Proponha o stack (sugestão do README: React + TypeScript + Vite, sem UI kit de terceiros — visual 100% custom) e a estrutura de pastas.
- Proponha a ordem de implementação em etapas pequenas; cada etapa termina com o app rodando e commitado no git. Sugestão de ordem:
  1. Scaffold + design tokens (README §9) + shell: sidebar, top bar, login, view-as (README §5)
  2. Camada de dados persistida + seed extraído do protótipo + `audit_log` + Undo (§8, leis 2–3)
  3. `AgentService` mock respeitando o contrato do agente (§12)
  4. Telas, uma por etapa: Welcome → Contacts → Contact Detail → Opportunities → Deal Detail → Deal Record → Transactions → Inbox → Intelligence → Activities → Marketing → Reports → Settings → Partner Portal (§6)
- Liste agora suas dúvidas e ambiguidades.
- **Espere minha aprovação do plano antes de escrever código.**

## Regras permanentes da sessão
- Ao fim de cada etapa: faça `git commit`, me diga o comando para rodar o app e o que validar visualmente.
- Pixel-perfect contra o v5 (tokens do §9); `design_handoff_fase1/screenshots/` é referência rápida.
- Se o design for ambíguo, pergunte — não invente telas, campos nem conteúdo.
- O backlog "Fora de escopo" (§4) não deve ser implementado, mas a arquitetura não pode bloqueá-lo.
- Os critérios de aceite no fim do README definem o que é "pronto".
