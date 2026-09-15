// Arte procedural: cada herói é desenhado com retângulos, no espírito do
// pixel art, a partir das cores e do símbolo declarados em seus dados.
(function (global) {
  const Jogo = (global.Jogo = global.Jogo || {});
  const A = {};

  function px(ctx, x, y, w, h, cor) {
    ctx.fillStyle = cor;
    ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  }

  function escurecer(cor, fator) {
    const n = parseInt(cor.slice(1), 16);
    const r = Math.max(0, Math.floor(((n >> 16) & 255) * fator));
    const g = Math.max(0, Math.floor(((n >> 8) & 255) * fator));
    const b = Math.max(0, Math.floor((n & 255) * fator));
    return "rgb(" + r + "," + g + "," + b + ")";
  }

  A.escurecer = escurecer;

  // Cada símbolo desenha um adereço ao lado do corpo (mão direita).
  function desenharSimbolo(ctx, simbolo, x, y, e, cores) {
    const madeira = "#6b4a2a";
    const metal = "#cfd6e0";
    const ouro = "#e8c45a";

    switch (simbolo) {
      case "cajado":
      case "manto":
        px(ctx, x, y - 22 * e, 2 * e, 30 * e, madeira);
        px(ctx, x - 1 * e, y - 24 * e, 4 * e, 3 * e, ouro);
        break;
      case "espada":
      case "adaga":
        px(ctx, x, y - 20 * e, 2 * e, simbolo === "espada" ? 18 * e : 11 * e, metal);
        px(ctx, x - 2 * e, y - 4 * e, 6 * e, 2 * e, ouro);
        break;
      case "espada_flamejante":
        px(ctx, x, y - 24 * e, 2 * e, 22 * e, "#fff4d0");
        px(ctx, x - 1 * e, y - 26 * e, 4 * e, 6 * e, "#f0842a");
        px(ctx, x - 2 * e, y - 3 * e, 6 * e, 2 * e, ouro);
        break;
      case "lanca":
      case "chifre":
        px(ctx, x, y - 26 * e, 2 * e, 34 * e, madeira);
        px(ctx, x - 1 * e, y - 30 * e, 4 * e, 6 * e, metal);
        break;
      case "arco":
        ctx.strokeStyle = madeira;
        ctx.lineWidth = 1.6 * e;
        ctx.beginPath();
        ctx.arc(x + 2 * e, y - 8 * e, 10 * e, -Math.PI / 2.2, Math.PI / 2.2);
        ctx.stroke();
        px(ctx, x + 1 * e, y - 18 * e, 1 * e, 20 * e, "#e8e0c8");
        break;
      case "funda":
        px(ctx, x, y - 14 * e, 1.5 * e, 10 * e, "#8a7a5a");
        px(ctx, x - 2 * e, y - 16 * e, 5 * e, 3 * e, "#6a6a6a");
        break;
      case "escudo":
        px(ctx, x - 1 * e, y - 18 * e, 8 * e, 12 * e, escurecer(metal, 0.8));
        px(ctx, x + 1 * e, y - 16 * e, 4 * e, 8 * e, cores.manto);
        break;
      case "machado":
        px(ctx, x, y - 22 * e, 2 * e, 28 * e, madeira);
        px(ctx, x - 3 * e, y - 22 * e, 8 * e, 7 * e, metal);
        break;
      case "harpa":
      case "trombeta":
        px(ctx, x - 1 * e, y - 18 * e, 8 * e, 14 * e, ouro);
        px(ctx, x + 1 * e, y - 16 * e, 4 * e, 10 * e, escurecer(ouro, 0.55));
        break;
      case "coroa":
        px(ctx, x - 1 * e, y - 16 * e, 8 * e, 5 * e, ouro);
        px(ctx, x + 1 * e, y - 19 * e, 1.6 * e, 3 * e, ouro);
        px(ctx, x + 4 * e, y - 19 * e, 1.6 * e, 3 * e, ouro);
        break;
      case "chama":
      case "tocha":
      case "brasa":
        px(ctx, x + 1 * e, y - 12 * e, 2 * e, 14 * e, madeira);
        px(ctx, x, y - 20 * e, 4 * e, 8 * e, "#f0842a");
        px(ctx, x + 1 * e, y - 22 * e, 2 * e, 5 * e, "#ffd98a");
        break;
      case "pergaminho":
        px(ctx, x - 1 * e, y - 16 * e, 8 * e, 10 * e, "#efe4c4");
        px(ctx, x, y - 14 * e, 6 * e, 1 * e, "#9a8a6a");
        px(ctx, x, y - 11 * e, 6 * e, 1 * e, "#9a8a6a");
        break;
      case "jarro":
        px(ctx, x - 1 * e, y - 14 * e, 7 * e, 9 * e, "#b98a5a");
        px(ctx, x + 1 * e, y - 17 * e, 3 * e, 3 * e, "#8a5f3a");
        break;
      case "serpente":
        px(ctx, x, y - 14 * e, 2 * e, 12 * e, "#4a8a4a");
        px(ctx, x + 1 * e, y - 18 * e, 5 * e, 3 * e, "#6abf6a");
        break;
      case "peixe":
      case "agua":
        px(ctx, x - 1 * e, y - 14 * e, 8 * e, 5 * e, "#5aa8c8");
        px(ctx, x + 6 * e, y - 16 * e, 3 * e, 8 * e, "#3a7a9a");
        break;
      case "olho":
        px(ctx, x - 1 * e, y - 16 * e, 9 * e, 6 * e, "#e8e0d0");
        px(ctx, x + 2 * e, y - 15 * e, 3 * e, 4 * e, "#3a2a6a");
        break;
      case "leao":
        px(ctx, x - 1 * e, y - 16 * e, 8 * e, 8 * e, "#c8973a");
        px(ctx, x + 1 * e, y - 13 * e, 2 * e, 2 * e, "#2a1a10");
        break;
      case "estrela":
        px(ctx, x + 1 * e, y - 22 * e, 3 * e, 3 * e, "#fff0b0");
        px(ctx, x - 1 * e, y - 20 * e, 7 * e, 1.5 * e, "#fff0b0");
        px(ctx, x + 1 * e, y - 18 * e, 3 * e, 3 * e, "#fff0b0");
        break;
      case "espiga":
        px(ctx, x + 1 * e, y - 16 * e, 1.5 * e, 16 * e, "#c8a85a");
        px(ctx, x - 1 * e, y - 18 * e, 5 * e, 5 * e, "#e8c87a");
        break;
      case "roda":
        ctx.strokeStyle = madeira;
        ctx.lineWidth = 1.6 * e;
        ctx.beginPath();
        ctx.arc(x + 3 * e, y - 8 * e, 7 * e, 0, Math.PI * 2);
        ctx.stroke();
        break;
      case "coluna":
        px(ctx, x - 1 * e, y - 26 * e, 8 * e, 26 * e, "#cfc6b0");
        px(ctx, x - 2 * e, y - 28 * e, 10 * e, 3 * e, "#b8ae98");
        break;
      case "relogio":
        px(ctx, x - 1 * e, y - 18 * e, 8 * e, 12 * e, "#cfd6e0");
        px(ctx, x + 2 * e, y - 15 * e, 1.5 * e, 5 * e, "#3a3a4a");
        break;
      case "asas":
        px(ctx, x - 2 * e, y - 20 * e, 4 * e, 12 * e, "#f2eeda");
        px(ctx, x + 2 * e, y - 18 * e, 3 * e, 9 * e, "#ddd6bc");
        break;
      default:
        px(ctx, x, y - 20 * e, 2 * e, 26 * e, madeira);
    }
  }

  // Corpo padrão: cabeça, túnica, manto e o adereço da classe.
  A.desenharHeroi = function (ctx, arte, cx, chao, escala, opcoes) {
    opcoes = opcoes || {};
    const e = escala;
    const c = arte || { tunica: "#cccccc", manto: "#888888", pele: "#c98d5e", cabelo: "#332211", simbolo: "cajado" };
    const espelhar = opcoes.espelhar;

    ctx.save();
    if (espelhar) {
      ctx.translate(cx, 0);
      ctx.scale(-1, 1);
      ctx.translate(-cx, 0);
    }

    // sombra
    ctx.fillStyle = "rgba(0,0,0,0.3)";
    ctx.beginPath();
    ctx.ellipse(cx, chao, 11 * e, 3.4 * e, 0, 0, Math.PI * 2);
    ctx.fill();

    if (opcoes.aura) {
      const g = ctx.createRadialGradient(cx, chao - 14 * e, 2 * e, cx, chao - 14 * e, 20 * e);
      g.addColorStop(0, opcoes.aura);
      g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.globalAlpha = 0.45;
      ctx.fillStyle = g;
      ctx.fillRect(cx - 22 * e, chao - 36 * e, 44 * e, 40 * e);
      ctx.globalAlpha = 1;
    }

    // manto atrás
    px(ctx, cx - 9 * e, chao - 25 * e, 18 * e, 22 * e, escurecer(c.manto, 0.72));
    // túnica
    px(ctx, cx - 7 * e, chao - 24 * e, 14 * e, 22 * e, c.tunica);
    px(ctx, cx - 7 * e, chao - 8 * e, 14 * e, 6 * e, escurecer(c.tunica, 0.78));
    // cinto
    px(ctx, cx - 7 * e, chao - 16 * e, 14 * e, 2 * e, escurecer(c.manto, 1.05));
    // braços
    px(ctx, cx - 9 * e, chao - 22 * e, 3 * e, 10 * e, c.pele);
    px(ctx, cx + 6 * e, chao - 22 * e, 3 * e, 10 * e, c.pele);
    // pés
    px(ctx, cx - 6 * e, chao - 2 * e, 5 * e, 2 * e, "#4a3a2a");
    px(ctx, cx + 1 * e, chao - 2 * e, 5 * e, 2 * e, "#4a3a2a");
    // cabeça
    px(ctx, cx - 5 * e, chao - 35 * e, 10 * e, 11 * e, c.pele);
    // cabelo / cobertura
    px(ctx, cx - 6 * e, chao - 37 * e, 12 * e, 5 * e, c.cabelo);
    px(ctx, cx - 6 * e, chao - 33 * e, 2 * e, 7 * e, c.cabelo);
    px(ctx, cx + 4 * e, chao - 33 * e, 2 * e, 7 * e, c.cabelo);
    // olhos
    px(ctx, cx - 3 * e, chao - 30 * e, 2 * e, 2 * e, "#2a1f18");
    px(ctx, cx + 1 * e, chao - 30 * e, 2 * e, 2 * e, "#2a1f18");

    if (opcoes.halo) {
      ctx.strokeStyle = "#ffe9a0";
      ctx.lineWidth = 1.4 * e;
      ctx.beginPath();
      ctx.ellipse(cx, chao - 39 * e, 7 * e, 2.2 * e, 0, 0, Math.PI * 2);
      ctx.stroke();
    }

    desenharSimbolo(ctx, c.simbolo, cx + 9 * e, chao - 2 * e, e, c);
    ctx.restore();
  };

  // Retrato quadrado usado nas listas e cartões.
  A.retrato = function (canvas, heroi, opcoes) {
    opcoes = opcoes || {};
    const F = Jogo.Formulas;
    const dpr = global.devicePixelRatio || 1;
    const lado = canvas.clientWidth || opcoes.tamanho || 64;
    canvas.width = lado * dpr;
    canvas.height = lado * dpr;
    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, lado, lado);

    const faccao = F.FACCOES[heroi.faccao];
    const g = ctx.createLinearGradient(0, 0, 0, lado);
    g.addColorStop(0, A.escurecer(faccao.cor, 0.35));
    g.addColorStop(1, "#14111c");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, lado, lado);

    A.desenharHeroi(ctx, heroi.arte, lado / 2, lado * 0.94, lado / 46, {
      halo: heroi.faccao === "celestiais",
      aura: heroi.faccao === "trevas" ? "rgba(150,60,180,0.8)" : null,
    });
  };

  Jogo.Arte = A;
})(typeof window !== "undefined" ? window : globalThis);
