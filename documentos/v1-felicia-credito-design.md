# Felícia Crédito — V1 Design Spec

**Data:** 2026-05-20  
**Autor:** Ayran Dias  
**Status:** Draft  
**Projeto GAS:** `1qKErmyBogImZKfioaCkDPcowFYkTGQnFDQbpZk1kSKe_zXk_N0vqthGU`

## Objetivo

Dashboard em Google Apps Script que consolida a visão econômica completa do cliente Stone — crédito e adquirência — numa interface única para tomada de decisão de pricing.

V1 foca em: consultar por CNPJ, exibir métricas-resumo de ambos os mundos, replicar o status crédito da Felícia atual, e mostrar o fluxo de caixa mensal unificado (crédito + adquirência) como timeline.

## Stack Técnica

- **Frontend:** React 18 + Tailwind CSS + Recharts
- **Build:** Vite + vite-plugin-singlefile (gera um HTML com JS/CSS inline)
- **Backend:** Google Apps Script (Code.gs) com BigQuery Advanced Service
- **Deploy:** `npm run build` → copia HTML para GAS → `clasp push` → deploy web app

### Justificativa

- React: carregamento incremental via hooks (cada seção carrega independentemente via `useState`/`useEffect`), escalável para próximas versões
- Tailwind: utility-first, bundle mínimo via purge, sem CSS manual
- Recharts: biblioteca de gráficos React declarativa, leve, suporta LineChart, AreaChart, tooltip customizado
- vite-plugin-singlefile: resolve a limitação do GAS de servir um único HTML — todo o bundle fica inline

## Fontes de Dados (3 queries BigQuery)

### 1. Status Crédito — `getStatusCredito(doc)`

```sql
SELECT *
FROM `sbj7ujlwjbsknn8v396xaahlf4ogck.Dias_Credit.base_felicia`
WHERE CNPJ = @doc
```

**Retorna:** status KYC, rating, tipo conta, ofertas safra atual (limites KGiro/Cartão/GFacil), histórico de ofertas, dados cartão (limites, atraso), desembolsos (contratos individuais com taxa, parcelas, atraso).

**Grão:** 1 linha por oferta/contrato do documento.

### 2. Rentabilidade Crédito — `getNpvCredito(doc)`

```sql
WITH loans AS (
  SELECT DISTINCT LoanId, documento
  FROM `dataplatform-prd.credit_policy_studies.credit_portfolio`
  WHERE documento = @doc
)
SELECT
  b.documento,
  SUM(a.financial_income_net * a.discount_factor)
    - SUM(a.funding_cost * a.discount_factor)
    - SUM(a.capital_cost * a.discount_factor) AS nii,
  SUM(a.financial_income_net * a.discount_factor)
    - SUM(a.funding_cost * a.discount_factor)
    - SUM(a.capital_cost * a.discount_factor)
    - SUM(a.pdd_result * a.discount_factor) AS risk_adj_nii,
  SUM(a.pv_cf) AS npv
FROM `pricing-dedicated-non-prod.credit_pricing.npv_kgiro` a
JOIN loans b ON a.loanid = b.LoanId
WHERE a.run_at = (SELECT MAX(run_at) FROM `pricing-dedicated-non-prod.credit_pricing.npv_kgiro`)
GROUP BY b.documento
```

**Retorna:** NII, Risk Adj NII, NPV — tudo a valor presente (lifetime).

### 3. PnL Adquirência — `getPnlAdquirencia(doc)`

```sql
SELECT
  Dt_Month,
  ROUND(SUM(GMV), 2) AS tpv,
  ROUND(SUM(Receita_Net_COF), 2) AS receita_net_cof,
  ROUND(SAFE_DIVIDE(SUM(Receita_Net_COF), ABS(SUM(GMV))), 4) AS tkr_net_cof,
  ROUND(SUM(Net_MDR_Stone), 2) AS net_mdr,
  ROUND(SAFE_DIVIDE(SUM(Net_MDR_Stone), SUM(TPV_Adquirencia)), 4) AS pctg_net_mdr,
  ROUND(SUM(Margem_Query), 2) AS margem,
  ROUND(SAFE_DIVIDE(SUM(Margem_Query), ABS(SUM(GMV))), 4) AS margem_div_tpv,
  SUM(custo_servir_Total) * (-1) AS cogs
FROM `sbj7ujlwjbsknn8v396xaahlf4ogck.Dias_PnL.PnL_Dashs_part`
WHERE ClientCNPJorCPF = @doc
  AND Dt_Month >= DATE_SUB(CURRENT_DATE(), INTERVAL 12 MONTH)
GROUP BY Dt_Month
ORDER BY Dt_Month
```

**Retorna:** série mensal de TPV, receita, margem, take rates.

### 4. Fluxo de Caixa Crédito — `getFluxoCreditoMensal(doc)`

```sql
WITH loans AS (
  SELECT DISTINCT LoanId, documento
  FROM `dataplatform-prd.credit_policy_studies.credit_portfolio`
  WHERE documento = @doc
)
SELECT
  a.reference_date,
  SUM(a.financial_income_net) AS receita_juros,
  SUM(a.funding_cost) AS funding_cost,
  SUM(a.capital_cost) AS capital_cost,
  SUM(a.pdd_result) AS pdd_result,
  SUM(a.variable_cost) AS variable_cost,
  SUM(a.net_cf) AS net_cf,
  SUM(a.financial_income_net - a.funding_cost - a.capital_cost) AS nii,
  SUM(a.financial_income_net - a.funding_cost - a.capital_cost - a.pdd_result) AS risk_adj_nii
FROM `pricing-dedicated-non-prod.credit_pricing.npv_kgiro` a
JOIN loans b ON a.loanid = b.LoanId
WHERE a.run_at = (SELECT MAX(run_at) FROM `pricing-dedicated-non-prod.credit_pricing.npv_kgiro`)
GROUP BY a.reference_date
ORDER BY a.reference_date
```

