import { useState, useEffect, type ReactNode } from 'react'

function MccToggle({ name }: { name: string }) {
  const [show, setShow] = useState(false)
  return (
    <>
      <button
        onClick={() => setShow(s => !s)}
        className="text-[10px] font-semibold text-[#00461e] border border-[#00461e]/30 bg-[#f5fff5] hover:bg-[#e6f7ee] px-2 py-0.5 rounded-full transition-colors"
      >
        {show ? 'ocultar' : 'ver'}
      </button>
      {show && <span className="text-[11px] text-gray-500 text-right">{name}</span>}
    </>
  )
}
import type { Afiliacao360 } from '../types'
import { CardSkeleton } from './Skeleton'
import InfoTooltip from './InfoTooltip'
const F360_NAV = [{ label: 'Documentação →', page: 'doc-felicia360' }]

interface Props {
  data: Afiliacao360[] | null
  status: string
}

const PRODUCTS: { key: keyof Afiliacao360; label: string }[] = [
  { key: 'tem_mdr_cartao', label: 'MDR Cartão' },
  { key: 'tem_rav', label: 'RAV' },
  { key: 'tem_pix_adquirencia', label: 'Pix Adq' },
  { key: 'tem_link_pagamento', label: 'Link Pagamento' },
  { key: 'tem_gateway', label: 'Gateway' },
  { key: 'tem_boleto', label: 'Boleto' },
  { key: 'tem_pagarme', label: 'Pagar.me' },
  { key: 'tem_conta_banking', label: 'Conta' },
  { key: 'tem_pix_banking', label: 'Pix Banking' },
  { key: 'tem_transferencia', label: 'Transferência' },
  { key: 'tem_seguro', label: 'Seguro' },
  { key: 'tem_taxas_inteligentes', label: 'Taxas Inteligentes' },
]

const v = (s: string | null | undefined) => (!s || s === 'null' || s === 'None') ? null : s
const d = (s: string | null | undefined): string => v(s) ?? '—'
const bool = (s: string | null | undefined) => s === 'true' || s === 'True'
const fmtDate = (s: string | null | undefined): string => {
  const val = v(s); if (!val) return '—'
  try {
    const n = parseFloat(val)
    if (!isNaN(n) && n > 1e8) {
      const d = new Date(n * 1000)
      return d.toLocaleDateString('pt-BR')
    }
    const parts = val.split('T')[0].split('-')
    if (parts.length === 3) {
      if (parseInt(parts[0]) < 2000) return '—'  // data sentinel (ex: 1900-01-01)
      return `${parts[2]}/${parts[1]}/${parts[0]}`
    }
    return val
  } catch { return val }
}
const fmtMonthYear = (s: string | null | undefined): string => {
  const val = v(s); if (!val) return '—'
  try {
    const parts = val.split('T')[0].split('-')
    if (parts.length === 3) return `${parts[1]}/${parts[0]}`
    return val
  } catch { return val }
}
const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase()

