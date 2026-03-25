import { parse } from "node-html-parser";

const BASE_URL = "https://semi.uyupun.tech";

const res = await fetch(BASE_URL);
const html = await res.text();
const root = parse(html);

const links = root
  .querySelectorAll("a[href]")
  .map((a) => a.getAttribute("href")!)
  .filter((href) => href.startsWith("/"));

console.log(links);
