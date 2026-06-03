import { useState } from 'react'
import AnimatedHero from '../components/AnimatedHero'

// ── Tipos ──────────────────────────────────────────────────────
interface FieldRow {
  dashLabel: string
  sourceField: string
  meaning: string
}

interface CardDoc {
  id: string
  title: string
  category: string         // label editorial: "IDENTIDADE · HISTÓRICO"
  preview: string          // frase curtíssima — só para o header fechado
  context: string          // contexto completo — visível ao abrir
  questions: string[]      // perguntas que o card responde
  gasFunctions: string[]   // funções em Code.gs
  auxTable: {              // base auxiliar que serve o dash
    name: string
    summary: string        // pequeno resumo do que é essa base
  }
  originalSources: {       // bases originais (BQ)
    table: string
    description: string
  }[]
  queryNotes: string       // resumo de como a query auxiliar foi montada
  fields: FieldRow[]       // campos — nível mais técnico
}

// ── Dados ──────────────────────────────────────────────────────
const CARDS: CardDoc[] = [
  {
    id: 'info-cliente',
    title: 'Informações do Cliente',
    category: 'IDENTIDADE · ENGAJAMENTO',
    preview: 'Identidade, histórico, produtos e engajamento do cliente.',
    context: 'Quem é o cliente, há quanto tempo está com a Stone, quais produtos usa e se está engajado — tudo em um lugar.',
    questions: [
      'Quem é esse cliente e qual o seu segmento de atuação (MCC e cluster)?',
      'Há quanto tempo está com a Stone em adquirência? Quando ativou canal digital ou banking?',
      'Está ativo, em churn, inativo ou nunca ativou?',
      'Quantos meses transacionou nos últimos 12?',
      'Quais produtos usa ativamente hoje (últimos 3 meses)?',
      'Faz parte de algum grupo econômico? Quantos CNPJs tem o grupo?',
      'Qual o tier e o TPV utilizado para essa classificação?',
      'Quando foi a última alteração de preço, renegociação ou atualização de oferta?',
      'Em qual cidade/UF está e qual o canal comercial responsável?',
    ],
    gasFunctions: ['getAfiliacao360(doc)'],
    auxTable: {
      name: 'sbj7ujlwjbsknn8v396xaahlf4ogck.Dias_PnL.affiliation_360',
      summary: '~12-13M linhas (excluindo documentos only Ton). 60 colunas em 9 blocos: identificação, segmentação, canal comercial, grupo econômico, tempo de cliente, engajamento, produtos ativos, pricing e geografia. Atualizada toda segunda via MERGE — preserva o campo extras entre refreshes. Grão: 1 linha por document.',
    },
    originalSources: [
      { table: 'segment_core.dim_one_number_affiliation', description: 'Base principal: documento, afiliações, nome, MCC, status, datas de credenciamento, canal de vendas, domicílio bancário. Todos os campos de identificação, segmentação e tempo de cliente.' },
      { table: 'segment_core.dim_one_number_affiliation_structure', description: 'Hierarquia comercial: channel, sub_channel, group_1 a group_3 (snapshot mensal com reference_date DESC).' },
      { table: 'segment_core.fct_one_number_payments', description: 'Engajamento adquirência (última transação, meses ativos 12m) e produtos adquirência (MDR, RAV, Pix adq, Link, Gateway, Boleto adq, Pagar.me). Janela: últimos 3 meses para produtos, histórico completo para engajamento.' },
      { table: 'segment_core.fct_one_number_banking', description: 'Engajamento banking (início, último mês, meses ativos 12m) e produtos banking (Conta, Pix banking, Boleto banking, Transferência, Seguro). Exclui Pagar.me para evitar double count no PIX.' },
      { table: 'client_segmentation.tb_client_tier_distribution', description: 'Tier (A-E) e TPV utilizado: COALESCE(tpv_medio_12m, tpv_first30d). Registro mais recente por dt_reference DESC.' },
      { table: 'lifecycle_analytics.economic_groups_* (3 tabelas)', description: 'Join em cadeia: business_establishments → groups_business_establishments (bridge) → groups. Retorna grupo_nome, grupo_tipo, grupo_id e qtd_docs_no_grupo.' },
      { table: 'active_offers.acquiring', description: 'Última atualização de oferta comercial. Requer dedupe obrigatória: ROW_NUMBER() PARTITION BY stonecode, affiliationKey ORDER BY updatedAt DESC, _PARTITIONTIME DESC — 65% dos stonecodes têm >1 linha.' },
      { table: 'a_distancia_business.renegotiations', description: 'Última renegociação formal aceita/executada: MAX(DATE(opportunity_execution_date)).' },
      { table: 'client_affiliation_open.vw_address', description: 'Endereço Stone: cidade (normalizado lowercase sem acentos) e UF por extenso → convertida para sigla via CASE WHEN com 27 estados.' },
      { table: 'salesforce_objects.vw_opportunity', description: 'Reativações SF para status "Novo ativo": RecordTypeId = \'0123j000001lxo1AAA\', stages FINALIZADO/EXECUTADO/CREDENCIADO, Pricing_Status = APROVADO nos últimos 3 meses.' },
      { table: 'Dias_Delay_Payments.Novo_Todos_Clientes', description: 'Taxas inteligentes: EXISTS stonecode com state = \'registered\'. Deduplica por document antes de agregar.' },
      { table: 'sandbox_hubzinho.treated_tb_core_super_dw_ClientListHubs', description: 'Domicílio bancário: banco onde o cliente recebe recebíveis. Deduplica por CNPJ com registro mais recente.' },
    ],
    queryNotes: 'CTEs separadas por domínio (afiliações, canal, segmentação, grupos, tempo, engajamento adq, engajamento banking, produtos adq, produtos banking, pricing, geografia) unificadas por document. Stonecode principal: prioriza APROVADO, desempata pelo mais antigo. Produtos usam janela de 3 meses. Status de engajamento: 6 estados em cascata — Novo ativo → Não ativado → Churned → Inativo recente → Em churn → Ativo. MERGE preserva extras sem sobrescrever.',
    fields: [
      { dashLabel: 'Nome / Razão Social', sourceField: 'trade_name · legal_name', meaning: 'Do stonecode principal (APROVADO mais antigo).' },
      { dashLabel: 'Afiliações (expandir)', sourceField: 'affiliations · qtd_stonecodes', meaning: 'String serializada: stonecode|company|status|data_cred separados por ; — parsear com SPLIT e UNNEST.' },
      { dashLabel: 'Empresas / Domicílio / Canal / Sales Force', sourceField: 'companies · domicilio_bancario · channel · main_sales_force', meaning: 'Canal de aquisição, banco de domicílio e estrutura comercial responsável.' },
      { dashLabel: 'MCC / Cluster / Tier', sourceField: 'mcc_id · mcc_name · mcc_cluster · tier · tpv_utilizado', meaning: 'Segmento de atuação e tier A-E baseado em TPV médio 12m (ou first30d se indisponível).' },
      { dashLabel: 'Tempo — Adquirência', sourceField: 'inicio_adquirencia · meses_adquirencia', meaning: 'MIN(COALESCE(accreditation_date, created_at)) WHERE company = \'STONE\'.' },
      { dashLabel: 'Tempo — Digital', sourceField: 'inicio_digital · meses_digital', meaning: 'MIN(COALESCE(accreditation_date, created_at)) WHERE company IN (\'PAGARME\', \'MUNDIPAGG\'). NULL se nunca teve essas marcas.' },
      { dashLabel: 'Tempo — Banking', sourceField: 'inicio_banking · meses_banking', meaning: 'MIN(reference_month) com receita != 0 OR movement > 0. Proxy para abertura de conta.' },
      { dashLabel: 'Status de engajamento', sourceField: 'status_engajamento', meaning: '6 estados: Novo ativo (<3m ou reativação SF) · Não ativado (nunca transacionou) · Churned (>90d) · Inativo recente (31-90d) · Em churn (transacionou mas TPV mês anterior < 85% da média 3m) · Ativo.' },
      { dashLabel: 'Última transação / Dias sem transacionar', sourceField: 'ultima_trx_adquirencia · dias_sem_transacionar', meaning: 'MAX(reference_date) de fct_one_number_payments WHERE movement_type = \'SALES\' AND gmv > 0.' },
      { dashLabel: 'Meses ativos Adq / Banking (12m)', sourceField: 'meses_ativos_adq_12m · meses_banking_ativos_12m', meaning: 'COUNT(DISTINCT reference_month) janela: últimos 11 meses fechados + mês corrente (máx 12).' },
      { dashLabel: 'Produtos ativos (badges)', sourceField: 'tem_mdr_cartao · tem_rav · tem_pix_adquirencia · tem_link_pagamento · tem_gateway · tem_boleto · tem_pagarme · tem_conta_banking · tem_pix_banking · tem_transferencia · tem_seguro · tem_taxas_inteligentes', meaning: 'true = utilizou nos últimos 3 meses. Boleto: OR entre adq e banking. PIX banking: exclui Pagar.me. Seguro: product = \'INSURANCE\' com qualquer product_type.' },
      { dashLabel: 'Grupo econômico', sourceField: 'pertence_a_grupo · grupo_nome · grupo_tipo · grupo_id · qtd_docs_no_grupo', meaning: 'Join em 3 tabelas lifecycle_analytics. qtd_docs_no_grupo = COUNT(DISTINCT document) do mesmo group_id.' },
      { dashLabel: 'Última alter. preço', sourceField: 'ultima_alteracao_preco · ultima_renegociacao · ultima_atualizacao_oferta', meaning: 'GREATEST(DATE(ultima_atualizacao_oferta), ultima_renegociacao) — a mais recente entre oferta e renegociação.' },
      { dashLabel: 'Cidade / UF', sourceField: 'cidade · uf', meaning: 'Normalizado (lowercase, sem acentos). UF: 27 estados mapeados de extenso para sigla.' },
    ],
  },
  {
    id: 'summary',
    title: 'Cards de Resumo',
    category: 'FINANCEIRO · RENTABILIDADE',
    preview: 'Volume, margem, saldo em conta e NPV de crédito.',
    context: 'Resumo financeiro rápido do cliente: quanto ele movimenta, quanto a Stone ganha com ele em adquirência, o saldo médio em conta e o valor econômico do crédito. O ponto de partida para avaliar o tamanho e a rentabilidade do relacionamento.',
    questions: [
      'Qual o valor econômico (NPV) deste cliente no crédito?',
      'Qual o TPV e a margem de adquirência no período recente?',
      'Qual o saldo médio em conta e reservas nos últimos 3 meses?',
      'O cliente tem receita de seguros?',
    ],
    gasFunctions: ['getStatusCredito(doc)', 'getNpvCredito(doc)', 'getPnlAdquirencia(doc)', 'getBancoMedia(doc)'],
    auxTable: {
      name: 'PnL_Dashs_part + resumo_conta_3M + tabela interna de crédito',
      summary: 'Três fontes distintas agregadas no frontend: PnL de adquirência por mês (PnL_Dashs_part), média bancária dos últimos 3 meses (resumo_conta_3M) e modelo de NPV de crédito.',
    },
    originalSources: [
      { table: 'Dias_PnL.PnL_Dashs_part', description: 'PnL de adquirência por documento, mês e empresa. Base de todas as métricas de receita e volume.' },
      { table: 'resumo_conta_3M', description: 'Resumo bancário com média de saldo, boleto emitido/liquidado, receita de seguros dos últimos 3 meses.' },
      { table: 'tabela interna de crédito', description: 'Modelo de NPV por documento: NII, Risk Adj NII, NPV calculados pelo time de crédito.' },
    ],
    queryNotes: 'Cada fonte é consultada em paralelo no frontend (useBigQuery hooks independentes). Os valores de adquirência são o mês mais recente disponível na PnL_Dashs_part.',
    fields: [
      { dashLabel: 'NPV / NII / Risk Adj NII', sourceField: 'npv · nii · risk_adj_nii', meaning: 'Valor econômico do crédito. NII = juros - funding - capital. Risk Adj NII = NII - PDD.' },
      { dashLabel: 'TPV / Receita nCOF / Margem', sourceField: 'TPV_Total · Receita_Net_COF · Margem_Total', meaning: 'Volume, receita líquida de funding e resultado operacional de adquirência.' },
      { dashLabel: 'Saldo conta / reservas', sourceField: 'saldo_conta · saldo_reservas', meaning: 'Média dos últimos 3 meses. Indica engajamento bancário.' },
      { dashLabel: 'Receita seguros', sourceField: 'receita_seguros · produtos_seguro', meaning: 'Receita de seguros e quantidade de produtos ativos.' },
    ],
  },
  {
    id: 'fluxo-caixa',
    title: 'Fluxo de Caixa Mensal',
    category: 'RESULTADO · SÉRIE HISTÓRICA',
    preview: 'Tendência do resultado do cliente ao longo do tempo.',
    context: 'Evolução mês a mês do resultado financeiro do cliente, juntando crédito e adquirência numa única visão. Útil para identificar tendências, sazonalidade e entender se o cliente está crescendo ou retraindo ao longo do tempo.',
    questions: [
      'O resultado financeiro deste cliente está melhorando ou piorando?',
      'Qual a trajetória da margem de adquirência nos últimos meses?',
      'Como o crédito contribui para o resultado total (Net CF)?',
      'O cliente tem sazonalidade forte em algum período?',
    ],
    gasFunctions: ['getFluxoCreditoMensal(doc)', 'getPnlAdquirencia(doc)'],
    auxTable: {
      name: 'tabela interna de crédito + PnL_Dashs_part',
      summary: 'Duas fontes mescladas por mês no frontend: série mensal do modelo de crédito e série mensal de adquirência.',
    },
    originalSources: [
      { table: 'tabela interna de crédito (série mensal)', description: 'Receita de juros, funding cost, capital cost, PDD e custo variável por documento e mês.' },
      { table: 'Dias_PnL.PnL_Dashs_part', description: 'Receita nCOF e margem de adquirência por mês.' },
    ],
    queryNotes: 'As duas séries são consultadas em paralelo e unidas por mês no componente FluxoCaixa.tsx. Meses com dados apenas em uma das fontes aparecem com a outra linha como null (connectNulls=true no gráfico).',
    fields: [
      { dashLabel: 'Receita Juros / NII / Risk Adj NII / Net CF', sourceField: 'receita_juros · nii · risk_adj_nii · net_cf', meaning: 'Cascata de resultado de crédito: bruto → margem → margem ajustada → caixa líquido.' },
      { dashLabel: 'Receita nCOF / Margem (Adq)', sourceField: 'Receita_Net_COF · Margem_Total', meaning: 'Resultado de adquirência por mês.' },
    ],
  },
  {
    id: 'insights-adq',
    title: 'Adquirência: Insights',
    category: 'ADQUIRÊNCIA · COMPORTAMENTO',
    preview: 'Mix de pagamento, evolução do TPV e linhas de receita.',
    context: 'Mostra como o cliente paga e o que isso gera de receita para a Stone. Dá para ver se ele usa mais débito, crédito à vista ou parcelado, como o volume evoluiu e quais produtos (MDR, RAV, Pix...) contribuem mais para o resultado.',
    questions: [
      'Qual o mix de pagamento do cliente (débito, crédito, parcelado)?',
      'O TPV está crescendo, estável ou caindo?',
      'Quais linhas de receita mais contribuem para o resultado?',
      'A margem global está evoluindo bem?',
    ],
    gasFunctions: ['getInsightsAdq(doc)', 'getPnlAdquirencia(doc)'],
    auxTable: {
      name: 'Dias_PnL.PnL_Dashs_part',
      summary: 'PnL de adquirência por documento, mês e empresa. Contém TPV por modalidade e bandeira, todas as linhas de receita e resultado.',
    },
    originalSources: [
      { table: 'Dias_PnL.PnL_Dashs_part', description: 'Campos de volume por modalidade (Vlr_TPV_debito_*, Vlr_TPV_credito_*, Vlr_TPV_psj*) e linhas de receita (Net_MDR, Floating, RAV, etc.).' },
    ],
    queryNotes: 'getInsightsAdq retorna TPV por modalidade agrupado por mês e empresa (CompanyName). getInsightsAdq usa GROUP BY Dt_Month, CompanyName; o frontend agrega por mês após filtrar empresa (Stone / Pagar.me).',
    fields: [
      { dashLabel: 'TPV Performado (linha preta)', sourceField: 'TPV_Adquirencia', meaning: 'CTPV total — volume de cartão. Referência de escala.' },
      { dashLabel: 'Share CTPV por modalidade', sourceField: 'Vlr_TPV_debito_* · Vlr_TPV_credito_a_vista_* · Vlr_TPV_psj1/2/3_*', meaning: 'Percentual de cada modalidade no total de cartão.' },
      { dashLabel: 'Linhas de Receita (10)', sourceField: 'Net_MDR_Stone · Floating_Conta · Vlr_Aluguel · Net_RAV · Rcta_TED · Pix_Rcta · Gateway · Rcta_Boleto · Rcta_Antifraude · Receita_Net_COF', meaning: 'Decomposição da receita total por produto.' },
      { dashLabel: 'Margem Global', sourceField: 'Margem_Total · Receita_Net_COF', meaning: 'Resultado e receita líquida mês a mês.' },
    ],
  },
  {
    id: 'adq-detalhado',
    title: 'Adquirência: Detalhado Mensal',
    category: 'ADQUIRÊNCIA · REFERÊNCIA',
    preview: 'Valores absolutos de adquirência mês a mês.',
    context: 'Tabela detalhada com cada linha de receita e indicador de adquirência mês a mês. Para quando você precisa de um número específico — MDR de março, RAV de outubro, margem do último trimestre — sem precisar ir direto no BigQuery.',
    questions: [
      'Qual foi o NetMDR% em determinado mês?',
      'Quanto o cliente gerou de RAV ou Floating?',
      'Qual a margem percentual sobre o TPV?',
      'Houve variação relevante em alguma linha de receita?',
    ],
    gasFunctions: ['getPnlAdquirencia(doc)'],
    auxTable: {
      name: 'Dias_PnL.PnL_Dashs_part',
      summary: 'Mesma base do Insights — PnL de adquirência por documento, mês e empresa. A diferença é que aqui todos os campos são exibidos na tabela (sem agregação de gráfico).',
    },
    originalSources: [
      { table: 'Dias_PnL.PnL_Dashs_part', description: 'Todas as colunas de receita, volume, percentuais e resultado de adquirência por mês.' },
    ],
    queryNotes: 'GROUP BY Dt_Month, CompanyName. O frontend agrega por mês após filtrar empresa e recalcula percentuais (delay%, NetMDR%, floating%, aluguel%, RAV%, TKR, margem%) como razão dos valores somados.',
    fields: [
      { dashLabel: 'TPV / CTPV / TPV Pix', sourceField: 'TPV_Total · TPV_Adquirencia · Pix_Total', meaning: 'Volumes totais — base de todos os percentuais.' },
      { dashLabel: 'NetMDR / NetMDR%', sourceField: 'Net_MDR_Stone', meaning: 'Principal linha de receita. % = NetMDR / CTPV.' },
      { dashLabel: 'Floating / Aluguel / NetRAV', sourceField: 'Floating_Conta · Vlr_Aluguel · Net_RAV', meaning: 'Receitas de float, hardware e antecipação.' },
      { dashLabel: 'Receita nCOF / TKR', sourceField: 'Receita_Net_COF', meaning: 'Receita total líquida. TKR = take rate sobre TPV.' },
      { dashLabel: 'COGs / Margem / Margem%', sourceField: 'custo_servir_Total · Margem_Total', meaning: 'Custo de servir e resultado final de adquirência.' },
    ],
  },
  {
    id: 'banking-insights',
    title: 'Banking: Insights',
    category: 'BANKING · TENDÊNCIA',
    preview: 'Evolução mensal dos saldos médios e receitas de banking do documento nos últimos 24 meses.',
    context: 'Gráfico de barras empilhadas com as principais linhas de receita de banking (Floating Sweep, PIX POS, Interchange, Smart Fees, etc.) ao longo do tempo. Linha separada para Saldo Conta e Saldo Reservas. Receitas respondem ao filtro de Produtos (Stone / Pagar.me). Saldos e boletos são por conta (sempre consolidados).',
    questions: [
      'Como evoluíram as receitas de banking deste cliente nos últimos 2 anos?',
      'O cliente tem Smart Fees ativo? Qual o desconto aplicado?',
      'Qual é a tendência do saldo médio de conta e reservas?',
    ],
    gasFunctions: ['getBankingHistorico(doc, companies)'],
    auxTable: {
      name: 'sbj7ujlwjbsknn8v396xaahlf4ogck.Dias_PnL.resumo_conta_historico + fct_one_number_banking',
      summary: 'Quando ambas as empresas selecionadas: usa resumo_conta_historico (pré-agregada, rápido). Quando filtrado por 1 empresa: query direta em fct_one_number_banking (receitas) + resumo_conta_historico (saldos/boletos).',
    },
    originalSources: [
      { table: 'Dias_PnL.resumo_conta_historico', description: 'Saldos médios (dias úteis) e volume de boletos por documento e mês. Account-level, sempre consolidado.' },
      { table: 'segment_core.fct_one_number_banking', description: 'Receitas de banking por documento, mês e company_name. Usado quando filtro de empresa está ativo.' },
      { table: 'Dias_PnL.PnL_Dashs_part', description: 'Floating delayed (Smart Fees) por documento, mês e CompanyName.' },
    ],
    queryNotes: 'getBankingHistorico(doc, companies) retorna histórico de até 24 meses. Quando ambas as empresas selecionadas, usa tabela pré-agregada (rápido). Quando filtrado por 1 empresa, faz query direta em fct_one_number_banking com company_name. Saldos e boletos são account-level (sempre consolidados).',
    fields: [
      { dashLabel: 'Mês de referência', sourceField: 'reference_month', meaning: 'Mês de referência do registro (YYYY-MM).' },
      { dashLabel: 'Saldo Conta', sourceField: 'media_saldo_conta_visao_cliente', meaning: 'Saldo em conta (inclui CDB) — média de dias úteis do mês.' },
      { dashLabel: 'Saldo Reservas', sourceField: 'media_saldo_reservas', meaning: 'Saldo em reservas — média de dias úteis do mês.' },
      { dashLabel: 'Receita Floating Sweep', sourceField: 'receita_floating_sweep', meaning: 'Receita de raspa-conta — maior linha de receita banking (~R$70MM/mês na base total).' },
      { dashLabel: 'Receita PIX POS', sourceField: 'receita_pix_pos', meaning: 'Receita de PIX originado por POS (adquirência + banking).' },
      { dashLabel: 'Floating Conta + Reserva', sourceField: 'receita_floating_conta_reserva', meaning: 'Receita de floating sobre saldo em conta e reservas.' },
      { dashLabel: 'Interchange (débito + crédito)', sourceField: 'receita_interchange_cartao', meaning: 'Receita de interchange de débito e crédito.' },
      { dashLabel: 'Taxas Inteligentes', sourceField: 'receita_floating_delayed', meaning: 'Receita de Smart Fees (delay payments). Fonte: PnL_Dashs_part com RevenueTypeName = \'floating_delayed\'.' },
      { dashLabel: 'Condições Smart Fees', sourceField: 'smartFeeConditions', meaning: 'Objeto com delayDays, modalidades ativas e desconto aplicado. Null se cliente não tem Smart Fees.' },
    ],
  },
  {
    id: 'banking-detalhado',
    title: 'Banking: Detalhado Mensal',
    category: 'BANKING · SÉRIE TEMPORAL',
    preview: 'Tabela com meses nas linhas e métricas de saldo, receita e volume de boletos nas colunas.',
    context: 'Tabela transposta: cada linha é um mês (até 24 meses), cada coluna é uma métrica de banking. Seções expansíveis: Saldos Médios (AVG de dias úteis), Receitas (SUM mensal) e Boletos (Volume). Receitas respondem ao filtro de Produtos (Stone / Pagar.me). Saldos e boletos são por conta (sempre consolidados).',
    questions: [
      'Qual foi a receita de floating sweep em março/2025?',
      'Quantos boletos este cliente emitiu nos últimos 7 meses?',
      'O saldo médio está crescendo ou caindo?',
    ],
    gasFunctions: ['getBankingHistorico(doc, companies)'],
    auxTable: {
      name: 'resumo_conta_historico + fct_one_number_banking',
      summary: 'Mesma fonte do Banking: Insights. Quando filtrado por empresa, receitas vêm de fct_one_number_banking; saldos/boletos sempre consolidados.',
    },
    originalSources: [
      { table: 'Dias_PnL.resumo_conta_historico', description: 'Saldos médios e volume de boletos por documento e mês. Account-level, sempre consolidado.' },
      { table: 'segment_core.fct_one_number_banking', description: 'Receitas de banking com filtro de company_name (quando ativo).' },
    ],
    queryNotes: 'getBankingHistorico(doc, companies) — mesma função do Banking: Insights. O frontend usa os mesmos dados mas renderiza em tabela transposta (mês x metrica) com secoes colapsaveis por grupo: Saldos, Receitas, Boletos.',
    fields: [
      { dashLabel: 'Mês de referência', sourceField: 'reference_month', meaning: 'Mês de referência do registro (YYYY-MM).' },
      { dashLabel: 'Saldo Conta', sourceField: 'media_saldo_conta_visao_cliente', meaning: 'Saldo em conta (inclui CDB) — média de dias úteis do mês.' },
      { dashLabel: 'Saldo Reservas', sourceField: 'media_saldo_reservas', meaning: 'Saldo em reservas — média de dias úteis do mês.' },
      { dashLabel: 'Receita Floating Sweep', sourceField: 'receita_floating_sweep', meaning: 'Receita de raspa-conta.' },
      { dashLabel: 'Receita PIX POS', sourceField: 'receita_pix_pos', meaning: 'Receita de PIX POS.' },
      { dashLabel: 'Floating Conta + Reserva', sourceField: 'receita_floating_conta_reserva', meaning: 'Receita de floating sobre saldo em conta e reservas.' },
      { dashLabel: 'Interchange (débito + crédito)', sourceField: 'receita_interchange_cartao', meaning: 'Receita de interchange.' },
      { dashLabel: 'Taxas Inteligentes', sourceField: 'receita_floating_delayed', meaning: 'Receita de Smart Fees.' },
      { dashLabel: 'Qtd. Boletos Emitidos', sourceField: 'qtd_boleto_emitido', meaning: 'Quantidade de boletos emitidos no mês.' },
      { dashLabel: 'Qtd. Boletos Liquidados', sourceField: 'qtd_boleto_liquidado', meaning: 'Quantidade de boletos liquidados no mês.' },
      { dashLabel: 'Valor Boletos Liquidados', sourceField: 'vlr_boleto_liquidado', meaning: 'Valor total liquidado em boletos no mês (R$).' },
    ],
  },
  {
    id: 'ofertas-credito',
    title: 'Ofertas de Crédito',
    category: 'CRÉDITO · STATUS',
    preview: 'Oferta disponível, contrato ativo e status de inadimplência.',
    context: 'Visão completa do crédito do cliente: se tem oferta disponível, qual o limite e produto, se há um contrato ativo e em que condições, e se está em dia ou inadimplente. Essencial antes de qualquer abordagem comercial envolvendo crédito.',
    questions: [
      'O cliente tem oferta de crédito disponível? Qual o limite?',
      'Há um contrato de crédito ativo? Em que condições (taxa, parcelas)?',
      'O cliente está inadimplente?',
      'Qual o status da negociação — aceite pendente, aprovado, cancelado?',
      'Qual o rating de crédito e o tipo de conta?',
    ],
    gasFunctions: ['getStatusCredito(doc)'],
    auxTable: {
      name: 'tabela interna de crédito',
      summary: 'Tabela de status de crédito por documento — consolida dados de KYC, limites aprovados, oferta vigente, crédito ativo e histórico de negociação.',
    },
    originalSources: [
      { table: 'tabela interna de crédito (time de crédito)', description: 'Modelo de risco, limites aprovados, status KYC, tipo de conta e rating.' },
      { table: 'lifecycle — negotiation / offer', description: 'Status da oferta (offer_id, offer_status, approval_status) e da negociação (negotiation_status, cancellation_reason).' },
    ],
    queryNotes: 'Query por documento retorna uma linha por contrato/oferta. O frontend deduplica por offer_id para exibir ofertas únicas e usa a primeira linha para os dados do contrato ativo.',
    fields: [
      { dashLabel: 'Rating / KYC / Tipo de conta', sourceField: 'RATING · kyc_status · account_type', meaning: 'Score de risco, status de verificação de identidade e tipo de conta.' },
      { dashLabel: 'Limites (Kgiro, Cartão, G.Fácil, Limiconta)', sourceField: 'LIMITE_KGIRO_FINAL · LIMITE_CARTAO_FINAL · LIMITE_GFACIL_FINAL · OFERTA_LIMICONTA', meaning: 'Limites aprovados por produto de crédito.' },
      { dashLabel: 'Oferta (ID, status, validade)', sourceField: 'offer_id · offer_status · offer_expiration_date · approval_status', meaning: 'Oferta disponível para o cliente.' },
      { dashLabel: 'Crédito ativo (parcelas, juros, vencimento)', sourceField: 'qtd_parcelas_credito_ativo · tx_juros_mes__credito_ativo · data_vencimento_credito_ativo', meaning: 'Condições do contrato vigente.' },
      { dashLabel: 'Faixa de atraso', sourceField: 'faixa_atraso · faixa_atraso_credito_ativo', meaning: 'Indicador de inadimplência — se e em qual faixa há parcelas em atraso.' },
      { dashLabel: 'Status da negociação', sourceField: 'negotiation_status · negotiation_last_update_date', meaning: 'Fase atual: análise, aprovada, cancelada, etc.' },
    ],
  },
]

