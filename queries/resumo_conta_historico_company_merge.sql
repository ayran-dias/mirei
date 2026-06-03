-- engine: bigquery
-- =============================================================================
-- resumo_conta_historico_company_merge.sql
-- MERGE incremental para tabela com granularidade doc × company × month
-- Destino: sbj7ujlwjbsknn8v396xaahlf4ogck.Dias_PnL.resumo_conta_historico_company
-- =============================================================================
-- Motivacao: evitar scan direto em fct_one_number_banking (~0.15TB/query)
-- quando o dashboard filtra por company. A tabela original
-- resumo_conta_historico agrega STONE+PAGARME; esta tabela mantem
-- a dimensao company_name para queries filtradas.
--
-- Colunas de saldo e boleto NAO existem aqui (sao account-level, sem company).
-- O Code.gs faz JOIN com resumo_conta_historico para essas colunas.
--
-- Schedule: rodar junto com resumo_conta_historico_v4_merge (semanal).
-- =============================================================================

DECLARE dt_start DATE DEFAULT DATE_TRUNC(DATE_SUB(CURRENT_DATE(), INTERVAL 2 MONTH), MONTH);
DECLARE dt_end   DATE DEFAULT DATE_SUB(DATE_TRUNC(CURRENT_DATE(), MONTH), INTERVAL 1 DAY);

-- Criar tabela se nao existir
CREATE TABLE IF NOT EXISTS `sbj7ujlwjbsknn8v396xaahlf4ogck.Dias_PnL.resumo_conta_historico_company` (
    document STRING,
    reference_month DATE,
    company_name STRING,
    receita_seguros FLOAT64,
    produtos_seguro STRING,
    receita_floating_sweep FLOAT64,
    receita_pix_pos FLOAT64,
    tpv_pix_pos FLOAT64,
    trx_pix_pos INT64,
    receita_floating_conta_reserva FLOAT64,
    receita_interchange_cartao FLOAT64,
    receita_cartao FLOAT64,
    receita_boleto FLOAT64,
    receita_juros_rotativo FLOAT64,
    receita_movimentacao FLOAT64,
    receita_outros_cartao FLOAT64,
    gmv_cartao FLOAT64,
    receita_outros_banking FLOAT64,
    receita_floating_delayed FLOAT64
)
PARTITION BY reference_month
CLUSTER BY document, company_name;

