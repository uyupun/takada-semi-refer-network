<script lang="ts">
  import { onMount } from 'svelte';
  import ForceGraph from 'force-graph';

  let container: HTMLDivElement;

  onMount(() => {
    const data = {
      nodes: [{ id: 'A' }, { id: 'B' }, { id: 'C' }],
      links: [{ source: 'A', target: 'B' }, { source: 'B', target: 'C' }],
    };

    new ForceGraph(container).graphData(data);
  });
</script>

<div bind:this={container}></div>
