import type { NodeObject } from 'force-graph';
import { idOf, type Link } from './linkEnds';

type LinkIds = { source: string; target: string };
type Point = { x: number; y: number };
type Segment = { from: NodeObject; to: NodeObject; cluster: NodeObject[] };

// 別の塊のリンク同士を、これより近づけない
const LINK_MARGIN = 10;
// 配置がほぼ落ち着いてから働かせる。最初は全ノードが固まっていて交差だらけなので、そこで押すと大きな塊が遠くへ弾き飛ばされる
const ACTIVE_ALPHA = 0.1;

// Union-Find で、リンクで繋がったノードの集まり（塊）ごとに同じIDを返す関数を作る
function buildClusterIdOf(ids: string[], links: LinkIds[]): (id: string) => string {
  const parent = new Map(ids.map((id) => [id, id]));
  const find = (id: string): string => {
    const parentId = parent.get(id)!;
    return parentId === id ? id : find(parentId);
  };
  links.forEach((link) => parent.set(find(link.source), find(link.target)));
  return find;
}

function groupByCluster(nodes: NodeObject[], clusterIdOf: (id: string) => string): Map<string, NodeObject[]> {
  const clusters = new Map<string, NodeObject[]>();
  nodes.forEach((node) => {
    const id = clusterIdOf(String(node.id));
    const members = clusters.get(id);
    if (members) members.push(node);
    else clusters.set(id, [node]);
  });
  return clusters;
}

// リンクごとに、両端のノードと属する塊をまとめる
function buildSegments(nodes: NodeObject[], linkIds: LinkIds[]): Segment[] {
  const nodeById = new Map(nodes.map((node) => [String(node.id), node]));
  const clusterIdOf = buildClusterIdOf([...nodeById.keys()], linkIds);
  const clusters = groupByCluster(nodes, clusterIdOf);
  return linkIds.map(({ source, target }) => ({
    from: nodeById.get(source)!,
    to: nodeById.get(target)!,
    cluster: clusters.get(clusterIdOf(source))!,
  }));
}

function closestPointOnSegment(p: Point, a: Point, b: Point): Point {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  // 長さ0の線分（両端が同じ位置）では0除算になるので、分母を1にする
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy || 1)));
  return { x: a.x + t * dx, y: a.y + t * dy };
}

function segmentsIntersect(a: Point, b: Point, c: Point, d: Point): boolean {
  const side = (p: Point, q: Point, r: Point) => Math.sign((q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x));
  return side(a, b, c) !== side(a, b, d) && side(c, d, a) !== side(c, d, b);
}

// 交差していない2本の線分の最短距離は、どちらかの端点ともう一方の線分との距離になる
function closestPoints(a: Point, b: Point, c: Point, d: Point): [Point, Point] {
  const candidates: [Point, Point][] = [
    [a, closestPointOnSegment(a, c, d)],
    [b, closestPointOnSegment(b, c, d)],
    [closestPointOnSegment(c, a, b), c],
    [closestPointOnSegment(d, a, b), d],
  ];
  const length = ([p, q]: [Point, Point]) => Math.hypot(q.x - p.x, q.y - p.y);
  return candidates.reduce((best, pair) => (length(pair) < length(best) ? pair : best));
}

// 線分 s から t へ押し離す向きと、2本の距離を求める
function separation(s: Segment, t: Segment): { dirX: number; dirY: number; distance: number } {
  const [a, b, c, d] = [s.from, s.to, t.from, t.to] as Point[];

  // 交差しているときは最短距離の向きが決まらないので、中点同士を結ぶ向きに押し離す
  const intersecting = segmentsIntersect(a, b, c, d);
  const [p, q] = intersecting
    ? [{ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, { x: (c.x + d.x) / 2, y: (c.y + d.y) / 2 }]
    : closestPoints(a, b, c, d);
  const length = Math.hypot(q.x - p.x, q.y - p.y);
  const distance = intersecting ? 0 : length;

  // 向きが決まらないほど重なっているときは、x 方向に押し離す
  if (length === 0) return { dirX: 1, dirY: 0, distance };
  return { dirX: (q.x - p.x) / length, dirY: (q.y - p.y) / length, distance };
}

// 2つの塊を逆向きに動かす。リンクの端だけ動かすと、密集した塊を貫いたリンクが抜け出せないため塊ごと動かす。小さい塊ほど大きく動かす
function pushApart(a: NodeObject[], b: NodeObject[], dirX: number, dirY: number, shift: number) {
  const shiftA = (shift * b.length) / (a.length + b.length);
  const shiftB = (shift * a.length) / (a.length + b.length);
  a.forEach((n) => { n.vx! -= dirX * shiftA; n.vy! -= dirY * shiftA; });
  b.forEach((n) => { n.vx! += dirX * shiftB; n.vy! += dirY * shiftB; });
}

// 別の塊のリンク同士が近すぎれば、1ステップで足りない距離の半分ずつ離す
function separatePair(s: Segment, t: Segment) {
  if (s.cluster === t.cluster) return;

  const { dirX, dirY, distance } = separation(s, t);
  if (distance >= LINK_MARGIN) return;

  pushApart(s.cluster, t.cluster, dirX, dirY, (LINK_MARGIN - distance) / 2);
}

// 別の塊のリンク同士が交差・接近していれば、その塊同士を押し離す
export function forceSeparateLinks(links: Link[]) {
  const linkIds = links.map((link) => ({ source: idOf(link.source), target: idOf(link.target) }));
  let segments: Segment[] = [];

  // 塊の構成はシミュレーション中に変わらないので、initialize で1回だけ求める
  const initialize = (nodes: NodeObject[]) => { segments = buildSegments(nodes, linkIds); };

  const force = (alpha: number) => {
    if (alpha > ACTIVE_ALPHA) return;

    for (let i = 0; i < segments.length; i++) {
      for (let j = i + 1; j < segments.length; j++) separatePair(segments[i], segments[j]);
    }
  };
  force.initialize = initialize;

  return force;
}
