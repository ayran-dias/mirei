---
estudo: felicia-credito
autor: Ayran Dias
data_criacao: 2026-05-20
baseado_em: null
skills_usadas: [novo-estudo]
queries_criadas: 12
queries_do_catalogo_reutilizadas: 0
inputs_recebidos: 10
sumario: "Mesa Banco @v273: Felicia 360 + Enterprise + GM + Simulador K-Giro + Repositorio de Estudos. Credito Lifetime VP resolvido (fix mount + aux tables docs+npv, zero cross-project). Monitor com pagina por usuario. GTM analytics. Doc Carteiras. Infra BQ: docs_enterprise/gm (seg-qua-sex), npv_kgiro_por_documento (toda seg), resumo_conta_historico_company (todo dom). IAM Secret Manager resolvido."
tags: [credito, adquirencia, dashboard, google-apps-script, vida-economica, bundle, tomada-decisao, react, recharts, bigquery]
revisado_por: null
status: concluido
---

## Objetivo

Construir a dashboard "Felícia Crédito" em Google Apps Script para consolidar a visão econômica completa do cliente Stone — combinando adquirência e crédito numa única interface de tomada de decisão. O problema central é que hoje não existe uma métrica unificada para avaliar a vida econômica do cliente que possui ambos os produtos, dificultando decisões de pricing, retenção e cross-sell.

## Inputs recebidos

1. **`query-npv-credito-por-documento-finch.sql`** — Fonte: Finch (via Bazetti). Query de rentabilidade de crédito K Giro por documento (CNPJ). Métricas a valor presente: NII (receita juros - funding - capital), Risk Adj NII (NII - PDD), NPV (Risk Adj NII - opex - CAC). Lifetime: soma todos os contratos do documento. Tabelas: `credit_pricing.npv_kgiro` + `credit_portfolio`. Exemplo validado: doc 15327458000127 → NII R$881, Risk Adj NII -R$2.887, NPV -R$3.945

2. **`query-base-felicia-looker.sql`** — Query do dashboard Felícia atual (Looker Studio). Lê tabela materializada `Dias_Credit.base_felicia`. Seções: Status da Conta (KYC, rating), Oferta safra atual (limites KGiro/Cartão/GFacil), Demais Ofertas (histórico), Cartão (limites, atraso), Desembolso (contratos individuais com taxa, parcelas, atraso)

3. **`status crédito/` (prints)** — 2 screenshots do dash Felícia atual para o doc 15327458000127. Mostra: 3 contratos KGiro (R$26k + R$8,6k + R$6,5k ≈ R$41k total), cartão com limite R$1 e atraso 31-60d, contrato set/24 com atraso 15-30d

4. **`dicionario-base-felicia.md`** — Mapeamento completo das 39 colunas da base_felicia para as seções do dash (Status Conta, Oferta safra atual, Demais Ofertas, Cartão, Desembolso). Validado com doc 15327458000127

5. **`query-popula-base-felicia.sql`** — Scheduled query diária que faz CREATE OR REPLACE da base_felicia. 7 CTEs: base (universo CNPJs via monitoramento + negociações), carteira (limites/ofertas), kyc (banking_core), cartao (portfolio_cartoes), propostas (negociações), rating (último rating), proposta_ativa (credit_portfolio). Tudo LEFT JOIN sobre base

6. **`query-pnl-adquirencia-por-documento.sql`** — PnL de adquirência por documento/mês da `PnL_Dashs_part`. Métricas: GMV, TPV Cartão, TPV PIX, Net MDR, Floating, Aluguel, Margem RAV, Receita TED/PIX, Receita Net COF, COGs, Margem. Todas com % sobre GMV

7. **`felicia-adquirencia/` (4+1 prints)** — Screenshots do dash Felícia atual (lado adquirência) + card adquirencia.jpg (tabela detalhada mensal com todas as colunas)

8. **`simuladores/2026-05-19 - DataRequest - Polos- v3.xlsm`** — Simulador principal da mesa de pricing (Polos v3). 60 sheets. PnL na sheet "DataRequest" (E37:I74): Payments Físico + Banking + Digital + Total

