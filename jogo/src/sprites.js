// Arte do jogo gerada em código: nada de assets externos, nenhuma licença de
// terceiros envolvida. Criaturas e personagens são montados a partir de formas
// primitivas rasterizadas em pixels inteiros, com contorno e sombreado
// automáticos — o que dá a leitura chunky de sprite de portátil 16-bit.
(function (global) {
  const OUTLINE = "#241a2e";

  function makeBuffer(size) {
    return { size, px: new Array(size * size).fill(null) };
  }

  function put(buf, x, y, color) {
    x = Math.round(x);
    y = Math.round(y);
    if (x < 0 || y < 0 || x >= buf.size || y >= buf.size) return;
    buf.px[y * buf.size + x] = color;
  }

  function get(buf, x, y) {
    if (x < 0 || y < 0 || x >= buf.size || y >= buf.size) return null;
    return buf.px[y * buf.size + x];
  }

  const shapes = {
    ellipse(buf, s) {
      const { x, y, rx, ry, c } = s;
      for (let py = Math.floor(y - ry); py <= Math.ceil(y + ry); py++) {
        for (let px = Math.floor(x - rx); px <= Math.ceil(x + rx); px++) {
          const dx = (px - x) / rx;
          const dy = (py - y) / ry;
          if (dx * dx + dy * dy <= 1.02) put(buf, px, py, c);
        }
      }
    },
    rect(buf, s) {
      for (let py = s.y; py < s.y + s.h; py++) {
        for (let px = s.x; px < s.x + s.w; px++) put(buf, px, py, s.c);
      }
    },
    tri(buf, s) {
      // triângulo isósceles apontando para cima (dir:-1) ou para baixo (dir:1)
      const dir = s.dir || -1;
      for (let i = 0; i < s.h; i++) {
        const t = i / Math.max(1, s.h - 1);
        const half = Math.round((s.w / 2) * (dir === -1 ? 1 - t : t));
        const py = dir === -1 ? s.y + i : s.y + i;
        for (let px = s.x - half; px <= s.x + half; px++) put(buf, px, py, s.c);
      }
    },
    px(buf, s) {
      put(buf, s.x, s.y, s.c);
    },
  };

  function render(size, parts, palette) {
    const buf = makeBuffer(size);
    for (const part of parts) {
      const fn = shapes[part.t];
      if (!fn) continue;
      fn(buf, Object.assign({}, part, { c: palette[part.c] || part.c }));
    }
    return buf;
  }

  function outline(buf, color) {
    const out = makeBuffer(buf.size);
    out.px = buf.px.slice();
    for (let y = 0; y < buf.size; y++) {
      for (let x = 0; x < buf.size; x++) {
        if (get(buf, x, y)) continue;
        const near =
          get(buf, x - 1, y) || get(buf, x + 1, y) || get(buf, x, y - 1) || get(buf, x, y + 1);
        if (near) out.px[y * out.size + x] = color;
      }
    }
    return out;
  }

  function toCanvas(buf) {
    const cv = document.createElement("canvas");
    cv.width = buf.size;
    cv.height = buf.size;
    const ctx = cv.getContext("2d");
    for (let y = 0; y < buf.size; y++) {
      for (let x = 0; x < buf.size; x++) {
        const c = buf.px[y * buf.size + x];
        if (!c) continue;
        ctx.fillStyle = c;
        ctx.fillRect(x, y, 1, 1);
      }
    }
    return cv;
  }

  function build(size, parts, palette) {
    return toCanvas(outline(render(size, parts, palette), OUTLINE));
  }

  // ---------------------------------------------------------------- criaturas
  // Cada criatura: corpo + cabeça + traço característico do seu tipo.
  function eyes(y, spread, light) {
    return [
      { t: "rect", x: 12 - spread - 1, y, w: 2, h: 3, c: "#f6f2ff" },
      { t: "rect", x: 12 + spread - 1, y, w: 2, h: 3, c: "#f6f2ff" },
      { t: "px", x: 12 - spread, y: y + 1, c: light || OUTLINE },
      { t: "px", x: 12 + spread - 1, y: y + 1, c: light || OUTLINE },
    ];
  }

  const CREATURE_ART = {
    fagulho: {
      pal: { body: "#f0913f", dark: "#c4611f", glow: "#ffd76b" },
      parts: [
        { t: "tri", x: 7, y: 3, w: 6, h: 6, c: "body" },
        { t: "tri", x: 17, y: 3, w: 6, h: 6, c: "body" },
        { t: "ellipse", x: 12, y: 11, rx: 7, ry: 6, c: "body" },
        { t: "ellipse", x: 12, y: 18, rx: 6, ry: 5, c: "dark" },
        { t: "ellipse", x: 20, y: 16, rx: 3, ry: 4, c: "glow" },
        { t: "tri", x: 20, y: 9, w: 5, h: 5, c: "glow" },
        ...eyes(9, 4),
        { t: "rect", x: 11, y: 13, w: 3, h: 1, c: "#7a3410" },
      ],
    },
    gotim: {
      pal: { body: "#4fb9e8", dark: "#2a7fb5", glow: "#bdeaff" },
      parts: [
        { t: "tri", x: 12, y: 2, w: 9, h: 6, c: "body" },
        { t: "ellipse", x: 12, y: 12, rx: 8, ry: 7, c: "body" },
        { t: "ellipse", x: 12, y: 19, rx: 7, ry: 4, c: "dark" },
        { t: "ellipse", x: 8, y: 9, rx: 2, ry: 3, c: "glow" },
        { t: "ellipse", x: 4, y: 15, rx: 2, ry: 3, c: "glow" },
        { t: "ellipse", x: 20, y: 15, rx: 2, ry: 3, c: "glow" },
        ...eyes(11, 4),
        { t: "rect", x: 11, y: 15, w: 3, h: 1, c: "#12496b" },
      ],
    },
    brotim: {
      pal: { body: "#63c359", dark: "#37853a", glow: "#c9f07a" },
      parts: [
        { t: "ellipse", x: 8, y: 4, rx: 4, ry: 3, c: "glow" },
        { t: "ellipse", x: 16, y: 4, rx: 4, ry: 3, c: "glow" },
        { t: "rect", x: 11, y: 4, w: 2, h: 4, c: "dark" },
        { t: "ellipse", x: 12, y: 13, rx: 8, ry: 7, c: "body" },
        { t: "ellipse", x: 12, y: 19, rx: 6, ry: 4, c: "dark" },
        { t: "ellipse", x: 12, y: 16, rx: 4, ry: 3, c: "glow" },
        ...eyes(11, 4),
        { t: "rect", x: 11, y: 15, w: 3, h: 1, c: "#1d5626" },
      ],
    },
    neblim: {
      pal: { body: "#b7a8e0", dark: "#7c6bb0", glow: "#e8e0ff" },
      parts: [
        { t: "ellipse", x: 12, y: 10, rx: 8, ry: 7, c: "body" },
        { t: "ellipse", x: 6, y: 17, rx: 3, ry: 3, c: "dark" },
        { t: "ellipse", x: 12, y: 18, rx: 4, ry: 3, c: "dark" },
        { t: "ellipse", x: 18, y: 17, rx: 3, ry: 3, c: "dark" },
        { t: "ellipse", x: 9, y: 6, rx: 3, ry: 2, c: "glow" },
        { t: "ellipse", x: 16, y: 5, rx: 2, ry: 2, c: "glow" },
        ...eyes(9, 4),
        { t: "rect", x: 11, y: 13, w: 3, h: 1, c: "#4a3a78" },
      ],
    },
    cinzel: {
      pal: { body: "#e2662f", dark: "#9c3a15", glow: "#ffd042" },
      parts: [
        { t: "tri", x: 6, y: 1, w: 7, h: 7, c: "dark" },
        { t: "tri", x: 18, y: 1, w: 7, h: 7, c: "dark" },
        { t: "ellipse", x: 12, y: 10, rx: 8, ry: 6, c: "body" },
        { t: "ellipse", x: 12, y: 18, rx: 8, ry: 5, c: "dark" },
        { t: "tri", x: 12, y: 2, w: 8, h: 5, c: "glow" },
        { t: "ellipse", x: 21, y: 13, rx: 3, ry: 5, c: "glow" },
        { t: "ellipse", x: 3, y: 13, rx: 3, ry: 5, c: "glow" },
        ...eyes(9, 5, "#ffe9a8"),
        { t: "rect", x: 10, y: 13, w: 5, h: 1, c: "#5e1f06" },
      ],
    },
    vultor: {
      pal: { body: "#8f7fc4", dark: "#4d4080", glow: "#d8ccff" },
      parts: [
        { t: "tri", x: 12, y: 1, w: 12, h: 7, c: "dark" },
        { t: "ellipse", x: 12, y: 11, rx: 9, ry: 7, c: "body" },
        { t: "ellipse", x: 12, y: 19, rx: 7, ry: 4, c: "dark" },
        { t: "ellipse", x: 3, y: 11, rx: 3, ry: 5, c: "glow" },
        { t: "ellipse", x: 21, y: 11, rx: 3, ry: 5, c: "glow" },
        ...eyes(10, 5, "#ffe9a8"),
        { t: "rect", x: 10, y: 15, w: 5, h: 1, c: "#2c2350" },
      ],
    },
  };

  // ------------------------------------------------------------- personagens
  function heroParts(dir, frame, pal) {
    const legOffset = frame === 1 ? 1 : 0;
    const base = [
      { t: "ellipse", x: 8, y: 5, rx: 5, ry: 4, c: pal.hair },
      { t: "ellipse", x: 8, y: 7, rx: 4, ry: 3, c: pal.skin },
      { t: "rect", x: 4, y: 10, w: 9, h: 5, c: pal.shirt },
      { t: "rect", x: 4 + legOffset, y: 14, w: 3, h: 2, c: pal.pants },
      { t: "rect", x: 10 - legOffset, y: 14, w: 3, h: 2, c: pal.pants },
    ];
    if (dir === "down") {
      base.push(
        { t: "px", x: 6, y: 7, c: OUTLINE },
        { t: "px", x: 10, y: 7, c: OUTLINE },
        { t: "rect", x: 3, y: 3, w: 11, h: 2, c: pal.hair }
      );
    } else if (dir === "up") {
      base.push({ t: "rect", x: 3, y: 3, w: 11, h: 5, c: pal.hair });
    } else {
      const flip = dir === "left" ? -1 : 1;
      base.push(
        { t: "px", x: 8 + flip * 2, y: 7, c: OUTLINE },
        { t: "rect", x: 3, y: 3, w: 11, h: 3, c: pal.hair }
      );
    }
    return base;
  }

  const HERO_PAL = { hair: "#4a3a63", skin: "#f0c9a0", shirt: "#d94f4f", pants: "#3b4f7a" };
  const NPC_PAL = { hair: "#6d5a3a", skin: "#e8bb8f", shirt: "#4f8fd9", pants: "#404a5c" };

  // ------------------------------------------------------------------ tiles
  // Ruído determinístico: mesmo tile desenha igual em todo carregamento.
  function noise(x, y, seed) {
    const n = Math.sin(x * 127.1 + y * 311.7 + seed * 74.7) * 43758.5453;
    return n - Math.floor(n);
  }

  const TILE = 16;

  const TILE_PAINTERS = {
    grama(ctx, seed) {
      ctx.fillStyle = "#6fae5a";
      ctx.fillRect(0, 0, TILE, TILE);
      for (let y = 0; y < TILE; y++) {
        for (let x = 0; x < TILE; x++) {
          const n = noise(x, y, seed);
          if (n > 0.93) {
            ctx.fillStyle = "#87c46c";
            ctx.fillRect(x, y, 1, 1);
          } else if (n < 0.06) {
            ctx.fillStyle = "#5c9a4c";
            ctx.fillRect(x, y, 1, 1);
          }
        }
      }
    },
    mato(ctx, seed) {
      ctx.fillStyle = "#4f8f43";
      ctx.fillRect(0, 0, TILE, TILE);
      ctx.fillStyle = "#3f7737";
      for (let x = 0; x < TILE; x += 4) {
        const h = 6 + Math.floor(noise(x, seed, 3) * 4);
        ctx.fillRect(x, TILE - h, 3, h);
      }
      ctx.fillStyle = "#67ad55";
      for (let x = 2; x < TILE; x += 4) {
        const h = 5 + Math.floor(noise(x, seed, 7) * 5);
        ctx.fillRect(x, TILE - h, 2, h);
      }
    },
    caminho(ctx, seed) {
      ctx.fillStyle = "#d8c8a0";
      ctx.fillRect(0, 0, TILE, TILE);
      for (let y = 0; y < TILE; y++) {
        for (let x = 0; x < TILE; x++) {
          const n = noise(x, y, seed + 11);
          if (n > 0.9) {
            ctx.fillStyle = "#c4b086";
            ctx.fillRect(x, y, 1, 1);
          }
        }
      }
    },
    agua(ctx, seed) {
      ctx.fillStyle = "#3f86c4";
      ctx.fillRect(0, 0, TILE, TILE);
      ctx.fillStyle = "#63a8de";
      for (let y = 2; y < TILE; y += 5) {
        const off = Math.floor(noise(y, seed, 2) * 6);
        ctx.fillRect(off, y, 6, 1);
        ctx.fillRect((off + 9) % TILE, y + 2, 4, 1);
      }
    },
    arvore(ctx, seed) {
      ctx.fillStyle = "#6fae5a";
      ctx.fillRect(0, 0, TILE, TILE);
      ctx.fillStyle = "#6b4a2a";
      ctx.fillRect(7, 10, 3, 6);
      ctx.fillStyle = "#2f6b33";
      ctx.beginPath();
      ctx.arc(8, 7, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#3f8a42";
      ctx.beginPath();
      ctx.arc(7, 6, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#57a851";
      for (let i = 0; i < 12; i++) {
        const a = noise(i, seed, 5) * Math.PI * 2;
        const r = noise(i, seed, 9) * 5;
        ctx.fillRect(8 + Math.cos(a) * r, 6 + Math.sin(a) * r, 1, 1);
      }
    },
    parede(ctx) {
      ctx.fillStyle = "#c9b79b";
      ctx.fillRect(0, 0, TILE, TILE);
      ctx.fillStyle = "#a89377";
      for (let y = 0; y < TILE; y += 4) {
        ctx.fillRect(0, y, TILE, 1);
        ctx.fillRect(y % 8 === 0 ? 4 : 10, y, 1, 4);
      }
    },
    telhado(ctx) {
      ctx.fillStyle = "#b8524b";
      ctx.fillRect(0, 0, TILE, TILE);
      ctx.fillStyle = "#96403c";
      for (let y = 0; y < TILE; y += 4) ctx.fillRect(0, y, TILE, 1);
      ctx.fillStyle = "#cf6a60";
      ctx.fillRect(0, 0, TILE, 1);
    },
    porta(ctx) {
      ctx.fillStyle = "#c9b79b";
      ctx.fillRect(0, 0, TILE, TILE);
      ctx.fillStyle = "#6b4a2a";
      ctx.fillRect(3, 2, 10, 14);
      ctx.fillStyle = "#8a6238";
      ctx.fillRect(4, 3, 8, 12);
      ctx.fillStyle = "#e8d06a";
      ctx.fillRect(10, 9, 2, 2);
    },
    areia(ctx, seed) {
      ctx.fillStyle = "#e6d9a8";
      ctx.fillRect(0, 0, TILE, TILE);
      for (let y = 0; y < TILE; y++) {
        for (let x = 0; x < TILE; x++) {
          if (noise(x, y, seed + 21) > 0.92) {
            ctx.fillStyle = "#d2c28c";
            ctx.fillRect(x, y, 1, 1);
          }
        }
      }
    },
    flor(ctx, seed) {
      TILE_PAINTERS.grama(ctx, seed);
      const cores = ["#e86a8f", "#f0d15a", "#d6a3e8"];
      for (let i = 0; i < 3; i++) {
        const x = 2 + Math.floor(noise(i, seed, 13) * 12);
        const y = 2 + Math.floor(noise(i, seed, 17) * 12);
        ctx.fillStyle = cores[i % cores.length];
        ctx.fillRect(x, y, 2, 2);
      }
    },
  };

  function buildTile(name, seed) {
    const cv = document.createElement("canvas");
    cv.width = TILE;
    cv.height = TILE;
    const ctx = cv.getContext("2d");
    (TILE_PAINTERS[name] || TILE_PAINTERS.grama)(ctx, seed || 1);
    return cv;
  }

  // ------------------------------------------------------------------ cache
  const cache = { creatures: {}, hero: {}, npc: {}, tiles: {} };

  function creature(id) {
    if (!cache.creatures[id]) {
      const art = CREATURE_ART[id] || CREATURE_ART.neblim;
      cache.creatures[id] = build(24, art.parts, art.pal);
    }
    return cache.creatures[id];
  }

  function hero(dir, frame, isNpc) {
    const store = isNpc ? cache.npc : cache.hero;
    const key = dir + frame;
    if (!store[key]) {
      store[key] = build(16, heroParts(dir, frame, isNpc ? NPC_PAL : HERO_PAL), {});
    }
    return store[key];
  }

  function tile(name, seed) {
    const key = name + ":" + (seed || 1);
    if (!cache.tiles[key]) cache.tiles[key] = buildTile(name, seed);
    return cache.tiles[key];
  }

  global.Sprites = { creature, hero, tile, TILE, OUTLINE, CREATURE_ART };
})(window);
