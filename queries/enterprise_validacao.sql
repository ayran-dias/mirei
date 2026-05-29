-- ═══════════════════════════════════════════════════════════════
-- enterprise_validacao.sql
-- Objetivo: validar mapeamento de campos vs Looker antes de
--           implementar o frontend Enterprise.
--
-- Benchmarks esperados (04/2026, do Looker):
--   GMV          = 3.014.858.366
--   TPV Cartão   = 2.117.753.809
--   TPV Pix      =   893.595.341
--   TPV Boleto   =     3.509.216
--   TPV Sub      =    12.686.216
--   TPV GTW      = 1.619.749.669
--   NetMDR       =     2.027.052
--   NetMDR%      =         0,10%
--   Aluguel      =       312.853
--   %Aluguel     =         0,010%
--   Rcta nCOF    =    10.819.028
--   TkR nCOF     =         0,36%
--   Margem       =     9.092.792
--   Margem/GMV   =         0,30%
-- ═══════════════════════════════════════════════════════════════

-- ── Query 1: Base Geral (12 meses, carteira total) ────────────
-- Validar contra a tabela "BASE GERAL" do Looker (sem filtros)
SELECT
  FORMAT_DATE('%Y-%m', Dt_Month) AS mes,
  ROUND(SUM(GMV), 2)                                                              AS gmv,
  ROUND(SUM(TPV_Adquirencia), 2)                                                  AS tpv_cartao,
  ROUND(SUM(Pix_Total), 2)                                                        AS tpv_pix,
  ROUND(SUM(TPV_BOLETO), 2)                                                       AS tpv_boleto,
  ROUND(SUM(TPV_Sub), 2)                                                          AS tpv_sub,
  ROUND(SUM(TPV_Gateway), 2)                                                      AS tpv_gtw,
  ROUND(SUM(Net_MDR_Stone), 2)                                                    AS net_mdr,
  ROUND(SAFE_DIVIDE(SUM(Net_MDR_Stone), NULLIF(SUM(TPV_Adquirencia), 0)), 4)     AS net_mdr_pct,
  ROUND(SUM(Rcta_Aluguel), 2)                                                     AS aluguel,
  ROUND(SAFE_DIVIDE(SUM(Rcta_Aluguel), NULLIF(SUM(GMV), 0)), 4)                  AS aluguel_pct,
  ROUND(SUM(Receita_Net_COF), 2)                                                  AS receita_ncof,
  ROUND(SAFE_DIVIDE(SUM(Receita_Net_COF), NULLIF(SUM(GMV), 0)), 4)               AS tkr_ncof,
  ROUND(SUM(Margem_Query), 2)                                                     AS margem,
  ROUND(SAFE_DIVIDE(SUM(Margem_Query), NULLIF(SUM(GMV), 0)), 4)                  AS margem_gmv
FROM `sbj7ujlwjbsknn8v396xaahlf4ogck.Dias.PnL_FELICIA_KA_com_Appends`
WHERE Dt_Month >= DATE_SUB(CURRENT_DATE(), INTERVAL 12 MONTH)
GROUP BY Dt_Month
ORDER BY Dt_Month DESC;


-- ── Query 2: Visão 3M Grupos (plano, para pivot no React) ─────
-- Retorna flat: grupo × mês × métricas. React pivota.
-- Validar contra tabelas "TPV Grupos" e "Receita NetCOF Grupos"
SELECT
  motivo                                                                           AS grupo,
  FORMAT_DATE('%Y-%m', Dt_Month)                                                  AS mes,
  ROUND(SUM(GMV), 2)                                                              AS gmv,
  ROUND(SUM(Receita_Net_COF), 2)                                                  AS receita_ncof,
  ROUND(SAFE_DIVIDE(SUM(Receita_Net_COF), NULLIF(SUM(GMV), 0)), 4)               AS tkr_ncof
FROM `sbj7ujlwjbsknn8v396xaahlf4ogck.Dias.PnL_FELICIA_KA_com_Appends`
WHERE Dt_Month >= DATE_TRUNC(DATE_SUB(CURRENT_DATE(), INTERVAL 3 MONTH), MONTH)
  AND motivo IS NOT NULL
