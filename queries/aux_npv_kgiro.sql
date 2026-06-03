-- engine: bigquery
-- Tabela auxiliar: npv_kgiro_por_documento
-- Destino: sbj7ujlwjbsknn8v396xaahlf4ogck.Dias_auxiliares.npv_kgiro_por_documento
-- Schedule: toda segunda-feira 04:00 UTC (npv_kgiro atualiza mensalmente)
-- Uso: substitui join cross-project pricing-dedicated-non-prod no getCreditoLifetimeSummary/Detail
-- Tamanho esperado: ~50-100k linhas (142k loans, agrupado por documento)

CREATE OR REPLACE TABLE `sbj7ujlwjbsknn8v396xaahlf4ogck.Dias_auxiliares.npv_kgiro_por_documento`
CLUSTER BY documento
AS (
  SELECT
    b.documento,
    SUM(a.financial_income_net * a.discount_factor)
      - SUM(a.funding_cost     * a.discount_factor)
      - SUM(a.capital_cost     * a.discount_factor) AS nii,
    SUM(a.financial_income_net * a.discount_factor)
      - SUM(a.funding_cost     * a.discount_factor)
      - SUM(a.capital_cost     * a.discount_factor)
      - SUM(a.pdd_result       * a.discount_factor) AS risk_adj_nii,
    SUM(a.pv_cf) AS npv
  FROM `pricing-dedicated-non-prod.credit_pricing.npv_kgiro` a
  JOIN (
    SELECT DISTINCT LoanId, documento
    FROM `dataplatform-prd.credit_policy_studies.credit_portfolio`
  ) b ON a.loanid = b.LoanId
  WHERE a.run_at = (SELECT MAX(run_at) FROM `pricing-dedicated-non-prod.credit_pricing.npv_kgiro`)
    AND b.documento IS NOT NULL
  GROUP BY b.documento
);
