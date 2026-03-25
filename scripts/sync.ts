import { parse } from "node-html-parser";
import { writeFileSync } from "fs";

const BASE_URL = "https://semi.uyupun.tech";
const SITEMAP_URL = `${BASE_URL}/sitemap-0.xml`;

type Node = {
  id: string;
  title: string;
  path: string;
};

type Link = {
  source: string;
  target: string;
};

type Graph = {
  nodes: Node[];
  links: Link[];
};

function normalizePath(path: string): string {
  return path === "/" ? "/" : path.replace(/\/$/, "");
}

function extractTitle(html: string): string {
  const root = parse(html);
  return root.querySelector("title")?.text ?? "";
}

function extractLinks(html: string): string[] {
  const root = parse(html);
  return root
    .querySelectorAll("main a[href]")
    .map((a) => normalizePath(a.getAttribute("href")!))
    .filter((href) => href.startsWith("/"));
}

async function fetchPage(path: string): Promise<{ title: string; links: string[] }> {
  const res = await fetch(BASE_URL + path);
  const html = await res.text();
  return { title: extractTitle(html), links: extractLinks(html) };
}

async function fetchPaths(): Promise<string[]> {
  const res = await fetch(SITEMAP_URL);
  const xml = await res.text();
  const root = parse(xml);
  return root
    .querySelectorAll("url loc")
    .map((loc) => normalizePath(loc.text.replace(BASE_URL, "")));
}

async function scrape(): Promise<Graph> {
  const paths = await fetchPaths();
  const pathSet = new Set(paths);
  const nodes: Node[] = [];
  const links: Link[] = [];

  for (const path of paths) {
    console.log(`crawling: ${path}`);
    const { title, links: pageLinks } = await fetchPage(path);
    nodes.push({ id: path, title, path });

    for (const link of pageLinks) {
      if (pathSet.has(link)) {
        links.push({ source: path, target: link });
      }
    }
  }

  return { nodes, links };
}

async function main(): Promise<void> {
  const graph = await scrape();
  writeFileSync("public/graph.json", JSON.stringify(graph, null, 2));
  console.log(`\nnodes: ${graph.nodes.length}, links: ${graph.links.length}`);
}

await main();
