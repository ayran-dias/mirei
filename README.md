# mirei

A Miro-inspired interactive canvas for React — built on top of [React Flow](https://reactflow.dev/).

![Demo screenshot placeholder](https://placehold.co/1200x600/1a1a1a/c7ff3d?text=mirei+canvas)

## Features

- **Cards** — status badges (backlog / planned / in-progress / done), categories, expand/collapse
- **Frames** — container groups with minimize/maximize, editable title and font size
- **Labels** — free-floating text with configurable size
- **Tables** — editable inline tables with checkboxes
- **Edges** — multiple styles (normal, bold, dashed, dotted, animated), custom colors
- **Color picker** — 40 preset colors + custom hex palette that persists across sessions
- **Undo** — Ctrl+Z restores up to 50 previous states
- **Export** — one-click PNG export of the full canvas
- **Viewport persistence** — zoom and pan position saved and restored
- **Permissions** — editor vs viewer modes; mobile is always read-only
- **Headless save** — no backend required; pass `onSave` / `onSaveDefault` callbacks to integrate with any storage layer

## Quick start

```bash
npm install
npm run dev
```

## Usage

```tsx
import RoadmapCanvas from './components/roadmap/RoadmapCanvas'

<RoadmapCanvas
  initialNodes={nodes}
  initialEdges={edges}
  isEditor={true}
  onSave={(json) => localStorage.setItem('canvas', json)}
  onSaveDefault={(json) => saveToServer(json)}
/>
```

### Props

| Prop | Type | Description |
|------|------|-------------|
| `initialNodes` | `Node[]` | Initial node state |
| `initialEdges` | `Edge[]` | Initial edge state |
| `isEditor` | `boolean` | Enables editing (drag, add, delete). Default: `false` |
| `initialViewport` | `{ x, y, zoom }` | Restore saved viewport |
| `initialCustomColors` | `string[]` | Restore saved custom palette |
| `onSave` | `(json: string) => void` | Called on every auto-save (debounced 1.5s) |
| `onSaveDefault` | `(json: string) => void` | Called when "Default" button is clicked |

The `json` payload shape:

```json
{
  "nodes": [...],
  "edges": [...],
  "viewport": { "x": 0, "y": 0, "zoom": 1 },
  "customColors": ["#ff0000", "#00ff00"]
}
```

## Node types

### Card

```typescript
interface RoadmapCardData {
  title: string
  description: string
  status: 'backlog' | 'planned' | 'in-progress' | 'done'
  category: 'feature' | 'ajuste' | 'nova-entrega' | 'longo-prazo'
  expanded?: boolean
  color?: string  // overrides status-based theme
}
```

### Label

```typescript
interface RoadmapLabelData {
  text: string
  fontSize?: number  // default 24
  color?: string     // default '#1A1A1A'
}
```

### Frame

```typescript
interface RoadmapFrameData {
  title: string
  titleSize?: number
  minimized?: boolean
  expandedHeight?: number
  containedNodeIds?: string[]
  color?: string  // header background color
}
```

### Table

```typescript
interface RoadmapTableData {
  title?: string
  columns: { header: string; hasCheckbox: boolean }[]
  rows: { id: string; cells: { text: string; checked?: boolean }[] }[]
}
```

## Edge data

```typescript
interface EdgeData {
  edgeStyle?: 'default' | 'bold' | 'dashed' | 'dotted' | 'animated'
  color?: string  // custom stroke color
}
```

## Roadmap

- [ ] Icon support (emoji + icon library)
- [ ] Image embed (drag & drop / URL)
- [ ] Sticky note node type
- [ ] Redo (Ctrl+Shift+Z)
- [ ] Multi-select color change
- [ ] Keyboard shortcuts panel

## Tech stack

- [React 18](https://react.dev/)
- [React Flow 12](https://reactflow.dev/)
- [Tailwind CSS 3](https://tailwindcss.com/)
- [Vite 6](https://vitejs.dev/)
- [html-to-image](https://github.com/bubkoo/html-to-image)

## License

MIT