MERGE `sbj7ujlwjbsknn8v396xaahlf4ogck.Dias_PnL.resumo_conta_historico_company` T
USING (

  WITH documentos_filtro AS (
      SELECT DISTINCT s.owner_document AS doc
      FROM `dataplatform-treated-prod.banking_core.accounts_summary` s
      WHERE s.client_group = 'SMB'
        AND s.marca = 'Stone'
  ),

  -- v4: adicionado reference_date BETWEEN para partition pruning
  seguros AS (
      SELECT
        DATE_TRUNC(b.reference_month, MONTH) AS reference_month,
        b.document,
        b.company_name,
        SUM(COALESCE(b.revenue_net_taxes, b.revenue_estimated_net_taxes, 0)) AS receita_seguros,
        STRING_AGG(DISTINCT
          CASE UPPER(b.product_type)
            WHEN 'LIFE'             THEN 'Vida'
            WHEN 'PROTECTED INCOME' THEN 'Perda de Renda'
            WHEN 'LENDER'           THEN 'Prestamista'
            WHEN 'STORE'            THEN 'Loja'
            WHEN 'CARD'             THEN 'Cartao'
            WHEN 'TRANSACTION'      THEN 'Transacoes'
          END
        ORDER BY
          CASE UPPER(b.product_type)
            WHEN 'LIFE'             THEN 'Vida'
            WHEN 'PROTECTED INCOME' THEN 'Perda de Renda'
            WHEN 'LENDER'           THEN 'Prestamista'
            WHEN 'STORE'            THEN 'Loja'
            WHEN 'CARD'             THEN 'Cartao'
            WHEN 'TRANSACTION'      THEN 'Transacoes'
          END
        ) AS produtos_seguro
      FROM `dataplatform-treated-prod.segment_core.fct_one_number_banking` b
      WHERE b.reference_date BETWEEN dt_start AND dt_end
        AND b.reference_month BETWEEN dt_start AND dt_end
        AND b.product = 'INSURANCE'
        AND UPPER(b.product_type) IN ('LIFE','PROTECTED INCOME','LENDER','STORE','CARD','TRANSACTION')
        AND b.company_name IN ('STONE', 'PAGARME')
      GROUP BY 1, 2, 3
  ),

  -- v4: adicionado reference_date BETWEEN para partition pruning
  banking_receitas AS (
      SELECT
        DATE_TRUNC(b.reference_month, MONTH) AS reference_month,
        b.document,
        b.company_name,
        SUM(CASE WHEN b.product = 'BALANCE' AND b.product_type = 'SWEEP ACCOUNT'
                 THEN COALESCE(b.revenue_net_taxes, 0) END) AS receita_floating_sweep,
        SUM(CASE WHEN b.product = 'MOVEMENT' AND b.product_type = 'PIX'
                      AND b.product_sub_type = 'POS' AND b.movement_type = 'IN'
                 THEN COALESCE(b.revenue_net_taxes, 0) END) AS receita_pix_pos,
        SUM(CASE WHEN b.product = 'MOVEMENT' AND b.product_type = 'PIX'
                      AND b.product_sub_type = 'POS' AND b.movement_type = 'IN'
                 THEN COALESCE(b.movement, 0) END) AS tpv_pix_pos,
        SUM(CASE WHEN b.product = 'MOVEMENT' AND b.product_type = 'PIX'
                      AND b.product_sub_type = 'POS' AND b.movement_type = 'IN'
                 THEN COALESCE(b.qty_trx, 0) END) AS trx_pix_pos,
        SUM(CASE WHEN b.product = 'BALANCE' AND b.product_type = 'PAYMENT ACCOUNT'
                 THEN COALESCE(b.revenue_net_taxes, 0)
                 WHEN b.product = 'BALANCE' AND b.product_type = 'RESERVA'
                 THEN COALESCE(b.revenue_net_taxes, 0) + COALESCE(b.cost, 0)
                 END) AS receita_floating_conta_reserva,
        SUM(CASE WHEN b.product = 'CARD' AND b.product_type IN (
                      'INTERCHANGE PREPAID DEBIT', 'INTERCHANGE CREDIT')
                 THEN COALESCE(b.revenue_net_taxes, 0) END) AS receita_interchange_cartao,
        SUM(CASE WHEN b.product = 'CARD' AND b.product_type IN ('DEBIT', 'CREDIT')
                 THEN COALESCE(b.revenue_net_taxes, 0) END) AS receita_cartao,
        SUM(CASE WHEN b.product = 'MOVEMENT' AND b.product_type = 'BOLETO'
                 THEN COALESCE(b.revenue_net_taxes, 0) END) AS receita_boleto,
        SUM(CASE WHEN b.product = 'CARD' AND b.product_type = 'ROTATIVE CREDIT'
                 THEN COALESCE(b.revenue_net_taxes, 0) END) AS receita_juros_rotativo,
        SUM(CASE WHEN b.product = 'MOVEMENT' AND b.product_type = 'TED'
                 THEN COALESCE(b.revenue_net_taxes, 0)
                 WHEN b.product = 'MOVEMENT' AND b.product_type = 'WITHDRAWAL'
                 THEN COALESCE(b.revenue_net_taxes, 0)
                 WHEN b.product = 'MOVEMENT' AND b.product_type = 'TOPUPS'
                 THEN COALESCE(b.revenue_net_taxes, 0)
                 WHEN b.product = 'MOVEMENT' AND b.product_type = 'PIX'
                      AND b.product_sub_type = 'TRANSFER' AND b.movement_type = 'OUT'
                 THEN COALESCE(b.revenue_net_taxes, 0)
                 END) AS receita_movimentacao,
        SUM(CASE WHEN b.product = 'CARD' AND b.product_type = 'CREDIT FINE'
                 THEN COALESCE(b.revenue_net_taxes, 0)
                 WHEN b.product = 'CARD' AND b.product_type IN ('VISA DEBIT REBATE', 'VISA CREDIT REBATE')
                 THEN COALESCE(b.revenue_net_taxes, 0)
                 WHEN b.product = 'CARD' AND b.product_type IN (
                      'INTERNATIONAL PREPAID DEBIT SPREAD', 'INTERNATIONAL CREDIT SPREAD')
                 THEN COALESCE(b.revenue_net_taxes, 0)
                 WHEN b.product = 'BALANCE' AND b.product_type = 'COLATERAL'
                 THEN COALESCE(b.revenue_net_taxes, 0)
                 END) AS receita_outros_cartao,
        SUM(CASE WHEN b.product = 'CARD'
                 THEN COALESCE(b.gmv, 0) END) AS gmv_cartao,
        SUM(CASE WHEN b.product NOT IN ('INSURANCE')
                 AND NOT (b.product = 'BALANCE' AND b.product_type IN (
                      'SWEEP ACCOUNT','RESERVA','PAYMENT ACCOUNT','COLATERAL',
                      'DELAYED PAYMENTS','GRAPHIC ACCOUNT','INVESTED','INACTIVITY FEE'))
                 AND NOT (b.product = 'MOVEMENT' AND b.product_type = 'PIX'
                      AND b.product_sub_type = 'POS' AND b.movement_type = 'IN')
                 AND NOT (b.product = 'MOVEMENT' AND b.product_type = 'PIX'
                      AND b.product_sub_type = 'TRANSFER' AND b.movement_type = 'OUT')
                 AND NOT (b.product = 'MOVEMENT' AND b.product_type IN ('BOLETO','WITHDRAWAL','TED','TOPUPS'))
                 AND NOT (b.product = 'CARD' AND b.product_type IN (
                      'ROTATIVE CREDIT','INTERCHANGE PREPAID DEBIT','INTERCHANGE CREDIT',
                      'DEBIT','CREDIT','CREDIT FINE',
                      'VISA DEBIT REBATE','VISA CREDIT REBATE',
                      'INTERNATIONAL PREPAID DEBIT SPREAD','INTERNATIONAL CREDIT SPREAD'))
                 THEN COALESCE(b.revenue_net_taxes, 0) END) AS receita_outros_banking
      FROM `dataplatform-treated-prod.segment_core.fct_one_number_banking` b
      WHERE b.reference_date BETWEEN dt_start AND dt_end
        AND b.reference_month BETWEEN dt_start AND dt_end
        AND b.company_name IN ('STONE', 'PAGARME')
      GROUP BY 1, 2, 3
  ),

  -- v4: adicionado Dt_Month_date BETWEEN para partition pruning
  -- PnL_Dashs_part tem CompanyName com valores 'Stone' e 'Pagar.me'
  -- Mapeamos para STONE/PAGARME para consistencia
  floating_delayed AS (
      SELECT
        DATE_TRUNC(p.Dt_Month, MONTH)   AS reference_month,
        p.ClientCNPJorCPF                AS document,
        CASE WHEN p.CompanyName = 'Stone' THEN 'STONE'
             WHEN p.CompanyName = 'Pagar.me' THEN 'PAGARME'
             ELSE UPPER(REPLACE(p.CompanyName, '.', ''))
        END AS company_name,
        SUM(p.floating_delayed)          AS receita_floating_delayed
      FROM `sbj7ujlwjbsknn8v396xaahlf4ogck.Dias_PnL.PnL_Dashs_part` p
      WHERE p.Dt_Month_date BETWEEN dt_start AND dt_end
        AND p.Dt_Month BETWEEN dt_start AND dt_end
        AND p.floating_delayed IS NOT NULL
        AND p.floating_delayed != 0
        AND p.CompanyName IN ('Stone', 'Pagar.me')
      GROUP BY 1, 2, 3
  ),

  consolidated AS (
      SELECT
        COALESCE(sg.reference_month, br.reference_month, fd.reference_month) AS reference_month,
        COALESCE(sg.document, br.document, fd.document) AS document,
        COALESCE(sg.company_name, br.company_name, fd.company_name) AS company_name,
        sg.receita_seguros,
        sg.produtos_seguro,
        br.receita_floating_sweep,
        br.receita_pix_pos,
        br.tpv_pix_pos,
        br.trx_pix_pos,
        br.receita_floating_conta_reserva,
        br.receita_interchange_cartao,
        br.receita_cartao,
        br.receita_boleto,
        br.receita_juros_rotativo,
        br.receita_movimentacao,
        br.receita_outros_cartao,
        br.gmv_cartao,
        br.receita_outros_banking,
        fd.receita_floating_delayed
      FROM seguros sg
      FULL OUTER JOIN banking_receitas br
          ON sg.reference_month = br.reference_month
         AND sg.document = br.document
         AND sg.company_name = br.company_name
      FULL OUTER JOIN floating_delayed fd
          ON COALESCE(sg.reference_month, br.reference_month) = fd.reference_month
         AND COALESCE(sg.document, br.document) = fd.document
         AND COALESCE(sg.company_name, br.company_name) = fd.company_name
  )

  SELECT * FROM consolidated

) S
ON T.document = S.document
   AND T.reference_month = S.reference_month
   AND T.company_name = S.company_name

