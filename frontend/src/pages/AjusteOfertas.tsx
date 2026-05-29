import AnimatedHero from '../components/AnimatedHero'
export default function AjusteOfertas() {
  return (
    <div>
      {/* Hero */}
      <AnimatedHero className="px-8 py-16">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-2 text-xs mb-4" style={{ color: 'rgba(255,255,255,0.5)' }}>
            <span>Ferramentas</span><span>·</span>
            <span className="font-bold" style={{ color: 'rgba(255,255,255,0.8)' }}>Ajuste de Ofertas</span>
          </div>
          <h1
            className="font-extrabold leading-[1.05] mb-4"
            style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)', color: 'white' }}
          >
            Ajuste de Ofertas
          </h1>
          <p className="text-base max-w-xl leading-relaxed" style={{ color: 'rgba(255,255,255,0.9)' }}>
            <span className="font-bold">Ferramenta: Ajuste de Ofertas</span><br />
            <a
              href="https://script.google.com/a/macros/stone.com.br/s/AKfycbyFfKujwBI0Yk6J8cgUpznYt7c_TQAS56_4E9cQrCBhelJ1aJruYLXLtdehKGNb2vBn/exec"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm underline underline-offset-2 hover:opacity-80 transition-opacity text-white"
            >
              Link original da ferramenta ↗
            </a><br />
            <span className="text-sm opacity-70">Acesso a alteração de planos é restrito a algumas pessoas da companhia.</span>
          </p>
        </div>
      </AnimatedHero>

      {/* Iframe embed */}
      <div className="w-full" style={{ height: 'calc(100vh - 180px)' }}>
        <iframe
          src="https://script.google.com/a/macros/stone.com.br/s/AKfycbyFfKujwBI0Yk6J8cgUpznYt7c_TQAS56_4E9cQrCBhelJ1aJruYLXLtdehKGNb2vBn/exec"
          className="w-full h-full border-0"
          title="Ajuste de Ofertas"
          allow="same-origin"
        />
      </div>
    </div>
  )
}
