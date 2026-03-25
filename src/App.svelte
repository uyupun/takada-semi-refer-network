<script lang="ts">
  import { onMount } from 'svelte';
  import ForceGraph, { type NodeObject } from 'force-graph';

  type Node = NodeObject & {
    title: string;
    path: string;
    author: string | null;
  };

  let container: HTMLDivElement;

  function wrapTitle(title: string, chunkSize = 12): string[] {
    return title.match(new RegExp(`.{1,${chunkSize}}`, 'g')) ?? [title];
  }

  function extractDateAuthor(path: string): string {
    return path.match(/\d{4}\/\d{2}-\d{2}\/[^/]+$/)?.[0] ?? '';
  }

  const MEMBERS_URL = 'https://raw.githubusercontent.com/uyupun/takada-semi/refs/heads/main/src/data/members.json';
  const COLOR_PALETTE = [
    '#e74c3c', '#3498db', '#2ecc71', '#f39c12',
    '#9b59b6', '#1abc9c', '#e67e22', '#e91e63',
    '#00bcd4', '#8bc34a', '#ff5722', '#607d8b',
  ];

  async function buildAuthorColors(): Promise<Record<string, string>> {
    const res = await fetch(MEMBERS_URL);
    const members = await res.json();
    return Object.keys(members).reduce((acc, author, i) => {
      acc[author] = COLOR_PALETTE[i % COLOR_PALETTE.length];
      return acc;
    }, {} as Record<string, string>);
  }

  onMount(async () => {
    const [data, authorColors] = await Promise.all([
      fetch(import.meta.env.BASE_URL + 'graph.json').then((r) => r.json()),
      buildAuthorColors(),
    ]);

    new ForceGraph<Node>(container)
      .graphData(data)
      .nodeColor((node) => authorColors[node.author ?? ''] ?? '#aaaaaa')
      .nodeCanvasObjectMode(() => 'after')
      .nodeCanvasObject((node, ctx) => {
        ctx.font = '2px sans-serif';
        ctx.fillStyle = '#000000';
        ctx.textAlign = 'center';

        const labelOffset = 8;
        const lineHeight = 3;

        const lines = wrapTitle(node.title);
        lines.forEach((line, i) => ctx.fillText(line, node.x, node.y + labelOffset + i * lineHeight));

        const dateAuthor = extractDateAuthor(node.path);
        if (dateAuthor) ctx.fillText(dateAuthor, node.x, node.y + labelOffset + lines.length * lineHeight);
      });
  });
</script>

<div bind:this={container}></div>
