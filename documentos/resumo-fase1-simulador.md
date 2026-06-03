---
estudo: mesa-banco
autor: Ayran Dias
data_criacao: 2026-04-30
data_conclusao: 2026-05-29
baseado_em: null
skills_usadas: []
queries_criadas: 0
queries_do_catalogo_reutilizadas: 0
inputs_recebidos: 0
sumario: Dissecacao dos simuladores de adquirencia Digital e Polos + viabilidade de usar a PnL API como motor do simulador Mesa Banco. Conclusao: PnL API nao aceita share de modalidade como input livre; arquitetura recomendada e motor JS 100% frontend com premissas regionais via BQ log.
tags: [mesa-banco, credito, adquirencia, bundle, ficha-comercial, pricing-operacoes, simulador, pnl-api]
revisado_por: null
status: concluido
---

## Objetivo

Dissecar os simuladores de adquirencia (Digital e Polos) e investigar a viabilidade de usar a PnL API como motor, para subsidiar a construcao do simulador na ferramenta Mesa Banco.

Escopo secundario (origem do estudo): construir o sistema Mesa Banco — fluxo operacional que conecta o Time de Credito (Stone) e o Time de Adquirencia para viabilizar deals de bundle (K Giro + Adquirencia) e operacoes standalone.

## Inputs recebidos

- Simulador Digital (planilha interna) — fornecido para engenharia reversa do motor de calculo
- Simulador Polos (planilha interna) — fornecido para comparacao com Digital e mapeamento de diferenciais de canal

## Achados

### Simulador Digital (task #28)

- 38 abas (37 ativas)
- Motor: DataRequestCliente → Main + Calc_Trans → DB → Visao Cliente
- 10 funcoes de adquirencia mapeadas:
  1. Net MDR
  2. Calculo reverso
  3. RAV com curva DI
  4. IC por platinizacao (~2.000 linhas)
  5. PnL 12+ linhas
  6. Payback
  7. CTS
  8. Floating
  9. Custo boleto
  10. Gateway COGS

Analise completa: `analises/simulador-digital-analise.md`

### Simulador Polos (task #29)

- 61 abas (57 ativas) — 60% maior que o Digital
- Diferenciais estruturais vs. Digital:
  - Comissao franquia: 0,480% TPV
  - Rebates: 38,85% (NetMDR / RAV / Aluguel / Banking)
  - Royalties: 10%
- CAC por canal:
  - Especialistas: R$ 2.719
  - Polo Proprio: R$ 2.105
  - Inbound: R$ 915
  - Franquia: R$ 242
- 28 abas extras vs. Digital: alcadas (3 niveis), CET 1x-18x, Proposta Pre-Aprovada, multi-CNPJ, validacao SF

Analise completa: `analises/simulador-polos-analise.md`

### PnL API — Viabilidade como motor do simulador (tasks #32 e #33)

- **Restricao critica:** a API NAO aceita share de modalidade como input livre
- Share e resolvido internamente via hierarquia (channel, level, MCC) do Portal de Ofertas — nao e parametrizavel externamente
- Achado em BQ: `register_negotiations` (101M rows, 181 colunas) possui 65 colunas `installment_share_{brand}_{modality}` adicionadas em mai/2025 — pode ser usado como log de premissas reais
- **Arquitetura recomendada:** motor JS 100% no frontend + API como fonte de premissas regionais via BQ log

Analises: `analises/pnl-api-viabilidade.md`, `analises/pnl-api-check-pratico.md`

## Queries utilizadas

Nenhuma query SQL nova criada neste estudo. Investigacao foi via engenharia reversa de planilhas e inspecao de schema BQ (sem persistencia de query).

## Decisoes tomadas

- Descartar PnL API como motor do simulador Mesa Banco (nao parametrizavel para share de modalidade)
- Adotar motor JS frontend com premissas retiradas de `register_negotiations` via BQ query pontual

## Proximos passos (backlog)

1. Construir motor JS de simulacao no frontend (escopo: Net MDR + RAV + IC simplificado + Payback)
2. Definir premissas regionais de share via query em `register_negotiations` (tabela: `dataplatform-prd`, 65 colunas de share por bandeira/modalidade)
3. Unificar este estudo com `2026-05-20-felicia-credito` para consolidar o simulador no app Mesa Banco

## Analises geradas

- `analises/simulador-digital-analise.md` — engenharia reversa do motor Digital (10 funcoes, 38 abas)
- `analises/simulador-polos-analise.md` — mapeamento Polos vs. Digital (diferenciais de canal, CAC, comissoes)
- `analises/pnl-api-viabilidade.md` — investigacao da API como motor; conclusao: inviavel como black-box
- `analises/pnl-api-check-pratico.md` — checagem pratica da restricao de share na API

## Queries para promover ao catalogo

Nenhuma.

## Scripts para promover

Nenhum.

## Historico

- 2026-04-30 | Ayran Dias | Criacao do estudo
- 2026-05-29 | Ayran Dias | Conclusao: dissecacao dos simuladores Digital e Polos, viabilidade PnL API investigada, arquitetura final definida. Status: concluido
