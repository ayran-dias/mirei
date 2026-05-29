export interface StatusCreditoRow {
  CNPJ: string
  LIMITE_KGIRO_FINAL: string | null
  LIMITE_CARTAO_FINAL: string | null
  LIMITE_GFACIL_FINAL: string | null
  OFERTA_GIRO: string | null
  OFERTA_CARTAO: string | null
  OFERTA_LIMICONTA: string | null
  RATING: string | null
  account_type: string | null
  last_kyc_approved_at: string | null
  kyc_status: string | null
  documento_dono: string | null
  tipo_documento: string | null
  documento_usuario: string | null
  limite_concedido: string | null
  limite_disponivel: string | null
  limite_utilizado_clean: string | null
  limite_concedido_collateral: string | null
  faixa_atraso: string | null
  data_inicio_rotativo_cartao: string | null
  offer_id: string | null
  customer_document: string | null
  offer_status: string | null
  offer_expiration_date: string | null
  approval_status: string | null
  negotiation_status: string | null
  negotiation_last_update_date: string | null
  proposal_status: string | null
  offer_rating: string | null
  disbursement_value: string | null
  disbursement_date: string | null
  product_sales_channel: string | null
  negotiation_cancellation_reason: string | null
  data_processamento: string | null
  faixa_atraso_credito_ativo: string | null
  qtd_parcelas_credito_ativo: string | null
  tx_juros_mes__credito_ativo: string | null
  data_vencimento_credito_ativo: string | null
  rating_contabilidade_credito_ativo: string | null
}

export interface NpvCredito {
  documento: string
  nii: string
  risk_adj_nii: string
  npv: string
}

export interface PnlAdquirenciaRow {
  mes: string
  company_name: string | null
  tpv: string
  delay_rcta: string | null
  delay_pct: string | null
  net_mdr: string
  pctg_net_mdr: string | null
  floating_conta: string | null
  floating_pct: string | null
  aluguel: string | null
  aluguel_pct: string | null
  net_rav: string | null
  rav_pct: string | null
  rcta_ted: string | null
  pix_rcta: string | null
  ctpv: string | null
  tpv_pix_vol: string | null
  gateway: string | null
  rcta_boleto: string | null
  rcta_antifraude: string | null
  rcta_transf: string | null
  rcta_setup: string | null
  receita_net_cof: string
  tkr_net_cof: string | null
  cogs: string
  margem: string
  margem_div_tpv: string | null
}

export interface Afiliacao360 {
  document: string | null
  document_type: string | null
  trade_name: string | null
  legal_name: string | null
  primary_stonecode: string | null
  companies: string | null
  qtd_stonecodes: string | null
  status_affiliation: string | null
  mcc_id: string | null
  mcc_name: string | null
  mcc_cluster: string | null
  tier: string | null
  tpv_utilizado: string | null
  channel: string | null
  sub_channel: string | null
  group_1: string | null
  group_2: string | null
  group_3: string | null
  main_sales_force: string | null
  sales_force: string | null
  domicilio_bancario: string | null
  pertence_a_grupo: string | null
  grupo_nome: string | null
  grupo_tipo: string | null
  grupo_id: string | null
  qtd_docs_no_grupo: string | null
  inicio_adquirencia: string | null
  inicio_digital: string | null
  inicio_banking: string | null
  meses_adquirencia: string | null
  meses_digital: string | null
  meses_banking: string | null
  ultima_trx_adquirencia: string | null
  dias_sem_transacionar: string | null
  status_engajamento: string | null
  meses_ativos_adq_12m: string | null
  ultimo_mes_banking_ativo: string | null
  meses_banking_ativos_12m: string | null
  tem_mdr_cartao: string | null
  tem_rav: string | null
  tem_pix_adquirencia: string | null
  tem_link_pagamento: string | null
  tem_gateway: string | null
  tem_boleto: string | null
  tem_pagarme: string | null
  tem_conta_banking: string | null
  tem_pix_banking: string | null
  tem_transferencia: string | null
  tem_seguro: string | null
  qtd_produtos_ativos: string | null
  ultima_atualizacao_oferta: string | null
  ultima_renegociacao: string | null
  ultima_alteracao_preco: string | null
  cidade: string | null
  uf: string | null
  affiliations: string | null
  extras: string | null
  updated_at: string | null
}

export interface InsightsAdqRow {
  mes: string
  company_name: string | null
  tpv_cartao: string | null
  tpv_pix: string | null
  tpv_debito: string | null
  tpv_cred_avista: string | null
  tpv_psj1: string | null
  tpv_psj2: string | null
  tpv_psj3: string | null
}

export interface BancoMedia {
  saldo_conta: string | null
  saldo_reservas: string | null
  boleto_emitido: string | null
  boleto_liquidado: string | null
  volume_boleto: string | null
  receita_seguros: string | null
  produtos_seguro: string | null
}

export interface FluxoCreditoRow {
  mes: string
  receita_juros: string
  funding_cost: string
  capital_cost: string
  pdd_result: string
  variable_cost: string
  net_cf: string
  nii: string
  risk_adj_nii: string
}
