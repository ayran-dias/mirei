%Aluguel
(ROUND( SUM( Rcta_Aluguel),2))/sum(GMV)

%Floating
(ROUND( SUM(  Floating_Stn ),2))/sum(GMV)

floating_delayed_sum
ROUND( SUM( floating_delayed),2)

saldo_delay_avg
ROUND( avg( floating_delayed),2)

%Margem_RAV
(ROUND( SUM( Margem_RAV_STN ),2))/sum(GMV)

%Net_MDR
(ROUND( SUM(Net_MDR_Stone),2))/sum(TPV_Adquirencia)

%Pix
(ROUND( SUM( Receita_Pix_Geral),2))/sum(GMV)

%RAV antecipada
sum(Vlr_GrossValue_STN) / sum(TPV_antecipavel_geral )

Custo_fund_STN_sum
SUM(Vlr_Custo_fund_STN)


custo_servir_Total_sum
sum (custo_servir_Total) * (-1)

Vlr_GrossValue_STN _sum
ROUND( SUM( Vlr_GrossValue_STN ),2)

Duration (DC)
SUM(DurationDC_x_GrossValue )/SUM(Vlr_GrossValue)

Fee_Stone_sum
ROUND( SUM( Fee_Stone ),2)

Fee (%)
(ROUND( SUM(Fee_Stone  ),2))/sum(TPV_Adquirencia)

GMV_SUM
ROUND( SUM(GMV),2)

IC (%)
(ROUND( sum(IC_Stone),2))/sum(TPV_Adquirencia)

IC_Stone_sum
ROUND( SUM( IC_Stone ),2)

Impostos_NetMDR_%
(ROUND( SUM(Impostos_MDR_Stone),2))/sum(TPV_Adquirencia)

Margem_Query_sum
sum(Margem_Query)

Margem_RAV_STN_sum
ROUND( SUM( Margem_RAV_STN ),2)

Margem/GMV
( sum(Margem_Query))/(ABS(sum(GMV)))

Margem/TPV Cartão
(SUM(Receita_Net_COF)-SUM(custo_servir_Total))/sum(TPV_Adquirencia)

Margem/TPV Cartão_query
(SUM(Margem_Query))/sum(TPV_Adquirencia)

MDR_%
(ROUND( SUM(MDR_Stone),2)) / sum(TPV_Adquirencia)

MDR_Stone_sum
ROUND( SUM( MDR_Stone ),2)

Net_MDR
SUM(Vlr_MDR -Vlr_IC -Vlr_Fee - Vlr_AliqNetMDR )

Net_MDR_Stone_Sum
ROUND( SUM(Net_MDR_Stone),2)

PnL_RAV
sum(Vlr_PnL_RAV) 

Rcta_Aluguel_Sum
ROUND( SUM( Rcta_Aluguel ),2)

Rcta_Antifraude_sum
ROUND( SUM( Rcta_Antifraude ),2)

Rcta_Boleto_sum
ROUND( SUM( Rcta_Boleto),2)

Rcta_gateway_sum
ROUND( SUM( Rcta_gateway ),2)

Rcta_Setup_sum
ROUND( SUM( Rcta_Setup ),2)

Rcta_transferencia_sum
ROUND( SUM( Rcta_transferencia ),2)

Receita NetCof
SUM( Net_MDR_Stone+ Margem_RAV_STN + Rcta_Aluguel + Rcta_Boleto+ Rcta_gateway+ Rcta_Antifraude+ Receita_Pix_Geral+ Rcta_transferencia+ Rcta_Setup+ Floating_Stn + floating_delayed )

Receita_Net_COF_m0_sum
SUM(Receita_Net_COF_m0)

Receita_Net_COF_M_Menos_1_sum
SUM(Receita_Net_COF_M_Menos_1)

Receita_Net_COF_M_Menos_2_sum
SUM(Receita_Net_COF_M_Menos_2)

Receita_Net_COF_M_Menos_3_sum
SUM(Receita_Net_COF_M_Menos_3)

Receita_Net_COF_query
SUM(Receita_Net_COF)


Receita_Pix_Geral_sum
ROUND( SUM( Receita_Pix_Geral ),2)

Receita_Pix_Pagarme_sum
ROUND( SUM(Receita_Pix_Pagarme ),2)

Receita_Pix_POS_sum
ROUND( SUM( Receita_Pix_POS ),2)

