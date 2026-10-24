// SVG artwork for the demo catalogue: simple device illustrations, brand wordmarks and category icons.
const shade = (hex, amount) => {
  const n = parseInt(hex.slice(1), 16);
  const clamp = (v) => Math.max(0, Math.min(255, Math.round(v)));
  const r = clamp(((n >> 16) & 255) + amount), g = clamp(((n >> 8) & 255) + amount), b = clamp((n & 255) + amount);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
};

// Each device is drawn in a 400x400 box centred at (200,200); c = body colour, d = darker detail, l = lighter highlight
const devices = {
  headphones: (c, d, l) => `
    <path d="M90 230 V190 a110 110 0 0 1 220 0 V230" fill="none" stroke="${d}" stroke-width="22" stroke-linecap="round"/>
    <rect x="62" y="205" width="66" height="120" rx="30" fill="${c}"/><rect x="272" y="205" width="66" height="120" rx="30" fill="${c}"/>
    <rect x="80" y="222" width="30" height="86" rx="15" fill="${l}" opacity=".5"/><rect x="290" y="222" width="30" height="86" rx="15" fill="${l}" opacity=".5"/>`,
  gamingHeadset: (c, d, l) => devices.headphones(c, d, l) + `
    <path d="M110 300 q20 70 85 62" fill="none" stroke="${d}" stroke-width="10" stroke-linecap="round"/><circle cx="200" cy="362" r="12" fill="${d}"/>
    <rect x="78" y="250" width="34" height="8" rx="4" fill="#22d3ee"/><rect x="288" y="250" width="34" height="8" rx="4" fill="#22d3ee"/>`,
  earbuds: (c, d, l) => `
    <rect x="95" y="230" width="210" height="130" rx="60" fill="${c}"/><rect x="95" y="230" width="210" height="40" rx="20" fill="${l}" opacity=".35"/>
    <circle cx="200" cy="325" r="7" fill="${d}"/>
    <g transform="rotate(-18 140 150)"><circle cx="140" cy="130" r="38" fill="${c}"/><rect x="128" y="140" width="24" height="80" rx="12" fill="${c}"/><circle cx="140" cy="130" r="18" fill="${d}"/></g>
    <g transform="rotate(18 260 150)"><circle cx="260" cy="130" r="38" fill="${c}"/><rect x="248" y="140" width="24" height="80" rx="12" fill="${c}"/><circle cx="260" cy="130" r="18" fill="${d}"/></g>`,
  speaker: (c, d, l) => `
    <rect x="70" y="120" width="260" height="170" rx="80" fill="${c}"/>
    <circle cx="140" cy="205" r="48" fill="${d}"/><circle cx="140" cy="205" r="22" fill="${l}" opacity=".6"/>
    <circle cx="260" cy="205" r="48" fill="${d}"/><circle cx="260" cy="205" r="22" fill="${l}" opacity=".6"/>
    <rect x="175" y="130" width="50" height="10" rx="5" fill="${l}" opacity=".6"/>`,
  soundbar: (c, d, l) => `
    <rect x="25" y="170" width="350" height="70" rx="30" fill="${c}"/>
    ${Array.from({ length: 13 }, (_, i) => `<circle cx="${60 + i * 23}" cy="205" r="6" fill="${d}"/>`).join("")}
    <rect x="290" y="255" width="80" height="90" rx="18" fill="${c}"/><circle cx="330" cy="300" r="26" fill="${d}"/>`,
  laptop: (c, d, l) => `
    <rect x="80" y="95" width="240" height="160" rx="12" fill="${d}"/><rect x="92" y="107" width="216" height="136" rx="4" fill="${l}"/>
    <path d="M110 125 h120 M110 145 h170 M110 165 h90" stroke="${c}" stroke-width="10" stroke-linecap="round" opacity=".6"/>
    <path d="M45 262 h310 l-18 30 h-274 z" fill="${c}"/><rect x="170" y="262" width="60" height="8" rx="4" fill="${d}"/>`,
  tablet: (c, d, l) => `
    <rect x="110" y="60" width="180" height="270" rx="22" fill="${c}"/><rect x="124" y="78" width="152" height="234" rx="10" fill="${l}"/>
    <rect x="140" y="100" width="56" height="56" rx="12" fill="${d}" opacity=".7"/><rect x="206" y="100" width="56" height="56" rx="12" fill="${c}" opacity=".7"/>
    <rect x="140" y="170" width="122" height="60" rx="12" fill="${d}" opacity=".4"/>`,
  phone: (c, d, l) => `
    <rect x="130" y="50" width="140" height="290" rx="28" fill="${c}"/><rect x="141" y="64" width="118" height="262" rx="18" fill="${l}"/>
    <rect x="178" y="72" width="44" height="12" rx="6" fill="${d}"/>
    <rect x="155" y="110" width="40" height="40" rx="10" fill="${d}" opacity=".6"/><rect x="205" y="110" width="40" height="40" rx="10" fill="${c}" opacity=".6"/>
    <rect x="155" y="160" width="90" height="40" rx="10" fill="${d}" opacity=".35"/>`,
  smartwatch: (c, d, l) => `
    <rect x="160" y="30" width="80" height="110" rx="20" fill="${d}"/><rect x="160" y="260" width="80" height="110" rx="20" fill="${d}"/>
    <rect x="120" y="110" width="160" height="180" rx="44" fill="${c}"/><rect x="136" y="126" width="128" height="148" rx="32" fill="#111827"/>
    <circle cx="200" cy="200" r="44" fill="none" stroke="${l}" stroke-width="10" stroke-dasharray="180 100"/><rect x="282" y="170" width="12" height="36" rx="6" fill="${d}"/>`,
  mouse: (c, d, l) => `
    <path d="M200 70 c75 0 105 70 105 150 c0 75 -45 120 -105 120 c-60 0 -105 -45 -105 -120 c0 -80 30 -150 105 -150 z" fill="${c}"/>
    <path d="M200 70 v100" stroke="${d}" stroke-width="6"/><rect x="190" y="105" width="20" height="40" rx="10" fill="${d}"/>
    <path d="M120 150 q80 30 160 0" fill="none" stroke="${l}" stroke-width="6" opacity=".5"/>`,
  keyboard: (c, d, l) => `
    <rect x="30" y="130" width="340" height="150" rx="16" fill="${c}"/>
    ${Array.from({ length: 4 }, (_, r) => Array.from({ length: 12 }, (_, k) => `<rect x="${46 + k * 26.5}" y="${146 + r * 27}" width="21" height="21" rx="4" fill="${r === 3 && k > 2 && k < 9 ? "none" : d}"/>`).join("")).join("")}
    <rect x="125" y="227" width="150" height="21" rx="4" fill="${d}"/><rect x="30" y="130" width="340" height="10" rx="5" fill="${l}" opacity=".3"/>`,
  monitor: (c, d, l) => `
    <rect x="40" y="70" width="320" height="200" rx="12" fill="${d}"/><rect x="52" y="82" width="296" height="176" rx="4" fill="${l}"/>
    <path d="M52 258 L180 140 L240 200 L280 165 L348 230 V258 z" fill="${c}" opacity=".7"/><circle cx="110" cy="130" r="20" fill="#fbbf24" opacity=".8"/>
    <rect x="185" y="270" width="30" height="60" fill="${c}"/><rect x="130" y="325" width="140" height="16" rx="8" fill="${c}"/>`,
  webcam: (c, d, l) => `
    <rect x="95" y="130" width="210" height="110" rx="55" fill="${c}"/><circle cx="200" cy="185" r="42" fill="${d}"/><circle cx="200" cy="185" r="22" fill="#1e3a8a"/><circle cx="190" cy="176" r="7" fill="#fff" opacity=".7"/>
    <circle cx="270" cy="160" r="6" fill="#22c55e"/><path d="M170 240 h60 l15 70 h-90 z" fill="${d}"/><rect x="140" y="305" width="120" height="14" rx="7" fill="${d}"/>`,
  console: (c, d, l) => `
    <rect x="105" y="60" width="190" height="280" rx="26" fill="${c}"/><rect x="155" y="60" width="90" height="280" fill="${d}" opacity=".85"/>
    <rect x="105" y="60" width="190" height="280" rx="26" fill="none" stroke="${d}" stroke-width="6"/>
    <rect x="170" y="300" width="60" height="8" rx="4" fill="#60a5fa"/>`,
  controller: (c, d, l) => `
    <path d="M110 140 h180 c40 0 70 40 80 100 c10 60 -20 90 -50 80 c-25 -8 -40 -45 -70 -45 h-100 c-30 0 -45 37 -70 45 c-30 10 -60 -20 -50 -80 c10 -60 40 -100 80 -100 z" fill="${c}"/>
    <path d="M115 205 h50 M140 180 v50" stroke="${d}" stroke-width="14" stroke-linecap="round"/>
    <circle cx="265" cy="185" r="11" fill="${d}"/><circle cx="290" cy="208" r="11" fill="${d}"/><circle cx="240" cy="208" r="11" fill="${d}"/><circle cx="265" cy="231" r="11" fill="${d}"/>
    <circle cx="170" cy="255" r="18" fill="${d}"/><circle cx="230" cy="255" r="18" fill="${d}"/>`,
  smartSpeaker: (c, d, l) => `
    <ellipse cx="200" cy="290" rx="120" ry="40" fill="${d}"/><rect x="80" y="150" width="240" height="140" fill="${c}"/>
    <ellipse cx="200" cy="150" rx="120" ry="40" fill="${l}"/><ellipse cx="200" cy="150" rx="92" ry="28" fill="none" stroke="#38bdf8" stroke-width="9"/>
    ${Array.from({ length: 4 }, (_, r) => Array.from({ length: 9 }, (_, k) => `<circle cx="${112 + k * 22}" cy="${195 + r * 22}" r="4" fill="${d}" opacity=".6"/>`).join("")).join("")}`,
  bulb: (c, d, l) => `
    <circle cx="200" cy="160" r="105" fill="${c}"/><circle cx="165" cy="125" r="30" fill="#fff" opacity=".45"/>
    <path d="M150 245 h100 v30 h-100 z" fill="${c}"/><rect x="150" y="270" width="100" height="70" rx="10" fill="${d}"/>
    <path d="M150 290 h100 M150 310 h100" stroke="${l}" stroke-width="6"/><path d="M180 340 h40 l-10 22 h-20 z" fill="${d}"/>`,
  camera: (c, d, l) => `
    <rect x="110" y="300" width="180" height="30" rx="15" fill="${d}"/><rect x="190" y="230" width="20" height="80" fill="${d}"/>
    <circle cx="200" cy="170" r="110" fill="${c}"/><circle cx="200" cy="170" r="62" fill="#111827"/><circle cx="200" cy="170" r="36" fill="#1e3a8a"/>
    <circle cx="186" cy="156" r="10" fill="#fff" opacity=".7"/><circle cx="200" cy="85" r="7" fill="#ef4444"/>`,
};

