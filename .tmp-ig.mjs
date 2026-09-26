const r = await fetch("https://www.instagram.com/marceloconelheiros/", {
  headers: {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    "Accept-Language": "pt-BR",
  },
});
const html = await r.text();
const re = /https:\\\/\\\/[^"'\\\s]+cdninstagram[^"'\\\s]+/g;
const raw = [...html.matchAll(re)].map((m) =>
  m[0].replace(/\\u0026/g, "&").replace(/\\\//g, "/")
);
const uniq = [...new Set(raw)];
console.log("count", uniq.length);
for (const u of uniq.slice(0, 12)) {
  console.log("---");
  console.log(u.slice(0, 220));
}
