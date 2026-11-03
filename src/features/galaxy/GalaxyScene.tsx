import { useEffect, useMemo, useRef, useState, type RefObject } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Line, OrbitControls, Stars } from '@react-three/drei'
import { AdditiveBlending, CanvasTexture, Vector3 } from 'three'
import type { Surah } from '../../data/schemas'
import { surahColor, starRadius, type ColorMode } from './colors'

interface Props {
  showNames: boolean
  surahs: Surah[]
  selected: number | null
  onSelect: (id: number | null) => void
  colorMode: ColorMode
  showLinks: boolean
  reducedMotion: boolean
}

type StarState = 'idle' | 'selected' | 'near' | 'dim'

const stateOf = (
  id: number,
  selected: number | null,
  hovered: number | null,
  near: Set<number>,
): StarState =>
  id === selected || id === hovered
    ? 'selected'
    : !selected
      ? 'idle'
      : near.has(id)
        ? 'near'
        : 'dim'

/** One soft radial glow texture shared by every star. */
function useGlowTexture() {
  return useMemo(() => {
    const size = 128
    const c = document.createElement('canvas')
    c.width = c.height = size
    const g = c.getContext('2d')!
    const grad = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
    grad.addColorStop(0, 'rgba(255,255,255,0.9)')
    grad.addColorStop(0.25, 'rgba(255,255,255,0.35)')
    grad.addColorStop(1, 'rgba(255,255,255,0)')
    g.fillStyle = grad
    g.fillRect(0, 0, size, size)
    return new CanvasTexture(c)
  }, [])
}

function Star({
  surah,
  color,
  state,
  onSelect,
  onHover,
  glow,
}: {
  surah: Surah
  color: string
  state: StarState
  onSelect: (id: number) => void
  onHover: (id: number | null) => void
  glow: CanvasTexture
}) {
  const r = starRadius(surah)
  return (
    <group position={surah.position}>
      <mesh>
        <sphereGeometry args={[r, 24, 16]} />
        <meshBasicMaterial color={color} transparent opacity={state === 'dim' ? 0.3 : 1} />
      </mesh>
      <sprite scale={[r * (state === 'selected' ? 14 : 8), r * (state === 'selected' ? 14 : 8), 1]}>
        <spriteMaterial
          map={glow}
          color={color}
          transparent
          depthWrite={false}
          blending={AdditiveBlending}
          opacity={state === 'dim' ? 0.08 : state === 'selected' ? 0.85 : 0.42}
        />
      </sprite>
      {/* generous invisible hit area so small surahs stay easy to pick */}
      <mesh
        onClick={(e) => {
          e.stopPropagation()
          onSelect(surah.id)
        }}
        onPointerOver={(e) => {
          e.stopPropagation()
          onHover(surah.id)
        }}
        onPointerOut={() => onHover(null)}
      >
        <sphereGeometry args={[Math.max(r * 2, 1.6), 8, 6]} />
        <meshBasicMaterial visible={false} />
      </mesh>
    </group>
  )
}

/**
 * Projects every star to screen space each frame and moves its label there.
 * Labels live in one DOM layer outside the canvas, so the browser shapes the Arabic text.
 */
function LabelProjector({
  surahs,
  labels,
}: {
  surahs: Surah[]
  labels: RefObject<Map<number, HTMLSpanElement>>
}) {
  const camera = useThree((s) => s.camera)
  const size = useThree((s) => s.size)
  const v = useMemo(() => new Vector3(), [])
  useFrame(() => {
    for (const s of surahs) {
      const el = labels.current.get(s.id)
      if (!el) continue
      v.set(s.position[0], s.position[1] - starRadius(s) - 1.1, s.position[2]).project(camera)
      const behind = v.z > 1
      el.style.visibility = behind ? 'hidden' : ''
      el.style.transform = `translate(-50%, -50%) translate(${((v.x + 1) / 2) * size.width}px, ${((1 - v.y) / 2) * size.height}px)`
    }
  })
  return null
}

/** Eases the orbit target toward the selected star. */
function Focus({ target }: { target: Vector3 | null }) {
  const controls = useThree((s) => s.controls) as unknown as {
    target: Vector3
    update: () => void
  } | null
  const camera = useThree((s) => s.camera)
  const goal = useRef<Vector3 | null>(null)
  useEffect(() => {
    goal.current = target ? target.clone() : new Vector3(0, 0, 0)
  }, [target])
  useFrame((_, dt) => {
    if (!controls || !goal.current) return
    const k = 1 - Math.exp(-dt * 3)
    const before = controls.target.clone()
    controls.target.lerp(goal.current, k)
    camera.position.add(controls.target.clone().sub(before))
    if (controls.target.distanceTo(goal.current) < 0.01) goal.current = null
    controls.update()
  })
  return null
}

