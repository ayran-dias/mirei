-- Fonte: Finch (via Bazetti)
-- Rentabilidade de crédito K Giro por documento (lifetime, todos os contratos somados)
-- Versão corrigida: DISTINCT em vez de ROW_NUMBER (pega todos os loanids do documento)
--
-- Métricas (todas a valor presente via discount_factor):
--   NII = Receita de Juros Líquida - Custo de Funding - Custo de Capital
--   Risk Adj NII = NII - Custo de Risco (PDD)
--   NPV = Risk Adj NII - Custo Operacional - CAC (= pv_cf)
--
-- Tabelas:
--   pricing-dedicated-non-prod.credit_pricing.npv_kgiro  (fluxos de caixa descontados por loanid)
--   dataplatform-prd.credit_policy_studies.credit_portfolio  (mapeamento loanid -> documento)
--
-- Nota: reflete toda a vida do cliente (soma de todos os contratos, ativos e encerrados)
--       Finch mencionou que é fácil adaptar para apenas contratos ativos

WITH npv_doc AS (
  SELECT
    b.documento,
    SUM(a.financial_income_net * a.discount_factor)
      - SUM(a.funding_cost      * a.discount_factor)
      - SUM(a.capital_cost      * a.discount_factor) AS nii,
    SUM(a.financial_income_net * a.discount_factor)
      - SUM(a.funding_cost      * a.discount_factor)
      - SUM(a.capital_cost      * a.discount_factor)
      - SUM(a.pdd_result        * a.discount_factor) AS risk_adj_nii,
    SUM(a.pv_cf) AS npv
  FROM `pricing-dedicated-non-prod.credit_pricing.npv_kgiro` a
  LEFT JOIN (
    SELECT DISTINCT LoanId, documento
    FROM `dataplatform-prd.credit_policy_studies.credit_portfolio`
  ) b
    ON a.loanid = b.LoanId
  WHERE run_at = (SELECT MAX(run_at) FROM `pricing-dedicated-non-prod.credit_pricing.npv_kgiro`)
  GROUP BY b.documento
)
SELECT * FROM npv_doc
