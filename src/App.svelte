<script lang="ts">
  import { onMount } from 'svelte';
  import ForceGraph from 'force-graph';

  let container: HTMLDivElement;

  onMount(() => {
    const data = {
      nodes: [
        { id: '/', title: '高田ゼミ', path: '/', author: null },
        { id: '/concept', title: 'コンセプト', path: '/concept', author: null },
        { id: '/presentations/2025/02-12/kazukichi', title: 'ヒューマンインタフェース', path: '/presentations/2025/02-12/kazukichi', author: 'kazukichi' },
        { id: '/presentations/2025/02-12/takashi', title: 'CustomPainter', path: '/presentations/2025/02-12/takashi', author: 'takashi' },
        { id: '/presentations/2025/03-12/murata', title: 'Webデザイン', path: '/presentations/2025/03-12/murata', author: 'murata' },
      ],
      links: [
        { source: '/', target: '/concept' },
        { source: '/concept', target: '/presentations/2025/02-12/kazukichi' },
        { source: '/concept', target: '/presentations/2025/02-12/takashi' },
        { source: '/presentations/2025/02-12/kazukichi', target: '/presentations/2025/03-12/murata' },
      ],
    };

    const authorColors: Record<string, string> = {
      kazukichi: '#e74c3c',
      takashi:   '#3498db',
      murata:    '#2ecc71',
    };

    new ForceGraph(container)
      .graphData(data)
      .nodeColor((node: any) => authorColors[node.author] ?? '#aaaaaa')
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
