import AnimatedHero from '../components/AnimatedHero'

export default function Simuladores() {
  return (
    <div className="flex flex-col min-h-screen" style={{ background: '#f5fff5' }}>
      <AnimatedHero className="px-6 py-12">
        <div className="max-w-5xl mx-auto">
          <p className="text-[#a5fa00] text-[11px] font-bold uppercase tracking-[0.15em] mb-2">Ferramentas · Simuladores</p>
          <h1 className="text-white font-black text-3xl tracking-tight">Simuladores</h1>
          <p className="text-white/50 text-sm mt-2">Simulação de adquirência e precificação.</p>
        </div>
      </AnimatedHero>
      <div className="flex-1 flex items-center justify-center px-6 py-20">
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-[#e6f7ee] flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-[#1D9E75]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 11h.01M12 11h.01M15 11h.01M4 19h16a2 2 0 002-2V7a2 2 0 00-2-2H4a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h2 className="text-xl font-extrabold text-[#00461e] mb-2">Em breve</h2>
          <p className="text-sm text-gray-400 max-w-sm">
            Simulador de adquirência em construção — motor de cálculo de MDR, RAV, IC e payback por perfil de cliente.
          </p>
        </div>
      </div>
    </div>
  )
}
