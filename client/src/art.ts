// Inline SVG artwork (data URIs) for games that have no owned WebP asset.
// Fully local — nothing is fetched at runtime.

const svgUri = (svg: string) => `data:image/svg+xml,${encodeURIComponent(svg.replace(/\s+/g, " ").trim())}`;

const scaffold = (body: string, w = 400, h = 300) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}"><defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#0d3b26"/><stop offset="1" stop-color="#06170f"/></linearGradient></defs><rect width="${w}" height="${h}" fill="url(#bg)"/>${body}</svg>`;

function connect4Body(): string {
  let body = "";
  for (let c = 0; c < 7; c++) {
    for (let r = 0; r < 6; r++) {
      body += `<circle cx='${58 + c * 48}' cy='${45 + r * 42}' r='17' fill='rgba(255,255,255,0.05)' stroke='rgba(255,255,255,0.10)' stroke-width='2'/>`;
    }
  }
  const pile = (col: number, count: number, color: string) => {
    for (let k = 0; k < count; k++) {
      body += `<circle cx='${58 + col * 48}' cy='${45 + (5 - k) * 42}' r='17' fill='${color}'/>`;
    }
  };
  pile(3, 3, "#60A5FA");
  pile(4, 2, "#60A5FA");
  pile(2, 2, "#F5C542");
  pile(5, 1, "#F5C542");
  return body;
}

function rpsBody(): string {
  const tile = (x: number, y: number, glyph: string) =>
    `<text x='${x}' y='${y}' font-size='64' text-anchor='middle' dominant-baseline='central'>${glyph}</text>`;
  return (
    `<circle cx='200' cy='140' r='105' fill='none' stroke='rgba(163,230,53,0.25)' stroke-width='2' stroke-dasharray='8 10'/>` +
    tile(110, 140, "✊") +
    tile(290, 140, "✌") +
    tile(200, 58, "✋") +
    `<text x='200' y='268' font-family='Outfit, sans-serif' font-weight='700' font-size='24' fill='#A3E635' text-anchor='middle'>RPS BLITZ</text>`
  );
}

export const connect4Art = svgUri(scaffold(connect4Body()));
export const rpsArt = svgUri(scaffold(rpsBody()));
