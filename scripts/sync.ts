import { parse } from "node-html-parser";

const BASE_URL = "https://semi.uyupun.tech";

function extractLinks(html: string): string[] {
  const root = parse(html);
  return root
    .querySelectorAll("a[href]")
    .map((a) => a.getAttribute("href")!)
    .filter((href) => href.startsWith("/"));
}

async function crawlBFS(): Promise<void> {
  const visited = new Set<string>();
  const queue: string[] = ["/"];

  while (queue.length > 0) {
    const path = queue.shift()!;
    if (visited.has(path)) continue;
    visited.add(path);

    console.log(`crawling: ${path}`);
    const res = await fetch(BASE_URL + path);
    const html = await res.text();

    const links = extractLinks(html);
    for (const link of links) {
      if (!visited.has(link)) {
        queue.push(link);
      }
    }
  }

  console.log(`\ntotal: ${visited.size} pages`);
}

await crawlBFS();
