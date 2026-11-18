import * as THREE from 'three';

/** Small waypoint graph: enough for a house, cheap enough for mobile. */
export class NavigationSystem {
  constructor(private nodes: THREE.Vector3[], private edges: number[][]) {}

  nearest(p: THREE.Vector3): number {
    let best = 0, d = Infinity;
    for (let i = 0; i < this.nodes.length; i++) {
      const dist = this.nodes[i].distanceToSquared(p);
      if (dist < d) { d = dist; best = i; }
    }
    return best;
  }

  /** BFS route; returns the full list of node indices from `from` to `to`. */
  route(from: number, to: number): number[] {
    if (from === to) return [from];
    const prev = new Array<number>(this.nodes.length).fill(-1);
    const seen = new Array<boolean>(this.nodes.length).fill(false);
    const queue = [from];
    seen[from] = true;
    while (queue.length) {
      const cur = queue.shift()!;
      for (const next of this.edges[cur] ?? []) {
        if (seen[next]) continue;
        seen[next] = true;
        prev[next] = cur;
        if (next === to) {
          const path = [to];
          let p = to;
          while (prev[p] !== -1) { p = prev[p]; path.unshift(p); }
          return path;
        }
        queue.push(next);
      }
    }
    return [from];
  }

  node(i: number): THREE.Vector3 { return this.nodes[i]; }
}
