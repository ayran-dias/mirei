/**
 * AnimatedHero — fundo com efeito aurora CSS puro (sem GIF/lib externa)
 * Blobs com radial-gradient + filter:blur + @keyframes animados
 */
interface Props {
  children: React.ReactNode
  className?: string
}

export default function AnimatedHero({ children, className = '' }: Props) {
  return (
    <div
      className={`relative overflow-hidden ${className}`}
      style={{
        // Base: composição estática do Felícia 360 — melhor combinação de cores
        background: 'radial-gradient(ellipse at 5% 95%, #00461e 0%, transparent 55%), radial-gradient(ellipse at 95% 5%, #a5fa00 0%, transparent 50%), radial-gradient(ellipse at 88% 85%, #00d700 0%, transparent 45%), #00461e',
      }}
    >
      {/* Blobs animados — compõem o efeito aurora */}
      <div className="hero-blob-1" />
      <div className="hero-blob-2" />
      <div className="hero-blob-3" />
      <div className="hero-blob-4" />

      {/* Conteúdo acima dos blobs */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  )
}
