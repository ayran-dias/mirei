import { useCallback, useState, useEffect } from 'react'
import { trackPage, trackEvent } from './hooks/useAnalytics'
import NavDropdown from './components/NavDropdown'
import AnimatedHero from './components/AnimatedHero'
import Enterprise from './pages/Enterprise'
import Home from './pages/Home'
import AjusteOfertas from './pages/AjusteOfertas'
import DocFelicia360 from './pages/DocFelicia360'
import GruposMarca from './pages/GruposMarca'
import RoadmapMesaBanco from './pages/RoadmapMesaBanco'
import MidLarge from './pages/MidLarge'
import Simuladores from './pages/Simuladores'
import SimuladorCredito from './pages/SimuladorCredito'
import Permissoes from './pages/Permissoes'
import DocSimuladorKGiro from './pages/DocSimuladorKGiro'
import Estudos from './pages/Estudos'
import DocCarteiras from './pages/DocCarteiras'

declare global {
  interface Window {
    __FELICIA_PAGE__?: string
    google?: { script?: { history?: { push: (state: unknown, params: Record<string, string>, hash: string) => void; setChangeHandler: (fn: (e: { state: unknown; params: Record<string, string>; hash: string }) => void) => void } } }
  }
}
import SearchBar from './components/SearchBar'
import SummaryCards from './components/SummaryCards'
import InfoCliente from './components/InfoCliente'
import CardAdquirencia from './components/CardAdquirencia'
import InsightsAdq from './components/InsightsAdq'
import OfertasCredito from './components/OfertasCredito'
import FluxoCaixa from './components/FluxoCaixa'
import AdminMonitor from './components/AdminMonitor'
import CollapsibleCard from './components/CollapsibleCard'
import { useBigQuery } from './hooks/useBigQuery'
import InsightsBanking from './components/InsightsBanking'
import CardBanking from './components/CardBanking'
import type { StatusCreditoRow, NpvCredito, PnlAdquirenciaRow, FluxoCreditoRow, Afiliacao360, BancoMedia, InsightsAdqRow, BancoHistoricoRow } from './types'

const COMPANY_OPTIONS = ['Stone', 'Pagar.me']

function aggregatePnl(rows: PnlAdquirenciaRow[], companies: string[]): PnlAdquirenciaRow[] {
  if (!rows?.length) return rows
  const filtered = rows.filter(r => !r.company_name || companies.includes(r.company_name))
  const byMes = new Map<string, any>()
  const n = (v: string | null | undefined) => parseFloat(v ?? '0') || 0
  for (const r of filtered) {
    if (!byMes.has(r.mes)) {
      byMes.set(r.mes, { mes: r.mes, tpv: 0, ctpv: 0, tpv_pix_vol: 0, delay_rcta: 0, net_mdr: 0, floating_conta: 0, aluguel: 0, net_rav: 0, rcta_ted: 0, pix_rcta: 0, gateway: 0, rcta_boleto: 0, rcta_antifraude: 0, rcta_transf: 0, rcta_setup: 0, receita_net_cof: 0, cogs: 0, margem: 0 })
    }
    const acc = byMes.get(r.mes)
    acc.tpv += n(r.tpv); acc.ctpv += n(r.ctpv); acc.tpv_pix_vol += n(r.tpv_pix_vol)
    acc.delay_rcta += n(r.delay_rcta); acc.net_mdr += n(r.net_mdr)
    acc.floating_conta += n(r.floating_conta); acc.aluguel += n(r.aluguel); acc.net_rav += n(r.net_rav)
    acc.rcta_ted += n(r.rcta_ted); acc.pix_rcta += n(r.pix_rcta); acc.gateway += n(r.gateway)
    acc.rcta_boleto += n(r.rcta_boleto); acc.rcta_antifraude += n(r.rcta_antifraude)
    acc.rcta_transf += n(r.rcta_transf); acc.rcta_setup += n(r.rcta_setup)
    acc.receita_net_cof += n(r.receita_net_cof); acc.cogs += n(r.cogs); acc.margem += n(r.margem)
  }
  const sd = (a: number, b: number) => b ? String(a / b) : null
  return Array.from(byMes.values()).map(acc => ({
    mes: acc.mes, company_name: null,
    tpv: String(acc.tpv), ctpv: String(acc.ctpv), tpv_pix_vol: String(acc.tpv_pix_vol),
    delay_rcta: String(acc.delay_rcta), delay_pct: sd(acc.delay_rcta, acc.tpv),
    net_mdr: String(acc.net_mdr), pctg_net_mdr: sd(acc.net_mdr, acc.ctpv || acc.tpv),
    floating_conta: String(acc.floating_conta), floating_pct: sd(acc.floating_conta, acc.tpv),
    aluguel: String(acc.aluguel), aluguel_pct: sd(acc.aluguel, acc.tpv),
    net_rav: String(acc.net_rav), rav_pct: sd(acc.net_rav, acc.tpv),
    rcta_ted: String(acc.rcta_ted), pix_rcta: String(acc.pix_rcta), gateway: String(acc.gateway),
    rcta_boleto: String(acc.rcta_boleto), rcta_antifraude: String(acc.rcta_antifraude),
    rcta_transf: String(acc.rcta_transf), rcta_setup: String(acc.rcta_setup),
    receita_net_cof: String(acc.receita_net_cof), tkr_net_cof: sd(acc.receita_net_cof, Math.abs(acc.tpv)),
    cogs: String(acc.cogs), margem: String(acc.margem), margem_div_tpv: sd(acc.margem, Math.abs(acc.tpv)),
  } as PnlAdquirenciaRow)).sort((a, b) => b.mes.localeCompare(a.mes))
}