9. **`simuladores/Modelo_Precos_Minimos_v226_BRANCH_17.xlsb`** — Modelo de Preços Mínimos com projeção M0-M60. Motor Adq_Banking: NPV, LTV, CAC, Payback, TIR. Aba Credito: projeção de carteira, PDD, receita juros, funding

10. **Prints adicionais** — card adquirencia.jpg usado como referência para o componente CardAdquirencia

## Achados

### Mapa de fontes consolidado

| Dimensão | Fonte | Grão | O que traz |
|----------|-------|------|------------|
| **Adquirência — Realizado** | `PnL_Dashs_part` | doc × mês | GMV, TPV, Net MDR, RAV, Aluguel, Floating, Pix, Gateway, COGs, Margem |
| **Adquirência — Projetado** | Motor Adq_Banking (Modelo Preços Mínimos) | doc × M0-M60 | Curvas retenção, NPV, LTV, CAC, Payback, TIR, Margem acumulada |
| **Adquirência — Aprovação** | DataRequest (Polos v3) | snapshot por deal | PnL estático (Receita, Lucro Bruto) por produto |
| **Crédito — Status** | `base_felicia` (7 CTEs) | doc × oferta | KYC, ofertas, cartão, desembolsos, atraso |
| **Crédito — Rentabilidade** | `credit_pricing.npv_kgiro` (Finch) | doc (lifetime) | NII, Risk Adj NII, NPV — fluxo de caixa descontado |
| **Crédito — Projetado** | `npv_kgiro` por reference_date | doc × mês | Receita juros, funding, capital, PDD, NII, net_cf mensal |
| **Cadastral** | `base_felicia` + `PnL_Dashs_part` | doc | Nome, SC, MCC, Canal, Regional, Polo, Rating |

### npv_kgiro tem granularidade mensal

Validado que `npv_kgiro` tem campo `reference_date` e `t` (período), permitindo série temporal por loanid. Para doc 15327458000127: 80 meses (set/24 a abr/31). Isso viabiliza o fluxo de caixa lado a lado crédito × adquirência no mesmo eixo temporal.

## Queries utilizadas

### Backend GAS — Code.gs (5 funções)

| Função | Fonte BQ | O que retorna |
|--------|----------|---------------|
| `getStatusCredito(doc)` | `Dias_Credit.base_felicia` | Status KYC, rating, ofertas, cartão, desembolsos |
| `getNpvCredito(doc)` | `credit_pricing.npv_kgiro` + `credit_portfolio` | NII, Risk Adj NII, NPV (lifetime VP) |
| `getPnlAdquirencia(doc)` | `Dias_PnL.PnL_Dashs_part` | Série mensal (12m): TPV, NetMDR, Floating, Aluguel, RAV, TED, Pix, Gateway, Rcta NetCOF, COGs, Margem + todos os % |
| `getFluxoCreditoMensal(doc)` | `credit_pricing.npv_kgiro` + `credit_portfolio` | Série mensal: receita juros, funding, capital, PDD, NII, risk_adj_nii |
| `getInfoClienteAdq(doc)` | `Dias_PnL.PnL_Dashs_part` | Afiliacoes, ClientName, MCC, SS1/SS3/SS5, Produtos |
| `getBancoMedia(doc)` | `Dias_PnL.resumo_conta_3M` | Saldo Conta, Saldo Reservas, Boletos Emitidos/Liquidados, Volume Boleto |
| `heartbeat()` | PropertiesService | Presenca real-time (ping 30s, offline 90s) |

## Decisoes tomadas

### Stack técnica
- **React 18 + Tailwind CSS + Recharts** buildado com Vite + vite-plugin-singlefile → HTML inline servido pelo GAS
- Justificativa: carregamento incremental via hooks (cada seção carrega independente), escalável, Recharts leve para gráficos

### Build pipeline e deploy