**Retorna:** série mensal de receita de juros, NII, Risk Adj NII, PDD, net_cf.

## Layout — Componentes React

### 1. SearchBar

Input de CNPJ com limpeza de formatação (remove pontos, barras, hifens). Botão "Buscar". Ao submeter, dispara as 4 queries em paralelo.

### 2. SummaryCards (grid 2 colunas)

**Card Crédito** (tons de azul):
| Métrica | Fonte |
|---------|-------|
| NII (VP) | getNpvCredito |
| Risk Adj NII (VP) | getNpvCredito |
| NPV | getNpvCredito |

Color coding: verde se positivo, vermelho se negativo.

**Card Adquirência** (tons de verde):
| Métrica | Cálculo |
|---------|---------|
| TPV (média 3m) | média dos últimos 3 meses de `tpv` |
| Margem/TPV | média dos últimos 3 meses de `margem_div_tpv` |
| Net MDR % | média dos últimos 3 meses de `pctg_net_mdr` |
| Margem (R$) | média dos últimos 3 meses de `margem` |
| TKR nCOF | média dos últimos 3 meses de `tkr_net_cof` |

Nota: meses com TPV = 0 são excluídos da média para não distorcer.

### 3. StatusCredito (réplica Felícia atual)

Sub-componentes em grid:
- **StatusConta:** Documento, Status KYC, Aprovação KYC, Tipo de conta, Rating
- **OfertaSafraAtual:** Limite KGiro, Limite Cartão, Limite GFacil, Oferta Giro, Oferta Cartão, Oferta Limite de Conta
- **DemaisOfertas:** Tabela com histórico (status, aprovação, negociação, desembolso, canal)
- **Cartao:** Doc Dono, Doc Usuário, Limites (concedido, disponível, colateral), Faixa de atraso
- **Desembolso:** Tabela com contratos (valor, data, taxa juros, parcelas, vencimento, atraso, rating)

### 4. FluxoCaixa (Recharts ComposedChart)

Gráfico com eixo X temporal (mês) compartilhado.

**Linhas de crédito** (tons de azul):
- `receita_juros` — Receita de juros bruta
- `nii` — NII (receita - funding - capital)
- `risk_adj_nii` — Risk Adj NII (nii - pdd)

**Linhas de adquirência** (tons de verde):
- `receita_net_cof` — Receita Net COF
- `margem` — Margem de contribuição

**Comportamento:**
- Tooltip mostra valores de ambos os mundos no hover
- Eixo X cobre o range máximo entre as duas séries (crédito pode ir até 2031, adquirência 12 meses)
- Opção de zoom/filter por período (V1: input de data início/fim simples)
- Área sombreada para distinguir período realizado vs. projetado (crédito tem projeção futura)
- Linha zero horizontal como referência

## Fluxo de Carregamento

1. Usuário digita CNPJ → clica Buscar
2. Todos os componentes mostram skeleton loaders
3. Frontend dispara 4 chamadas paralelas via `google.script.run`
4. Cada componente renderiza independentemente conforme sua query retorna
5. Se query falha, componente mostra mensagem de erro isolada (não afeta os demais)

## Estrutura de Arquivos

```
estudos/2026-05-20-felicia-credito/
├── gas/                          # Projeto GAS (clasp linked)
│   ├── appsscript.json
│   ├── Code.gs                   # Backend: doGet, queries BQ
│   └── Index.html                # Frontend: bundle React (gerado pelo build)
├── frontend/                     # Código fonte React
│   ├── package.json
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   ├── src/
│   │   ├── main.tsx
│   │   ├── App.tsx
│   │   ├── components/
│   │   │   ├── SearchBar.tsx
│   │   │   ├── SummaryCards.tsx
│   │   │   ├── StatusCredito.tsx
│   │   │   ├── FluxoCaixa.tsx
│   │   │   └── Skeleton.tsx
│   │   ├── hooks/
│   │   │   └── useBigQuery.ts    # Hook genérico para google.script.run
│   │   └── types/
│   │       └── index.ts          # Tipos das queries
│   └── index.html
└── scripts/
    └── build-and-push.sh         # Build + copia HTML + clasp push
```

## Decisões técnicas

- **Projeto BQ para queries:** `sbj7ujlwjbsknn8v396xaahlf4ogck` (projeto pessoal do Ayran, mesmo das dashs existentes) para base_felicia e PnL_Dashs. `pricing-dedicated-non-prod` para npv_kgiro. `dataplatform-prd` para credit_portfolio.
- **Meses com TPV=0 na média:** excluídos do cálculo das métricas de adquirência no SummaryCard para não distorcer (cliente pode ter meses sem transação mas com aluguel)
- **Período do fluxo de caixa:** crédito mostra toda a série disponível (pode ir até 2031); adquirência mostra últimos 12 meses. Eixo X compartilhado, cada série ocupa seu range natural
- **Web app access:** DOMAIN (qualquer pessoa com email @stone.com.br)
- **Não há autenticação adicional:** GAS executa as queries com as credenciais do deployer
