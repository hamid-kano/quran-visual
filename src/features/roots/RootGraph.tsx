import { useEffect, useRef } from 'react'
import Graph from 'graphology'
import Sigma from 'sigma'
import type { RootIndex } from '../../data/schemas'
import { communityColor } from './colors'

interface NodeAttrs {
  x: number
  y: number
  size: number
  color: string
  count: number
}

const LABEL_FONT = '"Reem Kufi", "Noto Naskh Arabic", serif'

/**
 * Sigma draws nodes and edges in WebGL. Arabic labels need proper letter joining,
 * which WebGL glyph atlases do not provide, so labels are drawn on a 2D canvas overlay
 * where the browser's text shaping applies.
 */
export default function RootGraph({
  data,
  selected,
  onSelect,
}: {
  data: RootIndex
  selected: string | null
  onSelect: (root: string | null) => void
}) {
  const container = useRef<HTMLDivElement>(null)
  const overlay = useRef<HTMLCanvasElement>(null)
  const sigmaRef = useRef<Sigma<NodeAttrs> | null>(null)
  const selectedRef = useRef<string | null>(selected)
  const hoveredRef = useRef<string | null>(null)
  const onSelectRef = useRef(onSelect)
  useEffect(() => {
    onSelectRef.current = onSelect
  }, [onSelect])

  useEffect(() => {
    const el = container.current
    const canvas = overlay.current
    if (!el || !canvas) return
    const graph = new Graph<NodeAttrs>({ type: 'undirected' })
    for (const r of data.roots) {
      if (r.x === null || r.y === null) continue
      graph.addNode(r.root, {
        x: r.x,
        y: -r.y,
        size: 1.6 + Math.sqrt(r.count) * 0.13,
        color: communityColor(r.community),
        count: r.count,
      })
    }
    for (const e of data.edges) graph.addEdge(e.a, e.b)
    // biggest first: they claim label space before smaller neighbours
    const byWeight = graph
      .nodes()
      .sort((a, b) => graph.getNodeAttribute(b, 'count') - graph.getNodeAttribute(a, 'count'))

    const center = () => hoveredRef.current ?? selectedRef.current
    const focusSet = () => {
      const c = center()
      return c && graph.hasNode(c) ? new Set([c, ...graph.neighbors(c)]) : null
    }

    let killed = false
    let renderer: Sigma<NodeAttrs> | null = null

    const drawLabels = () => {
      if (!renderer) return
      const { width, height } = renderer.getDimensions()
      const dpr = window.devicePixelRatio || 1
      if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
        canvas.width = width * dpr
        canvas.height = height * dpr
        canvas.style.width = `${width}px`
        canvas.style.height = `${height}px`
      }
      const ctx = canvas.getContext('2d')!
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, width, height)
      ctx.direction = 'rtl'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'top'

      const focus = focusSet()
      const c = center()
      const taken: [number, number, number, number][] = []
      const order = focus ? [...focus].sort((a, b) => (a === c ? -1 : b === c ? 1 : 0)) : byWeight
      for (const node of order) {
        const attrs = graph.getNodeAttributes(node)
        const p = renderer.graphToViewport({ x: attrs.x, y: attrs.y })
        if (p.x < -40 || p.y < -40 || p.x > width + 40 || p.y > height + 40) continue
        const display = renderer.getNodeDisplayData(node)
        if (!display) continue
        const r = renderer.scaleSize(display.size)
        if (!focus && r < 4.6) continue
        const isCenter = node === c
        const size = isCenter ? 20 : focus ? 15 : Math.min(17, 11 + r * 0.5)
        ctx.font = `500 ${size}px ${LABEL_FONT}`
        const w = ctx.measureText(node).width
        const box: [number, number, number, number] = [
          p.x - w / 2 - 3,
          p.y + r + 1,
          w + 6,
          size + 4,
        ]
        if (
          !isCenter &&
          taken.some(
            (t) =>
              box[0] < t[0] + t[2] &&
              box[0] + box[2] > t[0] &&
              box[1] < t[1] + t[3] &&
              box[1] + box[3] > t[1],
          )
        )
          continue
        taken.push(box)
        ctx.lineWidth = 4
        ctx.strokeStyle = 'rgba(8,20,42,0.85)'
        ctx.strokeText(node, p.x, p.y + r + 2)
        ctx.fillStyle = isCenter ? '#f3e3b0' : focus ? '#f3ead6' : 'rgba(233,225,204,0.82)'
        ctx.fillText(node, p.x, p.y + r + 2)
      }
    }

    document.fonts.load(`500 16px ${LABEL_FONT}`).finally(() => {
      if (killed) return
      renderer = new Sigma(graph, el, {
        settings: { renderLabels: false, hideEdgesOnMove: false } as never,
        nodeReducer: (node, d) => {
          const focus = focusSet()
          if (!focus) return {}
          if (!focus.has(node)) return { color: '#24354f', zIndex: 0 }
          return node === center() ? { size: (d.size ?? 4) * 1.5, zIndex: 2 } : { zIndex: 1 }
        },
        edgeReducer: (edge) => {
          const c = center()
          if (c && graph.hasNode(c)) {
            const [a, b] = graph.extremities(edge)
            return a === c || b === c
              ? { color: 'rgba(230,207,143,0.8)', size: 1.6, zIndex: 2 }
              : { color: 'rgba(120,140,170,0.04)', size: 0.5 }
          }
          return { color: 'rgba(150,170,200,0.14)', size: 0.6 }
        },
      })
      renderer.on('afterRender', drawLabels)
      renderer.on('clickNode', ({ node }) => onSelectRef.current(node))
      renderer.on('clickStage', () => onSelectRef.current(null))
      renderer.on('enterNode', ({ node }) => {
        hoveredRef.current = node
        el.style.cursor = 'pointer'
        renderer?.refresh({ skipIndexation: true })
      })
      renderer.on('leaveNode', () => {
        hoveredRef.current = null
        el.style.cursor = ''
        renderer?.refresh({ skipIndexation: true })
      })
      sigmaRef.current = renderer
      // the first frame was drawn inside the constructor, before our label pass was attached
      renderer.refresh()
      focusOn(renderer, selectedRef.current, false)
    })

    return () => {
      killed = true
      renderer?.kill()
      sigmaRef.current = null
    }
  }, [data])

  useEffect(() => {
    selectedRef.current = selected
    const r = sigmaRef.current
    if (!r) return
    r.refresh({ skipIndexation: true })
    focusOn(r, selected, true)
  }, [selected])

  return (
    <div
      className="absolute inset-0"
      role="img"
      aria-label="شبكة الجذور: كل نقطة جذر، ويُرسم خط بين جذرين إذا اجتمعا في الآيات أكثر مما تقتضيه الصدفة"
    >
      <div ref={container} className="absolute inset-0" />
      <canvas ref={overlay} className="pointer-events-none absolute inset-0" aria-hidden />
    </div>
  )
}

function focusOn(r: Sigma<NodeAttrs>, node: string | null, animate: boolean) {
  const cam = r.getCamera()
  const duration =
    animate && !window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 600 : 0
  if (!node || !r.getGraph().hasNode(node)) {
    cam.animate({ x: 0.5, y: 0.5, ratio: 1 }, { duration })
    return
  }
  const d = r.getNodeDisplayData(node)
  if (!d) return
  // on wide screens the detail page covers the left side: shift the focus rightwards
  const shift = window.innerWidth >= 640 ? 0.16 : 0
  cam.animate({ x: d.x - shift * 0.5, y: d.y, ratio: 0.5 }, { duration })
}
