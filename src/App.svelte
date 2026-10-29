<script lang="ts">
import ForceGraph, { type NodeObject } from "force-graph";
import { onMount } from "svelte";
import { idOf, type Link } from "./linkEnds";
import { forceSeparateLinks } from "./separateLinks";

type GraphNode = NodeObject & {
  title: string;
  path: string;
  author: string | null;
};

let container: HTMLDivElement;

const SITE_URL = "https://semi.uyupun.tech";
const MEMBERS_URL =
  "https://raw.githubusercontent.com/uyupun/takada-semi/refs/heads/main/src/data/members.json";
const COLOR_PALETTE = [
  "#e74c3c",
  "#3498db",
  "#2ecc71",
  "#f39c12",
  "#9b59b6",
  "#1abc9c",
  "#e67e22",
  "#e91e63",
  "#00bcd4",
  "#8bc34a",
  "#ff5722",
  "#607d8b",
];
const UNKNOWN_AUTHOR_COLOR = "#aaaaaa";
const ARROW_LENGTH = 6;
// ノードの丸の半径。描画（nodeRelSize）とクリック判定の両方で使う
const NODE_RADIUS = 4;

// 近くのノード同士だけ強く反発させ、全体が広がりすぎないようにする
const CHARGE_STRENGTH = -60;
const CHARGE_DISTANCE_MAX = 300;

// 被リンク数はノードの丸の中に描く
const IN_LINK_COUNT_FONT = "bold 4px sans-serif";
const IN_LINK_COUNT_COLOR = "#ffffff";

// ラベルはグラフ座標で描くので、ズームに合わせて拡大縮小される
const LABEL_FONT = "2px sans-serif";
const LABEL_COLOR = "#000000";
const LABEL_CHARS_PER_LINE = 12;
// ノードの中心から、ラベル1行目までの縦の距離
const LABEL_OFFSET_Y = 8;
const LABEL_LINE_HEIGHT = 3;

async function fetchAuthorColors(): Promise<Record<string, string>> {
  const res = await fetch(MEMBERS_URL);
  const members = await res.json();
  return Object.keys(members).reduce(
    (acc, author, i) => {
      acc[author] = COLOR_PALETTE[i % COLOR_PALETTE.length];
      return acc;
    },
    {} as Record<string, string>,
  );
}

// ノードの ID ごとに、リンク先として指されている数を数える
function countInLinks(links: Link[]): Map<string, number> {
  const counts = new Map<string, number>();
  links.forEach((link) => {
    const id = idOf(link.target);
    counts.set(id, (counts.get(id) ?? 0) + 1);
  });
  return counts;
}

// 0 は描かない（全ノードに 0 が並ぶと見づらいため）
function drawInLinkCount(
  node: GraphNode,
  count: number,
  ctx: CanvasRenderingContext2D,
) {
  const { x, y } = node;
  if (x === undefined || y === undefined || count === 0) return;

  // 文字の縦位置の設定がラベルの描画に持ち越されないよう、描き終えたら元に戻す
  ctx.save();
  ctx.font = IN_LINK_COUNT_FONT;
  ctx.fillStyle = IN_LINK_COUNT_COLOR;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(String(count), x, y);
  ctx.restore();
}

function wrapTitle(title: string): string[] {
  return (
    title.match(new RegExp(`.{1,${LABEL_CHARS_PER_LINE}}`, "g")) ?? [title]
  );
}

// 例: '/presentations/2025/02-12/kazukichi' → '2025/02-12/kazukichi'
function extractDateAuthor(path: string): string {
  return path.match(/\d{4}\/\d{2}-\d{2}\/[^/]+$/)?.[0] ?? "";
}

// ノードの下に、タイトル（折り返し）と日付・作者を描く
function drawLabel(node: GraphNode, ctx: CanvasRenderingContext2D) {
  const { x, y } = node;
  if (x === undefined || y === undefined) return;

  ctx.font = LABEL_FONT;
  ctx.fillStyle = LABEL_COLOR;
  ctx.textAlign = "center";

  const lines = [...wrapTitle(node.title), extractDateAuthor(node.path)].filter(
    Boolean,
  );
  lines.forEach((line, i) => {
    ctx.fillText(line, x, y + LABEL_OFFSET_Y + i * LABEL_LINE_HEIGHT);
  });
}

// 画面上の位置にあるノードを、座標の計算で探す
function nodeAt(
  graph: ForceGraph<GraphNode>,
  event: MouseEvent,
): GraphNode | undefined {
  const rect = container.getBoundingClientRect();
  const { x, y } = graph.screen2GraphCoords(
    event.clientX - rect.left,
    event.clientY - rect.top,
  );
  return graph.graphData().nodes.find((node) => {
    if (node.x === undefined || node.y === undefined) return false;
    return Math.hypot(node.x - x, node.y - y) <= NODE_RADIUS;
  });
}

onMount(async () => {
  const [data, authorColors] = await Promise.all([
    fetch(`${import.meta.env.BASE_URL}graph.json`).then((res) => res.json()),
    fetchAuthorColors(),
  ]);

  const inLinkCounts = countInLinks(data.links);

  const graph = new ForceGraph<GraphNode>(container)
    .graphData(data)
    .nodeColor(
      (node) => authorColors[node.author ?? ""] ?? UNKNOWN_AUTHOR_COLOR,
    )
    .nodeRelSize(NODE_RADIUS)
    .linkDirectionalArrowLength(ARROW_LENGTH)
    // 矢印をリンクの終点（リンク先のノード側）に付ける
    .linkDirectionalArrowRelPos(1)
    // ノードの丸は標準のまま描き、その後に被リンク数とラベルを重ねて描く
    .nodeCanvasObjectMode(() => "after")
    .nodeCanvasObject((node, ctx) => {
      drawInLinkCount(node, inLinkCounts.get(String(node.id)) ?? 0, ctx);
      drawLabel(node, ctx);
    })
    // force-graph 標準の当たり判定は、裏のキャンバスに描いた色を読み取ってノードを見分ける。
    // Brave の指紋対策は読み取った色にノイズを混ぜるので、判定が外れてクリックが効かなくなる。
    // そのため標準の判定は止め、クリックは onBackgroundClick で受けて nodeAt で判定する
    // （onBackgroundClick を使うのは、背景のドラッグ＝パンをクリックと区別してくれるため）
    .enablePointerInteraction(false)
    .enableNodeDrag(false)
    .onBackgroundClick((event) => {
      const node = nodeAt(graph, event);
      if (node) window.open(`${SITE_URL}${node.path}`, "_blank");
    });

  // 標準の判定を止めるとノード上の指カーソルも出なくなるので、自前で切り替える
  container.addEventListener("pointermove", (event) => {
    container.style.cursor = nodeAt(graph, event) ? "pointer" : "";
  });

  graph
    .d3Force("charge")
    ?.strength(CHARGE_STRENGTH)
    .distanceMax(CHARGE_DISTANCE_MAX);
  graph.d3Force("separateLinks", forceSeparateLinks(data.links));
});
</script>

<div bind:this={container}></div>
