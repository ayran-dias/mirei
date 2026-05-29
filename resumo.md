---
estudo: felicia-credito
autor: Ayran Dias
data_criacao: 2026-05-20
baseado_em: null
skills_usadas: [novo-estudo]
queries_criadas: 7
queries_do_catalogo_reutilizadas: 0
inputs_recebidos: 10
sumario: "Felicia 360: dashboard GAS+React que unifica credito, adquirencia e banking por CNPJ. V3.0 live com 7 queries BQ, 10 componentes React, identidade visual Stone, monitor admin real-time. 42 deploys ate 21/05."
tags: [credito, adquirencia, dashboard, google-apps-script, vida-economica, bundle, tomada-decisao, react, recharts, bigquery]
revisado_por: null
status: em_andamento
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

### Build pipeline
- Código fonte em `frontend/src/` (Google Drive)
- Build em `/c/temp/felicia-build/` (path local sem espaços — Google Drive com espaços quebra Vite)
- Copiar arquivos manualmente para build dir antes de `npx vite build`
- Output `dist/index.html` → copia para `gas/Index.html` → `clasp push --force`

### Deploy fixo
- **Deployment ID:** `AKfycbxTNqpYwEBxdXLg-qmcNGjM-agAFAeLAt4YEgZOvh7m7KnRaLwuMtuGmgg__h4TrrmI`
- **URL fixa:** `https://script.google.com/a/macros/stone.com.br/s/AKfycbxTNqpYwEBxdXLg-qmcNGjM-agAFAeLAt4YEgZOvh7m7KnRaLwuMtuGmgg__h4TrrmI/exec`
- Sempre atualizar com `-i <ID>` para não criar URLs novas
- Comando: `clasp deploy -i AKfycbxTNqpYwEBxdXLg-qmcNGjM-agAFAeLAt4YEgZOvh7m7KnRaLwuMtuGmgg__h4TrrmI -d "descrição"`
- **Projeto GAS:** `1qKErmyBogImZKfioaCkDPcowFYkTGQnFDQbpZk1kSKe_zXk_N0vqthGU`

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

## Skill criado: /revisar-proposta

Time de revisão crítica para implementações. Estrutura em `.claude/skills/revisar-proposta/`:
- **SKILL.md** — Orquestrador do fluxo
- **agents/cto.md** — Maestro: reformula dor, decide consultores, consolida, monta briefing
- **agents/analista-credito.md** — Consultor: risco, PDD, inadimplência, stress
- **agents/analista-pricing.md** — Consultor: MDR, margem, alçadas, mix
- **agents/analista-financeiro.md** — Advogado do diabo: tenta derrubar proposta
- **agents/engenheiro.md** — Implementa a partir de briefing fechado

Fluxo: Demanda → CTO → Consultores (paralelo) → CTO consolida → Financeiro → Se aprovado → Briefing → Engenheiro

## Proximos passos

- [x] Tabela detalhada mensal de adquirencia com 19 colunas e filtro de colunas
- [x] Card Banco: Media 3m (saldo conta, reservas, boletos, volume)
- [x] Resumo de desembolsos no card credito (qtd, total, adimplencia)
- [x] UI Stone brand (header verde, cards com cabeçalho colorido, CollapsibleCard)
- [x] Monitor admin real-time com heartbeat
- [x] Zoom via scroll no grafico + linha "Hoje"
- [x] Tooltips "?" com definicoes de metricas
- [x] Fix media 3m (excluir mes aberto, ordem correta)
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
