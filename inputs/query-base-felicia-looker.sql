-- Fonte: Dashboard Felícia atual (Looker Studio)
-- Tabela materializada: sbj7ujlwjbsknn8v396xaahlf4ogck.Dias_Credit.base_felicia
-- Responsável: Ayran Dias
--
-- O dash aceita lista de CNPJs como input, faz limpeza de formatação e consulta a base.
-- Seções visíveis no dash:
--   1. Status da Conta: documento, status_kyc, aprovacao_kyc, tipo_conta, rating
--   2. Oferta (safra atual): limite_kgiro, limite_cartao, limite_gfacil, oferta_giro, oferta_cartao, oferta_limite_conta
--   3. Demais Ofertas: histórico com status, aprovação, negociação, desembolso, canal, ID
--   4. Cartão: doc_dono, doc_usuario, limite_concedido, limite_disponivel, limite_colateral, faixa_atraso
--   5. Desembolso: documento, valor, data, tx_juros, vencimento, qtd_parcelas, faixa_atraso, rating_contrato, status_proposta, ID

SELECT * FROM `sbj7ujlwjbsknn8v396xaahlf4ogck.Dias_Credit.base_felicia`
WHERE 1=1
  AND CNPJ IN UNNEST(
    SPLIT(
      REPLACE(
        REPLACE(
          REPLACE(
            REPLACE(
              REPLACE(
                REPLACE(
                  REPLACE(@documento, '.', ''),
                ' ', ''),
              '\n', ''),
            '\r', ''),
          '/', ''),
        '-', ''),
      '"', ''),
      ','
    )
  )
