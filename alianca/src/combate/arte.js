// Arte procedural: cada herói é montado com retângulos, ganha contorno e
// sombreamento, e é guardado em cache num canvas fora de tela. O adereço da
// classe fica solto para poder girar durante o golpe.
(function (global) {
  const Jogo = (global.Jogo = global.Jogo || {});
  const A = {};

  const LARGURA = 44;
  const ALTURA = 58;
  const CONTORNO = "#120e1c";

  const cache = {};

  function escalaDispositivo(ctx) {
    try {
      const t = ctx.getTransform();
      return Math.abs(t.a) || 1;
    } catch (e) {
      return 1;
    }
  }

  function arteExterna(id) {
    return id && Jogo.ArteExterna && Jogo.ArteExterna.pronta(id) ? Jogo.ArteExterna : null;
  }

  // ------------------------------------------------------------- cores
  function componentes(cor) {
    if (cor[0] === "#") {
      const n = parseInt(cor.slice(1), 16);
      return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    }
    const m = cor.match(/\d+/g) || [0, 0, 0];
    return [Number(m[0]), Number(m[1]), Number(m[2])];
  }

  function misturar(cor, fator) {
    const [r, g, b] = componentes(cor);
    const f = (v) => Math.round(Math.max(0, Math.min(255, v * fator)));
    return "rgb(" + f(r) + "," + f(g) + "," + f(b) + ")";
  }

  A.escurecer = (cor, fator) => misturar(cor, fator);
  A.clarear = (cor, fator) => misturar(cor, fator);

  A.comAlfa = function (cor, alfa) {
    const [r, g, b] = componentes(cor);
    return "rgba(" + r + "," + g + "," + b + "," + alfa + ")";
  };

  // ------------------------------------------------------- forma do corpo
  // Lista de retângulos [x, y, largura, altura, cor] com os pés na origem.
  function formaHeroi(c, classe, faccao) {
    const t = c.tunica;
    const m = c.manto;
    const pele = c.pele;
    const cabelo = c.cabelo;

    const tSombra = misturar(t, 0.72);
    const tLuz = misturar(t, 1.16);
    const mSombra = misturar(m, 0.66);
    const mLuz = misturar(m, 1.12);
    const peleSombra = misturar(pele, 0.8);
    const couro = "#4a3524";

    const r = [];
    const add = (x, y, w, h, cor) => r.push([x, y, w, h, cor]);

    // asas dos celestiais, bem atrás de tudo
    if (faccao === "celestiais") {
      add(-16, -38, 6, 16, "#efe9d2");
      add(-14, -40, 5, 12, "#fdfaf0");
      add(10, -38, 6, 16, "#ded6bc");
      add(9, -40, 5, 12, "#efe9d2");
    }

    // manto
    add(-10, -35, 20, 27, mSombra);
    add(-10, -35, 4, 27, misturar(m, 0.5));
    add(6, -35, 4, 27, m);
    add(-11, -36, 22, 5, m);
    add(-11, -36, 22, 2, mLuz);

    // pernas e calçado
    add(-6, -9, 5, 9, tSombra);
    add(1, -9, 5, 9, misturar(t, 0.62));
    add(-7, -2, 6, 2, couro);
    add(1, -2, 6, 2, couro);

    // túnica
    add(-7, -32, 14, 11, t);
    add(-8, -21, 16, 8, t);
    add(-9, -13, 18, 5, tSombra);
    add(-7, -32, 2, 24, tLuz);
    add(5, -32, 2, 24, tSombra);
    add(-8, -22, 16, 2, misturar(m, 0.9)); // cinto
    add(-1, -20, 2, 7, tSombra); // dobra central

    // braços
    add(-10, -31, 3, 12, t);
    add(7, -31, 3, 12, t);
    add(-10, -20, 3, 3, pele);
    add(7, -20, 3, 3, pele);

    // pescoço e cabeça
    add(-2, -36, 4, 3, peleSombra);
    add(-5, -47, 10, 12, pele);
    add(-5, -47, 2, 12, misturar(pele, 1.1));
    add(3, -47, 2, 12, peleSombra);

    // rosto
    const olho = faccao === "trevas" ? "#e05a5a" : "#241a16";
    add(-3, -42, 2, 2, olho);
    add(1, -42, 2, 2, olho);
    add(-1, -39, 2, 1, peleSombra);

    // cabelo e barba conforme a classe
    if (classe === "guerreiro") {
      // elmo com crista
      add(-6, -50, 12, 6, misturar(m, 1.25));
      add(-6, -50, 12, 2, mLuz);
      add(-6, -45, 2, 6, misturar(m, 1.05));
      add(4, -45, 2, 6, mSombra);
      add(-1, -44, 2, 6, misturar(m, 1.05)); // protetor nasal
      add(-1, -54, 2, 5, misturar(t, 1.3)); // crista
      add(-2, -53, 4, 2, misturar(t, 1.1));
    } else if (classe === "vidente" || classe === "sacerdote") {
      // capuz ou turbante
      add(-7, -50, 14, 7, misturar(m, 1.05));
      add(-7, -50, 14, 2, mLuz);
      add(-7, -44, 3, 10, misturar(m, 0.9));
      add(4, -44, 3, 10, mSombra);
      add(-4, -44, 8, 2, misturar(cabelo, 1.0));
      if (classe === "vidente") add(-5, -43, 10, 2, "rgba(0,0,0,0.35)");
      // barba
      add(-4, -37, 8, 4, cabelo);
      add(-2, -34, 4, 2, misturar(cabelo, 0.85));
    } else if (classe === "arqueiro") {
      add(-6, -49, 12, 5, cabelo);
      add(-6, -46, 2, 7, cabelo);
      add(4, -46, 2, 7, misturar(cabelo, 0.8));
      add(-7, -48, 14, 2, misturar(m, 1.1)); // faixa
    } else {
      // arauto: cabelo solto com diadema
      add(-6, -49, 12, 5, cabelo);
      add(-7, -47, 3, 11, cabelo);
      add(4, -47, 3, 11, misturar(cabelo, 0.82));
      add(-6, -49, 12, 2, misturar(t, 1.35));
    }

    // coroa da realeza
    if (faccao === "realeza") {
      add(-6, -53, 12, 3, "#e8c45a");
      add(-6, -56, 2, 4, "#e8c45a");
      add(-1, -57, 2, 5, "#f5dd8a");
      add(4, -56, 2, 4, "#e8c45a");
    }

    return r;
  }

  // ----------------------------------------------------- montagem em cache
  function chaveSprite(arte, classe, faccao, e) {
    return [arte.tunica, arte.manto, arte.pele, arte.cabelo, classe, faccao, e.toFixed(2)].join("|");
  }

  function comporCorpo(arte, classe, faccao, e) {
    const chave = chaveSprite(arte, classe, faccao, e);
    if (cache[chave]) return cache[chave];

    const canvas = document.createElement("canvas");
    canvas.width = Math.ceil(LARGURA * e);
    canvas.height = Math.ceil(ALTURA * e);
    const ctx = canvas.getContext("2d");
    ctx.imageSmoothingEnabled = false;

    const ox = canvas.width / 2;
    const oy = canvas.height - Math.round(2 * e);
    const formas = formaHeroi(arte, classe, faccao);

    function pintar(deslocX, deslocY, corFixa) {
      formas.forEach(([x, y, w, h, cor]) => {
        ctx.fillStyle = corFixa || cor;
        ctx.fillRect(
          Math.round(ox + x * e + deslocX),
          Math.round(oy + y * e + deslocY),
          Math.max(1, Math.round(w * e)),
          Math.max(1, Math.round(h * e))
        );
      });
    }

    // contorno: a mesma silhueta em volta, na cor escura
    const passo = Math.max(1, Math.round(e));
    [[-passo, 0], [passo, 0], [0, -passo], [0, passo]].forEach(([dx, dy]) => pintar(dx, dy, CONTORNO));
    pintar(0, 0, null);

    // silhueta branca, usada no clarão de quando a unidade apanha
    const brilho = document.createElement("canvas");
    brilho.width = canvas.width;
    brilho.height = canvas.height;
    const ctxBrilho = brilho.getContext("2d");
    ctxBrilho.drawImage(canvas, 0, 0);
    ctxBrilho.globalCompositeOperation = "source-in";
    ctxBrilho.fillStyle = "#ffffff";
    ctxBrilho.fillRect(0, 0, brilho.width, brilho.height);

    cache[chave] = { canvas, brilho, ox, oy };
    return cache[chave];
  }

  // ------------------------------------------------------------- adereços
  // Desenhado à parte para poder girar junto com o golpe.
  function desenharSimbolo(ctx, simbolo, e, cores) {
    const madeira = "#6b4a2a";
    const metal = "#cfd6e0";
    const metalEscuro = "#8d95a3";
    const ouro = "#e8c45a";
    const px = (x, y, w, h, cor) => {
      ctx.fillStyle = cor;
      ctx.fillRect(Math.round(x * e), Math.round(y * e), Math.max(1, Math.round(w * e)), Math.max(1, Math.round(h * e)));
    };

    switch (simbolo) {
      case "cajado":
      case "manto":
        px(-1, -26, 2.5, 34, madeira);
        px(-1, -26, 1, 34, misturar(madeira, 1.3));
        px(-2.5, -30, 5.5, 4, ouro);
        px(-1.5, -29, 3.5, 2, "#fff0b8");
        break;
      case "espada":
        px(-1, -24, 2.5, 20, metal);
        px(-1, -24, 1, 20, "#f2f6ff");
        px(-3.5, -5, 7.5, 2, ouro);
        px(-1, -3, 2.5, 5, madeira);
        break;
      case "adaga":
        px(-1, -18, 2.5, 13, metal);
        px(-3, -5, 6.5, 2, metalEscuro);
        px(-1, -3, 2.5, 4, madeira);
        break;
      case "espada_flamejante":
        px(-1, -28, 2.5, 24, "#fff6d8");
        px(-2.5, -32, 5.5, 8, "#f0842a");
        px(-1.5, -34, 3.5, 6, "#ffd06a");
        px(-3.5, -5, 7.5, 2, ouro);
        px(-1, -3, 2.5, 5, "#6b3a1a");
        break;
      case "lanca":
      case "chifre":
        px(-1, -32, 2.5, 40, madeira);
        px(-2.5, -38, 5.5, 7, metal);
        px(-1.5, -37, 2, 5, "#f2f6ff");
        break;
      case "arco":
        ctx.strokeStyle = madeira;
        ctx.lineWidth = 2 * e;
        ctx.beginPath();
        ctx.arc(0, -13 * e, 12 * e, -Math.PI / 2.1, Math.PI / 2.1);
        ctx.stroke();
        ctx.strokeStyle = "#e8e0c8";
        ctx.lineWidth = Math.max(1, e * 0.8);
        ctx.beginPath();
        ctx.moveTo(1 * e, -25 * e);
        ctx.lineTo(1 * e, -1 * e);
        ctx.stroke();
        break;
      case "funda":
        ctx.strokeStyle = "#8a7a5a";
        ctx.lineWidth = Math.max(1, e * 0.9);
        ctx.beginPath();
        ctx.arc(0, -14 * e, 7 * e, 0.2, Math.PI - 0.2);
        ctx.stroke();
        px(-2, -9, 4, 3.5, "#7a7a7a");
        px(-1, -8, 2, 1.5, "#a0a0a0");
        break;
      case "escudo":
        px(-5, -15, 10, 15, metalEscuro);
        px(-5, -15, 10, 3, metal);
        px(-3, -12, 6, 9, cores.manto);
        px(-1, -10, 2, 5, ouro);
        px(-5, -3, 10, 3, metalEscuro);
        break;
      case "machado":
        px(-1, -28, 2.5, 34, madeira);
        px(-6, -30, 8, 9, metal);
        px(-6, -30, 8, 3, "#eef2f8");
        px(1, -28, 4, 6, metalEscuro);
        break;
      case "harpa":
        px(-4, -17, 2.5, 19, ouro);
        px(4, -13, 2.5, 15, ouro);
        px(-4, -18, 10, 2.5, misturar(ouro, 0.8));
        ctx.strokeStyle = "#fff3c0";
        ctx.lineWidth = Math.max(1, e * 0.5);
        for (let i = 0; i < 3; i++) {
          ctx.beginPath();
          ctx.moveTo((-2 + i * 2) * e, -16 * e);
          ctx.lineTo((-1 + i * 2.2) * e, 0);
          ctx.stroke();
        }
        break;
      case "trombeta":
        px(-2, -10, 12, 3.5, ouro);
        px(8, -13, 4, 9, misturar(ouro, 1.15));
        px(-2, -9, 10, 1.5, "#fff3c0");
        break;
      case "coroa":
        px(-5, -11, 11, 5, ouro);
        px(-5, -15, 2.5, 5, ouro);
        px(-1, -17, 2.5, 7, "#f5dd8a");
        px(3, -15, 2.5, 5, ouro);
        px(-5, -7, 11, 2, misturar(ouro, 0.7));
        break;
      case "chama":
      case "tocha":
      case "brasa":
        px(-1, -18, 2.5, 22, madeira);
        px(-3, -26, 6.5, 9, "#e0631f");
        px(-2, -29, 4.5, 6, "#f5a23a");
        px(-1, -31, 2.5, 4, "#ffe6a0");
        break;
      case "pergaminho":
        px(-5, -12, 11, 13, "#efe4c4");
        px(-5, -12, 11, 2, "#cdbf99");
        px(-6, -13, 2.5, 15, "#b9a87e");
        px(4, -13, 2.5, 15, "#b9a87e");
        px(-3, -8, 7, 1, "#8a7a5a");
        px(-3, -5, 7, 1, "#8a7a5a");
        break;
      case "jarro":
        px(-4, -12, 9, 12, "#b98a5a");
        px(-4, -12, 3, 12, "#d0a271");
        px(-2, -15, 5, 3.5, "#8a5f3a");
        px(4, -10, 2.5, 5, "#8a5f3a");
        break;
      case "serpente":
        px(-1, -20, 2.5, 26, madeira);
        px(-3, -18, 6.5, 3, "#3f7a3f");
        px(-2, -13, 6.5, 3, "#4f9a4f");
        px(-3, -8, 6.5, 3, "#3f7a3f");
        px(1, -23, 5.5, 4, "#57a857");
        px(5, -22, 1.8, 1.5, "#e0d060");
        break;
      case "peixe":
      case "agua":
        px(-4, -11, 10, 6.5, "#4f9ec0");
        px(-4, -11, 10, 2, "#7fc8e0");
        px(6, -14, 3.5, 10, "#35768f");
        px(-2, -9, 2, 2, "#0f2a38");
        break;
      case "olho":
        px(-1, -18, 2.5, 24, madeira);
        px(-5, -26, 11, 7.5, "#e8e0d0");
        px(-1, -25, 4, 5.5, "#3a2a6a");
        px(0, -24, 2, 3, "#0f0a20");
        px(-5, -27, 11, 1.5, "#9a8fb5");
        px(-6, -22, 13, 1.5, "rgba(180,160,255,0.5)");
        break;
      case "leao":
        px(-5, -14, 11, 12, "#8d95a3");
        px(-5, -14, 11, 3, "#cfd6e0");
        px(-4, -11, 9, 7, "#c8973a");
        px(-2, -9, 2, 2, "#2a1a10");
        px(1.5, -9, 2, 2, "#2a1a10");
        break;
      case "estrela":
        px(-1, -30, 3.5, 3.5, "#fff0b0");
        px(-4, -27.5, 9.5, 2, "#fff0b0");
        px(-1, -25, 3.5, 3.5, "#fff0b0");
        px(-2.5, -28.5, 6.5, 6.5, "rgba(255,240,176,0.35)");
        break;
      case "espiga":
        px(-1, -16, 2, 22, "#a8854a");
        px(-4, -20, 8, 7, "#e8c87a");
        px(-3, -19, 6, 2, "#fff0b8");
        break;
      case "roda":
        ctx.strokeStyle = madeira;
        ctx.lineWidth = 2 * e;
        ctx.beginPath();
        ctx.arc(0, -4 * e, 8.5 * e, 0, Math.PI * 2);
        ctx.stroke();
        ctx.lineWidth = Math.max(1, e * 0.7);
        ctx.beginPath();
        ctx.moveTo(-8.5 * e, -4 * e);
        ctx.lineTo(8.5 * e, -4 * e);
        ctx.moveTo(0, -12.5 * e);
        ctx.lineTo(0, 4.5 * e);
        ctx.stroke();
        break;
      case "coluna":
        px(0, -24, 10, 30, "#cfc6b0");
        px(0, -24, 3, 30, "#e6dfcc");
        px(-1.5, -26, 13, 3, "#b8ae98");
        px(-1.5, 4, 13, 3, "#b8ae98");
        break;
      case "relogio":
        px(-5, -13, 11, 13, "#cfd6e0");
        px(-4, -12, 9, 11, "#2a3040");
        px(0, -10, 1.5, 5, "#f0c05a");
        break;
      case "asas":
        px(-5, -18, 5, 15, "#f2eeda");
        px(-1, -20, 4.5, 18, "#fdfaf0");
        px(3, -17, 3.5, 12, "#ddd6bc");
        break;
      default:
        px(-1, -24, 2.5, 30, madeira);
        px(-2, -27, 4.5, 3.5, ouro);
    }
  }

  // --------------------------------------------------------------- herói
  // opcoes: espelhar, halo, aura, pose ("parado"|"ataque"|"atingido"|"morto"),
  // progresso (0..1 dentro da pose) e fase (para a respiração).
  A.desenharHeroi = function (ctx, arte, cx, chao, escala, opcoes) {
    opcoes = opcoes || {};
    const e = escala;
    const c = arte || { tunica: "#cccccc", manto: "#888888", pele: "#c98d5e", cabelo: "#332211", simbolo: "cajado" };
    const classe = opcoes.classe || "arauto";
    const faccao = opcoes.faccao || "";
    const pose = opcoes.pose || "parado";
    const p = opcoes.progresso || 0;
    const fase = opcoes.fase || 0;

    const externa = arteExterna(opcoes.id);
    const usarIlustracao = externa && Jogo.ArteExterna.temSprite(opcoes.id);
    const corpo = usarIlustracao ? null : comporCorpo(c, classe, faccao, e);

    // deslocamentos da pose
    let alturaVoo = Math.sin(fase) * 0.8 * e;
    let inclinacao = 0;
    let avanco = 0;
    let anguloArma = 0;
    let alfa = 1;

    if (pose === "ataque") {
      const arco = Math.sin(p * Math.PI);
      avanco = arco * 5 * e;
      anguloArma = -0.5 + arco * 1.5;
      alturaVoo -= arco * 2 * e;
    } else if (pose === "atingido") {
      avanco = -Math.sin(p * Math.PI) * 3 * e;
      inclinacao = -0.12 * Math.sin(p * Math.PI);
    } else if (pose === "morto") {
      inclinacao = 0.5;
      alfa = 0.35;
      alturaVoo = 2 * e;
    }

    const espelhar = opcoes.espelhar;
    const lado = espelhar ? -1 : 1;

    ctx.save();
    ctx.globalAlpha = alfa;

    // sombra no chão
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.beginPath();
    ctx.ellipse(cx, chao, 11 * e, 3.2 * e, 0, 0, Math.PI * 2);
    ctx.fill();

    if (opcoes.aura) {
      const g = ctx.createRadialGradient(cx, chao - 18 * e, 2 * e, cx, chao - 18 * e, 26 * e);
      g.addColorStop(0, opcoes.aura);
      g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.globalAlpha = alfa * (0.4 + Math.sin(fase * 0.7) * 0.08);
      ctx.fillStyle = g;
      ctx.fillRect(cx - 28 * e, chao - 46 * e, 56 * e, 50 * e);
      ctx.globalAlpha = alfa;
    }

    ctx.translate(cx + avanco * lado, chao + alturaVoo);
    ctx.scale(lado, 1);
    if (inclinacao) ctx.rotate(inclinacao);

    if (usarIlustracao) {
      const dev = escalaDispositivo(ctx);
      const alturaLogica = 56 * e;
      const sprite = Jogo.ArteExterna.sprite(opcoes.id, alturaLogica * dev);
      if (sprite) {
        const larguraLogica = sprite.largura / dev;
        ctx.drawImage(sprite.canvas, -larguraLogica / 2, -alturaLogica, larguraLogica, alturaLogica);
        if (opcoes.flash > 0.02) {
          ctx.globalAlpha = alfa * Math.min(1, opcoes.flash) * 0.7;
          ctx.drawImage(sprite.brilho, -larguraLogica / 2, -alturaLogica, larguraLogica, alturaLogica);
          ctx.globalAlpha = alfa;
        }
      }
    } else {
      ctx.drawImage(corpo.canvas, -corpo.ox, -corpo.oy);
      if (opcoes.flash > 0.02) {
        ctx.globalAlpha = alfa * Math.min(1, opcoes.flash) * 0.75;
        ctx.drawImage(corpo.brilho, -corpo.ox, -corpo.oy);
        ctx.globalAlpha = alfa;
      }

      // adereço principal, preso à mão da frente
      ctx.save();
      ctx.translate(9 * e, -19 * e);
      ctx.rotate(anguloArma);
      desenharSimbolo(ctx, c.simbolo, e, c);
      ctx.restore();
    }

    ctx.restore();

    if (opcoes.halo && !usarIlustracao) {
      ctx.save();
      ctx.globalAlpha = alfa * 0.9;
      ctx.strokeStyle = "#ffe9a0";
      ctx.lineWidth = Math.max(1, 1.4 * e);
      ctx.beginPath();
      ctx.ellipse(cx, chao - 56 * e + alturaVoo, 7.5 * e, 2.4 * e, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  };

  // ------------------------------------------------------------- retrato
  A.retrato = function (canvas, heroi, opcoes) {
    opcoes = opcoes || {};
    const F = Jogo.Formulas;
    const dpr = global.devicePixelRatio || 1;
    const lado = canvas.clientWidth || opcoes.tamanho || 64;
    canvas.width = Math.round(lado * dpr);
    canvas.height = Math.round(lado * dpr);
    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, lado, lado);

    const faccao = F.FACCOES[heroi.faccao] || { cor: "#888" };
    const raridade = F.RARIDADES[heroi.raridade] || { cor: "#888" };

    // fundo em degradê com um halo da facção
    const fundo = ctx.createLinearGradient(0, 0, 0, lado);
    fundo.addColorStop(0, misturar(faccao.cor, 0.42));
    fundo.addColorStop(0.65, "#191426");
    fundo.addColorStop(1, "#100d1a");
    ctx.fillStyle = fundo;
    ctx.fillRect(0, 0, lado, lado);

    const brilho = ctx.createRadialGradient(lado / 2, lado * 0.62, lado * 0.05, lado / 2, lado * 0.62, lado * 0.55);
    brilho.addColorStop(0, A.comAlfa(faccao.cor, 0.35));
    brilho.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = brilho;
    ctx.fillRect(0, 0, lado, lado);

    // raios sutis ao fundo
    ctx.save();
    ctx.globalAlpha = 0.12;
    ctx.fillStyle = faccao.cor;
    for (let i = 0; i < 6; i++) {
      ctx.beginPath();
      ctx.moveTo(lado / 2, lado * 0.62);
      const a = (i / 6) * Math.PI * 2 + 0.3;
      ctx.lineTo(lado / 2 + Math.cos(a) * lado, lado * 0.62 + Math.sin(a) * lado);
      ctx.lineTo(lado / 2 + Math.cos(a + 0.22) * lado, lado * 0.62 + Math.sin(a + 0.22) * lado);
      ctx.fill();
    }
    ctx.restore();

    const externa = arteExterna(heroi.id);
    if (externa) {
      const r = Jogo.ArteExterna.imagem(heroi.id);
      const lim = r.limites;
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      if (lim.recortada) {
        // figura recortada: encaixa inteira, com os pés perto da base
        const escala = Math.min((lado * 0.92) / lim.altura, (lado * 0.92) / lim.largura);
        const larg = lim.largura * escala;
        const alt = lim.altura * escala;
        ctx.drawImage(r.img, lim.x0, lim.y0, lim.largura, lim.altura, (lado - larg) / 2, lado * 0.96 - alt, larg, alt);
      } else {
        // ilustração de fundo fechado: preenche o cartão
        const escala = Math.max(lado / lim.largura, lado / lim.altura);
        const larg = lim.largura * escala;
        const alt = lim.altura * escala;
        ctx.drawImage(r.img, lim.x0, lim.y0, lim.largura, lim.altura, (lado - larg) / 2, (lado - alt) / 2, larg, alt);
      }
      ctx.imageSmoothingEnabled = false;
    } else {
      A.desenharHeroi(ctx, heroi.arte, lado / 2, lado * 0.95, lado / 62, {
        id: heroi.id,
        classe: heroi.classe,
        faccao: heroi.faccao,
        halo: heroi.faccao === "celestiais",
        aura: heroi.faccao === "trevas" ? "rgba(155,60,180,0.85)" : null,
      });
    }

    // moldura da raridade
    ctx.strokeStyle = A.comAlfa(raridade.cor, 0.8);
    ctx.lineWidth = Math.max(1, lado * 0.025);
    ctx.strokeRect(ctx.lineWidth / 2, ctx.lineWidth / 2, lado - ctx.lineWidth, lado - ctx.lineWidth);
    if (heroi.raridade === "lendario" || heroi.raridade === "epico") {
      ctx.strokeStyle = A.comAlfa(raridade.cor, 0.25);
      ctx.lineWidth = Math.max(1, lado * 0.06);
      ctx.strokeRect(ctx.lineWidth / 2, ctx.lineWidth / 2, lado - ctx.lineWidth, lado - ctx.lineWidth);
    }
  };

  A.LARGURA_SPRITE = LARGURA;
  A.ALTURA_SPRITE = ALTURA;
  Jogo.Arte = A;
})(typeof window !== "undefined" ? window : globalThis);
