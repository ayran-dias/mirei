import { useState, useEffect, useRef } from 'react'

interface UserPresence {
  email: string
  doc: string
  page: string
  lastPing: string
  firstSeen: string
  online: boolean
}

interface LogEntry {
  ts: string
  email: string
  doc: string
  page: string
}

interface AdminData {
  isAdmin: boolean
  users?: UserPresence[]
  log?: LogEntry[]
}

declare const google: any

// ── Helpers ───────────────────────────────────────────────────
function safeTimeAgo(ts: string | undefined): string {
  if (!ts) return '—'
  const ms = Date.now() - new Date(ts).getTime()
  if (isNaN(ms) || ms < 0) return '—'
  const secs = Math.floor(ms / 1000)
  if (secs < 60) return 'agora'
  const mins = Math.floor(secs / 60)
  if (mins < 60) return `${mins}m atrás`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h atrás`
  return `${Math.floor(hrs / 24)}d atrás`
}

function sessionDuration(firstSeen: string | undefined): string {
  if (!firstSeen) return ''
  const ms = Date.now() - new Date(firstSeen).getTime()
  if (isNaN(ms) || ms < 0) return ''
  const mins = Math.floor(ms / 1000 / 60)
  if (mins < 1) return '<1m'
  if (mins < 60) return `${mins}m`
  return `${Math.floor(mins / 60)}h${mins % 60 > 0 ? String(mins % 60).padStart(2, '0') : ''}`
}

const PAGE_LABELS: Record<string, string> = {
  home:           'Início',
  felicia360:     'Felícia 360',
  enterprise:     'Enterprise',
  'ajuste-ofertas': 'Ajuste de Ofertas',
}

function pageLabel(page: string | undefined): string {
  if (!page) return 'Início'
  return PAGE_LABELS[page] || page
}

// ── Heartbeat — envia página atual a cada 30s ─────────────────
interface HeartbeatProps { currentPage: string; currentDoc?: string }

function useHeartbeat({ currentPage, currentDoc = '' }: HeartbeatProps) {
  useEffect(() => {
    if (typeof google === 'undefined') return
    const ping = () => {
      try { google.script.run.heartbeat({ page: currentPage, doc: currentDoc }) } catch (_) {}
    }
    ping()
    const id = setInterval(ping, 30000)
    return () => clearInterval(id)
  }, [currentPage, currentDoc])
}

// ── Componente ────────────────────────────────────────────────
interface Props { currentPage: string; currentDoc?: string }

export default function AdminMonitor({ currentPage, currentDoc = '' }: Props) {
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<'online' | 'log'>('online')
  const [adminData, setAdminData] = useState<AdminData | null>(null)
  const [loading, setLoading] = useState(false)
  const refreshRef = useRef<number | null>(null)

  useHeartbeat({ currentPage, currentDoc })

  const fetchUsers = () => {
    if (typeof google === 'undefined') return
    setLoading(true)
    try {
      google.script.run
        .withSuccessHandler((d: AdminData) => { setAdminData(d); setLoading(false) })
        .withFailureHandler(() => setLoading(false))
        .getActiveUsers()
    } catch (_) { setLoading(false) }
  }

  useEffect(() => { fetchUsers() }, [])

  useEffect(() => {
    if (open) {
      fetchUsers()
      refreshRef.current = window.setInterval(fetchUsers, 15000)
    } else {
      if (refreshRef.current) { clearInterval(refreshRef.current); refreshRef.current = null }
    }
    return () => { if (refreshRef.current) clearInterval(refreshRef.current) }
  }, [open])

  if (!adminData?.isAdmin) return null

  const users: UserPresence[] = adminData.users || []
  const log: LogEntry[] = adminData.log || []
  const onlineCount = users.filter(u => u.online).length

  return (
    <>
      {/* Botão com badge */}
      <button
        onClick={() => setOpen(!open)}
        className="relative p-1.5 rounded-full hover:bg-white/20 transition-colors"
        title="Monitor de uso"
      >
        <svg className="w-5 h-5 text-white/80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
        {onlineCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 bg-emerald-400 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center leading-none">
            {onlineCount}
          </span>
        )}
      </button>

      {/* Painel lateral */}
      {open && (
        <div className="fixed top-0 right-0 h-full w-80 bg-white shadow-2xl z-50 flex flex-col" style={{ fontFamily: "'Manrope',sans-serif" }}>
          {/* Header */}
          <div className="bg-[#00461e] px-4 py-3 flex items-center justify-between flex-shrink-0">
            <div>
              <h3 className="text-white font-semibold text-sm">Monitor Mesa Banco</h3>
              <p className="text-white/50 text-[10px]">
                {loading ? 'Atualizando...' : `${onlineCount} online · atualiza 15s`}
              </p>
            </div>
            <button onClick={() => setOpen(false)} className="text-white/70 hover:text-white p-1">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Página atual do admin */}
          <div className="px-4 py-2 bg-[#f5fff5] border-b border-[#e8f0e8] flex-shrink-0">
            <span className="text-[10px] text-[#505a50]">Você está em: </span>
            <span className="text-[10px] font-bold text-[#00461e]">{pageLabel(currentPage)}</span>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-[#e8f0e8] flex-shrink-0">
            {(['online', 'log'] as const).map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`flex-1 py-2 text-xs font-medium transition-colors ${tab === t ? 'text-[#00461e] border-b-2 border-[#00461e]' : 'text-[#96a096]'}`}>
                {t === 'online' ? `Usuários (${onlineCount} online)` : `Histórico (${log.length})`}
              </button>
            ))}
          </div>

          {/* Conteúdo */}
          <div className="flex-1 overflow-y-auto">
            {tab === 'online' ? (
              users.length === 0
                ? <p className="text-[#96a096] text-sm p-4">Nenhum usuário registrado</p>
                : <div className="divide-y divide-[#f0f4f0]">
                    {users.map((user, i) => (
                      <div key={i} className="px-4 py-3 hover:bg-[#fafffe]">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${user.online ? 'bg-emerald-400' : 'bg-[#c8d2c8]'}`} />
                          <span className="text-xs font-semibold text-[#1e281e] truncate flex-1">
                            {user.email.split('@')[0]}
                          </span>
                          <span className={`text-[10px] font-medium ${user.online ? 'text-emerald-600' : 'text-[#96a096]'}`}>
                            {user.online ? 'online' : safeTimeAgo(user.lastPing)}
                          </span>
                        </div>
                        <div className="ml-4 mt-1 flex items-center gap-2 flex-wrap">
                          {/* Página atual */}
                          <span className="text-[10px] bg-[#f5fff5] text-[#00461e] font-semibold px-1.5 py-0.5 rounded-full">
                            {pageLabel(user.page)}
                          </span>
                          {/* Doc consultado */}
                          {user.doc && (
                            <span className="text-[10px] text-[#505a50] font-mono truncate max-w-[120px]">
                              {user.doc}
                            </span>
                          )}
                          {/* Duração da sessão */}
                          {user.firstSeen && (
                            <span className="text-[10px] text-[#96a096] ml-auto">
                              sessão: {sessionDuration(user.firstSeen)}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
            ) : (
              log.length === 0
                ? <p className="text-[#96a096] text-sm p-4">Nenhuma ação registrada</p>
                : <div className="divide-y divide-[#f0f4f0]">
                    {log.map((entry, i) => (
                      <div key={i} className="px-4 py-3 hover:bg-[#fafffe]">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-semibold text-[#1e281e] truncate">{entry.email.split('@')[0]}</span>
                          <span className="text-[10px] text-[#96a096] whitespace-nowrap">{safeTimeAgo(entry.ts)}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] bg-[#f5fff5] text-[#00461e] font-semibold px-1.5 py-0.5 rounded-full">
                            {pageLabel(entry.page)}
                          </span>
                          {entry.doc && (
                            <span className="text-[10px] text-[#505a50] font-mono truncate">{entry.doc}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
            )}
          </div>

          <div className="px-4 py-2 border-t border-[#e8f0e8] bg-[#f5fff5] flex-shrink-0">
            <span className="text-[10px] text-[#96a096]">Heartbeat 30s · Offline após 90s · Log últimas 100 ações</span>
          </div>
        </div>
      )}
    </>
  )
}
