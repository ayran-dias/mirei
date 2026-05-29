/**
 * useAnalytics — Google Analytics 4 (GA4) para Mesa Banco
 * O script gtag.js é carregado diretamente no index.html (não via JS dinâmico)
 * para evitar bloqueio de CSP no ambiente GAS.
 */

declare global {
  interface Window {
    dataLayer: unknown[]
    gtag: (...args: unknown[]) => void
  }
}

const GA_ID = 'G-K7HYK9MNK6'

const PAGE_TITLES: Record<string, string> = {
  home:             'Início',
  felicia360:       'Felícia 360',
  enterprise:       'Enterprise',
  'ajuste-ofertas': 'Ajuste de Ofertas',
}

export function trackPage(page: string) {
  try {
    if (typeof window === 'undefined' || !window.gtag) return
    window.gtag('event', 'page_view', {
      page_title:    PAGE_TITLES[page] || page,
      page_location: window.location.href,
      page_path:     `/?page=${page}`,
      send_to:       GA_ID,
    })
  } catch (_) {}
}

export function trackEvent(action: string, params?: Record<string, unknown>) {
  try {
    if (typeof window === 'undefined' || !window.gtag) return
    window.gtag('event', action, { ...params, send_to: GA_ID })
  } catch (_) {}
}

// Hook simples — mantido para consistência com chamadas no App.tsx
export function useAnalytics(_currentPage?: string) {
  return { trackPage, trackEvent }
}
