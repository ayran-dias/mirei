-- Query que popula a tabela base_felicia diariamente (scheduled query)
-- Tabela destino: sbj7ujlwjbsknn8v396xaahlf4ogck.Dias_Credit.base_felicia
-- Responsável: Ayran Dias
--
-- Fontes:
--   1. base (universo de CNPJs):
--      - credit_policy_studies.ART_TB_MONITORAMENTO_OFERTAS_SEGUNDA_ONDA
--      - credit_data_tribe.tbl_concession_negotiations_offer_latest (Pending/Accepted/Available, canal Stone)
--   2. carteira: ART_TB_MONITORAMENTO_OFERTAS_SEGUNDA_ONDA (limites, ofertas, rating)
--   3. kyc: banking_core.accounts_summary (marca Stone)
--   4. cartao: credit_policy_studies.credit_portfolio_cartoes (rank_mes_ref=1)
--   5. propostas: tbl_concession_negotiations_offer_latest (Pending/Accepted/Available/Cancelled)
--   6. rating: último rating por doc (ROW_NUMBER por offer_expiration_date DESC)
--   7. proposta_ativa: credit_policy_studies.credit_portfolio (rank_mes=1, match por offer_id)

CREATE OR REPLACE TABLE `sbj7ujlwjbsknn8v396xaahlf4ogck.Dias_Credit.base_felicia` AS (

WITH base AS (
  SELECT DISTINCT CNPJ
  FROM `dataplatform-prd.credit_policy_studies.ART_TB_MONITORAMENTO_OFERTAS_SEGUNDA_ONDA`

  UNION DISTINCT

  SELECT DISTINCT customer_document AS CNPJ
  FROM `dataplatform-prd.credit_data_tribe.tbl_concession_negotiations_offer_latest`
  WHERE negotiation_status IN ("Pending", "Accepted", "Available")
    AND product_sales_channel = "Stone"
),

carteira AS (
  SELECT
    CNPJ,
    LIMITE_KGIRO_FINAL,
    LIMITE_CARTAO_FINAL,
    LIMITE_GFACIL_FINAL,
    OFERTA_GIRO,
    OFERTA_CARTAO,
    OFERTA_LIMICONTA,
    RATING
  FROM `dataplatform-prd.credit_policy_studies.ART_TB_MONITORAMENTO_OFERTAS_SEGUNDA_ONDA`
  WHERE CNPJ IN (SELECT DISTINCT CNPJ FROM base)
),

kyc AS (
  SELECT DISTINCT
    a.owner_document,
    a.account_type,
    a.last_kyc_approved_at,
    CASE WHEN a.last_kyc_approved_at IS NULL THEN "KYC Pendente" ELSE "KYC Aprovado" END AS kyc_status
  FROM `dataplatform-treated-prod.banking_core.accounts_summary` a
  WHERE a.owner_document IN (SELECT DISTINCT CNPJ FROM base)
    AND a.marca = "Stone"
),

cartao AS (
  SELECT
    documento_dono,
    tipo_documento,
    documento_usuario,
    flag_piloto_interno,
    limite_concedido,
    limite_disponivel,
    limite_utilizado_clean,
    limite_concedido_collateral,
    faixa_atraso
  FROM `dataplatform-prd.credit_policy_studies.credit_portfolio_cartoes`
  WHERE LPAD(documento_dono, 14, '0') IN (SELECT DISTINCT CNPJ FROM base)
    AND rank_mes_ref = 1
),

propostas AS (
  SELECT DISTINCT
    offer_id,
    customer_document,
    offer_status,
    offer_expiration_date,
    approval_status,
    negotiation_status,
    negotiation_last_update_date,
    proposal_status,
    offer_rating,
    disbursement_value,
    disbursement_date,
    product_sales_channel,
    negotiation_cancellation_reason
  FROM `dataplatform-prd.credit_data_tribe.tbl_concession_negotiations_offer_latest`
  WHERE customer_document IN (SELECT DISTINCT CNPJ FROM base)
    AND negotiation_status IN ("Pending", "Accepted", "Available", "Cancelled")
),

rating AS (
  SELECT DISTINCT
    customer_document,
    offer_rating
  FROM propostas
  QUALIFY ROW_NUMBER() OVER (PARTITION BY customer_document ORDER BY offer_expiration_date DESC) = 1
),

proposta_ativa AS (
  SELECT DISTINCT
    documento,
    id_oferta,
    faixa_atraso,
    qtd_parcelas,
    tx_juros_mes,
    data_vencimento,
    rating_contabilidade
  FROM `dataplatform-prd.credit_policy_studies.credit_portfolio`
  WHERE id_oferta IN (SELECT DISTINCT offer_id FROM propostas)
    AND rank_mes = 1
)

SELECT
  b.CNPJ,
  c.LIMITE_KGIRO_FINAL,
  c.LIMITE_CARTAO_FINAL,
  c.LIMITE_GFACIL_FINAL,
  c.OFERTA_GIRO,
  c.OFERTA_CARTAO,
  c.OFERTA_LIMICONTA,
  COALESCE(c.RATING, r.offer_rating) AS RATING,
  k.account_type,
  k.last_kyc_approved_at,
  k.kyc_status,
  ca.documento_dono,
  ca.tipo_documento,
  ca.documento_usuario,
  ca.flag_piloto_interno,
  ca.limite_concedido,
  ca.limite_disponivel,
  ca.limite_utilizado_clean,
  ca.limite_concedido_collateral,
  ca.faixa_atraso,
  p.offer_id,
  p.customer_document,
  p.offer_status,
  p.offer_expiration_date,
  p.approval_status,
  p.negotiation_status,
  p.negotiation_last_update_date,
  p.proposal_status,
  p.offer_rating,
  p.disbursement_value,
  p.disbursement_date,
  p.product_sales_channel,
  p.negotiation_cancellation_reason,
  CURRENT_DATE() AS data_processamento,
  pa.faixa_atraso AS faixa_atraso_credito_ativo,
  pa.qtd_parcelas AS qtd_parcelas_credito_ativo,
  pa.tx_juros_mes AS tx_juros_mes__credito_ativo,
  pa.data_vencimento AS data_vencimento_credito_ativo,
  pa.rating_contabilidade AS rating_contabilidade_credito_ativo
FROM base b
LEFT JOIN carteira c        ON b.CNPJ = c.CNPJ
LEFT JOIN cartao ca         ON b.CNPJ = ca.documento_dono
LEFT JOIN propostas p       ON b.CNPJ = p.customer_document
LEFT JOIN kyc k             ON b.CNPJ = k.owner_document
LEFT JOIN rating r          ON b.CNPJ = r.customer_document
LEFT JOIN proposta_ativa pa ON b.CNPJ = pa.documento AND pa.id_oferta = p.offer_id
)