**IDs:**
- Script ID: `1qKErmyBogImZKfioaCkDPcowFYkTGQnFDQbpZk1kSKe_zXk_N0vqthGU`
- Deployment ID (fixo): `AKfycbxTNqpYwEBxdXLg-qmcNGjM-agAFAeLAt4YEgZOvh7m7KnRaLwuMtuGmgg__h4TrrmI`
- URL: `https://script.google.com/a/macros/stone.com.br/s/AKfycbxTNqpYwEBxdXLg-qmcNGjM-agAFAeLAt4YEgZOvh7m7KnRaLwuMtuGmgg__h4TrrmI/exec`
- GitHub: `https://github.com/ayran-dias/mirei` (branch master)
- Versão atual: v331 (2026-06-08)

**Deploy completo (frontend + backend):**
```bash
# ATENÇÃO: SEMPRE deletar src antes de copiar — evita src/src/ aninhado
SRC="G:/Drives compartilhados/Pricing KA/11. Estudos/2026.04.24 - cp/estudos/2026-05-20-felicia-credito/frontend"
GAS="G:/Drives compartilhados/Pricing KA/11. Estudos/2026.04.24 - cp/estudos/2026-05-20-felicia-credito/gas"

rm -rf /c/tmp_felicia_build/src
cp -r "$SRC/src" /c/tmp_felicia_build/src
cp "$SRC/package.json" "$SRC/index.html" "$SRC/vite.config.ts" "$SRC/tailwind.config.js" "$SRC/postcss.config.js" "$SRC/tsconfig.json" /c/tmp_felicia_build/
cd /c/tmp_felicia_build && npm run build

cp /c/tmp_felicia_build/dist/index.html "$GAS/Index.html"
cd "$GAS" && npx clasp push --force
npx clasp deploy -i AKfycbxTNqpYwEBxdXLg-qmcNGjM-agAFAeLAt4YEgZOvh7m7KnRaLwuMtuGmgg__h4TrrmI -d "descrição"
```

**Deploy só Code.gs (sem rebuild):**
```bash
cd "G:/Drives compartilhados/Pricing KA/11. Estudos/2026.04.24 - cp/estudos/2026-05-20-felicia-credito/gas"
npx clasp push --force
npx clasp deploy -i AKfycbxTNqpYwEBxdXLg-qmcNGjM-agAFAeLAt4YEgZOvh7m7KnRaLwuMtuGmgg__h4TrrmI -d "descrição"
```

**Gotchas críticos:**
- Build path `/c/tmp_felicia_build/` (não `/c/temp/`) — MAX_PATH do Windows quebra npm dentro do Google Drive
- `rm -rf /c/tmp_felicia_build/src` obrigatório antes de copiar — cp -r não substitui se destino existir
- `node_modules` persiste em `/c/tmp_felicia_build/` — se `package.json` mudou, rodar `npm install` primeiro
- Injetar dados no GAS (ex: rotas admin) ANTES de abrir o roadmap — auto-save do frontend sobrescreve
- `const` com `useCallback` não sofre hoisting — declarar ANTES do `useEffect` que a referencia

### Gotcha: campo Gateway
- O campo correto na `PnL_Dashs_part` é `Rcta_gateway` (não `Rcta_gateway_sum`). Erro causou query 400 e "Sem dados" no frontend.

### Gotcha: build com Google Drive
- `cp -r` para `/c/temp/felicia-build/src` não substitui arquivos existentes corretamente — só copia novos. Copiar arquivo por arquivo para garantir atualização.
- Sempre verificar `grep -c "NovoComponente" dist/index.html` antes de fazer push.

## Componentes React (v3.0)

