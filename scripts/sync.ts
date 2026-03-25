export {};

const BASE_URL = "https://semi.uyupun.tech";

const res = await fetch(BASE_URL);
const html = await res.text();
console.log(html.slice(0, 500));