function aggregateInsights(rows: InsightsAdqRow[], companies: string[]): InsightsAdqRow[] {
  if (!rows?.length) return rows
  const filtered = rows.filter(r => !r.company_name || companies.includes(r.company_name))
  const byMes = new Map<string, any>()
  const n = (v: string | null | undefined) => parseFloat(v ?? '0') || 0
  for (const r of filtered) {
    if (!byMes.has(r.mes)) byMes.set(r.mes, { mes: r.mes, tpv_cartao: 0, tpv_pix: 0, tpv_debito: 0, tpv_cred_avista: 0, tpv_psj1: 0, tpv_psj2: 0, tpv_psj3: 0 })
    const acc = byMes.get(r.mes)
    acc.tpv_cartao += n(r.tpv_cartao); acc.tpv_pix += n(r.tpv_pix); acc.tpv_debito += n(r.tpv_debito)
    acc.tpv_cred_avista += n(r.tpv_cred_avista); acc.tpv_psj1 += n(r.tpv_psj1); acc.tpv_psj2 += n(r.tpv_psj2); acc.tpv_psj3 += n(r.tpv_psj3)
  }
  return Array.from(byMes.values()).map(acc => ({
    mes: acc.mes, company_name: null,
    tpv_cartao: String(acc.tpv_cartao), tpv_pix: String(acc.tpv_pix), tpv_debito: String(acc.tpv_debito),
    tpv_cred_avista: String(acc.tpv_cred_avista), tpv_psj1: String(acc.tpv_psj1), tpv_psj2: String(acc.tpv_psj2), tpv_psj3: String(acc.tpv_psj3),
  } as InsightsAdqRow)).sort((a, b) => b.mes.localeCompare(a.mes))
}

