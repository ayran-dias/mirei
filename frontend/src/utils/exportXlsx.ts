import * as XLSX from 'xlsx'

/**
 * Exporta um array de objetos como arquivo .xlsx real (sem aviso de formato).
 * @param data Array de rows (objetos com chaves = colunas)
 * @param headers Array de { key: string, label: string } definindo ordem/nome das colunas
 * @param filename Nome do arquivo sem extensão
 */
export function exportToXlsx(
  data: Record<string, any>[],
  headers: { key: string; label: string }[],
  filename: string
): void {
  // Construir array para worksheet: primeira linha = headers, demais = dados
  const wsData: any[][] = [
    headers.map(h => h.label),
    ...data.map(row => headers.map(h => {
      const v = row[h.key]
      if (v === null || v === undefined || v === '—' || v === '') return ''
      const n = parseFloat(String(v))
      return isNaN(n) ? String(v) : n  // números como números, strings como strings
    }))
  ]

  const ws = XLSX.utils.aoa_to_sheet(wsData)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Dados')
  XLSX.writeFile(wb, `${filename}.xlsx`)
}