Receita_RAV_STN_SUM
ROUND( SUM( Receita_RAV_STN ),2)

Receita_TED_sum
ROUND( SUM( Receita_TED ),2)

Take Rate nCOF
SUM( Net_MDR_Stone+ Margem_RAV_STN + Rcta_Aluguel + Rcta_Boleto+ Rcta_gateway+ Rcta_Antifraude+ Receita_Pix_Geral+ Rcta_transferencia+ Rcta_Setup+ Floating_Stn + floating_delayed ) / sum(GMV)

Taxa_Simples
(SUM(TxPre_x_GrossValue) /SUM(Vlr_GrossValue))

TPV_Boleto_Sum
ROUND( SUM(TPV_BOLETO),2)

TPV_Cartao
ROUND( SUM(TPV_Adquirencia),2)

tpv_credito
SUM(Vlr_TPV_credito_a_vista_Visa + Vlr_TPV_credito_a_vista_MasterCard + Vlr_TPV_credito_a_vista_Elo + Vlr_TPV_credito_a_vista_Hipercard + Vlr_TPV_credito_a_vista_Amex)

tpv_debito
SUM(Vlr_TPV_debito_Visa + Vlr_TPV_debito_MasterCard + Vlr_TPV_debito_Elo )

tpv_12_18
SUM(Vlr_TPV_credito_maior_que_12_Visa + Vlr_TPV_credito_maior_que_12_VMasterCard + Vlr_TPV_credito_maior_que_12_VElo + Vlr_TPV_credito_maior_que_12_VHipercard +Vlr_TPV_credito_maior_que_12_VAmex )

tpv_2_a_6
SUM(Vlr_TPV_credito__2_6_Visa + Vlr_TPV_credito__2_6_MasterCard + Vlr_TPV_credito__2_6_Elo + Vlr_TPV_credito__2_6_Hipercard +Vlr_TPV_credito__2_6_Amex )

tpv_7_a_12
SUM(Vlr_TPV_credito_7_12_Visa + Vlr_TPV_credito_7_12_MasterCard + Vlr_TPV_credito_7_12_Elo + Vlr_TPV_credito_7_12_Hipercard + Vlr_TPV_credito_7_12_Amex  )

%12_18
tpv_12_18/Sum(TPV_Adquirencia)

%2a6
tpv_2_a_6/Sum(TPV_Adquirencia)

%7_a_12
tpv_7_a_12/Sum(TPV_Adquirencia)

%cred
tpv_credito/Sum(TPV_Adquirencia)

deb%
tpv_debito/Sum(TPV_Adquirencia)

TPV_M0_sum
SUM(TPV_M0 )

TPV_Menos_1_sum
SUM(TPV_Menos_1)

TPV_Menos_2_sum
SUM(TPV_Menos_2)

TPV_Menos_3_sum
SUM(TPV_Menos_3)

TPV_PIX_POS_sum
ROUND( SUM( TPV_PIX_POS ),2)



Vlr_Fee_credito__2_6_Amex_sum
sum(Vlr_Fee_credito__2_6_Amex) / SUM(Vlr_TPV_credito__2_6_Amex)

Vlr_Fee_credito__2_6_Elo_sum
sum(Vlr_Fee_credito__2_6_Elo) / SUM(Vlr_TPV_credito__2_6_Elo)

Vlr_Fee_credito__2_6_Hipercard_sum
sum(Vlr_Fee_credito__2_6_Hipercard) / SUM(Vlr_TPV_credito__2_6_Hipercard)

Vlr_Fee_credito__2_6_MasterCard_sum
sum(Vlr_Fee_credito__2_6_MasterCard) / SUM(Vlr_TPV_credito__2_6_MasterCard)

Vlr_Fee_credito__2_6_Visa_sum
sum(Vlr_Fee_credito__2_6_Visa) / SUM(Vlr_TPV_credito__2_6_Visa)

Vlr_Fee_7_12_Amex_sum
sum(Vlr_Fee_credito_7_12_Amex) / SUM(Vlr_TPV_credito_7_12_Amex)

Vlr_Fee_credito_7_12_Elo_sum
sum(Vlr_Fee_credito_7_12_Elo) / SUM(Vlr_TPV_credito_7_12_Elo)