export default function App() {
  // Routing: lê page inicial do GAS (URL param), navegação interna via estado
  const [currentPage, setCurrentPage] = useState<string>(
    (typeof window !== 'undefined' && window.__FELICIA_PAGE__) || 'home'
  )
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [currentUserEmail, setCurrentUserEmail] = useState<string>('')

  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).google?.script?.run) {
      const runner = (window as any).google.script.run
        .withSuccessHandler((info: { email: string }) => setCurrentUserEmail(info.email || ''))
        .withFailureHandler(() => setCurrentUserEmail(''))
      runner.getUserInfo()
    }
  }, [])

  const navigate = (page: string) => {
    setCurrentPage(page)
    try { window.google?.script?.history?.push(null, { page }, '') } catch (_) {}
  }

  // Responde ao botão voltar/avançar do browser
  useEffect(() => {
    try {
      window.google?.script?.history?.setChangeHandler((e) => {
        const p = e.params?.page
        if (p) setCurrentPage(p)
      })
    } catch (_) {}
  }, [])
  const [selectedCompanies, setSelectedCompanies] = useState<string[]>(COMPANY_OPTIONS)
  const toggleCompany = (c: string) => setSelectedCompanies(prev =>
    prev.includes(c) ? (prev.length > 1 ? prev.filter(x => x !== c) : prev) : [...prev, c]
  )

  const statusCredito = useBigQuery<StatusCreditoRow[]>()
  const npvCredito = useBigQuery<NpvCredito[]>()
  const pnlAdq = useBigQuery<PnlAdquirenciaRow[]>()
  const fluxoCredito = useBigQuery<FluxoCreditoRow[]>()
  const afiliacao360 = useBigQuery<Afiliacao360[]>()
  const banco = useBigQuery<BancoMedia[]>()
  const insightsAdq = useBigQuery<InsightsAdqRow[]>()
  const bankingHistorico = useBigQuery<BancoHistoricoRow[]>()

  const isLoading = statusCredito.status === 'loading'
    || npvCredito.status === 'loading'
    || pnlAdq.status === 'loading'
    || fluxoCredito.status === 'loading'
    || afiliacao360.status === 'loading'
    || banco.status === 'loading'

  const [lastSearchedDoc, setLastSearchedDoc] = useState<string>('')

  const handleSearch = useCallback((doc: string) => {
    trackEvent('search_cnpj', { page: 'felicia360' })
    setLastSearchedDoc(doc)
    statusCredito.run('getStatusCredito', doc)
    npvCredito.run('getNpvCredito', doc)
    pnlAdq.run('getPnlAdquirencia', doc)
    fluxoCredito.run('getFluxoCreditoMensal', doc)
    afiliacao360.run('getAfiliacao360', doc)
    banco.run('getBancoMedia', doc)
    insightsAdq.run('getInsightsAdq', doc)
    bankingHistorico.run('getBankingHistorico', doc, selectedCompanies)
  }, [selectedCompanies])

  // Re-fetch banking data when company filter changes (and a doc has been searched)
  useEffect(() => {
    if (lastSearchedDoc && bankingHistorico.status !== 'idle') {
      bankingHistorico.run('getBankingHistorico', lastSearchedDoc, selectedCompanies)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCompanies.join(',')])

  // Rastrear mudança de página no GA4
  useEffect(() => { trackPage(currentPage) }, [currentPage])

  const hasData = statusCredito.status !== 'idle'
  // Doc atual consultado — passado ao monitor
  const currentDoc = (afiliacao360.data as any)?.[0]?.document ?? ''

  return (
    <div className="min-h-screen bg-[#f5fff5] overflow-x-hidden">
      {/* Navbar */}
      <header className="bg-[#00461e]">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-3 flex items-center justify-between">
          <button onClick={() => navigate('home')} className="text-white font-bold text-sm tracking-wide flex-shrink-0 hover:text-white/80 transition-colors">stone</button>

          {/* Nav items — hidden on mobile */}
          <nav className="hidden md:flex items-center gap-1">
            <NavDropdown label="Início" onNavigate={() => navigate('home')} />
            <NavDropdown label="Felícia 360" onNavigate={() => navigate('felicia360')} />
            <NavDropdown
              label="Acompanhamentos"
              onNavigate={navigate}
              items={[
                {
                  label: 'Carteiras',
                  children: [
                    { label: 'Enterprise', page: 'enterprise' },
                    { label: 'Grupos Marca', page: 'grupos-marca' },
                    { label: 'Mid-Large', page: 'mid-large' },
                  ],
                },
              ]}
            />
            <NavDropdown
              label="Ferramentas"
              onNavigate={navigate}
              items={[
                { label: 'Ajuste de Ofertas', page: 'ajuste-ofertas' },
                {
                  label: 'Simuladores',
                  children: [
                    { label: 'Credito (K-Giro)', page: 'simulador-credito' },
                  ],
                },
              ]}
            />
            <NavDropdown
              label="Repositório"
              onNavigate={navigate}
              items={[
                {
                  label: 'Documentações',
                  children: [
                    { label: 'Felícia 360', page: 'doc-felicia360' },
                    { label: 'Simulador K-Giro', page: 'doc-simulador-kgiro' },
                    { label: 'Carteiras', page: 'doc-carteiras' },
                  ],
                },
                {
                  label: 'Planejamentos',
                  children: [
                    { label: 'Roadmap: Mesa Banco', page: 'roadmap-mesa-banco' },
                  ],
                },
                { label: 'Estudos', page: 'estudos' },
              ]}
            />
            {currentUserEmail === 'ayran.maduro@stone.com.br' && (
              <NavDropdown label="Permissoes" onNavigate={() => navigate('permissoes')} />
            )}
          </nav>

          <div className="flex items-center gap-2 md:gap-3 flex-shrink-0">
            <AdminMonitor currentPage={currentPage} />
            <span className="bg-[#00d700] text-[#00461e] text-xs font-bold px-3 py-1 rounded-full hidden sm:inline-block">Mesa Banco</span>
            {/* Hamburger — mobile only */}
            <button
              onClick={() => setMobileMenuOpen(o => !o)}
              className="md:hidden text-white p-1"
              aria-label="Menu"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {mobileMenuOpen
                  ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                }
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <nav className="md:hidden border-t border-white/10 bg-white px-4 py-3">
            {/* Início */}
            <button
              onClick={() => { navigate('home'); setMobileMenuOpen(false) }}
              className="block w-full text-left text-sm text-[#00461e] font-medium py-2 px-4 hover:bg-[#f0faf5] rounded-lg transition-colors"
            >
              Início
            </button>
            <button
              onClick={() => { navigate('felicia360'); setMobileMenuOpen(false) }}
              className="block w-full text-left text-sm text-[#00461e] font-medium py-2 px-4 hover:bg-[#f0faf5] rounded-lg transition-colors"
            >
              Felícia 360
            </button>

            {/* Separator */}
            <div className="border-t border-[#e8f0e8] my-2" />

            {/* Acompanhamentos */}
            <p className="text-[10px] font-bold text-[#00461e]/50 tracking-widest px-4 pb-1">Acompanhamentos</p>
            {([
              { label: 'Enterprise', page: 'enterprise' },
              { label: 'Grupos Marca', page: 'grupos-marca' },
              { label: 'Mid-Large', page: 'mid-large' },
            ] as const).map(item => (
              <button
                key={item.page}
                onClick={() => { navigate(item.page); setMobileMenuOpen(false) }}
                className="block w-full text-left text-sm text-[#00461e] font-medium py-2 px-4 hover:bg-[#f0faf5] rounded-lg transition-colors"
              >
                {item.label}
              </button>
            ))}

            {/* Separator */}
            <div className="border-t border-[#e8f0e8] my-2" />

            {/* Ferramentas */}
            <p className="text-[10px] font-bold text-[#00461e]/50 tracking-widest px-4 pb-1">Ferramentas</p>
            <button
              onClick={() => { navigate('ajuste-ofertas'); setMobileMenuOpen(false) }}
              className="block w-full text-left text-sm text-[#00461e] font-medium py-2 px-4 hover:bg-[#f0faf5] rounded-lg transition-colors"
            >
              Ajuste de Ofertas
            </button>
            <button
              onClick={() => { navigate('simulador-credito'); setMobileMenuOpen(false) }}
              className="block w-full text-left text-sm text-[#00461e] font-medium py-2 px-4 hover:bg-[#f0faf5] rounded-lg transition-colors"
            >
              Simuladores &rsaquo; Credito (K-Giro)
            </button>

            {/* Separator */}
            <div className="border-t border-[#e8f0e8] my-2" />

            {/* Repositório */}
            <p className="text-[10px] font-bold text-[#00461e]/50 tracking-widest px-4 pb-1">Repositório</p>
            <button
              onClick={() => { navigate('doc-felicia360'); setMobileMenuOpen(false) }}
              className="block w-full text-left text-sm text-[#00461e] font-medium py-2 px-4 hover:bg-[#f0faf5] rounded-lg transition-colors"
            >
              Documentações &rsaquo; Felícia 360
            </button>
            <button
              onClick={() => { navigate('doc-simulador-kgiro'); setMobileMenuOpen(false) }}
              className="block w-full text-left text-sm text-[#00461e] font-medium py-2 px-4 hover:bg-[#f0faf5] rounded-lg transition-colors"
            >
              Documentações &rsaquo; Simulador K-Giro
            </button>
            <button
              onClick={() => { navigate('doc-carteiras'); setMobileMenuOpen(false) }}
              className="block w-full text-left text-sm text-[#00461e] font-medium py-2 px-4 hover:bg-[#f0faf5] rounded-lg transition-colors"
            >
              Documentações &rsaquo; Carteiras
            </button>
            <button
              onClick={() => { navigate('roadmap-mesa-banco'); setMobileMenuOpen(false) }}
              className="block w-full text-left text-sm text-[#00461e] font-medium py-2 px-4 hover:bg-[#f0faf5] rounded-lg transition-colors"
            >
              Planejamentos &rsaquo; Roadmap Mesa Banco
            </button>
            <button
              onClick={() => { navigate('estudos'); setMobileMenuOpen(false) }}
              className="block w-full text-left text-sm text-[#00461e] font-medium py-2 px-4 hover:bg-[#f0faf5] rounded-lg transition-colors"
            >
              Estudos
            </button>

            {currentUserEmail === 'ayran.maduro@stone.com.br' && (<>
              <div className="border-t border-[#e8f0e8] my-2" />
              <button
                onClick={() => { navigate('permissoes'); setMobileMenuOpen(false) }}
                className="block w-full text-left text-sm text-[#00461e] font-medium py-2 px-4 hover:bg-[#f0faf5] rounded-lg transition-colors"
              >
                Permissoes
              </button>
            </>)}
          </nav>
        )}
      </header>

      {/* Roteamento de páginas */}
      {currentPage === 'home' && <Home onNavigate={navigate} />}
      {currentPage === 'enterprise' && <Enterprise />}
      {currentPage === 'ajuste-ofertas' && <AjusteOfertas />}
      {currentPage === 'grupos-marca' && <GruposMarca />}
      {currentPage === 'doc-felicia360' && <DocFelicia360 onNavigate={navigate} />}
      {currentPage === 'roadmap-mesa-banco' && <RoadmapMesaBanco />}
      {currentPage === 'mid-large' && <MidLarge />}
      {currentPage === 'simuladores' && <Simuladores />}
      {currentPage === 'simulador-credito' && <SimuladorCredito onNavigate={navigate} />}
      {currentPage === 'permissoes' && <Permissoes userEmail={currentUserEmail} />}
      {currentPage === 'doc-simulador-kgiro' && <DocSimuladorKGiro onNavigate={navigate} />}
      {currentPage === 'doc-carteiras' && <DocCarteiras onNavigate={navigate} />}
      {currentPage === 'estudos' && <Estudos />}
      {currentPage !== 'home' && currentPage !== 'enterprise' && currentPage !== 'felicia360' && currentPage !== 'ajuste-ofertas' && currentPage !== 'grupos-marca' && currentPage !== 'doc-felicia360' && currentPage !== 'doc-simulador-kgiro' && currentPage !== 'roadmap-mesa-banco' && currentPage !== 'mid-large' && currentPage !== 'simuladores' && currentPage !== 'simulador-credito' && currentPage !== 'permissoes' && currentPage !== 'estudos' && currentPage !== 'doc-carteiras' && (
        <div className="max-w-7xl mx-auto px-6 py-16 text-center text-[#96a096]">Página não encontrada.</div>
      )}

      {currentPage !== 'felicia360' ? null : <>

      {/* Hero */}
      <AnimatedHero className="px-4 md:px-6 py-8 md:py-12">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-white font-extrabold text-2xl md:text-4xl leading-tight mb-3">Felicia 360</h1>
          <div className="mt-6 md:mt-8 max-w-lg">
            <SearchBar onSearch={handleSearch} loading={isLoading} />
          </div>
        </div>
      </AnimatedHero>

      <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 md:py-8">
        {!hasData && (
          <div className="text-center py-16 text-[#96a096]">
            <p className="text-base font-medium text-[#505a50]">Digite um CNPJ para consultar</p>
            <p className="text-sm mt-1">Crédito, adquirência e banco carregados em paralelo</p>
          </div>
        )}

        {hasData && (
          <div className="space-y-8">
            {/* Informacoes do Cliente */}
            <InfoCliente
              data={afiliacao360.data}
              status={afiliacao360.status}
            />

            {/* Summary Cards — wrapper colapsável */}
            <CollapsibleCard title="Resumo" defaultOpen={true}>
              <SummaryCards
                npv={npvCredito.data}
                npvStatus={npvCredito.status}
                pnl={pnlAdq.data ? aggregatePnl(pnlAdq.data, selectedCompanies) : null}
                pnlStatus={pnlAdq.status}
                credito={statusCredito.data}
                banco={banco.data}
                bancoStatus={banco.status}
              />
            </CollapsibleCard>

            {/* Fluxo de Caixa */}
            <FluxoCaixa
              pnl={pnlAdq.data}
              pnlStatus={pnlAdq.status}
              credito={fluxoCredito.data}
              creditoStatus={fluxoCredito.status}
              defaultOpen={true}
            />

            {/* Filtro Produtos */}
            {pnlAdq.status === 'success' && (
              <div className="flex items-center gap-4 px-1">
                <span className="text-xs font-semibold text-[#505a50] uppercase tracking-wide">Produtos:</span>
                {COMPANY_OPTIONS.map(c => (
                  <label key={c} className="flex items-center gap-1.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={selectedCompanies.includes(c)}
                      onChange={() => toggleCompany(c)}
                      className="rounded border-gray-300 text-[#00461e] focus:ring-[#00461e]"
                    />
                    <span className="text-sm text-[#505a50]">{c}</span>
                  </label>
                ))}
              </div>
            )}

            {/* Adquirencia - Insights */}
            <InsightsAdq
              pnl={pnlAdq.data ? aggregatePnl(pnlAdq.data, selectedCompanies) : null}
              pnlStatus={pnlAdq.status}
              insights={insightsAdq.data ? aggregateInsights(insightsAdq.data, selectedCompanies) : null}
              insightsStatus={insightsAdq.status}
              defaultOpen={false}
            />

            {/* Adquirencia - Detalhado Mensal */}
            <CardAdquirencia
              data={pnlAdq.data ? aggregatePnl(pnlAdq.data, selectedCompanies) : null}
              status={pnlAdq.status}
              defaultOpen={false}
            />

            {/* Banking: Insights */}
            <InsightsBanking
              data={bankingHistorico.data}
              status={bankingHistorico.status}
              selectedCompanies={selectedCompanies}
              defaultOpen={false}
            />

            {/* Banking: Detalhado Mensal */}
            <CardBanking
              data={bankingHistorico.data}
              status={bankingHistorico.status}
              selectedCompanies={selectedCompanies}
              defaultOpen={false}
            />

            {/* Ofertas de Credito */}
            <OfertasCredito
              data={statusCredito.data}
              status={statusCredito.status}
              defaultOpen={false}
            />
          </div>
        )}

        {/* Footer */}
        <div className="mt-12 pb-6 text-center text-[11px] text-[#96a096]">
          Mesa Banco - Pricing Operações
        </div>
      </div>

      </>}
    </div>
  )
}
