-- Fonte: PnL_Dashs (tabela do Ayran)
-- Rentabilidade de adquirência por documento/mês
-- Tabela: sbj7ujlwjbsknn8v396xaahlf4ogck.Dias_PnL.PnL_Dashs_part
-- Grão: documento × mês
--
-- Métricas:
--   GMV (volume total), TPV_Cartao, TPV_PIX_Total
--   Net_MDR (receita MDR líquida de interchange)
--   Floating (receita de float)
--   Rcta_Aluguel (receita de aluguel de maquininha)
--   Margem_RAV_STN (margem de antecipação)
--   Receita_TED, Receita_Pix
--   Receita_Net_COF (receita total net of COF = soma das linhas acima)
--   COGs (custo de servir, invertido p/ positivo)
--   Margem (= Receita_Net_COF - COGs)
--   floating_delayed (float diferido)
--   Percentuais: pctg_Net_MDR, pctg_Floating, pctg_Aluguel, pctg_Margem_RAV, pctg_Pix, tkr_netCOF, Margem_div_GMV, Delay_pct

SELECT
    Dt_Month,
    ClientCNPJorCPF AS documento,

    ROUND(SUM(GMV), 2) AS GMV,
    ROUND(SUM(TPV_Adquirencia), 2) AS TPV_Cartao,
    ROUND(SUM(Pix_Total), 2) AS TPV_PIX_Total,

    ROUND(SUM(Net_MDR_Stone), 2) AS Net_MDR,
    ROUND(SAFE_DIVIDE(SUM(Net_MDR_Stone), SUM(TPV_Adquirencia)), 4) AS pctg_Net_MDR,

    ROUND(SUM(Floating_Stn), 2) AS Floating,
    SAFE_DIVIDE(ROUND(SUM(Floating_Stn), 2), SUM(GMV)) AS pctg_Floating,

    ROUND(SUM(Rcta_Aluguel), 2) AS Rcta_Aluguel,
    SAFE_DIVIDE(ROUND(SUM(Rcta_Aluguel), 2), SUM(GMV)) AS pctg_Aluguel,

    ROUND(SUM(Margem_RAV_STN), 2) AS Margem_RAV_STN,
    SAFE_DIVIDE(ROUND(SUM(Margem_RAV_STN), 2), SUM(GMV)) AS pctg_Margem_RAV,

    ROUND(SUM(Receita_TED), 2) AS Receita_TED_sum,

    ROUND(SUM(Receita_Pix_Geral), 2) AS Receita_Pix,
    SAFE_DIVIDE(ROUND(SUM(Receita_Pix_Geral), 2), SUM(GMV)) AS pctg_Pix,

    ROUND(SUM(Receita_Net_COF), 2) AS Receita_Net_COF,
    SAFE_DIVIDE(SUM(Receita_Net_COF), ABS(SUM(GMV))) AS tkr_netCOF,

    SUM(custo_servir_Total) * (-1) AS COGs,

    ROUND(SUM(Margem_Query), 2) AS Margem,
    SAFE_DIVIDE(SUM(Margem_Query), ABS(SUM(GMV))) AS Margem_div_GMV,

    ROUND(SUM(floating_delayed), 2) AS floating_delayed,
    ROUND(SAFE_DIVIDE(SUM(floating_delayed), SUM(GMV)), 4) AS Delay_pct

FROM `sbj7ujlwjbsknn8v396xaahlf4ogck.Dias_PnL.PnL_Dashs_part`
WHERE 1=1
  AND Dt_Month >= '2025-01-01'
  AND ClientCNPJorCPF IN ("15327458000127")
GROUP BY Dt_Month, ClientCNPJorCPF
ORDER BY Dt_Month DESC