Vlr_Fee_credito_7_12_Hipercard_sum
sum(Vlr_Fee_credito_7_12_Hipercard) / SUM(Vlr_TPV_credito_7_12_Hipercard)

Vlr_Fee_credito_7_12_MasterCard_sum
sum(Vlr_Fee_credito_7_12_MasterCard) / SUM(Vlr_TPV_credito_7_12_MasterCard)

Vlr_Fee_credito_7_12_Visa_sum
sum(Vlr_Fee_credito_7_12_Visa) / SUM(Vlr_TPV_credito_7_12_Visa)


Vlr_Fee_credito_a_vista_Amex_sum
sum(Vlr_Fee_credito_a_vista_Amex) / SUM(Vlr_TPV_credito_a_vista_Amex)

Vlr_Fee_credito_a_vista_Elo_sum
sum(Vlr_Fee_credito_a_vista_Elo) / SUM(Vlr_TPV_credito_a_vista_Elo)

Vlr_Fee_credito_a_vista_Hipercard_sum
sum(Vlr_Fee_credito_a_vista_Hipercard) / SUM(Vlr_TPV_credito_a_vista_Hipercard)

Vlr_Fee_credito_a_vista_MasterCard_sum
sum(Vlr_Fee_credito_a_vista_MasterCard) / SUM(Vlr_TPV_credito_a_vista_MasterCard)

Vlr_Fee_credito_a_vista_Visa_sum
sum(Vlr_Fee_credito_a_vista_Visa) / SUM(Vlr_TPV_credito_a_vista_Visa)

Vlr_Fee_debito_Elo_sum
sum(Vlr_Fee_debito_Elo) / SUM(Vlr_TPV_debito_Elo)

Vlr_Fee_debito_MasterCard_sum
sum(Vlr_Fee_debito_MasterCard) / SUM(Vlr_TPV_debito_MasterCard)

Vlr_Fee_debito_Visa_sum
sum(Vlr_Fee_debito_Visa) / SUM(Vlr_TPV_debito_Visa)


Vlr_IC_credito__2_6_Amex_sum
sum(Vlr_IC_credito__2_6_Amex) / SUM(Vlr_TPV_credito__2_6_Amex)

Vlr_IC_credito__2_6_Elo_sum
sum(Vlr_IC_credito__2_6_Elo) / SUM(Vlr_TPV_credito__2_6_Elo)

Vlr_IC_credito__2_6_Hipercard_sum
sum(Vlr_IC_credito__2_6_Hipercard) / SUM(Vlr_TPV_credito__2_6_Hipercard)

Vlr_IC_credito__2_6_MasterCard_sum
sum(Vlr_IC_credito__2_6_MasterCard) / SUM(Vlr_TPV_credito__2_6_MasterCard)

Vlr_IC_credito__2_6_Visa_sum
sum(Vlr_IC_credito__2_6_Visa) / SUM(Vlr_TPV_credito__2_6_Visa)


Vlr_IC_credito_7_12_Amex_sum
sum(Vlr_IC_credito_7_12_Amex) / SUM(Vlr_TPV_credito_7_12_Amex)

Vlr_IC_credito_7_12_Elo_sum
sum(Vlr_IC_credito_7_12_Elo) / SUM(Vlr_TPV_credito_7_12_Elo)

Vlr_IC_credito_7_12_Hipercard_sum
sum(Vlr_IC_credito_7_12_Hipercard) / SUM(Vlr_TPV_credito_7_12_Hipercard)

Vlr_IC_credito_7_12_MasterCard_sum
sum(Vlr_IC_credito_7_12_MasterCard) / SUM(Vlr_TPV_credito_7_12_MasterCard)

Vlr_IC_credito_7_12_Visa_sum
sum(Vlr_IC_credito_7_12_Visa) / SUM(Vlr_TPV_credito_7_12_Visa)


Vlr_IC_credito_a_vista_Amex_sum
sum(Vlr_IC_credito_a_vista_Amex) / SUM(Vlr_TPV_credito_a_vista_Amex)

Vlr_IC_credito_a_vista_Elo_sum
sum(Vlr_IC_credito_a_vista_Elo) / SUM(Vlr_TPV_credito_a_vista_Elo)

Vlr_IC_credito_a_vista_Hipercard_sum
sum(Vlr_IC_credito_a_vista_Hipercard) / SUM(Vlr_TPV_credito_a_vista_Hipercard)

