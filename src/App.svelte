<script lang="ts">
  import { onMount } from 'svelte';
  import ForceGraph from 'force-graph';

  let container: HTMLDivElement;

  onMount(() => {
    const data = {
      nodes: [
        { id: '/', title: '高田ゼミ', path: '/', author: null },
        { id: '/concept', title: 'コンセプト', path: '/concept', author: null },
        { id: '/presentations/2025/02-12/kazukichi', title: 'ヒューマンインタフェースとダグラス・エンゲルバート', path: '/presentations/2025/02-12/kazukichi', author: 'kazukichi' },
      ],
      links: [
        { source: '/', target: '/concept' },
        { source: '/concept', target: '/presentations/2025/02-12/kazukichi' },
      ],
    };

    new ForceGraph(container)
      .graphData(data)
      .nodeCanvasObjectMode(() => 'after')
      .nodeCanvasObject((node: any, ctx: CanvasRenderingContext2D) => {
        ctx.font = '4px sans-serif';
        ctx.fillStyle = '#000000';
        ctx.textAlign = 'center';
        ctx.fillText(node.title, node.x, node.y + 8);
        ctx.fillText(node.path, node.x, node.y + 13);
      });
  });
</script>

<div bind:this={container}></div>