GROUP BY motivo, Dt_Month
ORDER BY SUM(GMV) DESC, Dt_Month DESC;


-- ── Query 3: Métricas por Cliente (último mês completo) ───────
-- Validar contra tabela "Métricas Por Cliente" do Looker
-- Último mês completo = DATE_TRUNC(DATE_SUB(CURRENT_DATE(), INTERVAL 1 MONTH), MONTH)
SELECT
  motivo                                                                           AS grupo,
  ROUND(SUM(GMV), 2)                                                              AS gmv,
  ROUND(SUM(TPV_Adquirencia), 2)                                                  AS tpv_cartao,
  ROUND(SUM(Pix_Total), 2)                                                        AS tpv_pix,
  ROUND(SUM(Net_MDR_Stone), 2)                                                    AS net_mdr,
  ROUND(SAFE_DIVIDE(SUM(Net_MDR_Stone), NULLIF(SUM(TPV_Adquirencia), 0)), 4)     AS net_mdr_pct,
  ROUND(SUM(Vlr_GrossValue_STN), 2)                                               AS gross_rav,
  ROUND(SUM(Floating_Stn), 2)                                                     AS floating,
  ROUND(SAFE_DIVIDE(SUM(Floating_Stn), NULLIF(SUM(GMV), 0)), 4)                  AS floating_pct,
  ROUND(SUM(Receita_Pix_Geral), 2)                                                AS rcta_pix,
  ROUND(SAFE_DIVIDE(SUM(Receita_Pix_Geral), NULLIF(SUM(GMV), 0)), 4)             AS pix_pct,
  ROUND(SUM(Margem_RAV_STN), 2)                                                   AS mrg_rav,
  ROUND(
    SAFE_DIVIDE(SUM(TxPre_x_GrossValue), NULLIF(SUM(Vlr_GrossValue_STN), 0)), 4) AS tx_simples,
  ROUND(
    SAFE_DIVIDE(SUM(DurationDC_x_GrossValue), NULLIF(SUM(Vlr_GrossValue_STN), 0)), 1) AS duration_dc,
  ROUND(SUM(Receita_Net_COF), 2)                                                  AS rct_netcof,
  ROUND(SAFE_DIVIDE(SUM(Receita_Net_COF), NULLIF(SUM(GMV), 0)), 4)               AS tkr_ncof,
  ROUND(SUM(Margem_Query), 2)                                                     AS margem,
  ROUND(SAFE_DIVIDE(SUM(Margem_Query), NULLIF(SUM(GMV), 0)), 4)                  AS margem_gmv
FROM `sbj7ujlwjbsknn8v396xaahlf4ogck.Dias.PnL_FELICIA_KA_com_Appends`
WHERE Dt_Month = DATE_TRUNC(DATE_SUB(CURRENT_DATE(), INTERVAL 1 MONTH), MONTH)
  AND motivo IS NOT NULL
GROUP BY motivo
ORDER BY SUM(GMV) DESC;


-- ── Query 4: Transacional Cartão (carteira mensal) ────────────
-- Validar contra tabela "Transacional Cartão - Carteira ao longo dos meses"
SELECT
  FORMAT_DATE('%Y-%m', Dt_Month)                                                  AS mes,
  ROUND(SUM(TPV_Adquirencia), 2)                                                  AS ctpv,
  ROUND(SUM(MDR_Stone), 2)                                                        AS mdr,
  ROUND(SUM(IC_Stone), 2)                                                         AS ic,
  ROUND(SUM(CAST(Fee_Stone AS FLOAT64)), 2)                                       AS fee,
  ROUND(SUM(Net_MDR_Stone), 2)                                                    AS net_mdr,
  ROUND(SUM(Impostos_MDR_Stone), 2)                                               AS impostos,
  ROUND(SAFE_DIVIDE(SUM(MDR_Stone), NULLIF(SUM(TPV_Adquirencia), 0)), 4)         AS mdr_pct,
  ROUND(SAFE_DIVIDE(SUM(Net_MDR_Stone), NULLIF(SUM(TPV_Adquirencia), 0)), 4)     AS net_mdr_pct
