import { parse } from "node-html-parser";
import { writeFileSync } from "fs";

const BASE_URL = "https://semi.uyupun.tech";
const SITEMAP_URL = `${BASE_URL}/sitemap-0.xml`;
const MEMBERS_URL = "https://raw.githubusercontent.com/uyupun/takada-semi/refs/heads/main/src/data/members.json";

type Node = {
  id: string;
  title: string;
  path: string;
  author: string | null;
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
  const text = root.querySelector("title")?.text ?? "";
  return text.replace(/ \| 高田ゼミ$/, "");
}

function extractLinks(html: string): string[] {
  const root = parse(html);
  return root
    .querySelectorAll("main a[href]")
    .map((a) => normalizePath(a.getAttribute("href")!))
    .filter((href) => href.startsWith("/"));
}

function extractAuthor(path: string, members: Set<string>): string | null {
  const lastSegment = path.split("/").at(-1) ?? "";
  return members.has(lastSegment) ? lastSegment : null;
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

async function fetchMembers(): Promise<Set<string>> {
  const res = await fetch(MEMBERS_URL);
  const json = await res.json();
  return new Set(Object.keys(json));
}

async function scrape(): Promise<Graph> {
  const [paths, members] = await Promise.all([fetchPaths(), fetchMembers()]);
  const pathSet = new Set(paths);
  const nodes: Node[] = [];
  const links: Link[] = [];

  for (const path of paths) {
    console.log(`crawling: ${path}`);
    const { title, links: pageLinks } = await fetchPage(path);
    nodes.push({ id: path, title, path, author: extractAuthor(path, members) });

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
