-- engine: bigquery
-- =============================================================================
-- resumo_conta_historico_v4_merge.sql
-- MERGE incremental otimizado para partition pruning
-- Destino: sbj7ujlwjbsknn8v396xaahlf4ogck.Dias_PnL.resumo_conta_historico
-- =============================================================================
-- Mudancas vs v3 (Parte B):
--   1. fct_one_number_banking: adicionado `reference_date BETWEEN` (partition col)
--      em CTEs seguros e banking_receitas. Reducao: ~1.7 TB por run.
--   2. PnL_Dashs_part: adicionado `Dt_Month_date BETWEEN` (partition col)
--      em CTE floating_delayed. Reducao: ~50 GB por run.
--   3. Custo total: 2.07 TB -> 0.31 TB (-85%)
-- =============================================================================

-- 2 meses atras para capturar correcoes retroativas no mes anterior

MERGE `sbj7ujlwjbsknn8v396xaahlf4ogck.Dias_PnL.resumo_conta_historico` T
USING (

  WITH documentos_filtro AS (
      SELECT DISTINCT s.owner_document AS doc
      FROM `dataplatform-treated-prod.banking_core.accounts_summary` s
      WHERE s.client_group = 'SMB'
        AND s.marca = 'Stone'
  ),

  saldo_raw AS (
      SELECT
          f.reference_date                AS data,
          s.owner_document                AS document,
          ROUND(SUM(f.available_balance + f.blocked_balance + f.risk_balance
                    + f.reserved_balance + f.closed_balance), 2)                 AS saldo_conta,
          ROUND(SUM(f.available_balance + f.blocked_balance + f.risk_balance
                    + f.reserved_balance + f.closed_balance + f.cdb_balance), 2) AS saldo_conta_visao_cliente,
          ROUND(SUM(f.reserva_invested_balance + f.reserva_income_balance
                    + f.old_invested_balance + f.old_income_balance), 2)         AS saldo_reservas,
          ROUND(SUM(f.cdb_balance), 2)    AS saldo_raspa_conta,
          ROUND(SUM(f.total_balance), 2)  AS saldo_total
      FROM `dataplatform-treated-prod.banking_core.fact_balance` f
      INNER JOIN `dataplatform-treated-prod.banking_core.accounts_summary` s
          ON s.account_id = f.account_id
          AND s.client_group = 'SMB'
          AND s.marca = 'Stone'
      INNER JOIN documentos_filtro df ON df.doc = s.owner_document
      INNER JOIN `dataplatform-treated-prod.cross_company.dim_date` dd
          ON f.reference_date = dd.full_date
      WHERE f.reference_date BETWEEN DATE_TRUNC(DATE_SUB(CURRENT_DATE(), INTERVAL 2 MONTH), MONTH) AND DATE_SUB(DATE_TRUNC(CURRENT_DATE(), MONTH), INTERVAL 1 DAY)
          AND dd.weekday_weekend = 'Dia da Semana'
          AND dd.is_national_holiday = 0
      GROUP BY data, s.owner_document
  ),

  saldo AS (
      SELECT
          DATE_TRUNC(sr.data, MONTH)                  AS reference_month,
          sr.document,
          ROUND(AVG(sr.saldo_conta), 2)               AS media_saldo_conta,
          ROUND(AVG(sr.saldo_conta_visao_cliente), 2) AS media_saldo_conta_visao_cliente,
          ROUND(AVG(sr.saldo_reservas), 2)            AS media_saldo_reservas,
          ROUND(AVG(sr.saldo_raspa_conta), 2)         AS media_saldo_raspa_conta,
          ROUND(AVG(sr.saldo_total), 2)               AS media_saldo_total
      FROM saldo_raw sr
      GROUP BY 1, 2
  ),

  emissoes_todos AS (
      SELECT
          DATE_TRUNC(e.reference_month, MONTH) AS reference_month,
          e.owner_document                     AS document,
          SUM(e.invoice_issued_count)          AS qtd_boleto_emitido,
          SUM(e.invoice_settled_tpv)           AS vlr_boleto_liquidado,
          SUM(e.invoice_settled_trx)           AS qtd_boleto_liquidado
      FROM `dataplatform-treated-prod.banking_core.monthly_account_economics` e
      INNER JOIN documentos_filtro df ON df.doc = e.owner_document
      WHERE e.reference_month BETWEEN DATE_TRUNC(DATE_SUB(CURRENT_DATE(), INTERVAL 2 MONTH), MONTH) AND DATE_SUB(DATE_TRUNC(CURRENT_DATE(), MONTH), INTERVAL 1 DAY)
      GROUP BY 1, 2
  ),

  emissoes_limpeza AS (
      SELECT document, SUM(qtd_boleto_emitido) AS qtd_total
      FROM emissoes_todos
      GROUP BY document
  ),

  emissoes AS (
      SELECT et.*
      FROM emissoes_todos et
      INNER JOIN emissoes_limpeza el
          ON el.document = et.document
         AND el.qtd_total > 1
  ),

  -- v4: adicionado reference_date BETWEEN para partition pruning
  seguros AS (
      SELECT
        DATE_TRUNC(b.reference_month, MONTH) AS reference_month,
        b.document,
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
      WHERE b.reference_date BETWEEN DATE_TRUNC(DATE_SUB(CURRENT_DATE(), INTERVAL 2 MONTH), MONTH) AND DATE_SUB(DATE_TRUNC(CURRENT_DATE(), MONTH), INTERVAL 1 DAY)
        AND b.reference_month BETWEEN DATE_TRUNC(DATE_SUB(CURRENT_DATE(), INTERVAL 2 MONTH), MONTH) AND DATE_SUB(DATE_TRUNC(CURRENT_DATE(), MONTH), INTERVAL 1 DAY)
        AND b.product = 'INSURANCE'
        AND UPPER(b.product_type) IN ('LIFE','PROTECTED INCOME','LENDER','STORE','CARD','TRANSACTION')
        AND b.company_name IN ('STONE', 'PAGARME')
      GROUP BY 1, 2
  ),

  -- v4: adicionado reference_date BETWEEN para partition pruning
  banking_receitas AS (
      SELECT
        DATE_TRUNC(b.reference_month, MONTH) AS reference_month,
        b.document,
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
      WHERE b.reference_date BETWEEN DATE_TRUNC(DATE_SUB(CURRENT_DATE(), INTERVAL 2 MONTH), MONTH) AND DATE_SUB(DATE_TRUNC(CURRENT_DATE(), MONTH), INTERVAL 1 DAY)
        AND b.reference_month BETWEEN DATE_TRUNC(DATE_SUB(CURRENT_DATE(), INTERVAL 2 MONTH), MONTH) AND DATE_SUB(DATE_TRUNC(CURRENT_DATE(), MONTH), INTERVAL 1 DAY)
        AND b.company_name IN ('STONE', 'PAGARME')
      GROUP BY 1, 2
  ),

  -- v4: adicionado Dt_Month_date BETWEEN para partition pruning
  floating_delayed AS (
      SELECT
        DATE_TRUNC(p.Dt_Month, MONTH)   AS reference_month,
        p.ClientCNPJorCPF                AS document,
        SUM(p.floating_delayed)          AS receita_floating_delayed
      FROM `sbj7ujlwjbsknn8v396xaahlf4ogck.Dias_PnL.PnL_Dashs_part` p
      WHERE p.Dt_Month_date BETWEEN DATE_TRUNC(DATE_SUB(CURRENT_DATE(), INTERVAL 2 MONTH), MONTH) AND DATE_SUB(DATE_TRUNC(CURRENT_DATE(), MONTH), INTERVAL 1 DAY)
        AND p.Dt_Month BETWEEN DATE_TRUNC(DATE_SUB(CURRENT_DATE(), INTERVAL 2 MONTH), MONTH) AND DATE_SUB(DATE_TRUNC(CURRENT_DATE(), MONTH), INTERVAL 1 DAY)
        AND p.floating_delayed IS NOT NULL
        AND p.floating_delayed != 0
      GROUP BY 1, 2
  ),

  consolidated AS (
      SELECT
        COALESCE(s.reference_month, e.reference_month, sg.reference_month,
                 br.reference_month, fd.reference_month) AS reference_month,
        COALESCE(s.document, e.document, sg.document,
                 br.document, fd.document) AS document,
        s.media_saldo_conta,
        s.media_saldo_conta_visao_cliente,
        s.media_saldo_reservas,
        s.media_saldo_raspa_conta,
        s.media_saldo_total,
        e.qtd_boleto_emitido,
        e.vlr_boleto_liquidado,
        e.qtd_boleto_liquidado,
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
      FROM saldo s
      FULL OUTER JOIN emissoes e
          ON s.reference_month = e.reference_month AND s.document = e.document
      FULL OUTER JOIN seguros sg
          ON COALESCE(s.reference_month, e.reference_month) = sg.reference_month
         AND COALESCE(s.document, e.document) = sg.document
      FULL OUTER JOIN banking_receitas br
          ON COALESCE(s.reference_month, e.reference_month, sg.reference_month) = br.reference_month
         AND COALESCE(s.document, e.document, sg.document) = br.document
      FULL OUTER JOIN floating_delayed fd
          ON COALESCE(s.reference_month, e.reference_month, sg.reference_month, br.reference_month) = fd.reference_month
         AND COALESCE(s.document, e.document, sg.document, br.document) = fd.document
  )

  SELECT * FROM consolidated

) S
ON T.document = S.document AND T.reference_month = S.reference_month

