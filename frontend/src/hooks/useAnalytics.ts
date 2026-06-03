/**
 * useAnalytics — Google Tag Manager (GTM) para Mesa Banco
 * GTM ID: GTM-NWPLWBNN
 * GA4 ID de referência: G-K7HYK9MNK6 (configurado dentro do GTM, não aqui)
 *
 * Pageviews e eventos são enviados via window.dataLayer.push().
 * O GTM processa o dataLayer e dispara as tags configuradas no console GTM.
 */

declare global {
  interface Window {
    dataLayer: Record<string, unknown>[]
    gtag: (...args: unknown[]) => void
  }
}

const PAGE_TITLES: Record<string, string> = {
  home:                  'Início',
  felicia360:            'Felícia 360',
  enterprise:            'Enterprise',
  'grupos-marca':        'Grupos Marca',
  'mid-large':           'Mid-Large',
  'ajuste-ofertas':      'Ajuste de Ofertas',
  simuladores:           'Simuladores',
  'simulador-credito':   'Simulador K-Giro',
  'doc-felicia360':      'Doc Felícia 360',
  'doc-simulador-kgiro': 'Doc Simulador K-Giro',
  'roadmap-mesa-banco':  'Roadmap',
  estudos:               'Estudos',
  permissoes:            'Permissões',
}

export function trackPage(page: string) {
  try {
    if (typeof window === 'undefined') return
    window.dataLayer = window.dataLayer || []
    window.dataLayer.push({
      event:         'page_view',
      page_title:    PAGE_TITLES[page] || page,
      page_path:     `/?page=${page}`,
      page_location: typeof window !== 'undefined' ? window.location.href : '',
    })
  } catch (_) {}
}

export function trackEvent(action: string, params?: Record<string, unknown>) {
  try {
    if (typeof window === 'undefined') return
    window.dataLayer = window.dataLayer || []
    window.dataLayer.push({ event: action, ...params })
  } catch (_) {}
}

// Hook simples — mantido para consistência com chamadas no App.tsx
export function useAnalytics(_currentPage?: string) {
  return { trackPage, trackEvent }
}
