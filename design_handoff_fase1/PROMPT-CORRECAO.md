# Prompt de correção — quando o app divergir do design aprovado

Cole tudo abaixo da linha na sessão do Claude Code (a atual ou uma nova, com a pasta do projeto aberta). Antes, copie a versão nova de `design_handoff_fase1/` para dentro do repo, substituindo a antiga.

---

Pare o desenvolvimento de novas features: o app está divergindo do design e das regras aprovadas. Não escreva código até o passo 4.

1. Releia `CLAUDE.md` e `design_handoff_fase1/README.md` (§§4–12).
2. O pacote agora tem `design_handoff_fase1/design-reference/screens/` — o protótipo fatiado por tela em arquivos pequenos (veja `INDEX.md`). Os estilos inline são a spec exata. A partir de agora é PROIBIDO implementar ou corrigir qualquer tela sem antes ler o fragmento correspondente inteiro; copie valores literais (px, hex, radius, copy em inglês) — nunca aproxime de memória.
3. Audite o app atual, tela por tela, contra o fragmento + screenshot correspondentes. Escreva `AUDIT.md` no root com TODAS as divergências (layout, espaçamento, cor, tipografia, copy, comportamento, funções faltando), agrupadas por tela e ordenadas por gravidade. Não corrija nada ainda.
4. Me mostre o `AUDIT.md` e espere minha aprovação.
5. Aprovado, corrija UMA tela por vez: reler fragmento → corrigir → `git commit` → me dizer o que validar. Só avance para a próxima tela quando eu aprovar a atual.

Regras permanentes (valem para o resto do projeto): não inventar telas, campos, copy ou "melhorias"; dúvida = pergunta; toda etapa termina com o app rodando + commit; se a sessão for compactada ou reiniciada, releia `CLAUDE.md` e o fragmento da tela em andamento antes de continuar.