function Badge({ on, label }: { on: boolean; label: string }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-colors ${
      on
        ? 'bg-[#e6f7ee] text-[#00461e] border-[#a3d9b3]'
        : 'bg-gray-50 text-gray-400 border-gray-200'
    }`}>
      <span className={`w-1.5 h-1.5 rounded-full ${on ? 'bg-[#00d700]' : 'bg-gray-300'}`} />
      {label}
    </span>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] font-bold text-[#00461e]/50 uppercase tracking-widest mb-2">{title}</p>
      {children}
    </div>
  )
}

function Row({ label, value, className = '' }: { label: string; value: string; className?: string }) {
  return (
    <div className="flex justify-between items-baseline gap-2 py-0.5">
      <span className="text-[11px] text-gray-400 whitespace-nowrap flex-shrink-0">{label}</span>
      <span className={`text-[12px] text-gray-800 font-medium text-right ${className}`}>{value}</span>
    </div>
  )
}

function TempoBar({ label, meses, inicio, color }: { label: string; meses: string | null; inicio: string | null; color: string }) {
  const m = meses ? parseInt(meses) : null
  const width = m ? Math.min(100, (m / 120) * 100) : 0
  return (
    <div className="flex items-center gap-3">
      <span className="text-[11px] text-gray-500 w-24 flex-shrink-0">{label}</span>
      <div className="flex-1">
        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all" style={{ width: `${width}%`, backgroundColor: color }} />
        </div>
      </div>
      <span className="text-[11px] font-semibold text-gray-700 w-16 text-right flex-shrink-0">
        {m ? `${m}m` : '—'}
      </span>
      <span className="text-[10px] text-gray-400 w-16 text-right flex-shrink-0">{fmtMonthYear(inicio)}</span>
    </div>
  )
}

// ── Declaração global google.script.run (GAS) ─────────────────
declare const google: {
  script: {
    run: {
      withSuccessHandler: (cb: (data: any) => void) => {
        withFailureHandler: (cb: (err: any) => void) => {
          getActiveOffers: (stonecode: string) => void
        }
      }
    }
  }
}

// ── CondicoesAtuais ───────────────────────────────────────────
interface CondicoesAtuaisProps {
  affiliations: string | null
  // Cache externo — gerenciado pelo InfoCliente para sobreviver ao open/close
  scData: Record<string, any>
  setScData: React.Dispatch<React.SetStateAction<Record<string, any>>>
  loadingSet: Set<string>
  setLoadingSet: React.Dispatch<React.SetStateAction<Set<string>>>
}

interface AfiliacaoItem {
  stonecode: string
  company: string
  status: string
  data_cred: string
}

function parseAfiliations(affiliations: string | null): AfiliacaoItem[] {
  if (!affiliations) return []
  return affiliations.split(';').map(s => {
    const [stonecode, company, status, data_cred] = s.split('|')
    return { stonecode: stonecode ?? '', company: company ?? '', status: status ?? '', data_cred: data_cred ?? '' }
  }).filter(a => a.stonecode && a.stonecode !== 'null' && a.stonecode !== 'None')
}

function fmt_pct(v: any): string {
  const n = parseFloat(v)
  if (isNaN(n)) return String(v ?? '—')
  return (n * 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '%'
}

function fmt_val(v: any): string {
  if (v === null || v === undefined || v === '') return '—'
  return String(v)
}

// ── MDR table helpers ─────────────────────────────────────────

// SVG de bandeiras — inline, fora do render
const SVG_VISA_MASTER = (
  <svg width="40" height="27" viewBox="0 0 40 27" fill="none" xmlns="http://www.w3.org/2000/svg">
    <g clipPath="url(#clip0_1006:26785)">
      <path d="M27.3127 0.623047H2.14168C0.973358 0.623047 0.0262451 1.57016 0.0262451 2.73848V19.8762C0.0262451 21.0445 0.973358 21.9916 2.14168 21.9916H27.3127C28.481 21.9916 29.4281 21.0445 29.4281 19.8762V2.73848C29.4281 1.57016 28.481 0.623047 27.3127 0.623047Z" fill="#0E1476"/>
      <path fillRule="evenodd" clipRule="evenodd" d="M12.7469 7.73934L11.2435 14.7862H13.0615L14.5649 7.73934H12.7469ZM22.2126 12.2905L23.1696 9.64355L23.7203 12.2905H22.2126ZM24.4545 7.73934H22.9031C22.5535 7.73934 22.2585 7.94312 22.1296 8.25647L19.4026 14.7862H21.3102L21.6882 13.7345H24.0197L24.2404 14.7862H25.9207L24.4545 7.73934ZM17.7201 9.10232C17.9801 9.06938 18.699 9.04314 19.5119 9.41781L19.8309 7.92341C19.3938 7.76344 18.8324 7.6123 18.1309 7.6123C16.3347 7.6123 15.0696 8.56982 15.0608 9.94153C15.0477 10.956 15.9633 11.5214 16.6517 11.8589C17.3595 12.2029 17.5977 12.4241 17.5935 12.7331C17.589 13.2064 17.0296 13.4146 16.5074 13.4234C15.5918 13.4365 15.0631 13.1757 14.6391 12.9785L14.3113 14.5212C14.7353 14.7183 15.5197 14.887 16.3325 14.8958C18.2423 14.8958 19.49 13.9514 19.4967 12.4855C19.5031 10.6251 16.9312 10.5244 16.9487 9.69175C16.9553 9.43972 17.1957 9.17237 17.7201 9.10232ZM10.0591 7.73934L8.16692 12.5359L7.4022 8.45805C7.31255 8.00235 6.95641 7.73934 6.56305 7.73934H3.47114L3.42749 7.94536C4.06111 8.08338 4.78447 8.30692 5.2214 8.54352C5.48798 8.69037 5.56445 8.81746 5.65186 9.16364L7.10053 14.7862H9.02348L11.9668 7.73934H10.0591Z" fill="white"/>
      <path d="M37.0068 4.47949H11.8358C10.6674 4.47949 9.72034 5.4266 9.72034 6.59493V23.7326C9.72034 24.901 10.6674 25.8481 11.8358 25.8481H37.0068C38.1751 25.8481 39.1222 24.901 39.1222 23.7326V6.59493C39.1222 5.4266 38.1751 4.47949 37.0068 4.47949Z" fill="white" fillOpacity="0.68" stroke="#D9D9D9"/>
      <path fillRule="evenodd" clipRule="evenodd" d="M22.1948 15.1432C22.1948 13.3111 23.0503 11.68 24.3822 10.6243C23.4001 9.84592 22.1594 9.37988 20.8092 9.37988C17.6279 9.37988 15.0491 11.9603 15.0491 15.1432C15.0491 18.3262 17.6279 20.9065 20.8092 20.9065C22.1592 20.9065 23.4 20.4405 24.382 19.6621C23.0502 18.6065 22.1948 16.9753 22.1948 15.1432Z" fill="#E01F26"/>
      <path fillRule="evenodd" clipRule="evenodd" d="M22.1948 15.1429C22.1948 16.975 23.0503 18.6062 24.3821 19.6618C25.714 18.6062 26.5694 16.975 26.5694 15.1429C26.5694 13.3108 25.7139 11.6796 24.3821 10.624C23.0503 11.6796 22.1948 13.3108 22.1948 15.1429Z" fill="#E76224"/>
      <path fillRule="evenodd" clipRule="evenodd" d="M33.6648 18.0457L33.6109 18.1839L33.5572 18.0458H33.4844V18.2611H33.5361V18.1112V18.1581V18.2869H33.5898H33.6391H33.5103V18.4369H33.5593V18.2214H33.4892L33.6648 18.0457ZM33.2575 18.0457V18.0925H33.3253V18.2611H33.3745V18.0925H33.4425V18.0457H33.2575ZM27.955 9.37988C26.6048 9.37988 25.3641 9.84592 24.3821 10.6243C25.7139 11.68 26.5693 13.3111 26.5693 15.1432C26.5693 16.9753 25.7139 18.6065 24.3821 19.6621C25.3641 20.4405 26.6048 20.9065 27.955 20.9065C31.1361 20.9065 33.7151 18.3263 33.7151 15.1432C33.7151 11.9602 31.1363 9.37988 27.955 9.37988Z" fill="#F29D1E"/>
    </g>
    <defs>
      <clipPath id="clip0_1006:26785">
        <rect width="40" height="26.383" fill="white" transform="translate(0 0.59668)"/>
      </clipPath>
    </defs>
  </svg>
)

const SVG_ELO = (
  <svg width="32" height="24" viewBox="0 0 32 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M29.6727 0.0297852H2.32723C1.05798 0.0297852 0.0290527 1.09087 0.0290527 2.39979V21.5998C0.0290527 22.9087 1.05798 23.9698 2.32723 23.9698H29.6727C30.9419 23.9698 31.9709 22.9087 31.9709 21.5998V2.39979C31.9709 1.09087 30.9419 0.0297852 29.6727 0.0297852Z" fill="black"/>
    <path d="M6.89175 9.33849C7.40124 9.16311 7.94926 9.14073 8.47057 9.27321C8.99188 9.40569 9.46664 9.68859 9.839 10.0879C10.2114 10.4873 10.4658 10.9878 10.5738 11.5305L12.52 11.1215C12.3369 10.1993 11.9038 9.34875 11.2713 8.66967C10.6383 7.99131 9.83214 7.51065 8.94591 7.28535C8.05911 7.05945 7.12878 7.09785 6.26245 7.39545L6.89175 9.33849Z" fill="#FFCB08"/>
    <path d="M4.59483 15.8422L5.91054 14.3062C5.50775 13.9389 5.21482 13.4614 5.06526 12.9289C4.91507 12.3971 4.91507 11.8314 5.06526 11.2995C5.21482 10.767 5.50775 10.2896 5.91054 9.92223L4.59422 8.38623C3.91031 9.01023 3.41134 9.82239 3.15751 10.7274C2.90306 11.6317 2.90306 12.5929 3.15751 13.4973C3.41134 14.4022 3.91031 15.2144 4.59422 15.8384L4.59483 15.8422Z" fill="#00A4E0"/>
    <path d="M10.5732 12.7031C10.4652 13.2458 10.2102 13.7457 9.83781 14.1444C9.46545 14.5437 8.99069 14.8254 8.46938 14.9579C7.94807 15.0903 7.40069 15.0673 6.89119 14.8919L6.26062 16.835C7.12637 17.1326 8.05669 17.1716 8.94292 16.9463C9.82914 16.7217 10.636 16.2423 11.2683 15.5639C11.9013 14.8855 12.3352 14.0363 12.5188 13.114L10.5732 12.7031Z" fill="#EF4023"/>
    <path d="M18.9954 14.0732C18.718 14.3555 18.3562 14.5328 17.9683 14.5757C17.581 14.6179 17.1907 14.5238 16.8617 14.3081L16.2175 15.3667C16.7767 15.7302 17.4389 15.889 18.0961 15.8166C18.754 15.745 19.369 15.446 19.8413 14.9693L18.9954 14.0732Z" fill="white"/>
    <path d="M17.8321 9.7614C17.1171 9.75048 16.422 10.0084 15.8778 10.4872C15.3335 10.9658 14.9766 11.6327 14.8742 12.3623C14.7713 13.0926 14.9301 13.8362 15.3205 14.4545L20.6527 12.1038C20.5025 11.4452 20.1438 10.8564 19.6325 10.4321C19.1217 10.0078 18.4874 9.7716 17.8314 9.76074L17.8321 9.7614ZM16.0639 12.9851C16.0559 12.914 16.0522 12.8417 16.0534 12.77C16.0584 12.4058 16.1719 12.0526 16.3774 11.7569C16.5828 11.4606 16.8707 11.2366 17.2028 11.1143C17.5354 10.9921 17.896 10.9768 18.2367 11.0714C18.5774 11.1662 18.8821 11.3665 19.1099 11.6443L16.0639 12.9851Z" fill="white"/>
    <path d="M22.3257 8.39502V14.2574L23.3119 14.6792L22.8452 15.8357L21.8696 15.4177C21.6735 15.3294 21.5066 15.1848 21.3886 15.0011C21.259 14.7829 21.1944 14.5301 21.2025 14.2741V8.39568L22.3257 8.39502Z" fill="white"/>
    <path d="M25.8811 11.1044C26.192 10.9975 26.5266 10.9834 26.8449 11.0647C27.1633 11.1453 27.4531 11.3181 27.6802 11.562C27.9074 11.8058 28.0626 12.1111 28.1283 12.4426L29.3168 12.193C29.2051 11.6298 28.9407 11.1107 28.5547 10.6967C28.1687 10.282 27.6765 9.98887 27.1354 9.85123C26.5942 9.71365 26.0263 9.73669 25.4976 9.91843L25.8811 11.1044Z" fill="white"/>
    <path d="M24.4805 15.0734L25.2829 14.137C25.0372 13.9109 24.8584 12.9716 24.7672 12.3015C24.676 11.977 25.0372 11.6852 25.2829 11.4612L24.4793 10.5249C24.0616 10.9057 23.7575 11.4017 23.6023 11.9534C23.4472 12.5057 23.4472 13.0925 23.6023 13.6449C23.7575 14.1966 24.0616 14.6926 24.4793 15.0734H24.4805Z" fill="white"/>
    <path d="M28.1283 13.1606C28.0625 13.4915 27.9068 13.7968 27.6796 14.0407C27.4519 14.2845 27.1627 14.4566 26.8443 14.5373C26.526 14.6179 26.1914 14.6039 25.8805 14.497L25.4957 15.6829C26.0245 15.8647 26.5923 15.889 27.1329 15.7514C27.6741 15.6144 28.1668 15.3213 28.5528 14.9078C28.9394 14.4938 29.2038 13.9747 29.3162 13.4122L28.1283 13.1606Z" fill="white"/>
  </svg>
)

const SVG_AMEX = (
  <svg width="32" height="24" viewBox="0 0 33 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <g clipPath="url(#clip0_1006:26542)">
      <path d="M30.0061 0.392578H2.66061C1.39136 0.392578 0.362427 1.42151 0.362427 2.69076V21.3089C0.362427 22.5782 1.39136 23.6071 2.66061 23.6071H30.0061C31.2753 23.6071 32.3042 22.5782 32.3042 21.3089V2.69076C32.3042 1.42151 31.2753 0.392578 30.0061 0.392578Z" fill="#007DC5"/>
      <path d="M6.37093 8.80029L3.47522 15.1921H6.94181L7.3716 14.173H8.35388L8.78367 15.1921H12.5994V14.4143L12.9394 15.1921H14.9132L15.2533 14.3978V15.1921H23.189L24.1539 14.1994L25.0574 15.1921L29.1334 15.2003L26.2285 12.014L29.1334 8.80029H25.1207L24.1814 9.77461L23.3063 8.80029H14.6732L13.9319 10.45L13.1732 8.80029H9.71382V9.55165L9.32901 8.80029H6.37093ZM7.04171 9.70793H8.73148L10.6522 14.0422V9.70793H12.5034L13.9869 12.8156L15.3541 9.70793H17.196V14.2945H16.0752L16.0661 10.7005L14.4322 14.2945H13.4297L11.7866 10.7005V14.2945H9.48104L9.04398 13.2662H6.68249L6.2463 14.2935H5.01103L7.04171 9.70793ZM18.2213 9.70793H22.7784L24.1722 11.2097L25.6109 9.70793H27.0047L24.887 12.0132L27.0047 14.2917H25.5477L24.1539 12.7726L22.7079 14.2917H18.2213V9.70793ZM7.86376 10.484L7.08575 12.3157H8.64083L7.86376 10.484ZM19.3467 10.6576V11.4949H21.8327V12.428H19.3467V13.3421H22.1352L23.4309 11.9958L22.1902 10.6568H19.3467V10.6576Z" fill="white"/>
    </g>
    <defs>
      <clipPath id="clip0_1006:26542">
        <rect width="32" height="23.2727" fill="white" transform="translate(0.333374 0.36377)"/>
      </clipPath>
    </defs>
  </svg>
)

// Todas as chaves de parcelamento em ordem
const ALL_INSTALLMENT_KEYS = [
  'debit',
  'credit1x', 'credit2x', 'credit3x', 'credit4x', 'credit5x',
  'credit6x', 'credit7x', 'credit8x', 'credit9x', 'credit10x',
  'credit11x', 'credit12x', 'credit13x', 'credit14x', 'credit15x',
  'credit16x', 'credit17x', 'credit18x',
  'creditIssuer',
]
const INSTALLMENT_ROW_LABELS: Record<string, string> = {
  debit: 'Débito',
  credit1x: 'Crédito 1x', credit2x: 'Crédito 2x', credit3x: 'Crédito 3x',
  credit4x: 'Crédito 4x', credit5x: 'Crédito 5x', credit6x: 'Crédito 6x',
  credit7x: 'Crédito 7x', credit8x: 'Crédito 8x', credit9x: 'Crédito 9x',
  credit10x: 'Crédito 10x', credit11x: 'Crédito 11x', credit12x: 'Crédito 12x',
  credit13x: 'Crédito 13x', credit14x: 'Crédito 14x', credit15x: 'Crédito 15x',
  credit16x: 'Crédito 16x', credit17x: 'Crédito 17x', credit18x: 'Crédito 18x',
  creditIssuer: 'Emissor',
}

// Grupos de bandeiras: visa e master compartilham coluna, resto separado
interface BrandCol {
  key: string           // identificador da coluna
  brands: string[]      // bandeiras que fazem parte dessa coluna (para lookup no mdr)
  icon: ReactNode
}

function buildBrandCols(mdr: any): BrandCol[] {
  const cols: BrandCol[] = []
  const hasVisa = mdr['visa'] != null
  const hasMaster = mdr['master'] != null
  if (hasVisa || hasMaster) {
    cols.push({ key: 'visa_master', brands: hasVisa ? ['visa'] : ['master'], icon: SVG_VISA_MASTER })
  }
  if (mdr['elo'] != null) cols.push({ key: 'elo', brands: ['elo'], icon: SVG_ELO })
  if (mdr['amex'] != null) cols.push({ key: 'amex', brands: ['amex'], icon: SVG_AMEX })
  // Bandeiras extras sem SVG definido
  const known = new Set(['visa', 'master', 'elo', 'amex'])
  Object.keys(mdr).forEach(b => {
    if (!known.has(b) && mdr[b] != null) {
      cols.push({ key: b, brands: [b], icon: <span className="text-[10px] font-bold text-gray-600">{b.charAt(0).toUpperCase() + b.slice(1)}</span> })
    }
  })
  return cols
}

function MdrTable({ mdr }: { mdr: any }) {
  if (!mdr || typeof mdr !== 'object') return null

  const brandCols = buildBrandCols(mdr)
  if (brandCols.length === 0) return null

  // Determinar quais linhas (parcelamentos) existem em pelo menos uma bandeira
  const rowSet = new Set<string>()
  brandCols.forEach(col => {
    col.brands.forEach(b => {
      const brandData = mdr[b]
      if (brandData && typeof brandData === 'object') {
        ALL_INSTALLMENT_KEYS.forEach(k => {
          if (brandData[k] !== undefined && brandData[k] !== null) rowSet.add(k)
        })
      }
    })
  })
  const rows = ALL_INSTALLMENT_KEYS.filter(k => rowSet.has(k))
  if (rows.length === 0) return null

  // Para visa_master: preferir visa, fallback master
  function getCellValue(col: BrandCol, installKey: string): number | null {
    for (const b of col.brands) {
      const val = mdr[b]?.[installKey]
      if (val !== undefined && val !== null) return val
    }
    // Se visa_master, tenta o outro
    if (col.key === 'visa_master') {
      const alt = mdr['master']?.[installKey] ?? mdr['visa']?.[installKey]
      if (alt !== undefined && alt !== null) return alt
    }
    return null
  }

  return (
    <div className="overflow-y-auto">
      <table className="w-full text-[11px] border-collapse">
        <thead className="sticky top-0 bg-white z-10">
          <tr className="border-b-2 border-[#d4e6d4]">
            <th className="py-2 pr-3 text-left text-[10px] text-gray-400 font-semibold uppercase tracking-wider w-24" />
            {brandCols.map(col => (
              <th key={col.key} className="py-2 px-2 text-center">
                <div className="flex justify-center items-center">{col.icon}</div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((installKey, i) => (
            <tr key={installKey} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
              <td className="py-1.5 pr-3 text-[11px] text-gray-500 whitespace-nowrap font-medium">
                {INSTALLMENT_ROW_LABELS[installKey] ?? installKey}
              </td>
              {brandCols.map(col => {
                const val = getCellValue(col, installKey)
                return (
                  <td key={col.key} className="py-1.5 px-2 text-center text-gray-700 tabular-nums">
                    {val !== null ? fmt_pct(val) : <span className="text-gray-300">—</span>}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

const FREQ_LABELS: Record<string, string> = {
  off: 'Off', du: 'Todo DU', weekly: 'Semanal', monthly: 'Mensal',
}
const PRICING_TYPE_LABELS: Record<string, string> = {
  SimpleInterest: 'Juros Simples',
  TotalEffectiveCost: 'CET',
  CompoundInterest: 'Juros Compostos',
}

function ActiveOfferModal({ stonecode, offerData, onClose }: {
  stonecode: string
  offerData: any
  onClose: () => void
}) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  // Schema novo: { currentConditions: { model, fees: { mdr|cet, rav, agravo, discounts }, ravConditions } }
  // Legacy fallback: { acquiring: { fees, prepayment } }
  const cc = offerData?.currentConditions
  const fees = cc?.fees ?? offerData?.acquiring?.fees
  const model: string = cc?.model ?? (offerData?.cetEnabled ? 'cet' : 'mdr_rav')
  const isCet = model === 'cet'

  // Tabela: mdr ou cet dependendo do modelo
  const feeTable = isCet ? fees?.cet : (fees?.mdr ?? offerData?.acquiring?.fees)

  // RAV: no schema novo é fees.rav = { auto: 0.0165, spot: 0.0195 }
  const ravObj = fees?.rav
  const ravAuto: number | undefined = typeof ravObj === 'object' ? ravObj?.auto : (typeof ravObj === 'number' ? ravObj : offerData?.acquiring?.prepayment?.auto)
  const ravSpot: number | undefined = typeof ravObj === 'object' ? ravObj?.spot : undefined

  // ravConditions: { frequency, pricingType, pickerType }
  const ravCond = cc?.ravConditions
  const agravo = fees?.agravo
  const discounts = fees?.discounts

  const type: string | undefined = offerData?.type
  const mcc: number | string | undefined = offerData?.mcc
  const cetEnabled: boolean | undefined = offerData?.cetEnabled
  const updatedAt: string | undefined = offerData?.updatedAt
  const smartFee = offerData?.smartFeeConditions

  const typeLabel: Record<string, string> = {
    Maquininha: 'Maquininha', Link: 'Link', TapOnPhone: 'Tap on Phone', Ecommerce: 'E-commerce',
  }

  const modelTag = isCet ? 'CET' : 'MDR+RAV'

  const domicile: string | undefined = cc?.domicile != null ? cc.domicile : undefined
  const monthlyFee: number | null = cc?.monthlyFee != null ? cc.monthlyFee : null
  const tag: string | null = cc?.tag != null ? cc.tag : null

  const hasSmartFee = discounts?.smartFee != null || smartFee?.enabled
  const hasRav = ravAuto != null || ravSpot != null
  const hasAgravo = agravo && Object.values(agravo).some((val: any) => parseFloat(val) > 0)
  const hasRavCond = ravCond && (ravCond.frequency != null || ravCond.pricingType || ravCond.pickerType)
  const hasMeta = domicile !== undefined || monthlyFee !== null || tag !== null
  const hasFooter = hasRav || hasAgravo || hasRavCond || cetEnabled !== undefined || hasMeta

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center p-4 overflow-y-auto bg-black/50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl border border-[#c8d2c8] w-full max-w-xl my-4 overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-[#00461e] px-5 py-3 flex items-center justify-between rounded-t-xl">
          <div>
            <div className="flex items-center gap-2">
              {type && (
                <span className="text-[11px] font-bold bg-white/20 text-white px-2 py-0.5 rounded">
                  {typeLabel[type] ?? type}
                </span>
              )}
              <span className="text-[11px] font-bold bg-white/10 text-white/80 px-2 py-0.5 rounded">
                {modelTag}
              </span>
              <h3 className="font-semibold text-white text-sm">SC {stonecode}</h3>
            </div>
            <p className="text-white/60 text-[11px] mt-0.5">
              {mcc ? `MCC ${mcc}` : ''}
              {mcc && updatedAt ? ' · ' : ''}
              {updatedAt ? `atualizado ${fmtDate(updatedAt)}` : ''}
            </p>
          </div>
          <button onClick={onClose} className="text-white/60 hover:text-white transition-colors ml-4">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div>
          {offerData?.error ? (
            <div className="m-5 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
              <p className="text-[12px] text-red-600 font-medium">Erro ao buscar oferta</p>
              <p className="text-[11px] text-red-500 mt-1">{offerData.error}</p>
            </div>
          ) : (
            <div>
              {/* Smart Fee badge — acima da tabela */}
              {hasSmartFee && (() => {
                const sfEnabled = smartFee?.enabled === true
                const sfDisabled = smartFee != null && smartFee.enabled === false
                const delayDays = smartFee?.delayDays ?? smartFee?.days
                const modalities = smartFee?.modalities
                const bankingAccountId: string | undefined = smartFee?.bankingAccountId
                const MODALITY_LABELS: Record<string, string> = { debit: 'Débito', credit: 'Crédito', pix: 'Pix' }
                const activeModalities = modalities
                  ? Object.entries(modalities).filter(([, v]) => v === true).map(([k]) => MODALITY_LABELS[k] ?? k)
                  : []
                const shortBankingId = bankingAccountId
                  ? `...${bankingAccountId.replace(/-/g, '').slice(-8)}`
                  : undefined

                return (
                  <div className="px-5 pt-4 pb-0 flex items-center gap-3 flex-wrap">
                    {sfDisabled ? (
                      <>
                        <span className="inline-flex items-center gap-1.5 bg-gray-50 text-gray-400 border border-gray-200 text-[11px] font-semibold px-2.5 py-1 rounded-full">
                          <span className="w-1.5 h-1.5 rounded-full bg-gray-300" />
                          Smart Fees · Desativado
                        </span>
                        {discounts?.smartFee != null && (
                          <span className="text-[11px] text-gray-400">desconto disponível: -{fmt_pct(discounts.smartFee)}</span>
                        )}
                      </>
                    ) : (
                      <>
                        <span className="inline-flex items-center gap-1.5 bg-[#e6f7ee] text-[#00461e] border border-[#a3d9b3] text-[11px] font-semibold px-2.5 py-1 rounded-full">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#00d700]" />
                          Smart Fees
                        </span>
                        {delayDays != null && (
                          <span className="text-[11px] text-gray-500">Recebimento: <span className="font-semibold text-gray-700">{delayDays} dias</span></span>
                        )}
                        {activeModalities.length > 0 && (
                          <span className="text-[11px] text-gray-500">Modalidades: <span className="font-semibold text-gray-700">{activeModalities.join(', ')}</span></span>
                        )}
                        {sfEnabled && shortBankingId && (
                          <span className="text-[11px] text-gray-500">Conta: <span className="font-medium text-gray-600 font-mono">{shortBankingId}</span></span>
                        )}
                        {discounts?.smartFee != null && (
                          <span className="text-[11px] font-semibold text-[#00461e]">desconto -{fmt_pct(discounts.smartFee)}</span>
                        )}
                      </>
                    )}
                  </div>
                )
              })()}

              {/* Tabela de taxas */}
              <div className="px-5 pt-4">
                <p className="text-[10px] font-bold text-[#00461e]/50 uppercase tracking-widest mb-2">
                  {isCet ? 'CET' : 'Taxas'}
                </p>
                {feeTable ? (
                  <MdrTable mdr={feeTable} />
                ) : (
                  <p className="text-[11px] text-gray-400">Sem dados de taxa</p>
                )}
              </div>

              {/* Footer: RAV + Agravos + Condições */}
              {hasFooter && (
                <div className="px-5 pt-4 pb-5 mt-2 border-t border-[#e8f0e8] flex flex-wrap gap-x-6 gap-y-3">

                  {/* RAV */}
                  {hasRav && (
                    <div className="flex items-baseline gap-3 flex-wrap">
                      <span className="text-[10px] font-bold text-[#00461e]/50 uppercase tracking-widest">RAV</span>
                      {ravAuto != null && (
                        <span className="text-[11px] text-gray-500">
                          Auto <span className="font-semibold text-gray-800">{fmt_pct(ravAuto)}</span>
                        </span>
                      )}
                      {ravSpot != null && (
                        <span className="text-[11px] text-gray-500">
                          Spot <span className="font-medium text-gray-700">{fmt_pct(ravSpot)}</span>
                        </span>
                      )}
                      {hasRavCond && ravCond.frequency != null && (
                        <span className="text-[11px] text-gray-500">
                          Freq <span className="text-gray-700">{FREQ_LABELS[ravCond.frequency] ?? ravCond.frequency}</span>
                        </span>
                      )}
                      {hasRavCond && ravCond.pricingType && (
                        <span className="text-[11px] text-gray-500">
                          <span className="text-gray-700">{PRICING_TYPE_LABELS[ravCond.pricingType] ?? ravCond.pricingType}</span>
                        </span>
                      )}
                    </div>
                  )}

                  {/* Agravos */}
                  {hasAgravo && (
                    <div className="flex items-baseline gap-3 flex-wrap">
                      <span className="text-[10px] font-bold text-[#00461e]/50 uppercase tracking-widest">Agravo</span>
                      {Object.entries(agravo).map(([k, val]: [string, any]) =>
                        parseFloat(val) > 0 ? (
                          <span key={k} className="text-[11px] text-gray-500">
                            {k.toUpperCase()} <span className="font-medium text-[#7a5200]">+{fmt_pct(val)}</span>
                          </span>
                        ) : null
                      )}
                    </div>
                  )}

                  {/* CET flag */}
                  {cetEnabled !== undefined && (
                    <span className="text-[11px] text-gray-500">
                      CET{' '}
                      <span className={cetEnabled ? 'text-[#00461e] font-semibold' : 'text-gray-400'}>
                        {cetEnabled ? 'Ativo' : 'Off'}
                      </span>
                    </span>
                  )}

                  {/* Domicílio */}
                  {domicile !== undefined && (
                    <span className="text-[11px] text-gray-500">
                      Domicílio <span className="font-medium text-gray-700">{capitalize(domicile)}</span>
                    </span>
                  )}

                  {/* Mensalidade */}
                  {monthlyFee !== null && (
                    <span className="text-[11px] text-gray-500">
                      Mensalidade{' '}
                      <span className="font-medium text-gray-700">
                        {monthlyFee.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </span>
                  )}

                  {/* Tag */}
                  {tag !== null && (
                    <span className="text-[11px] text-gray-500">
                      Tag <span className="font-medium text-gray-700">{tag}</span>
                    </span>
                  )}
                </div>
              )}

              {/* padding bottom se nao tem footer */}
              {!hasFooter && <div className="pb-5" />}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function CompanyBadge({ company, type }: { company: string; type?: string }) {
  const companyMap: Record<string, { label: string; color: string }> = {
    STONE:     { label: 'STN', color: '#00461e' },
    PAGARME:   { label: 'PGM', color: '#6b7280' },
    MUNDIPAGG: { label: 'MUN', color: '#374151' },
    TON:       { label: 'TON', color: '#0d6e3b' },
  }
  const typeMap: Record<string, { label: string; color: string }> = {
    Maquininha: { label: 'POS',  color: '#00461e' },
    Link:       { label: 'Link', color: '#1a1f71' },
    TapOnPhone: { label: 'Tap',  color: '#0d6e3b' },
    Ecommerce:  { label: 'Eco',  color: '#374151' },
  }

  let config: { label: string; color: string }
  if (type && typeMap[type]) {
    config = typeMap[type]
  } else if (type) {
    config = { label: type.slice(0, 3), color: '#6b7280' }
  } else {
    const key = company?.toUpperCase() ?? ''
    config = companyMap[key] || { label: key.slice(0, 3) || 'SC', color: '#9ca3af' }
  }

  return (
    <span
      className="text-[9px] font-bold px-1 py-0.5 rounded text-white leading-none flex-shrink-0"
      style={{ backgroundColor: config.color }}
      title={type ?? company}
    >
      {config.label}
    </span>
  )
}

// ── helper: chamar GAS getActiveOffers ────────────────────────
function callGetActiveOffers(stonecode: string, onSuccess: (data: any) => void, onError: (err: any) => void) {
  if (typeof google === 'undefined') {
    onSuccess({ error: 'Ambiente de desenvolvimento — deploy no GAS para testar' })
    return
  }
  google.script.run
    .withSuccessHandler(onSuccess)
    .withFailureHandler(onError)
    .getActiveOffers(stonecode)
}

function CondicoesAtuais({ affiliations, scData, setScData, loadingSet, setLoadingSet }: CondicoesAtuaisProps) {
  const parsed = parseAfiliations(affiliations)

  // Melhoria 2: filtrar apenas stonecodes Stone
  const stoneSCs = parsed.filter(a => a.company?.toUpperCase() === 'STONE')
  const [openModal, setOpenModal] = useState<string | null>(null)

  // Melhoria 1: pre-load de todos os stonecodes Stone ao montar
  useEffect(() => {
    if (stoneSCs.length === 0) return
    const pending = stoneSCs.map(a => a.stonecode).filter(sc => !scData[sc])
    if (pending.length === 0) return

    setLoadingSet(prev => {
      const next = new Set(prev)
      pending.forEach(sc => next.add(sc))
      return next
    })

    pending.forEach(sc => {
      callGetActiveOffers(
        sc,
        (result: any) => {
          setScData(prev => ({ ...prev, [sc]: result }))
          setLoadingSet(prev => { const next = new Set(prev); next.delete(sc); return next })
        },
        (err: any) => {
          setScData(prev => ({ ...prev, [sc]: { error: err?.message || 'Erro desconhecido' } }))
          setLoadingSet(prev => { const next = new Set(prev); next.delete(sc); return next })
        }
      )
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [affiliations])  // re-roda quando o cliente muda

  if (stoneSCs.length === 0) return null

  function handleClickSC(stonecode: string) {
    // Se já carregado, abrir modal direto — sem nova chamada
    if (scData[stonecode]) {
      setOpenModal(stonecode)
      return
    }
    // Se ainda não carregado (ex: pre-load pendente), aguardar — botão mostra spinner
    // caso improvável: se pre-load não iniciou ainda, disparar agora
    if (!loadingSet.has(stonecode)) {
      setLoadingSet(prev => { const next = new Set(prev); next.add(stonecode); return next })
      callGetActiveOffers(
        stonecode,
        (result: any) => {
          setScData(prev => ({ ...prev, [stonecode]: result }))
          setLoadingSet(prev => { const next = new Set(prev); next.delete(stonecode); return next })
          setOpenModal(stonecode)
        },
        (err: any) => {
          setScData(prev => ({ ...prev, [stonecode]: { error: err?.message || 'Erro desconhecido' } }))
          setLoadingSet(prev => { const next = new Set(prev); next.delete(stonecode); return next })
          setOpenModal(stonecode)
        }
      )
    }
  }

  return (
    <>
      <div>
        <p className="text-[10px] font-bold text-[#00461e]/50 uppercase tracking-widest mb-2">Condições Stonecodes</p>
        <div className="flex flex-wrap gap-1.5">
          {stoneSCs.map(a => {
            const isLoading = loadingSet.has(a.stonecode)
            const offerType: string | undefined = scData[a.stonecode]?.type
            return (
              <span key={a.stonecode} className="inline-flex items-center gap-1.5">
                <CompanyBadge company={a.company} type={offerType} />
                <button
                  onClick={() => handleClickSC(a.stonecode)}
                  disabled={isLoading}
                  className="text-[11px] px-2.5 py-1 rounded-lg border border-gray-200 hover:border-[#00461e]/40 hover:bg-[#f5fff5] font-sans text-gray-600 hover:text-[#00461e] transition-colors disabled:opacity-50 disabled:cursor-wait"
                  title={`${a.company} · ${a.status}`}
                >
                  {a.stonecode}
                  {isLoading && <span className="ml-1 text-[#00461e] animate-pulse">...</span>}
                </button>
              </span>
            )
          })}
        </div>
        <p className="text-[10px] text-gray-400 mt-1.5">Clique no stonecode para ver condições ativas</p>
      </div>

      {openModal && scData[openModal] && (
        <ActiveOfferModal
          stonecode={openModal}
          offerData={scData[openModal]}
          onClose={() => setOpenModal(null)}
        />
      )}
    </>
  )
}

function AfiliacoesRow({ qtd, affiliations, scData }: {
  qtd: string | null
  affiliations: string | null
  scData: Record<string, any>
}) {
  const [open, setOpen] = useState(false)

  const parsed = affiliations
    ? affiliations.split(';').map(s => {
        const [stonecode, company, status, data_cred] = s.split('|')
        return { stonecode, company, status, data_cred }
      })
    : []

  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open])

  return (
    <>
      <div className="flex justify-between items-baseline gap-2 py-0.5">
        <span className="text-[11px] text-gray-400 whitespace-nowrap flex-shrink-0">Afiliações</span>
        <div className="flex items-center gap-2">
          <span className="text-[12px] text-gray-800 font-medium">{d(qtd)}</span>
          {parsed.length > 0 && (
            <button
              onClick={() => setOpen(true)}
              className="text-[10px] font-semibold text-[#00461e] border border-[#00461e]/30 bg-[#f5fff5] hover:bg-[#e6f7ee] px-2 py-0.5 rounded-full transition-colors"
            >
              ver
            </button>
          )}
        </div>
      </div>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl border border-[#c8d2c8] w-full max-w-xl mx-4 overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="bg-[#00461e] px-5 py-3 flex items-center justify-between">
              <h3 className="font-semibold text-white text-sm">Afiliações ({parsed.length})</h3>
              <button onClick={() => setOpen(false)} className="text-white/60 hover:text-white transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-[#f5fff5] border-b border-[#c8d2c8]">
                    <th className="px-4 py-2.5 text-left text-[#505a50] font-semibold">Stonecode</th>
                    <th className="px-4 py-2.5 text-left text-[#505a50] font-semibold">Empresa</th>
                    <th className="px-4 py-2.5 text-left text-[#505a50] font-semibold">Tipo</th>
                    <th className="px-4 py-2.5 text-left text-[#505a50] font-semibold">Status</th>
                    <th className="px-4 py-2.5 text-left text-[#505a50] font-semibold">Credenciamento</th>
                  </tr>
                </thead>
                <tbody>
                  {parsed.map((a, i) => (
                    <tr key={i} className="border-b border-[#e8f0e8] hover:bg-[#f5fff5]">
                      <td className="px-4 py-2 font-sans text-[11px] text-gray-600">{a.stonecode ?? '—'}</td>
                      <td className="px-4 py-2 font-medium">{a.company ?? '—'}</td>
                      <td className="px-4 py-2">
                        {a.company?.toUpperCase() === 'STONE' && scData[a.stonecode]?.type
                          ? <CompanyBadge company={a.company} type={scData[a.stonecode].type} />
                          : <span className="text-gray-400">—</span>
                        }
                      </td>
                      <td className="px-4 py-2">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          a.status === 'APROVADO' ? 'bg-[#e6f7ee] text-[#00461e]' : 'bg-red-50 text-red-600'
                        }`}>
                          {a.status ?? '—'}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-gray-500">{fmtDate(a.data_cred) ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default function InfoCliente({ data, status }: Props) {
  const [open, setOpen] = useState(false)
  const [hovered, setHovered] = useState(false)
  const [scData, setScData] = useState<Record<string, any>>({})
  const [loadingSet, setLoadingSet] = useState<Set<string>>(new Set())

  const r = data && data.length > 0 ? data[0] : null

  // Resetar cache quando o documento pesquisado muda (novo cliente)
  useEffect(() => {
    setScData({})
    setLoadingSet(new Set())
  }, [r?.document])

  const isLoading = status === 'loading'

  const statusColor = (s: string | null) => {
    if (!s) return 'bg-gray-100 text-gray-500'
    if (s === 'APROVADO') return 'bg-[#e6f7ee] text-[#00461e]'
    return 'bg-yellow-50 text-yellow-700'
  }

  const engajColor = (s: string | null) => {
    if (!s) return 'bg-gray-100 text-gray-500'
    if (s.toLowerCase().includes('ativo')) return 'bg-[#e6f7ee] text-[#00461e]'
    return 'bg-red-50 text-red-600'
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-[#c8d2c8] overflow-hidden">
      {/* Header */}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full bg-[#00461e] px-6 py-3 flex items-center justify-between hover:bg-[#00461e]/90 transition-colors text-left"
      >
        <div className="flex items-center gap-2 md:gap-3 min-w-0">
          <svg
            className={`w-4 h-4 text-white/60 transition-transform duration-200 flex-shrink-0 ${open ? 'rotate-0' : '-rotate-90'}`}
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
          <h3 className="font-semibold text-white text-sm truncate">Informacoes do Cliente</h3>
          {r && (
            <span className="text-white/80 text-sm font-medium truncate max-w-[120px] md:max-w-[200px] hidden sm:inline">
              · {d(r.trade_name)}
            </span>
          )}
        </div>
        {r && (
          <div className="flex items-center gap-1 md:gap-2 flex-shrink-0">
            <InfoTooltip navLinks={F360_NAV} />
            {v(r.status_affiliation) && (
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${statusColor(r.status_affiliation)}`}>
                {r.status_affiliation}
              </span>
            )}
            {v(r.status_engajamento) && (
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full hidden sm:inline-block ${engajColor(r.status_engajamento)}`}>
                {r.status_engajamento}
              </span>
            )}
            {(v(r.cidade) || v(r.uf)) && (
              <span className="text-[11px] text-white/60 hidden md:inline">
                {[capitalize(d(r.cidade)), d(r.uf)].filter(x => x !== '—').join(', ') || '—'}
              </span>
            )}
          </div>
        )}
      </button>

      {/* Recorte — recorte do card aberto, clampado em altura + gradiente.
           Padrão reutilizável: substituir este bloco por qualquer body real.
           Para replicar em outro card: wrapping div com overflow-hidden + pointer-events-none no content + overlay absoluto com gradient. */}
      {!open && r && !isLoading && (
        <div
          className="relative overflow-hidden cursor-pointer"
          style={{ height: 160 }}
          onClick={() => setOpen(true)}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
        >
          {/* Conteúdo real do card — pointer-events desligado (usuário só pode clicar no overlay) */}
          <div className="pointer-events-none select-none px-4 md:px-6 pt-4">
            <div className="space-y-5">
              {v(r.updated_at) && (
                <p className="text-[11px] text-gray-400 -mt-1">Dados atualizados em {fmtDate(r.updated_at)}</p>
              )}
              {/* Linha 1: Identificação + Tempo + Engajamento — idêntico ao body aberto */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <Section title="Identificação">
                  <div className="space-y-0.5">
                    <Row label="Documento" value={d(r.document)} />
                    <Row label="Razão Social" value={d(r.legal_name)} />
                    <Row label="Tipo" value={d(r.document_type)} />
                    <Row label="Canal" value={d(r.channel)} />
                    <Row label="Sales Force" value={d(r.main_sales_force)} />
                  </div>
                </Section>
                <Section title="Tempo com a Stone">
                  <div className="space-y-2.5 mt-1">
                    <TempoBar label="Adquirência" meses={r.meses_adquirencia} inicio={r.inicio_adquirencia} color="#00461e" />
                    <TempoBar label="Banking" meses={r.meses_banking} inicio={r.inicio_banking} color="#00d700" />
                    <TempoBar label="Digital" meses={r.meses_digital} inicio={r.inicio_digital} color="#6ee7b7" />
                  </div>
                </Section>
                <Section title="Engajamento">
                  <div className="space-y-0.5">
                    <Row label="Status" value={d(r.status_engajamento)}
                      className={r.status_engajamento?.toLowerCase().includes('ativo') ? 'text-[#00461e] font-bold' : 'text-red-600 font-bold'} />
                    <Row label="Última transação" value={fmtDate(r.ultima_trx_adquirencia)} />
                    <Row label="Dias sem transacionar" value={d(r.dias_sem_transacionar)} />
                    <Row label="Meses ativos Adq (12m)" value={d(r.meses_ativos_adq_12m)} />
                  </div>
                </Section>
              </div>
            </div>
          </div>
          {/* Overlay: gradiente + captura do clique */}
          <div
            className="absolute inset-0"
            style={{ background: 'linear-gradient(to bottom, transparent 40%, white 92%)' }}
          />
          {/* Overlay hover "expandir" */}
          <div
            className={`absolute inset-0 flex items-end justify-center pb-3 transition-opacity duration-200 pointer-events-none ${hovered ? 'opacity-100' : 'opacity-0'}`}
            style={{ background: hovered ? 'linear-gradient(to bottom, transparent 20%, rgba(255,255,255,0.7) 80%)' : 'transparent' }}
          >
            <span className="text-[11px] font-semibold text-gray-400 tracking-wide">expandir</span>
          </div>
        </div>
      )}

      {/* Body */}
      {open && (
        <div className="px-4 md:px-6 pb-6 pt-4">
          {isLoading && <CardSkeleton />}
          {!isLoading && !r && <p className="text-gray-400 text-sm">Sem dados</p>}
          {!isLoading && r && (
            <div className="space-y-5">
              {v(r.updated_at) && (
                <p className="text-[11px] text-gray-400 -mt-1">
                  Dados atualizados em {fmtDate(r.updated_at)}
                </p>
              )}

              {/* Row 1: Identificação + Tempo + Engajamento */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

                {/* Identificação */}
                <Section title="Identificação">
                  <div className="space-y-0.5">
                    <Row label="Documento" value={d(r.document)} />
                    <Row label="Razão Social" value={d(r.legal_name)} />
                    <Row label="Tipo" value={d(r.document_type)} />
                    <AfiliacoesRow qtd={r.qtd_stonecodes} affiliations={r.affiliations} scData={scData} />
                    <Row label="Empresas" value={d(r.companies)} />
                    <div className="flex justify-between items-baseline gap-2 py-0.5">
                      <span className="text-[11px] text-gray-400 whitespace-nowrap flex-shrink-0">MCC</span>
                      <div className="flex items-center gap-2">
                        <span className="text-[12px] text-gray-800 font-medium text-right">
                          {v(r.mcc_id) ? r.mcc_id : '—'}
                        </span>
                        {v(r.mcc_name) && (
                          <MccToggle name={r.mcc_name!} />
                        )}
                      </div>
                    </div>
                    <Row label="Domicílio" value={d(r.domicilio_bancario)} />
                    <Row label="Canal" value={d(r.channel)} />
                    <Row label="Sales Force" value={d(r.main_sales_force)} />
                  </div>
                </Section>

                {/* Tempo com a Stone */}
                <Section title="Tempo com a Stone">
                  <div className="space-y-2.5 mt-1">
                    <TempoBar label="Adquirência" meses={r.meses_adquirencia} inicio={r.inicio_adquirencia} color="#00461e" />
                    <TempoBar label="Banking" meses={r.meses_banking} inicio={r.inicio_banking} color="#00d700" />
                    <TempoBar label="Digital" meses={r.meses_digital} inicio={r.inicio_digital} color="#6ee7b7" />
                  </div>
                  <p className="text-[10px] text-gray-400 mt-2">Barra: proporção de 120 meses</p>
                </Section>

                {/* Engajamento */}
                <Section title="Engajamento">
                  <div className="space-y-0.5">
                    <Row label="Status" value={d(r.status_engajamento)}
                      className={r.status_engajamento?.toLowerCase().includes('ativo') ? 'text-[#00461e] font-bold' : 'text-red-600 font-bold'} />
                    <Row label="Última transação" value={fmtDate(r.ultima_trx_adquirencia)} />
                    <Row label="Dias sem transacionar" value={d(r.dias_sem_transacionar)} />
                    <Row label="Meses ativos Adq (12m)" value={d(r.meses_ativos_adq_12m)} />
                    <Row label="Último mês Banking ativo" value={fmtMonthYear(r.ultimo_mes_banking_ativo)} />
                    <Row label="Meses ativos Banking (12m)" value={d(r.meses_banking_ativos_12m)} />
                  </div>
                </Section>
              </div>

              <div className="border-t border-[#e8f0e8]" />

              {/* Row 2: Produtos + Grupo + Preços */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

                {/* Produtos */}
                <Section title={`Produtos Ativos (${d(r.qtd_produtos_ativos)})`}>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {PRODUCTS
                      .map(p => ({ ...p, on: bool(r[p.key]) }))
                      .sort((a, b) => Number(b.on) - Number(a.on))
                      .map(p => <Badge key={p.key} on={p.on} label={p.label} />)
                    }
                  </div>
                </Section>

                {/* Grupo Econômico */}
                <Section title="Grupo Econômico">
                  {bool(r.pertence_a_grupo) ? (
                    <div className="space-y-0.5">
                      <Row label="Pertence a grupo" value="Sim" className="text-[#00461e] font-bold" />
                      <Row label="Nome" value={d(r.grupo_nome)} />
                      <Row label="Tipo" value={d(r.grupo_tipo)} />
                      <Row label="Docs no grupo" value={d(r.qtd_docs_no_grupo)} />
                    </div>
                  ) : (
                    <p className="text-[12px] text-gray-400 mt-1">Não pertence a grupo econômico</p>
                  )}
                </Section>

                {/* Preços */}
                <Section title="Preços & Ofertas">
                  <div className="space-y-0.5">
                    <Row label="Última alter. preço" value={fmtDate(r.ultima_alteracao_preco)} />
                    <Row label="Última renegociação" value={fmtDate(r.ultima_renegociacao)} />
                    <Row label="Última atualiz. oferta" value={fmtDate(r.ultima_atualizacao_oferta)} />
                    {v(r.tier) && <Row label="Tier" value={d(r.tier)} />}
                  </div>
                </Section>
              </div>

              <div className="border-t border-[#e8f0e8]" />

              {/* Row 3: Condições Atuais */}
              <CondicoesAtuais
                affiliations={r.affiliations}
                scData={scData}
                setScData={setScData}
                loadingSet={loadingSet}
                setLoadingSet={setLoadingSet}
              />

            </div>
          )}
        </div>
      )}
    </div>
  )
}
