import AnimatedHero from '../components/AnimatedHero'

interface Props {
  onNavigate?: (page: string) => void
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      <h2 className="text-sm font-extrabold text-[#00461e] uppercase tracking-wider mb-3">{title}</h2>
      {children}
    </section>
  )
}

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-block bg-[#e8f5e9] text-[#00461e] text-[10px] font-bold px-2 py-0.5 rounded-full mr-1">
      {children}
    </span>
  )
}

function Field({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-gray-100 last:border-0">
      <span className="text-xs text-gray-400 w-36 shrink-0 pt-0.5">{label}</span>
      <div>
        <span className="text-xs font-medium text-[#1e281e] font-mono">{value}</span>
        {note && <p className="text-[10px] text-gray-400 mt-1 leading-relaxed">{note}</p>}
      </div>
    </div>
  )
}

export default function DocCarteiras({ onNavigate }: Props) {
  return (
    <div className="flex flex-col min-h-screen" style={{ background: '#f5fff5' }}>
      <AnimatedHero className="px-6 py-10">
        <div className="max-w-5xl mx-auto">
          <p className="text-[#a5fa00] text-[11px] font-bold uppercase tracking-[0.15em] mb-2">
            Repositório &middot; Documentações &middot; Carteiras
          </p>
          <h1 className="text-white font-black text-3xl tracking-tight">Documentação: Carteiras</h1>
          <p className="text-white/50 text-sm mt-2">
            Motor unificado de acompanhamento de carteira — Enterprise e Grupos Marca.
          </p>
        </div>
      </AnimatedHero>

      <div className="max-w-4xl mx-auto w-full px-4 md:px-6 py-8 space-y-8">

        {/* Links rápidos */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Enterprise', page: 'enterprise', desc: 'Grupos econômicos Enterprise' },
            { label: 'Grupos Marca', page: 'grupos-marca', desc: 'Redes de marca e franquias' },
          ].map(({ label, page, desc }) => (
            <div key={page} className="flex items-center gap-3 bg-[#00461e] rounded-2xl px-5 py-4">
              <div className="flex-1 min-w-0">
                <p className="text-[#c7ff3d] text-xs font-bold uppercase tracking-wider">{label}</p>
                <p className="text-white/80 text-sm">{desc}</p>
              </div>
              <button
                onClick={() => onNavigate?.(page)}
                className="shrink-0 bg-[#c7ff3d] text-[#00461e] text-xs font-bold px-4 py-2 rounded-xl hover:bg-[#d4ff5a] transition-colors"
              >
                Abrir →
              </button>
            </div>
          ))}
        </div>

        {/* Visão geral */}
        <Section title="O que é">
          <p className="text-sm text-gray-600 leading-relaxed">
            As páginas de carteira (<strong>Enterprise</strong> e <strong>Grupos Marca</strong>) compartilham o mesmo motor de análise:
            os dados de cada cliente são consolidados por grupo econômico e apresentados em seções padronizadas —
            Base Geral, Visão 3M, Linhas de Receita, Transacional, RAV, Modalidade, Métricas por cliente e Afiliações.
          </p>
          <p className="text-sm text-gray-600 leading-relaxed mt-3">
            A diferença entre as carteiras está na <strong>fonte de dados e no universo de clientes</strong>,
            não na interface ou nas métricas exibidas.
          </p>
        </Section>

        {/* Fontes por carteira */}
        <Section title="Fontes de dados por carteira">
          <div className="space-y-5">

            {/* Enterprise */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm font-bold text-[#00461e]">Enterprise</span>
                <Tag>Stone + Pagar.me</Tag>
              </div>
              <div className="bg-gray-50 rounded-xl p-4 space-y-0.5">
                <Field
                  label="Tabela PnL"
                  value="Dias.PnL_FELICIA_KA_com_Appends"
                  note="Inclui afiliações Stone e Pagar.me. Filtro: Produto_PnL IN ('Apends','RAV')."
                />
                <Field
                  label="Tabela aux docs"
                  value="Dias_auxiliares.docs_enterprise"
                  note="44k linhas (doc × SC). Atualizada seg-qua-sex 05:00 UTC."
                />
                <Field
                  label="Universo"
                  value="Grandes contas com contrato Enterprise ativo"
                />
              </div>
            </div>

            {/* Grupos Marca */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm font-bold text-[#00461e]">Grupos Marca</span>
                <Tag>Stone only</Tag>
              </div>
              <div className="bg-gray-50 rounded-xl p-4 space-y-0.5">
                <Field
                  label="Tabela PnL"
                  value="Dias.PnL_GM"
                  note="Afiliações Stone apenas. Filtro: Produto_PnL IN ('Apends','RAV')."
                />
                <Field
                  label="Tabela aux docs"
                  value="Dias_auxiliares.docs_gm"
                  note="106k linhas (doc × SC). Atualizada seg-qua-sex 05:00 UTC."
                />
                <Field
                  label="Universo"
                  value="Redes de marca e franquias — Grandes Redes, Partner Hub, Franchising"
                />
              </div>
            </div>
          </div>

          <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl">
            <p className="text-xs text-amber-800">
              <strong>Atenção:</strong> Grupos Marca exibe apenas a visão Stone. Clientes com operação Pagar.me
              aparecem com margem menor do que a consolidada. Estudo de impacto disponível no Repositório de Estudos:
              "Análise de grupos com e sem Pagarme".
            </p>
          </div>
        </Section>

        {/* Seções do motor */}
        <Section title="Seções do motor de carteira">
          <div className="space-y-3">
            {[
              { nome: 'Base Geral', desc: 'Tabela mensal com todas as métricas por grupo: GMV, TPV, Net MDR, RAV, Floating, COGs, Margem. Filtros cascading por grupo, documento, SC, MCC e mês. Heatmap por coluna.' },
              { nome: 'Crédito: Lifetime (VP)', desc: 'NII, Risk-Adj NII e NPV acumulados (valor presente) por documento, via npv_kgiro. Fonte: tabela auxiliar pré-computada npv_kgiro_por_documento (atualizada semanalmente). Filtro próprio de grupo dentro do card.' },
              { nome: 'Linhas de Receita', desc: 'Decomposição mensal de receita em 10 linhas: Net MDR, RAV, Floating, Aluguel, TED, Pix, Gateway, Antifraude, Transferência e Setup.' },
              { nome: 'Visão 3 Meses', desc: 'Médias dos últimos 3 meses fechados por grupo. Visão resumida para comparação rápida de performance.' },
              { nome: 'Transacional', desc: 'Mix de bandeiras e modalidades (débito, crédito à vista, PSJ 2-6x, 7-12x, >12x) com TPV, MDR bruto, IC, Fee e Net MDR.' },
              { nome: 'RAV', desc: 'Receita de antecipação: Gross Value, duration, taxa pré, funding e margem RAV líquida.' },
              { nome: 'Modalidade × Bandeira', desc: 'Cruzamento de modalidade de pagamento com bandeira (Visa, Master, Elo, Hiper, Amex). TPV e Net MDR.' },
              { nome: 'Métricas por cliente', desc: 'Drill-down por documento/CNPJ: TPV M0 e histórico 3M, receita, margem e take rate nCOF.' },
              { nome: 'Afiliações', desc: 'Lista de stonecodes (afiliações) do grupo com status, tipo (POS/Tap/Link) e data de credenciamento.' },
            ].map(({ nome, desc }) => (
              <div key={nome} className="flex gap-3">
                <span className="text-xs font-bold text-[#00461e] w-44 shrink-0 pt-0.5">{nome}</span>
                <p className="text-xs text-gray-600 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </Section>

        {/* Filtros */}
        <Section title="Filtros cascading (Base Geral)">
          <p className="text-sm text-gray-600 leading-relaxed mb-4">
            O FilterBar da Base Geral controla o universo de dados de todas as seções que dependem de seleção de grupo.
            Os filtros são cascading: selecionar um valor atualiza as opções dos demais campos em tempo real.
          </p>
          <div className="bg-gray-50 rounded-xl p-4 space-y-0.5">
            <Field label="Grupo" value="grupos" note="Nome do grupo econômico (motivo no PnL)." />
            <Field label="Grupo 1" value="grupo1s / categoria" note="Enterprise: grupo1_enc. GM: categoria." />
            <Field label="Grupo 2" value="grupo2s / responsible_agent_id" note="Enterprise: grupo2_enc. GM: ID do responsável." />
            <Field label="Documento" value="docs" note="CNPJ ou CPF." />
            <Field label="Afiliação" value="scs" note="Stonecode (affiliation_id)." />
            <Field label="MCC" value="mccs" note="Código de categoria de estabelecimento." />
            <Field label="Mês" value="mes" note="Mês de referência no formato YYYY-MM." />
          </div>
        </Section>

        {/* Crédito Lifetime */}
        <Section title="Crédito: Lifetime (VP) — arquitetura">
          <p className="text-sm text-gray-600 leading-relaxed mb-4">
            O card de crédito é o único que consulta fontes externas à PnL. O fluxo é:
          </p>
          <ol className="space-y-2 text-sm text-gray-600">
            <li className="flex gap-2"><span className="font-bold text-[#00461e] shrink-0">1.</span>Filtros do Base Geral + filtro de grupo próprio do card → lista de documentos da carteira.</li>
            <li className="flex gap-2"><span className="font-bold text-[#00461e] shrink-0">2.</span>JOIN com <code className="text-xs bg-gray-100 px-1 rounded">Dias_auxiliares.npv_kgiro_por_documento</code> — tabela pré-computada com NII, Risk-Adj NII e NPV por documento (91k docs, atualizada toda segunda 04:00 UTC).</li>
            <li className="flex gap-2"><span className="font-bold text-[#00461e] shrink-0">3.</span>Resultado: soma agregada (summary) + detalhe paginado por documento (20 por vez).</li>
          </ol>
          <div className="mt-4 bg-gray-50 rounded-xl p-4 space-y-0.5">
            <Field label="Fonte NPV" value="pricing-dedicated-non-prod.credit_pricing.npv_kgiro" />
            <Field label="Tabela aux" value="Dias_auxiliares.npv_kgiro_por_documento" note="91.322 documentos. Elimina scan cross-project em tempo real." />
            <Field label="Schedule aux" value="toda segunda-feira 04:00 UTC" />
          </div>
        </Section>

        {/* Tabelas auxiliares */}
        <Section title="Tabelas auxiliares — schedules">
          <div className="bg-gray-50 rounded-xl p-4 space-y-0.5">
            <Field label="docs_enterprise" value="seg-qua-sex 05:00 UTC" note="CREATE OR REPLACE — docs e SCs da carteira Enterprise." />
            <Field label="docs_gm" value="seg-qua-sex 05:00 UTC" note="CREATE OR REPLACE — docs e SCs da carteira Grupos Marca." />
            <Field label="npv_kgiro_por_documento" value="toda segunda 04:00 UTC" note="CREATE OR REPLACE — NII/NPV por documento (cross-project, 2.65 GB)." />
            <Field label="resumo_conta_historico_company" value="todo domingo 03:00 UTC" note="MERGE — Banking por document × company_name." />
          </div>
        </Section>

      </div>
    </div>
  )
}