FROM `sbj7ujlwjbsknn8v396xaahlf4ogck.Dias.PnL_FELICIA_KA_com_Appends`
WHERE Dt_Month >= DATE_SUB(CURRENT_DATE(), INTERVAL 12 MONTH)
GROUP BY Dt_Month
ORDER BY Dt_Month DESC;


-- ── Query 5: RAV canal (mensal) ───────────────────────────────
-- Validar contra tabela "RAV (canal)" do Looker
-- Looker 04/2026: TPV Ant=1.739.360.614, Gross=454.870.098, %RAV=26%,
--   Rcta RAV=19.246.741, COF=14.872.066, Mrg RAV=3.479.701, Mrg RAV%=0,12%
SELECT
  DATE_TRUNC(Dt_Month, MONTH)                                                     AS dt_month,
  FORMAT_DATE('%Y-%m', Dt_Month)                                                  AS mes,
  ROUND(SUM(TPV_antecipavel_geral), 2)                                            AS tpv_antecipavel,
  ROUND(SUM(Vlr_GrossValue_STN), 2)                                               AS gross,
  ROUND(SAFE_DIVIDE(SUM(Vlr_GrossValue_STN), NULLIF(SUM(TPV_antecipavel_geral), 0)), 4) AS pct_rav,
  ROUND(SUM(Receita_RAV_STN), 2)                                                  AS rcta_rav,
  ROUND(SUM(Vlr_Custo_fund_STN), 2)                                               AS cof,
  ROUND(SUM(Margem_RAV_STN), 2)                                                   AS mrg_rav,
  ROUND(SAFE_DIVIDE(SUM(Margem_RAV_STN), NULLIF(SUM(TPV_antecipavel_geral), 0)), 4) AS mrg_rav_pct,
  ROUND(SAFE_DIVIDE(SUM(TxPre_x_GrossValue), NULLIF(SUM(Vlr_GrossValue_STN), 0)), 4) AS tx_simples,
  ROUND(SAFE_DIVIDE(SUM(DurationDC_x_GrossValue), NULLIF(SUM(Vlr_GrossValue_STN), 0)), 1) AS duration_dc
FROM `sbj7ujlwjbsknn8v396xaahlf4ogck.Dias.PnL_FELICIA_KA_com_Appends`
WHERE Dt_Month >= DATE_SUB(CURRENT_DATE(), INTERVAL 12 MONTH)
GROUP BY Dt_Month
ORDER BY Dt_Month DESC;


-- ── Query 6: Linhas de Receita (mensal agregado) ──────────────
-- Validar contra gráfico "Linhas de Receita" do Looker
SELECT
  FORMAT_DATE('%Y-%m', Dt_Month)                                                  AS mes,
  ROUND(SUM(Net_MDR_Stone), 2)                                                    AS rcta_net_mdr,
  ROUND(SUM(Receita_Pix_Geral), 2)                                                AS rcta_pix,
  ROUND(SUM(Margem_RAV_STN), 2)                                                   AS mrg_rav,
  ROUND(SUM(Rcta_gateway), 2)                                                     AS rcta_gateway,
  ROUND(SUM(Rcta_Aluguel), 2)                                                     AS rcta_aluguel,
  ROUND(SUM(Floating_Stn), 2)                                                     AS rcta_floating,
  ROUND(SUM(Receita_Net_COF), 2)                                                  AS receita_ncof,
  ROUND(SUM(custo_servir_Total) * -1, 2)                                          AS custo_servir,
  ROUND(SUM(Margem_Query), 2)                                                     AS margem
FROM `sbj7ujlwjbsknn8v396xaahlf4ogck.Dias.PnL_FELICIA_KA_com_Appends`
WHERE Dt_Month >= DATE_SUB(CURRENT_DATE(), INTERVAL 24 MONTH)
GROUP BY Dt_Month
ORDER BY Dt_Month DESC;
