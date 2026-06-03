-- engine: bigquery
-- Tabela auxiliar: docs_gm
-- Destino: sbj7ujlwjbsknn8v396xaahlf4ogck.Dias_auxiliares.docs_gm
-- Schedule: seg-qua-sex 05:00 UTC
-- Uso: substitui scan completo de PnL_GM no buildCreditoDocsSubquery_
-- Tamanho esperado: ~10-50k linhas (doc x SC distinct)

CREATE OR REPLACE TABLE `sbj7ujlwjbsknn8v396xaahlf4ogck.Dias_auxiliares.docs_gm`
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
    responsible_agent_id,
    ClientName,
    CompanyName,
    SalesStructureNameLevel1,
    SalesStructureNameLevel2,
    SalesStructureNameLevel3,
    SalesStructureNameLevel4
  FROM `sbj7ujlwjbsknn8v396xaahlf4ogck.Dias.PnL_GM`
  WHERE Produto_PnL IN ('Apends', 'RAV')
);