| Componente | O que mostra |
|------------|-------------|
| **SearchBar** | Input CNPJ com icone, rounded-full, dispara 7 queries paralelas |
| **InfoCliente** | Grid 2 colunas: Adquirencia (doc, afiliacoes, MCC, SS1/SS3/SS5, produtos) + Status Conta (KYC, rating) |
| **SummaryCards** | 3 cards: Credito (NII, Risk Adj, NPV + resumo desembolsos + adimplencia) + Adquirencia media 3m (TPV, Margem, Net MDR%, TKR nCOF) + Banco media 3m (Saldo Conta/Reservas, Boletos, Volume). Tooltips com "?" e definicoes. Aviso TPV baixo |
| **CardAdquirencia** | Tabela 19 colunas com filtro de colunas, mes MM/YYYY, negativos em vermelho. CollapsibleCard |
| **OfertasCredito** | Cartao + Demais Ofertas (filtro status, Cancelled/Denied ocultos, ordem expiracao DESC) + Desembolso (ordem data DESC). CollapsibleCard |
| **FluxoCaixa** | ComposedChart com 5 linhas + linha "Hoje". Zoom via scroll mouse (preventDefault) + Brush. Filtros toggle como legenda. Default 75% zoom. CollapsibleCard |
| **CollapsibleCard** | Componente reutilizavel: header verde/azul com seta minimizar/maximizar |
| **InfoTooltip** | Popup "?" com definicoes de metricas |
| **AdminMonitor** | Monitor real-time visivel so para admin. Heartbeat 30s, tabs online/historico, auto-refresh 15s |
| **NavbarMobile** | Secoes ACOMPANHAMENTOS / FERRAMENTAS / REPOSITORIO para navegacao em telas pequenas |
| **RoadmapSection** | Secao colapsavel "Acompanhamentos" com cards Enterprise e Grupos Marca |

## Skill criado: /revisar-proposta

Time de revisão crítica para implementações. Estrutura em `.claude/skills/revisar-proposta/`:
- **SKILL.md** — Orquestrador do fluxo
- **agents/cto.md** — Maestro: reformula dor, decide consultores, consolida, monta briefing
- **agents/analista-credito.md** — Consultor: risco, PDD, inadimplência, stress
- **agents/analista-pricing.md** — Consultor: MDR, margem, alçadas, mix
- **agents/analista-financeiro.md** — Advogado do diabo: tenta derrubar proposta
- **agents/engenheiro.md** — Implementa a partir de briefing fechado

Fluxo: Demanda → CTO → Consultores (paralelo) → CTO consolida → Financeiro → Se aprovado → Briefing → Engenheiro

## Melhorias UI entregues (2026-05-29, tasks #19-#31, v197)

- [x] #19: InfoTooltip — removido "Roadmap →", mantido so "Documentacao →"
- [x] #20: Formatacao pt-BR em todos os componentes (separador milhar `.`, decimal `,`)
- [x] #21: Ofertas de Credito — reordenado: Cartao → Desembolso → Demais Ofertas (colapsavel)
- [x] #22: FluxoCaixa — Net CF e Margem em destaque (opacidade 1, strokeWidth 2.5), demais linhas em 0.4
- [x] #23: InfoCliente — campo MCC mostra so numero, pill "ver" revela nome completo
- [x] #24: Navbar mobile — secoes ACOMPANHAMENTOS / FERRAMENTAS / REPOSITORIO
- [x] #25: Rotulos FluxoCaixa — `isKeyPoint()` para first/last/inflexoes nos highlight lines
- [x] #26: Tabela Detalhado Mensal — `font-mono` → `font-sans` nas celulas numericas
- [x] #27: Tooltips FluxoCaixa e InsightsAdq — `font-mono` → `font-sans`
- [x] #30: Detalhado Mensal — filtro de meses com pills toggle + Todos/Nenhum
- [x] #31: Roadmap — secao colapsavel "Acompanhamentos" com cards Enterprise e Grupos Marca

## Queries adicionadas (sessão 2026-06-01)

| Função | Fonte BQ | O que retorna |
|--------|----------|---------------|
| `getBankingHistorico(doc)` | `Dias_PnL.resumo_conta_historico` | 36 campos de saldos e receitas mensais (24 meses) |
| `getActiveOffers(stonecode)` | Active Offers API (Marcopolo) | Condições MDR/CET, RAV, Smart Fees por stonecode |
| `getSFCredentials_()` | Secret Manager / ScriptProperties | Credenciais SF (username, password, token) |