export function productSvg(kind, color, background) {
  const draw = devices[kind];
  if (!draw) throw new Error(`no artwork for ${kind}`);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="800" viewBox="0 0 800 800">
  <defs><radialGradient id="bg" cx="50%" cy="40%" r="75%"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="${background}"/></radialGradient></defs>
  <rect width="800" height="800" fill="url(#bg)"/>
  <ellipse cx="400" cy="690" rx="230" ry="26" fill="#000" opacity=".08"/>
  <g transform="translate(400 400) scale(1.45) translate(-200 -200)">${draw(color, shade(color, -60), shade(color, 70))}</g>
</svg>`;
}

export function logoSvg(name, color) {
  const size = name.length > 12 ? 44 : name.length > 8 ? 52 : 60;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="240" viewBox="0 0 480 240">
  <text x="240" y="135" text-anchor="middle" dominant-baseline="middle" font-family="Segoe UI, Arial, Helvetica, sans-serif" font-size="${size}" font-weight="700" letter-spacing="1" fill="${color}">${name.replace(/&/g, "&amp;")}</text>
</svg>`;
}

// Category icons are stored as SVG files, like the existing ones
export function categoryIconSvg(kind) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="64" height="64">${devices[kind]("#db2777", "#831843", "#fbcfe8")}</svg>`;
}

export function heroSvg(kinds, colors, background) {
  const parts = kinds.map((kind, i) => {
    const x = 400 + (i - (kinds.length - 1) / 2) * 330;
    return `<g transform="translate(${x} 420) scale(${i === 1 ? 1.2 : 0.95}) translate(-200 -200)">${devices[kind](colors[i], shade(colors[i], -60), shade(colors[i], 70))}</g>`;
  });
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800" viewBox="-200 0 1200 800">
  <rect x="-200" width="1200" height="800" fill="${background}"/>${parts.join("")}
</svg>`;
}
