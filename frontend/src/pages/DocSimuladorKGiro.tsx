import AnimatedHero from '../components/AnimatedHero'

interface Props {
  onNavigate?: (page: string) => void
}

export default function DocSimuladorKGiro({ onNavigate }: Props) {
  return (
    <div className="flex flex-col min-h-screen" style={{ background: '#f5fff5' }}>
      <AnimatedHero className="px-6 py-10">
        <div className="max-w-5xl mx-auto">
          <p className="text-[#a5fa00] text-[11px] font-bold uppercase tracking-[0.15em] mb-2">
            Repositório &middot; Documentações &middot; Simulador K-Giro
          </p>
          <h1 className="text-white font-black text-3xl tracking-tight">Simulador K-Giro</h1>
          <p className="text-white/50 text-sm mt-2">
            Documentação da metodologia e motor de cálculo do simulador unitário de crédito.
          </p>
        </div>
      </AnimatedHero>

      <div className="max-w-4xl mx-auto w-full px-4 md:px-6 py-8 space-y-8">

        {/* Link para o simulador */}
        <div className="flex items-center gap-3 bg-[#00461e] rounded-2xl px-5 py-4">
          <svg className="w-5 h-5 text-[#c7ff3d] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 11h.01M12 11h.01M15 11h.01M4 19h16a2 2 0 002-2V7a2 2 0 00-2-2H4a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          <div className="flex-1 min-w-0">
            <p className="text-[#c7ff3d] text-xs font-bold uppercase tracking-wider">Simulador</p>
            <p className="text-white/80 text-sm">Abrir Simulador K-Giro</p>
          </div>
          <button
            onClick={() => onNavigate?.('simulador-credito')}
            className="shrink-0 bg-[#c7ff3d] text-[#00461e] text-xs font-bold px-4 py-2 rounded-xl hover:bg-[#d4ff5a] transition-colors"
          >
            Abrir →
          </button>
        </div>

        {/* Visão Geral */}
        <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-sm font-extrabold text-[#00461e] uppercase tracking-wider mb-3">Visão Geral</h2>
          <p className="text-sm text-gray-600 leading-relaxed">
            O simulador projeta o PnL unitário de um empréstimo K-Giro (capital de giro) ao longo de até 64 meses,
            considerando amortização (Tabela Price), curva de inadimplência paramétrica (Weibull), custos de funding,
            custo de capital próprio e custos operacionais por canal de originação.
          </p>
        </section>

        {/* Tabela Price */}
        <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-sm font-extrabold text-[#00461e] uppercase tracking-wider mb-3">Tabela Price (PMT)</h2>
          <p className="text-sm text-gray-600 leading-relaxed mb-3">
            O empréstimo segue amortização pela Tabela Price: parcelas fixas calculadas como:
          </p>
          <div className="bg-gray-50 rounded-lg px-4 py-3 font-mono text-sm text-[#00461e]">
            PMT = VD x taxa / (1 - (1 + taxa)^(-prazo))
          </div>
          <p className="text-xs text-gray-400 mt-2">
            Onde VD = valor desembolsado, taxa = taxa de juros mensal, prazo = meses do contrato.
          </p>
        </section>

        {/* Curva Weibull */}
        <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-sm font-extrabold text-[#00461e] uppercase tracking-wider mb-3">Curva de Inadimplência (Weibull)</h2>
          <p className="text-sm text-gray-600 leading-relaxed mb-3">
            A probabilidade acumulada de default (Over 30d) segue uma distribuição Weibull parametrizada por:
          </p>
          <ul className="text-sm text-gray-600 space-y-1.5 ml-4 list-disc mb-3">
            <li><strong>Beta</strong>: parâmetro de forma. Controla a velocidade de entrada em atraso.</li>
            <li><strong>Lambda</strong>: parâmetro de escala. Desloca a curva no tempo.</li>
            <li><strong>PD Infinito</strong>: probabilidade terminal de default (teto assintótico).</li>
          </ul>
          <div className="bg-gray-50 rounded-lg px-4 py-3 font-mono text-sm text-[#00461e]">
            PD(t) = PD_inf x (1 - exp(-(t / lambda)^beta))
          </div>
          <p className="text-xs text-gray-400 mt-2">
            O PMT efetivo de cada mês é multiplicado por (1 - PD(t)), simulando a perda de pagamento por atraso.
          </p>
        </section>

        {/* Estrutura PnL */}
        <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-sm font-extrabold text-[#00461e] uppercase tracking-wider mb-3">Estrutura do PnL Mensal</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-[#00461e] text-white">
                <tr>
                  <th className="px-3 py-2 text-left font-bold">Componente</th>
                  <th className="px-3 py-2 text-left font-bold">Fórmula</th>
                </tr>
              </thead>
              <tbody className="text-gray-600">
                <tr className="border-b border-gray-100"><td className="px-3 py-2 font-semibold">Receita</td><td className="px-3 py-2">Juros do período</td></tr>
                <tr className="border-b border-gray-100 bg-gray-50"><td className="px-3 py-2 font-semibold">Imposto</td><td className="px-3 py-2">Receita x (-4,65%)</td></tr>
                <tr className="border-b border-gray-100"><td className="px-3 py-2 font-semibold">Funding</td><td className="px-3 py-2">Saldo Under90 médio x CoF x (1 - %Ke) x (-1)</td></tr>
                <tr className="border-b border-gray-100 bg-gray-50"><td className="px-3 py-2 font-semibold">Custo Capital</td><td className="px-3 py-2">Saldo Under90 médio x Ke x %Ke x (-1)</td></tr>
                <tr className="border-b border-gray-100"><td className="px-3 py-2 font-semibold text-[#00461e]">NII</td><td className="px-3 py-2">Receita + Imposto + Funding + Custo Capital</td></tr>
                <tr className="border-b border-gray-100 bg-gray-50"><td className="px-3 py-2 font-semibold">Perdas</td><td className="px-3 py-2">Delta Over90d x (-1) x LGD</td></tr>
                <tr className="border-b border-gray-100"><td className="px-3 py-2 font-semibold text-[#00461e]">Risk-Adj NII</td><td className="px-3 py-2">NII + Perdas</td></tr>
                <tr className="border-b border-gray-100 bg-gray-50"><td className="px-3 py-2 font-semibold">CTS Variável</td><td className="px-3 py-2">CTS unitário x (Carteira liq WO / Saldo)</td></tr>
                <tr className="border-b border-gray-100"><td className="px-3 py-2 font-semibold text-[#00461e]">Margem Contrib.</td><td className="px-3 py-2">Risk-Adj NII + CTS Variável</td></tr>
                <tr className="bg-gray-50"><td className="px-3 py-2 font-semibold">CAC</td><td className="px-3 py-2">Custo de aquisição por canal (mês 0 apenas)</td></tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* NPV e TIR */}
        <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-sm font-extrabold text-[#00461e] uppercase tracking-wider mb-3">NPV e TIR</h2>
          <ul className="text-sm text-gray-600 space-y-1.5 ml-4 list-disc">
            <li><strong>LTV</strong>: NPV da margem de contribuição descontada pelo WACC.</li>
            <li><strong>NPV</strong>: LTV + CAC unitário.</li>
            <li><strong>TIR a.a.</strong>: IRR anualizada do fluxo de caixa mensal (Newton-Raphson).</li>
            <li><strong>WACC</strong>: CoF x (1 - %Ke) + Ke x %Ke.</li>
          </ul>
        </section>

        {/* Parâmetros restritos */}
        <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-sm font-extrabold text-[#00461e] uppercase tracking-wider mb-3">Parâmetros de Edição Restrita</h2>
          <p className="text-sm text-gray-600 leading-relaxed mb-3">
            Três seções do simulador têm edição restrita a editores autorizados:
          </p>
          <ul className="text-sm text-gray-600 space-y-1.5 ml-4 list-disc">
            <li><strong>Financing</strong>: CoF, Ke, %Capital Próprio (definem o WACC).</li>
            <li><strong>Custos Operacionais</strong>: CTS unitário, tabela de CAC por canal.</li>
            <li><strong>Curva de Inadimplência</strong>: Beta, Lambda, PD Infinito, LGD (parâmetros Weibull e perda).</li>
          </ul>
          <p className="text-xs text-gray-400 mt-3">
            Para solicitar acesso de editor, entre em contato com a Mesa Banco.
          </p>
        </section>

        {/* Footer */}
        <div className="text-center text-[11px] text-gray-400 pb-6 mt-4">
          Mesa Banco - Pricing Operações
        </div>
      </div>
    </div>
  )
}
