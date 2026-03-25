<script lang="ts">
  import { onMount } from 'svelte';
  import ForceGraph from 'force-graph';

  let container: HTMLDivElement;

  function wrapTitle(title: string, chunkSize = 12): string[] {
    return title.match(new RegExp(`.{1,${chunkSize}}`, 'g')) ?? [title];
  }

  function extractDateAuthor(path: string): string {
    return path.match(/\d{4}\/\d{2}-\d{2}\/[^/]+$/)?.[0] ?? '';
  }

  onMount(() => {
    const data = {
      nodes: [
        { id: '/', title: '高田ゼミ', path: '/', author: null },
        { id: '/concept', title: 'コンセプト', path: '/concept', author: null },
        { id: '/presentations/2025/02-12/kazukichi', title: 'ヒューマンインタフェースとダグラス・エンゲルバート', path: '/presentations/2025/02-12/kazukichi', author: 'kazukichi' },
        { id: '/presentations/2025/02-12/takashi', title: 'CustomPainterとAnimationControllerを使用したアニメーションの作成', path: '/presentations/2025/02-12/takashi', author: 'takashi' },
        { id: '/presentations/2025/03-12/murata', title: 'ヴァネヴァー・ブッシュと『As We May Think』', path: '/presentations/2025/03-12/murata', author: 'murata' },
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
