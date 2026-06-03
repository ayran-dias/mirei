import AnimatedHero from '../components/AnimatedHero'

interface PermissionGroup {
  name: string
  description: string
  emails: string[]
}

const PERMISSION_GROUPS: PermissionGroup[] = [
  {
    name: 'Simulador de Credito',
    description: 'Editores dos parametros avancados (Financing, Custos Operacionais, Curva Inadimplencia)',
    emails: [
      'ayran.maduro@stone.com.br',
      'carlos.bazetti@stone.com.br',
      'gustavo.teles@stone.com.br',
    ],
  },
  {
    name: 'Roadmap',
    description: 'Editores do Roadmap Mesa Banco (criar, mover e editar cards)',
    emails: [
      'ayran.maduro@stone.com.br',
      'carlos.bazetti@stone.com.br',
    ],
  },
]

export default function Permissoes({ userEmail }: { userEmail: string }) {
  const isAdmin = userEmail === 'ayran.maduro@stone.com.br'

  if (!isAdmin) {
    return (
      <div className="flex flex-col min-h-screen" style={{ background: '#f5fff5' }}>
        <AnimatedHero className="px-6 py-10">
          <div className="max-w-5xl mx-auto">
            <h1 className="text-white font-black text-3xl tracking-tight">Permissoes</h1>
          </div>
        </AnimatedHero>
        <div className="max-w-5xl mx-auto px-6 py-16 text-center">
          <p className="text-[#96a096] text-sm">Acesso restrito.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen" style={{ background: '#f5fff5' }}>
      <AnimatedHero className="px-6 py-10">
        <div className="max-w-5xl mx-auto">
          <p className="text-[#a5fa00] text-[11px] font-bold uppercase tracking-[0.15em] mb-2">
            Administracao
          </p>
          <h1 className="text-white font-black text-3xl tracking-tight">Permissoes</h1>
          <p className="text-white/50 text-sm mt-2">
            Grupos de permissao e emails autorizados por funcionalidade.
          </p>
        </div>
      </AnimatedHero>

      <div className="max-w-4xl mx-auto w-full px-4 md:px-6 py-8 space-y-6">
        {PERMISSION_GROUPS.map(group => (
          <div key={group.name} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center gap-3 mb-1">
              <h3 className="text-sm font-extrabold text-[#00461e] uppercase tracking-wider">{group.name}</h3>
              <span className="text-[10px] text-[#00461e]/50 bg-[#00461e]/5 border border-[#00461e]/10 px-2 py-0.5 rounded-full font-semibold">
                {group.emails.length} {group.emails.length === 1 ? 'editor' : 'editores'}
              </span>
            </div>
            <p className="text-xs text-gray-400 mb-4">{group.description}</p>

            <div className="space-y-2">
              {group.emails.map(email => (
                <div key={email} className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-gray-50 border border-gray-100">
                  <div className="w-7 h-7 rounded-full bg-[#00461e] flex items-center justify-center text-white text-[10px] font-bold uppercase flex-shrink-0">
                    {email.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[#00461e]">{email.split('@')[0].replace('.', ' ')}</p>
                    <p className="text-[10px] text-gray-400">{email}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        <div className="text-center text-[11px] text-gray-400 pb-6">
          Para alterar permissoes, editar a lista no codigo-fonte (Code.gs + componentes TSX).
        </div>
      </div>
    </div>
  )
}