**Tabela nova:** `Dias_PnL.resumo_conta_historico` — 26 colunas, Stone+PagarMe, jan/2024→atual
- PARTITION BY reference_month + CLUSTER BY document
- MERGE v4 otimizado: 0.31 TB (~$2/run) com partition pruning
- Scheduled query: todo domingo 03:00 UTC

## Proximos passos (backlog)

- [x] Tabela detalhada mensal de adquirencia com 19 colunas e filtro de colunas
- [x] Card Banco: Media 3m (saldo conta, reservas, boletos, volume)
- [x] Resumo de desembolsos no card credito (qtd, total, adimplencia)
- [x] UI Stone brand (header verde, cards com cabecalho colorido, CollapsibleCard)
- [x] Monitor admin real-time com heartbeat
- [x] Zoom via scroll no grafico + linha "Hoje"
- [x] Tooltips "?" com definicoes de metricas
- [x] Fix media 3m (excluir mes aberto, ordem correta)
- [ ] Simulador de adquirencia no frontend (motor JS) — arquitetura definida, construcao nao iniciada
- [x] Unificar estudos 04-30 e 05-20 em pasta unica
- [ ] Roadmap: seed de cards com avanos (task #34)
- [ ] Brainstorming academico: frameworks de financas bancarias (CLV, RAROC, unit economics)
- [ ] Secao de adquirencia detalhada: condicoes MDR por bandeira, share performado, equipamentos
- [ ] Projecao do motor Adq_Banking (simulado vs. realizado)
- [ ] Metrica unificada de valor do cliente (credito + adquirencia combinados)
- [ ] Explorar aba Credito do Modelo Precos Minimos
- [ ] Testar com mais documentos para validar robustez

## Queries para promover ao catalogo

- `getNpvCredito` — query do Finch adaptada, útil para qualquer análise de rentabilidade crédito por doc
- `getFluxoCreditoMensal` — série temporal de crédito por doc, novo (não existia antes)

## Scripts para promover

- Hook `useBigQuery.ts` — hook genérico React para chamar google.script.run com loading/error states
- Pipeline de build: Vite → singlefile → clasp push (documentar como padrão para projetos GAS+React)

## Historico

- 2026-05-20 | Ayran Dias | Criação do estudo
- 2026-05-20 | Ayran Dias | v1.0 — Deploy inicial: SearchBar, SummaryCards, StatusCredito, FluxoCaixa
- 2026-05-20 | Ayran Dias | v1.1 — Reestruturação: InfoCliente (adq+crédito), OfertasCredito separado, FluxoCaixa com zoom/filtros
- 2026-05-20 | Ayran Dias | v1.2 — Aviso "Métricas distorcidas pelo baixo TPV" no card adquirência
- 2026-05-20 | Ayran Dias | v1.3 — Fix: Brush não reseta ao trocar filtros (useRef), default mostra tudo
- 2026-05-20 | Ayran Dias | v1.4 — CardAdquirencia: tabela detalhada mensal com 18 colunas
- 2026-05-20 | Ayran Dias | v1.5 — Gateway adicionada, dropdown filtro de colunas, colunas Delay/TED ocultas por default
- 2026-05-20 | Ayran Dias | v1.5.1 — Fix: campo correto é Rcta_gateway (não Rcta_gateway_sum)
- 2026-05-20 | Ayran Dias | v1.5.2 — Default ocultar Delay rcta, Delay %, Rcta TED
- 2026-05-20 | Ayran Dias | Criacao skill /revisar-proposta (5 agentes)
- 2026-05-20 | Ayran Dias | Consolidacao URL fixa de deploy, limpeza de deployments duplicados
- 2026-05-20 | Ayran Dias | v1.6 — Zoom via scroll do mouse no grafico
- 2026-05-20 | Ayran Dias | v1.7 — Fix crash loop wheel zoom + prevent page scroll
- 2026-05-21 | Ayran Dias | v2.0 — UI Stone brand: header verde com logo Felicia, cards com cabecalho colorido
- 2026-05-21 | Ayran Dias | v2.2 — CollapsibleCard (minimizar/maximizar) nos 3 cards inferiores
- 2026-05-21 | Ayran Dias | v2.3 — Fix Invalid Date (epoch seconds) + subtitles mais escuros
- 2026-05-21 | Ayran Dias | v2.4 — Filtro de status em Demais Ofertas (Cancelled/Denied ocultos default)
- 2026-05-21 | Ayran Dias | v2.5 — Rename para Felicia 360 + labels SS1/SS3/SS5 + Produtos + Afiliacoes
- 2026-05-21 | Ayran Dias | v2.6 — Monitor admin real-time com heartbeat
- 2026-05-21 | Ayran Dias | v2.7 — Presenca online/offline + tabs usuarios/historico
- 2026-05-21 | Ayran Dias | v2.8 — Resumo desembolsos no card credito + fix adimplencia Encerrado
- 2026-05-21 | Ayran Dias | v2.8.2 — Fix media 3m: excluir mes aberto + ordem correta
- 2026-05-21 | Ayran Dias | v2.9 — Tooltips "?" com definicoes de metricas nos 3 summary cards
- 2026-05-21 | Ayran Dias | v2.9.1 — Linha "Hoje" no grafico + toggle na legenda
- 2026-05-21 | Ayran Dias | v3.0 — Card Banco: Media 3m (saldo, reservas, boletos, volume)
- 2026-05-21 | Ayran Dias | v3.0.3 — Travessoes trocados por dois pontos em todos os titulos
- 2026-05-21 | Ayran Dias | Documentacao tecnica gerada (felicia-360-documentacao-tecnica.docx)
- 2026-05-29 | Ayran Dias | v197 — Tasks #19-#31: formatacao pt-BR, reordenacao Ofertas (Cartao>Desembolso>Demais), destaque FluxoCaixa (Net CF/Margem), pill "ver" MCC, navbar mobile, rotulos isKeyPoint, font-sans Detalhado/Tooltips, filtro pills meses, secao Roadmap Acompanhamentos
- 2026-05-29 | Ayran Dias | v197 encerrado (status: concluido — fase 1)
- 2026-06-01 | Ayran Dias | Reaberto para fase 2: Banking cards + BQ + Secret Manager
- 2026-06-01 | Ayran Dias | v202-v227 — Banking Insights+Detalhado (tabela transposta), resumo_conta_historico (76M linhas, MERGE v4), Secret Manager (getSFCredentials_), Condições Stonecodes (Active Offers API), Roadmap edges delete+reconect, navbar Title Case fix, summary cards compacto, InfoCliente blur preview, FluxoCaixa -20%, DocFelicia360 banking
- 2026-06-01 | Ayran Dias | Ajuste de Ofertas Auth.gs migrado para Secret Manager (mesmo secret Chaves-sf)
- 2026-06-01 | Ayran Dias | Estudo 2026-04-30-mesa-banco unificado aqui (analises/simulador/, documentos/)
- 2026-06-01 | Ayran Dias | Estudo encerrado (status: concluido)
- 2026-06-02 | Ayran Dias | Reaberto fase 3: Repositório de Estudos, gap GM/Pagarme, Simulador K-Giro overhaul, Home 3 repos
- 2026-06-02 | Ayran Dias | v228-v262 — Simulador K-Giro (motor completo, validado 17/17), Roadmap overhaul (frames/edges/table nodes), Home cards+badges, gap Enterprise vs GM documentado, Crédito Lifetime VP (card + paginação), Base Geral heatmap+sort+colunas dinâmicas, resumo_conta_historico_company (46.5M rows), IAM Secret Manager resolvido
- 2026-06-03 | Ayran Dias | v263-v273 — Crédito VP fix completo (prevFilterKey null, docs aux + npv_kgiro_por_documento), Monitor fix (page no return + 13 labels), GTM analytics (GTM-NWPLWBNN), filtro Grupo próprio no card VP, DocCarteiras, DocFelicia360 botão, Repositório de Estudos v9
- 2026-06-03 | Ayran Dias | Versão atual: @v273/@276. Estudo em andamento.
