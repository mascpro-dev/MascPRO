const r = await fetch("https://www.instagram.com/marceloconelheiros/", {
  headers: {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    "Accept-Language": "pt-BR",
  },
});
const html = await r.text();
let i = 0;
let n = 0;
while (n < 6) {
  const at = html.indexOf("cdninstagram", i);
  if (at < 0) break;
  console.log("---", at);
  console.log(html.slice(Math.max(0, at - 80), at + 180).replace(/\n/g, " "));
  i = at + 12;
  n++;
}
console.log("total", html.split("cdninstagram").length - 1);
