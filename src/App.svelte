<script lang="ts">
  import { onMount } from 'svelte';
  import ForceGraph, { type NodeObject } from 'force-graph';
  import { forceSeparateLinks } from './separateLinks';

  type GraphNode = NodeObject & {
    title: string;
    path: string;
    author: string | null;
  };

  let container: HTMLDivElement;

  const SITE_URL = 'https://semi.uyupun.tech';
  const MEMBERS_URL = 'https://raw.githubusercontent.com/uyupun/takada-semi/refs/heads/main/src/data/members.json';
  const COLOR_PALETTE = [
    '#e74c3c', '#3498db', '#2ecc71', '#f39c12',
    '#9b59b6', '#1abc9c', '#e67e22', '#e91e63',
    '#00bcd4', '#8bc34a', '#ff5722', '#607d8b',
  ];
  const UNKNOWN_AUTHOR_COLOR = '#aaaaaa';
  const ARROW_LENGTH = 6;

  // 近くのノード同士だけ強く反発させ、全体が広がりすぎないようにする
  const CHARGE_STRENGTH = -60;
  const CHARGE_DISTANCE_MAX = 300;

  // ラベルはグラフ座標で描くので、ズームに合わせて拡大縮小される
  const LABEL_FONT = '2px sans-serif';
  const LABEL_COLOR = '#000000';
  const LABEL_CHARS_PER_LINE = 12;
  // ノードの中心から、ラベル1行目までの縦の距離
  const LABEL_OFFSET_Y = 8;
  const LABEL_LINE_HEIGHT = 3;

  async function fetchAuthorColors(): Promise<Record<string, string>> {
    const res = await fetch(MEMBERS_URL);
    const members = await res.json();
    return Object.keys(members).reduce((acc, author, i) => {
      acc[author] = COLOR_PALETTE[i % COLOR_PALETTE.length];
      return acc;
    }, {} as Record<string, string>);
  }

  function wrapTitle(title: string): string[] {
    return title.match(new RegExp(`.{1,${LABEL_CHARS_PER_LINE}}`, 'g')) ?? [title];
  }

  // 例: '/presentations/2025/02-12/kazukichi' → '2025/02-12/kazukichi'
  function extractDateAuthor(path: string): string {
    return path.match(/\d{4}\/\d{2}-\d{2}\/[^/]+$/)?.[0] ?? '';
  }

  // ノードの下に、タイトル（折り返し）と日付・作者を描く
  function drawLabel(node: GraphNode, ctx: CanvasRenderingContext2D) {
    const { x, y } = node;
    if (x === undefined || y === undefined) return;

    ctx.font = LABEL_FONT;
    ctx.fillStyle = LABEL_COLOR;
    ctx.textAlign = 'center';

    const lines = [...wrapTitle(node.title), extractDateAuthor(node.path)].filter(Boolean);
    lines.forEach((line, i) => ctx.fillText(line, x, y + LABEL_OFFSET_Y + i * LABEL_LINE_HEIGHT));
  }

  onMount(async () => {
    const [data, authorColors] = await Promise.all([
      fetch(import.meta.env.BASE_URL + 'graph.json').then((res) => res.json()),
      fetchAuthorColors(),
    ]);

    const graph = new ForceGraph<GraphNode>(container)
      .graphData(data)
      .nodeColor((node) => authorColors[node.author ?? ''] ?? UNKNOWN_AUTHOR_COLOR)
      .linkDirectionalArrowLength(ARROW_LENGTH)
      // 矢印をリンクの終点（リンク先のノード側）に付ける
      .linkDirectionalArrowRelPos(1)
      .onNodeClick((node) => window.open(`${SITE_URL}${node.path}`, '_blank'))
      // ノードの丸は標準のまま描き、その後にラベルを重ねて描く
      .nodeCanvasObjectMode(() => 'after')
      .nodeCanvasObject(drawLabel);

    graph.d3Force('charge')?.strength(CHARGE_STRENGTH).distanceMax(CHARGE_DISTANCE_MAX);
    graph.d3Force('separateLinks', forceSeparateLinks(data.links));
  });
</script>

<div bind:this={container}></div>
