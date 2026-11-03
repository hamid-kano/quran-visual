import { useMemo } from 'react'
import type { RootIndex } from '../../data/schemas'
import NetworkGraph, { type NetworkNode } from '../../components/NetworkGraph'
import { communityColor } from './colors'

export default function RootGraph({
  data,
  selected,
  onSelect,
}: {
  data: RootIndex
  selected: string | null
  onSelect: (root: string | null) => void
}) {
  const nodes = useMemo<NetworkNode[]>(
    () =>
      data.roots.flatMap((r) =>
        r.x === null || r.y === null
          ? []
          : [
              {
                key: r.root,
                x: r.x,
                y: r.y,
                size: 1.6 + Math.sqrt(r.count) * 0.13,
                color: communityColor(r.community),
                weight: r.count,
              },
            ],
      ),
    [data],
  )
  return (
    <NetworkGraph
      nodes={nodes}
      edges={data.edges}
      selected={selected}
      onSelect={onSelect}
      ariaLabel="شبكة الجذور: كل نقطة جذر، ويُرسم خط بين جذرين إذا اجتمعا في الآيات أكثر مما تقتضيه الصدفة"
    />
  )
}
