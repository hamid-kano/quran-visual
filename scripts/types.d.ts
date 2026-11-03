declare module 'd3-force-3d' {
  // Minimal surface used by the data generator.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  type Any = any
  export function forceSimulation(nodes?: Any[], numDimensions?: number): Any
  export function forceLink(links?: Any[]): Any
  export function forceManyBody(): Any
  export function forceCenter(x?: number, y?: number, z?: number): Any
}