function Scene({
  surahs,
  byId,
  selected,
  hovered,
  near,
  onHover,
  onSelect,
  colorMode,
  showLinks,
  reducedMotion,
  labels,
}: Props & {
  byId: Map<number, Surah>
  hovered: number | null
  near: Set<number>
  onHover: (id: number | null) => void
  labels: RefObject<Map<number, HTMLSpanElement>>
}) {
  const glow = useGlowTexture()
  const sel = selected ? byId.get(selected) : undefined

  const allLinks = useMemo(() => {
    const seen = new Set<string>()
    const out: { a: Surah; b: Surah; w: number }[] = []
    for (const s of surahs)
      for (const n of s.neighbors.slice(0, 3)) {
        const key = s.id < n.surah ? `${s.id}-${n.surah}` : `${n.surah}-${s.id}`
        if (seen.has(key)) continue
        seen.add(key)
        out.push({ a: s, b: byId.get(n.surah)!, w: n.similarity })
      }
    return out
  }, [surahs, byId])

  const focus = useMemo(() => (sel ? new Vector3(...sel.position) : null), [sel])

  return (
    <>
      <Stars
        radius={180}
        depth={60}
        count={2200}
        factor={3}
        saturation={0}
        fade
        speed={reducedMotion ? 0 : 0.4}
      />
      <OrbitControls
        makeDefault
        enableDamping
        dampingFactor={0.08}
        minDistance={12}
        maxDistance={160}
        autoRotate={!reducedMotion && !selected}
        autoRotateSpeed={0.25}
      />
      <Focus target={focus} />
      <LabelProjector surahs={surahs} labels={labels} />

      {showLinks &&
        allLinks.map(({ a, b, w }) => (
          <Line
            key={`${a.id}-${b.id}`}
            points={[a.position, b.position]}
            color="#a9b8cf"
            transparent
            opacity={0.08 + w * 0.35}
            lineWidth={1}
          />
        ))}

      {sel &&
        sel.neighbors.map((n) => {
          const o = byId.get(n.surah)!
          return (
            <Line
              key={`sel-${n.surah}`}
              points={[sel.position, o.position]}
              color="#e6cf8f"
              transparent
              opacity={0.35 + n.similarity * 0.9}
              lineWidth={1.5 + n.similarity * 3}
            />
          )
        })}

      {surahs.map((s) => (
        <Star
          key={s.id}
          surah={s}
          color={surahColor(s, colorMode)}
          glow={glow}
          onSelect={onSelect}
          onHover={onHover}
          state={stateOf(s.id, selected, hovered, near)}
        />
      ))}
    </>
  )
}

const LABEL_CLASS: Record<StarState, string> = {
  selected: 'z-20 text-[19px] text-gold-soft',
  near: 'z-10 text-[15px] text-vellum',
  idle: 'text-[13px] text-mist',
  dim: 'text-[13px] text-mist',
}

export default function GalaxyScene(props: Props) {
  const { surahs, selected, showNames } = props
  const [hovered, setHovered] = useState<number | null>(null)
  const byId = useMemo(() => new Map(surahs.map((s) => [s.id, s])), [surahs])
  const near = useMemo(
    () => new Set((selected ? byId.get(selected)?.neighbors : [])?.map((n) => n.surah) ?? []),
    [byId, selected],
  )
  const labels = useRef(new Map<number, HTMLSpanElement>())

  useEffect(() => {
    document.body.style.cursor = hovered ? 'pointer' : ''
    return () => {
      document.body.style.cursor = ''
    }
  }, [hovered])

  return (
    <div className="absolute inset-0">
      <Canvas
        camera={{ position: [0, 8, 105], fov: 45, near: 0.5, far: 600 }}
        dpr={[1, 2]}
        onPointerMissed={() => props.onSelect(null)}
        aria-label="مجرّة السور: كل نجم سورة، والقرب بين النجوم يعكس تشابه جذورها"
        role="img"
      >
        <Scene
          {...props}
          byId={byId}
          hovered={hovered}
          near={near}
          onHover={setHovered}
          labels={labels}
        />
      </Canvas>
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        {surahs.map((s) => {
          const state = stateOf(s.id, selected, hovered, near)
          const shown =
            state === 'selected' ||
            state === 'near' ||
            (state === 'idle' && (showNames || s.ayahs >= 100))
          return (
            <span
              key={s.id}
              ref={(el) => {
                if (el) labels.current.set(s.id, el)
                else labels.current.delete(s.id)
              }}
              className={`absolute left-0 top-0 whitespace-nowrap font-medium select-none ${LABEL_CLASS[state]} ${shown ? '' : 'hidden'}`}
            >
              {s.name}
            </span>
          )
        })}
      </div>
    </div>
  )
}