WHEN MATCHED THEN UPDATE SET
    T.receita_seguros                 = S.receita_seguros,
    T.produtos_seguro                 = S.produtos_seguro,
    T.receita_floating_sweep          = S.receita_floating_sweep,
    T.receita_pix_pos                 = S.receita_pix_pos,
    T.tpv_pix_pos                     = S.tpv_pix_pos,
    T.trx_pix_pos                     = S.trx_pix_pos,
    T.receita_floating_conta_reserva  = S.receita_floating_conta_reserva,
    T.receita_interchange_cartao      = S.receita_interchange_cartao,
    T.receita_cartao                  = S.receita_cartao,
    T.receita_boleto                  = S.receita_boleto,
    T.receita_juros_rotativo          = S.receita_juros_rotativo,
    T.receita_movimentacao            = S.receita_movimentacao,
    T.receita_outros_cartao           = S.receita_outros_cartao,
    T.gmv_cartao                      = S.gmv_cartao,
    T.receita_outros_banking          = S.receita_outros_banking,
    T.receita_floating_delayed        = S.receita_floating_delayed

WHEN NOT MATCHED THEN INSERT (
    reference_month, document, company_name,
    receita_seguros, produtos_seguro,
    receita_floating_sweep, receita_pix_pos, tpv_pix_pos, trx_pix_pos,
    receita_floating_conta_reserva, receita_interchange_cartao, receita_cartao,
    receita_boleto, receita_juros_rotativo, receita_movimentacao,
    receita_outros_cartao, gmv_cartao, receita_outros_banking,
    receita_floating_delayed
) VALUES (
    S.reference_month, S.document, S.company_name,
    S.receita_seguros, S.produtos_seguro,
    S.receita_floating_sweep, S.receita_pix_pos, S.tpv_pix_pos, S.trx_pix_pos,
    S.receita_floating_conta_reserva, S.receita_interchange_cartao, S.receita_cartao,
    S.receita_boleto, S.receita_juros_rotativo, S.receita_movimentacao,
    S.receita_outros_cartao, S.gmv_cartao, S.receita_outros_banking,
    S.receita_floating_delayed
);
