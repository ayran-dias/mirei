import { readFileSync, writeFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const distHtml = resolve(__dirname, '../dist/index.html')
const gasHtml = resolve(__dirname, '../../gas/Index.html')

const content = readFileSync(distHtml, 'utf-8')
writeFileSync(gasHtml, content, 'utf-8')

console.log(`✓ Copied ${distHtml} → ${gasHtml}`)
console.log(`  Size: ${(content.length / 1024).toFixed(1)} KB`)
