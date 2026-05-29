import { useState, useCallback } from 'react'

// Tipagem do google.script.run no GAS
declare const google: {
  script: {
    run: {
      withSuccessHandler: (cb: (data: any) => void) => {
        withFailureHandler: (cb: (err: any) => void) => {
          [key: string]: (...args: any[]) => void
        }
      }
    }
  }
}

type Status = 'idle' | 'loading' | 'success' | 'error'

export function useBigQuery<T>() {
  const [data, setData] = useState<T | null>(null)
  const [status, setStatus] = useState<Status>('idle')
  const [error, setError] = useState<string | null>(null)

  const run = useCallback((fnName: string, ...args: any[]) => {
    setStatus('loading')
    setError(null)
    setData(null)

    // Em dev local, usa mock
    if (typeof google === 'undefined') {
      console.warn(`[DEV] google.script.run.${fnName} not available, using mock`)
      setStatus('error')
      setError('Ambiente de desenvolvimento — deploy no GAS para testar com dados reais')
      return
    }

    google.script.run
      .withSuccessHandler((result: any) => {
        if (result && result.error) {
          setStatus('error')
          setError(result.error)
        } else {
          setData(result as T)
          setStatus('success')
        }
      })
      .withFailureHandler((err: any) => {
        setStatus('error')
        setError(err?.message || 'Erro ao executar query')
      })
      [fnName](...args)
  }, [])

  return { data, status, error, run }
}