Vlr_IC_credito_a_vista_MasterCard_sum
sum(Vlr_IC_credito_a_vista_MasterCard) / SUM(Vlr_TPV_credito_a_vista_MasterCard)

Vlr_IC_credito_a_vista_Visa_sum
sum(Vlr_IC_credito_a_vista_Visa) / SUM(Vlr_TPV_credito_a_vista_Visa)


Vlr_IC_debito_Elo_sum
sum(Vlr_IC_debito_Elo) / SUM(Vlr_TPV_debito_Elo)

Vlr_IC_debito_MasterCard_sum
sum(Vlr_IC_debito_MasterCard) / SUM(Vlr_TPV_debito_MasterCard)

Vlr_IC_debito_Visa_sum
sum(Vlr_IC_debito_Visa) / SUM(Vlr_TPV_debito_Visa)


Vlr_MDR_credito__2_6_Amex_sum
sum(Vlr_MDR_credito__2_6_Amex) / SUM(Vlr_TPV_credito__2_6_Amex)

Vlr_MDR_credito__2_6_Elo_sum
sum(Vlr_MDR_credito__2_6_Elo) / SUM(Vlr_TPV_credito__2_6_Elo)

Vlr_MDR_credito__2_6_Hipercard_sum
sum(Vlr_MDR_credito__2_6_Hipercard) / SUM(Vlr_TPV_credito__2_6_Hipercard)

Vlr_MDR_credito__2_6_MasterCard_sum
sum(Vlr_MDR_credito__2_6_MasterCard) / SUM(Vlr_TPV_credito__2_6_MasterCard)

Vlr_MDR_credito__2_6_Visa_sum
sum(Vlr_MDR_credito__2_6_Visa) / SUM(Vlr_TPV_credito__2_6_Visa)


Vlr_MDR_credito_7_12_Amex_sum
sum(Vlr_MDR_credito_7_12_Amex) / SUM(Vlr_TPV_credito_7_12_Amex)

Vlr_MDR_credito_7_12_Elo_sum
sum(Vlr_MDR_credito_7_12_Elo) / SUM(Vlr_TPV_credito_7_12_Elo)

Vlr_MDR_credito_7_12_Hipercard_sum
sum(Vlr_MDR_credito_7_12_Hipercard) / SUM(Vlr_TPV_credito_7_12_Hipercard)

Vlr_MDR_credito_7_12_MasterCard_sum
sum(Vlr_MDR_credito_7_12_MasterCard) / SUM(Vlr_TPV_credito_7_12_MasterCard)

Vlr_MDR_credito_7_12_Visa_sum
sum(Vlr_MDR_credito_7_12_Visa) / SUM(Vlr_TPV_credito_7_12_Visa)


Vlr_MDR_credito_a_vista_Amex_sum
sum(Vlr_MDR_credito_a_vista_Amex) / SUM(Vlr_TPV_credito_a_vista_Amex)

Vlr_MDR_credito_a_vista_Elo_sum
sum(Vlr_MDR_credito_a_vista_Elo) / SUM(Vlr_TPV_credito_a_vista_Elo)

Vlr_MDR_credito_a_vista_Hipercard_sum
sum(Vlr_MDR_credito_a_vista_Hipercard) / SUM(Vlr_TPV_credito_a_vista_Hipercard)

Vlr_MDR_credito_a_vista_MasterCard_sum
sum(Vlr_MDR_credito_a_vista_MasterCard) / SUM(Vlr_TPV_credito_a_vista_MasterCard)

Vlr_MDR_credito_a_vista_Visa_sum
sum(Vlr_MDR_credito_a_vista_Visa) / SUM(Vlr_TPV_credito_a_vista_Visa)


Vlr_MDR_debito_Elo_sum
sum(Vlr_MDR_debito_Elo) / SUM(Vlr_TPV_debito_Elo)


Vlr_MDR_debito_MasterCard_sum
sum(Vlr_MDR_debito_MasterCard) / SUM(Vlr_TPV_debito_MasterCard)

Vlr_MDR_debito_Visa_sum
sum(Vlr_MDR_debito_Visa) / SUM(Vlr_TPV_debito_Visa)

--TPV
Vlr_TPV_debito_Elo_sum
sum(Vlr_TPV_debito_Elo) / SUM(TPV_Adquirencia)

