import AnimatedHero from '../components/AnimatedHero'
/**
 * Home.tsx — Felícia 360 Hub
 * Layout baseado no meta.jpg: hero lime, cards de feature, grid 3 colunas.
 * Cada nova feature é adicionada como um FeatureCard aqui.
 */

interface FeatureCard {
  badge: string
  title: string
  subtitle: string
  description: string
  tags: string
  cta: string
  page: string
  accentColor?: string
}

const FEATURES: FeatureCard[] = [
  {
    badge: 'Dash',
    title: 'Felícia 360',
    subtitle: 'Painel individual por CNPJ — crédito, adquirência e banco',
    description: 'Busque um cliente pelo CNPJ e veja tudo em uma tela: score e situação de crédito, NPV, PnL mensal, fluxo de caixa, extrato bancário e ofertas de crédito ativas. Dados de três produtos integrados.',
    tags: '1 CNPJ por busca · Crédito · Adquirência · Banco',
    cta: 'Buscar cliente →',
    page: 'felicia360',
    accentColor: '#00d700',
  },
  {
    badge: 'Dash',
    title: 'Carteira Enterprise',
    subtitle: 'Portfólio consolidado de grupos econômicos Enterprise',
    description: 'Monitore grandes contas no nível de grupo econômico. Abas: Base Geral, Visão 3M, Transacional, RAV, Modalidade × Bandeira, Métricas por cliente e Afiliações.',
    tags: 'Grupos econômicos · TPV · RAV · Afiliações',
    cta: 'Abrir carteira →',
    page: 'enterprise',
    accentColor: '#00461e',
  },
  {
    badge: 'Dash',
    title: 'Grupos Marca',
    subtitle: 'Portfólio consolidado de redes de marca e franquias',
    description: 'Monitore redes franqueadas no nível de grupo de marca: Base Geral, Visão 3M, Transacional, RAV, Linhas de Receita e Métricas por grupo. Fonte: PnL_GM.',
    tags: 'Redes de marca · PnL_GM · RAV · Franquias',
    cta: 'Abrir acompanhamento →',
    page: 'grupos-marca',
    accentColor: '#007d00',
  },
  {
    badge: 'Dash',
    title: 'Carteira Mid-Large',
    subtitle: 'Portfólio consolidado de clientes mid-large',
    description: 'Acompanhamento de carteira mid-large via ferramenta dedicada. Métricas de TPV, receita e engajamento por grupo econômico.',
    tags: 'Mid-large · TPV · Receita · Grupos econômicos',
    cta: 'Abrir carteira →',
    page: 'mid-large',
    accentColor: '#007d00',
  },
  {
    badge: 'Ferramenta',
    title: 'Ajuste de Ofertas',
    subtitle: 'Edição de planos comerciais por stonecode',
    description: 'Altere MDR, RAV, PIX e Smart Fees de clientes individuais. Valida regras de precificação antes de aplicar. Acesso restrito a operadores autorizados.',
    tags: 'MDR · RAV · PIX · Acesso restrito',
    cta: 'Abrir ferramenta →',
    page: 'ajuste-ofertas',
    accentColor: '#007d00',
  },
  {
    badge: 'Repositório',
    title: 'Documentação Felícia 360',
    subtitle: 'Referência técnica das páginas e cards',
    description: 'Documentação completa do Felícia 360: origem dos dados, queries, definições de campos e lógicas de cálculo. Disclosure progressivo em 3 níveis.',
    tags: 'Referência · Dados · Queries',
    cta: 'Ver documentação →',
    page: 'doc-felicia360',
    accentColor: '#1D9E75',
  },
  {
    badge: 'Repositório',
    title: 'Roadmap: Mesa Banco',
    subtitle: 'Planejamento e histórico do projeto',
    description: 'Canvas interativo com todos os cards do projeto organizados por fase. Drag & drop para editores, pan/zoom para todos.',
    tags: 'Planejamento · Canvas · Projeto',
    cta: 'Ver roadmap →',
    page: 'roadmap-mesa-banco',
    accentColor: '#1D9E75',
  },
  {
    badge: 'Repositório',
    title: 'Estudos',
    subtitle: 'Análises e estudos da equipe de Pricing Operações',
    description: 'Repositório de estudos quantitativos: análises de margem, cohorts, rentabilidade e impacto de decisões de pricing. Visualizações interativas com dados direto do BQ.',
    tags: 'Análises · Pricing · BQ · Interativo',
    cta: 'Ver estudos →',
    page: 'estudos',
    accentColor: '#1D9E75',
  },
]

interface Props {
  onNavigate: (page: string) => void
}

export default function Home({ onNavigate }: Props) {
  return (
    <div className="min-h-screen" style={{ background: '#f5fff5' }}>

      {/* Hero — lime gradient matching meta.jpg */}
<AnimatedHero className="px-4 md:px-8 py-12 md:py-20">
        <div className="max-w-5xl mx-auto">
          <h1
            className="font-extrabold leading-[1.05] mb-6"
            style={{ fontSize: 'clamp(2rem, 6vw, 4.5rem)', color: 'white' }}
          >
            Mesa Banco
          </h1>
          <p className="text-white text-sm md:text-base max-w-xl leading-relaxed">
            <span className="font-bold text-white">Painel: Mesa Banco</span><br />
            Ferramentas, documentacoes, dashs e acompanhamentos.
          </p>
        </div>
      </AnimatedHero>

      {/* Grid de features */}
      <div className="max-w-5xl mx-auto px-4 md:px-8 py-8 md:py-14">
        {/* Section header */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-6 h-0.5 bg-[#00d700]" />
            <span className="text-[11px] font-bold tracking-widest text-[#505a50] uppercase">Ferramentas disponíveis</span>
          </div>
          <p className="text-xl md:text-3xl font-extrabold text-[#00461e]">
            4 dashboards, 1 ferramenta e 3 repositórios.
          </p>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map((f) => (
            <div
              key={f.page}
              className="bg-white rounded-2xl shadow-sm border border-[#e8f0e8] flex flex-col overflow-hidden hover:shadow-md transition-shadow cursor-pointer group"
              style={{ borderLeft: `4px solid ${f.accentColor}` }}
              onClick={() => onNavigate(f.page)}
            >
              {/* Card body */}
              <div className="p-6 flex-1">
                {/* Badge */}
                <span
                  className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold mb-4"
                  style={{ background: '#a5fa00', color: '#00461e' }}
                >
                  {f.badge}
                </span>

                <h2 className="text-xl font-extrabold text-[#00461e] mb-1 leading-tight">
                  {f.title}
                </h2>
                <p className="text-xs font-semibold text-[#505a50] mb-3">
                  {f.subtitle}
                </p>
                <p className="text-sm text-[#505a50] leading-relaxed">
                  {f.description}
                </p>
              </div>

              {/* Footer */}
              <div className="px-6 pb-5 pt-3 border-t border-[#f0f4f0]">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-[#96a096] bg-[#f5fff5] px-2 py-1 rounded-full">
                    {f.tags}
                  </span>
                </div>
                <button
                  onClick={e => { e.stopPropagation(); onNavigate(f.page) }}
                  className="mt-3 w-full py-2 rounded-xl text-sm font-bold transition-colors"
                  style={{ background: f.accentColor, color: f.accentColor === '#00d700' ? '#00461e' : 'white' }}
                >
                  {f.cta}
                </button>
              </div>
            </div>
          ))}

        </div>
      </div>

      <div className="pb-8 text-center text-[11px] text-[#96a096]">
        Mesa Banco · Pricing Operações
      </div>
    </div>
  )
}