WHEN MATCHED THEN UPDATE SET
    T.media_saldo_conta               = S.media_saldo_conta,
    T.media_saldo_conta_visao_cliente = S.media_saldo_conta_visao_cliente,
    T.media_saldo_reservas            = S.media_saldo_reservas,
    T.media_saldo_raspa_conta         = S.media_saldo_raspa_conta,
    T.media_saldo_total               = S.media_saldo_total,
    T.qtd_boleto_emitido              = S.qtd_boleto_emitido,
    T.vlr_boleto_liquidado            = S.vlr_boleto_liquidado,
    T.qtd_boleto_liquidado            = S.qtd_boleto_liquidado,
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
    reference_month, document,
    media_saldo_conta, media_saldo_conta_visao_cliente,
    media_saldo_reservas, media_saldo_raspa_conta, media_saldo_total,
    qtd_boleto_emitido, vlr_boleto_liquidado, qtd_boleto_liquidado,
    receita_seguros, produtos_seguro,
    receita_floating_sweep, receita_pix_pos, tpv_pix_pos, trx_pix_pos,
    receita_floating_conta_reserva, receita_interchange_cartao, receita_cartao,
    receita_boleto, receita_juros_rotativo, receita_movimentacao,
    receita_outros_cartao, gmv_cartao, receita_outros_banking,
    receita_floating_delayed
) VALUES (
    S.reference_month, S.document,
    S.media_saldo_conta, S.media_saldo_conta_visao_cliente,
    S.media_saldo_reservas, S.media_saldo_raspa_conta, S.media_saldo_total,
    S.qtd_boleto_emitido, S.vlr_boleto_liquidado, S.qtd_boleto_liquidado,
    S.receita_seguros, S.produtos_seguro,
    S.receita_floating_sweep, S.receita_pix_pos, S.tpv_pix_pos, S.trx_pix_pos,
    S.receita_floating_conta_reserva, S.receita_interchange_cartao, S.receita_cartao,
    S.receita_boleto, S.receita_juros_rotativo, S.receita_movimentacao,
    S.receita_outros_cartao, S.gmv_cartao, S.receita_outros_banking,
    S.receita_floating_delayed
);