// ── Componentes ────────────────────────────────────────────────

function QuestionsBlock({ context, questions }: { context: string; questions: string[] }) {
  return (
    <div style={{ background: 'rgba(199, 255, 61, 0.25)', borderRadius: 14, padding: '22px 28px', display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 24, alignItems: 'flex-start' }}>
      {/* Ícone */}
      <div style={{ width: 38, height: 38, borderRadius: '50%', background: '#0D0D0D', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
        <span style={{ color: '#fff', fontWeight: 700, fontSize: 18, lineHeight: 1 }}>?</span>
      </div>
      {/* Texto */}
      <div>
        <p style={{ fontSize: 11, fontWeight: 500, color: '#0D0D0D', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>O que este card responde</p>
        <p style={{ fontSize: 14, color: '#0D0D0D', lineHeight: 1.6, marginBottom: 12 }}>{context}</p>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {questions.map((q, i) => (
            <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 14, fontWeight: 700, color: '#0D0D0D', lineHeight: 1.5 }}>
              <span style={{ fontWeight: 900, flexShrink: 0, marginTop: 1 }}>→</span>
              {q}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

// Nível 2: sub-seção dentro do card (fundo branco, borda leve)
function Sub({ title, badge, nested, children }: {
  title: string; badge?: string; nested?: boolean; children: React.ReactNode
}) {
  const [open, setOpen] = useState(false)
  return (
    <div className={`rounded-lg overflow-hidden ${nested ? 'border border-gray-100' : 'border border-gray-200'}`}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={`w-full px-4 py-2.5 flex items-center justify-between transition-colors text-left ${nested ? 'bg-[#F5F5F0] hover:bg-gray-100' : 'bg-white hover:bg-[#F5F5F0]'}`}
      >
        <div className="flex items-center gap-2">
          <svg className={`w-3 h-3 transition-transform duration-150 flex-shrink-0 ${open ? 'rotate-0' : '-rotate-90'} text-gray-300`}
            fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
          <span className={`text-[11px] font-bold tracking-wide uppercase ${nested ? 'text-gray-400' : 'text-[#1A1A1A]'}`}>{title}</span>
          {badge && <span className="text-[10px] bg-[#1D9E75]/10 text-[#1D9E75] font-bold px-1.5 py-0.5 rounded-full">{badge}</span>}
        </div>
      </button>
      {open && (
        <div className={`border-t px-4 py-3 space-y-2 ${nested ? 'border-gray-100 bg-[#F5F5F0]' : 'border-gray-100 bg-white'}`}>
          {children}
        </div>
      )}
    </div>
  )
}

function CardSection({ card }: { card: CardDoc }) {
  const [open, setOpen] = useState(false)

  return (
    <div className={`bg-white rounded-2xl overflow-hidden border-l-4 border border-gray-100 shadow-sm transition-shadow hover:shadow-md ${open ? 'border-l-[#1D9E75]' : 'border-l-gray-200'}`}>
      {/* Nível 0: header do card */}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full px-6 pt-5 pb-4 flex items-start justify-between hover:bg-[#F5F5F0] transition-colors text-left"
      >
        <div className="flex-1 min-w-0">
          {/* Label categoria */}
          <p className="text-[10px] font-bold tracking-[0.12em] text-[#1D9E75] uppercase mb-1.5">{card.category}</p>
          <div className="flex items-center gap-2.5">
            <svg className={`w-4 h-4 text-gray-300 transition-transform duration-200 flex-shrink-0 ${open ? 'rotate-0' : '-rotate-90'}`}
              fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
            <h2 className="font-extrabold text-[#1A1A1A] text-base tracking-tight">{card.title}</h2>
          </div>
          {!open && <p className="text-[12px] text-gray-400 mt-1.5 ml-6">{card.preview}</p>}
        </div>
      </button>

      {/* Nível 1: conteúdo do card */}
      {open && (
        <div className="px-6 pb-6 space-y-5">

          {/* ── Camada negócio ── */}
          <QuestionsBlock context={card.context} questions={card.questions} />

          {/* ── Camada técnica (expandível) ── */}
          <div className="space-y-2">
            <p className="text-[10px] font-bold tracking-[0.12em] text-gray-300 uppercase">Detalhes técnicos</p>

            {/* Funções Code.gs */}
            <Sub title="Funções Code.gs" badge={String(card.gasFunctions.length)}>
              <div className="space-y-1">
                {card.gasFunctions.map((f, i) => (
                  <code key={i} className="block text-[11px] bg-gray-50 text-[#00461e] px-3 py-1.5 rounded border border-gray-100">{f}</code>
                ))}
              </div>
            </Sub>

            {/* Base auxiliar + sub-detalhes aninhados */}
            <Sub title="Base auxiliar" badge={card.auxTable.name.split('.').pop()}>
              <div className="mb-3">
                <code className="text-[10px] bg-[#f5fff5] text-[#00461e] px-2 py-0.5 rounded border border-[#c8d2c8]">{card.auxTable.name}</code>
                <p className="text-xs text-gray-500 mt-2 leading-relaxed">{card.auxTable.summary}</p>
              </div>

              {/* Bases originais — aninhado */}
              <Sub title="Bases originais (BQ)" badge={String(card.originalSources.length)} nested>
                <div className="space-y-3">
                  {card.originalSources.map((s, i) => (
                    <div key={i}>
                      <code className="text-[10px] text-[#00461e]">{s.table}</code>
                      <p className="text-[11px] text-gray-500 mt-0.5 leading-relaxed">{s.description}</p>
                    </div>
                  ))}
                </div>
              </Sub>

              {/* Como foi montada — aninhado */}
              <Sub title="Como a query foi montada" nested>
                <p className="text-xs text-gray-500 leading-relaxed">{card.queryNotes}</p>
              </Sub>
            </Sub>

            {/* Campos — mais técnico */}
            <Sub title="Campos e significados" badge={String(card.fields.length)}>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-[#e8f0e8]">
                      <th className="pb-2 pr-4 text-left text-gray-400 font-semibold w-1/4">No dash</th>
                      <th className="pb-2 pr-4 text-left text-gray-400 font-semibold w-1/4">Campo original</th>
                      <th className="pb-2 text-left text-gray-400 font-semibold">O que significa</th>
                    </tr>
                  </thead>
                  <tbody>
                    {card.fields.map((f, i) => (
                      <tr key={i} className="border-b border-gray-50">
                        <td className="py-2 pr-4 font-medium text-gray-700 align-top">{f.dashLabel}</td>
                        <td className="py-2 pr-4 align-top"><code className="text-[10px] text-gray-400 break-all">{f.sourceField}</code></td>
                        <td className="py-2 text-gray-500 align-top leading-relaxed">{f.meaning}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Sub>
          </div>
        </div>
      )}
    </div>
  )
}

interface Props {
  onNavigate?: (page: string) => void
}

export default function DocFelicia360({ onNavigate }: Props) {
  return (
    <div className="min-h-screen bg-[#f5fff5]">
      <AnimatedHero className="px-6 py-12">
        <div className="max-w-4xl mx-auto">
          <p className="text-[#a5fa00] text-[11px] font-bold uppercase tracking-[0.15em] mb-3">Repositório · Documentações</p>
          <h1 className="text-white font-black text-4xl leading-tight tracking-tight">Felícia 360</h1>
          <p className="text-white/50 text-sm mt-3 max-w-lg">O que cada card responde, de onde vêm os dados e como foram construídos.</p>
        </div>
      </AnimatedHero>

      <div className="max-w-4xl mx-auto px-6 py-8 space-y-3">

        {/* Link para o Felícia 360 */}
        <div className="flex items-center gap-3 bg-[#00461e] rounded-2xl px-5 py-4">
          <svg className="w-5 h-5 text-[#c7ff3d] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <div className="flex-1 min-w-0">
            <p className="text-[#c7ff3d] text-xs font-bold uppercase tracking-wider">Painel</p>
            <p className="text-white/80 text-sm">Abrir Felícia 360</p>
          </div>
          <button
            onClick={() => onNavigate?.('felicia360')}
            className="shrink-0 bg-[#c7ff3d] text-[#00461e] text-xs font-bold px-4 py-2 rounded-xl hover:bg-[#d4ff5a] transition-colors"
          >
            Abrir →
          </button>
        </div>

        {CARDS.map(c => <CardSection key={c.id} card={c} />)}
      </div>

    </div>
  )
}
