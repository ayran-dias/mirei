# Dicionário: base_felicia

**Tabela:** `sbj7ujlwjbsknn8v396xaahlf4ogck.Dias_Credit.base_felicia`  
**Grão:** 1 linha por oferta/contrato de crédito por documento (CNPJ)  
**Última atualização observada:** 18/05/2026 (campo `data_processamento`)  
**Validado com:** doc 15327458000127 (3 contratos KGiro)

## Seção: Status da Conta

| Coluna | Tipo | Label no Dash | Exemplo |
|--------|------|---------------|---------|
| `CNPJ` | STRING | Documento | 15327458000127 |
| `kyc_status` | STRING | Status KYC | KYC Aprovado |
| `last_kyc_approved_at` | DATETIME | Aprovação KYC | 2023-03-24 19:39:33 |
| `account_type` | STRING | Tipo de conta | Pagamento |
| `RATING` | FLOAT | Rating | 10.0 |

## Seção: Oferta (safra atual)

| Coluna | Tipo | Label no Dash | Exemplo |
|--------|------|---------------|---------|
| `LIMITE_KGIRO_FINAL` | FLOAT | Limite KGiro | NaN (sem oferta atual) |
| `LIMITE_CARTAO_FINAL` | FLOAT | Limite Cartão | NaN |
| `LIMITE_GFACIL_FINAL` | FLOAT | Limite GFacil | NaN |
| `OFERTA_GIRO` | FLOAT | Oferta Giro | NaN |
| `OFERTA_CARTAO` | FLOAT | Oferta Cartão | NaN |
| `OFERTA_LIMICONTA` | FLOAT | Oferta Limite de Conta | NaN |

**Nota:** NaN = "Não há dados" no dash. Reflete safra atual; se cliente não tem oferta vigente, fica vazio.

## Seção: Demais Ofertas (histórico)

| Coluna | Tipo | Label no Dash | Exemplo |
|--------|------|---------------|---------|
| `offer_id` | STRING | ID | jr7dhsj8q9hwcbgg8bbryjjrk |
| `customer_document` | STRING | Documento | 15327458000127 |
| `offer_status` | STRING | Status | Accepted |
| `offer_expiration_date` | DATETIME (UTC) | Data Expiração | 2024-10-18 |
| `approval_status` | STRING | Status Aprovação | Approved |
| `negotiation_status` | STRING | Status Negociação | Accepted |
| `negotiation_last_update_date` | DATETIME (UTC) | Negoc. (últ.stat.) | 2024-09-05 |
| `proposal_status` | STRING | Status Prop. | Processed |
| `offer_rating` | STRING | Rating Oferta | 7.000000000 |
| `disbursement_value` | FLOAT | Desembolso (R$) | 26002.00 |
| `disbursement_date` | DATE | Desembolso (Data) | 2024-09-09 |
| `product_sales_channel` | STRING | Canal | Stone |
| `negotiation_cancellation_reason` | STRING | Cancelado (Mo...) | None |

## Seção: Cartão

| Coluna | Tipo | Label no Dash | Exemplo |
|--------|------|---------------|---------|
| `documento_dono` | STRING | Documento Dono | 15327458000127 |
| `documento_usuario` | STRING | Documento Usuário | 34915997847 |
| `tipo_documento` | STRING | (não visível) | CNPJ |
| `flag_piloto_interno` | BOOLEAN | (não visível) | False |
| `limite_concedido` | FLOAT | Limite Concedido | 1.0 (R$1) |
| `limite_disponivel` | FLOAT | Limite Disponível | -1678.19 |
| `limite_utilizado_clean` | FLOAT | (não visível) | 1679.19 |
| `limite_concedido_collateral` | FLOAT | Limite Concedido Colateral | 0.0 |
| `faixa_atraso` | STRING | Faixa de atraso (cartão) | 31 a 60 |

## Seção: Desembolso (contratos ativos)

| Coluna | Tipo | Label no Dash | Exemplo |
|--------|------|---------------|---------|
| `CNPJ` | STRING | Documento | 15327458000127 |
| `disbursement_value` | FLOAT | Desembolso (R$) | 6498.45 |
| `disbursement_date` | DATE | Desembolso (Data) | 2025-03-07 |
| `tx_juros_mes__credito_ativo` | STRING | Tx. Juros | 0.019900000 (1,99%) |
| `data_vencimento_credito_ativo` | DATE | Vencimento | 2031-03-17 |
| `qtd_parcelas_credito_ativo` | INT | Qtd. Parcelas | 60 |
| `faixa_atraso_credito_ativo` | STRING | Faixa Atraso | Em dia / 15 a 30 |
| `rating_contabilidade_credito_ativo` | FLOAT | Rating Cont. | 0.0 |
| `proposal_status` | STRING | Status Proposta | Processed |
| `offer_id` | STRING | ID | jrbsbam997unc2jy7qxs18abu |

## Coluna auxiliar

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `data_processamento` | DATE | Data de refresh da base materializada (2026-05-18) |

## Notas

- O grão é **1 linha por oferta/contrato**, não por documento. Campos de Status da Conta e Cartão se repetem em todas as linhas do mesmo CNPJ
- Campos de Oferta (safra atual) também se repetem — são atributos do documento, não da oferta
- `offer_rating` é STRING (ex: "7.000000000"), não numérico — cuidado ao comparar
- `tx_juros_mes__credito_ativo` também é STRING — converter para FLOAT antes de usar