Vlr_TPV_debito_MasterCard_sum
sum(Vlr_TPV_debito_MasterCard) / SUM(TPV_Adquirencia)

Vlr_TPV_debito_Visa_sum
sum(Vlr_TPV_debito_Visa) / SUM(TPV_Adquirencia)


Vlr_TPV_credito_a_vista_Amex_sum
sum(Vlr_TPV_credito_a_vista_Amex) / SUM(TPV_Adquirencia)

Vlr_TPV_credito_a_vista_Elo_sum
sum(Vlr_TPV_credito_a_vista_Elo) / SUM(TPV_Adquirencia)

Vlr_TPV_credito_a_vista_Hipercard_sum
sum(Vlr_TPV_credito_a_vista_Hipercard) / SUM(TPV_Adquirencia)

Vlr_TPV_credito_a_vista_MasterCard_sum
sum(Vlr_TPV_credito_a_vista_MasterCard) / SUM(TPV_Adquirencia)

Vlr_TPV_credito_a_vista_Visa_sum
sum(Vlr_TPV_credito_a_vista_Visa) / SUM(TPV_Adquirencia)


Vlr_TPV_credito__2_6_Amex_sum
sum(Vlr_TPV_credito__2_6_Amex) / SUM(TPV_Adquirencia)

Vlr_TPV_credito__2_6_Elo_sum
sum(Vlr_TPV_credito__2_6_Elo) / SUM(TPV_Adquirencia)

Vlr_TPV_credito__2_6_Hipercard_sum
sum(Vlr_TPV_credito__2_6_Hipercard) / SUM(TPV_Adquirencia)

Vlr_TPV_credito__2_6_Visa_sum
sum(Vlr_TPV_credito__2_6_Visa) / SUM(TPV_Adquirencia)

Vlr_TPV_credito__2_6_MasterCard_sum
sum(Vlr_TPV_credito__2_6_MasterCard) / SUM(TPV_Adquirencia)



Vlr_TPV_credito_7_12_Amex_sum
sum(Vlr_TPV_credito_7_12_Amex) / SUM(TPV_Adquirencia)

Vlr_TPV_credito_7_12_Elo_sum
sum(Vlr_TPV_credito_7_12_Elo) / SUM(TPV_Adquirencia)

Vlr_TPV_credito_7_12_Hipercard_sum
sum(Vlr_TPV_credito_7_12_Hipercard) / SUM(TPV_Adquirencia)

Vlr_TPV_credito_7_12_MasterCard_sum
sum(Vlr_TPV_credito_7_12_MasterCard) / SUM(TPV_Adquirencia)

Vlr_TPV_credito_7_12_Visa_sum
sum(Vlr_TPV_credito_7_12_Visa) / SUM(TPV_Adquirencia)


---------TPV Grupos (3 meses)
ordernar↓
(TPV_Menos_2_sum - TPV_Menos_3_sum) / ABS(TPV_Menos_2_sum)

ordernar↓
(TPV_Menos_1_sum - TPV_Menos_2_sum) / ABS(TPV_Menos_2_sum)

ordernar↓
(TPV_M0_sum - TPV_Menos_1_sum) / ABS(TPV_Menos_1_sum)

---------Receita Grupos (3 meses)
ordernar↓
(Receita_Net_COF_M_Menos_2_sum - Receita_Net_COF_M_Menos_3_sum) / ABS(Receita_Net_COF_M_Menos_3_sum)

ordernar↓
(Receita_Net_COF_M_Menos_1_sum - Receita_Net_COF_M_Menos_2_sum) / ABS(Receita_Net_COF_M_Menos_2_sum)

ordernar↓
(Receita_Net_COF_m0_sum - Receita_Net_COF_M_Menos_1_sum) / ABS(Receita_Net_COF_M_Menos_1_sum)

---------TakeRate NetCOF (3 meses)
tk-3
Receita_Net_COF_M_Menos_3_sum/sum(GMV_Menos_3)

tk-2
Receita_Net_COF_M_Menos_2_sum/sum(GMV_Menos_2)

tk-1
Receita_Net_COF_M_Menos_1_sum/sum(GMV_Menos_1)

tk-0
Receita_Net_COF_m0_sum/sum(GMV_M0)


Delay %
ROUND(((SUM(floating_delayed)) / GMV_SUM), 2)
floating_delayed_sum/ GMV_SUM