# Prompt inicial — cole isto na primeira sessão do Claude Code

Copie tudo abaixo da linha e cole no Claude Code (com a pasta do projeto aberta).

---

Leia primeiro, sem escrever código:
1. `CLAUDE.md` (raiz do repo)
2. `design_handoff_fase1/README.md` — inteiro
3. `design_handoff_fase1/design-reference/screens/INDEX.md`

Contexto: este repo está vazio exceto pelo pacote de handoff. A tarefa é implementar a **Fase 1** do A/CO Pipeline Intelligence conforme o README (seções 4–12). A fonte da verdade visual é o protótipo v5, fatiado por tela em `design_handoff_fase1/design-reference/screens/` — arquivos pequenos com estilos inline que são a spec exata. **Nunca** copiar código do protótipo para produção; recriar no stack do repo.

## Passo 1 — Plano (não codar ainda)
- Proponha o stack (sugestão do README: React + TypeScript + Vite, sem UI kit de terceiros — visual 100% custom) e a estrutura de pastas.
- Proponha a ordem de implementação em etapas pequenas; cada etapa termina com o app rodando e commitado no git. Sugestão de ordem:
  1. Scaffold + design tokens (README §9) + shell: sidebar, top bar, login, view-as (fragmento `00-shell-...`)
  2. Camada de dados persistida + seed extraído de `design-reference/logic-and-data.js` + `audit_log` + Undo (§8, leis 2–3)
  3. `AgentService` mock respeitando o contrato do agente (§12)
  4. Telas, uma por etapa, seguindo os fragmentos de `screens/`
- Liste agora suas dúvidas e ambiguidades.
- **Espere minha aprovação do plano antes de escrever código.**

## Loop obrigatório por tela
1. Ler o fragmento INTEIRO em `screens/` (e o screenshot correspondente em `screenshots/`, se existir).
2. Implementar copiando valores literais dos estilos inline (px, hex, radius, sombras) e o copy exato em inglês. É proibido implementar de memória ou "aproximar".
3. Rodar o app, me dizer o que validar visualmente, `git commit`.
4. Esperar minha aprovação antes da próxima tela.

## Regras permanentes da sessão
- Se o design for ambíguo, pergunte — não invente telas, campos, copy nem "melhorias".
- Se a sessão for compactada ou reiniciada, releia `CLAUDE.md` e o fragmento da tela em andamento antes de continuar.
- O backlog "Fora de escopo" (§4) não deve ser implementado, mas a arquitetura não pode bloqueá-lo.
- Os critérios de aceite no fim do README definem o que é "pronto".
