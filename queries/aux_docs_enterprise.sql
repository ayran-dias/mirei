-- engine: bigquery
-- Tabela auxiliar: docs_enterprise
-- Destino: sbj7ujlwjbsknn8v396xaahlf4ogck.Dias_auxiliares.docs_enterprise
-- Schedule: seg-qua-sex 05:00 UTC (antes dos paineis de manha)
-- Uso: substitui scan completo de PnL_FELICIA_KA_com_Appends no buildCreditoDocsSubquery_
-- Tamanho esperado: ~50-200k linhas (doc x SC distinct)

CREATE OR REPLACE TABLE `sbj7ujlwjbsknn8v396xaahlf4ogck.Dias_auxiliares.docs_enterprise`
CLUSTER BY ClientCNPJorCPF, SC
AS (
  SELECT DISTINCT
    ClientCNPJorCPF,
    SC,
    CAST(MCC AS STRING)          AS MCC,
    mccname,
    MccCluster,
    motivo,
    categoria,
    grupo1_enc,
    grupo2_enc,
    ClientName,
    CompanyName,
    SalesStructureNameLevel1,
    SalesStructureNameLevel2,
    SalesStructureNameLevel3,
    SalesStructureNameLevel4
  FROM `sbj7ujlwjbsknn8v396xaahlf4ogck.Dias.PnL_FELICIA_KA_com_Appends`
  WHERE Produto_PnL IN ('Apends', 'RAV')
);
