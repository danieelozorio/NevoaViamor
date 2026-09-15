// Arte procedural: cada herói é montado com retângulos, ganha contorno e
// sombreamento, e é guardado em cache num canvas fora de tela. O adereço da
// classe fica solto para poder girar durante o golpe.
(function (global) {
  const Jogo = (global.Jogo = global.Jogo || {});
  const A = {};

  const LARGURA = 54;
  const ALTURA = 68;
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

  // Mistura duas cores; usada para tingir metal com a cor do manto do herói.
  function mesclar(corA, corB, peso) {
    const a = componentes(corA);
    const b = componentes(corB);
    const f = (i) => Math.round(a[i] + (b[i] - a[i]) * peso);
    return "rgb(" + f(0) + "," + f(1) + "," + f(2) + ")";
  }
  A.clarear = (cor, fator) => misturar(cor, fator);

  A.comAlfa = function (cor, alfa) {
    const [r, g, b] = componentes(cor);
    return "rgba(" + r + "," + g + "," + b + "," + alfa + ")";
  };

  // ------------------------------------------------------- forma do corpo
  // A figura é montada linha a linha: para cada altura calcula-se a largura,
  // é isso que faz ombro, capa e cabeça saírem arredondados em vez de quadrados.
  function pintor() {
    const lista = [];
    const add = (x, y, w, h, cor) => {
      if (w > 0.35 && h > 0) lista.push([x, y, w, h, cor]);
    };
    return { lista, add };
  }

  // Faixa vertical cuja meia-largura muda a cada linha.
  function faixa(add, yTopo, yBase, cor, meiaLargura, deslocX) {
    const altura = Math.round(yBase - yTopo);
    for (let i = 0; i < altura; i++) {
      const t = altura <= 1 ? 0 : i / (altura - 1);
      const w = meiaLargura(t, i);
      if (w < 0.35) continue;
      const dx = deslocX ? deslocX(t, i) : 0;
      add(dx - w, yTopo + i, w * 2, 1, cor);
    }
  }

  function elipse(add, cx, cy, rx, ry, cor, deY, ateY) {
    for (let y = -ry; y <= ry; y++) {
      if (deY != null && cy + y < deY) continue;
      if (ateY != null && cy + y > ateY) continue;
      const t = y / ry;
      const w = rx * Math.sqrt(Math.max(0, 1 - t * t));
      if (w < 0.35) continue;
      add(cx - w, cy + y, w * 2, 1, cor);
    }
  }

  // Lista de retângulos [x, y, largura, altura, cor], com os pés na origem.
  function formaHeroi(c, classe, faccao) {
    const t = c.tunica;
    const m = c.manto;
    const pele = c.pele;
    const cabelo = c.cabelo;

    const tSombra = misturar(t, 0.7);
    const tEscura = misturar(t, 0.55);
    const tLuz = misturar(t, 1.18);
    const mSombra = misturar(m, 0.62);
    const mLuz = misturar(m, 1.18);
    const peleSombra = misturar(pele, 0.78);
    const peleLuz = misturar(pele, 1.12);
    const cabeloLuz = misturar(cabelo, 1.3);
    const ouro = "#e8c45a";
    const ouroEscuro = "#a8832c";
    const ouroLuz = "#fff0b8";
    const couro = "#5a4028";
    const metalBase = "#c6cedb";
    const metal = mesclar(metalBase, m, 0.34);
    const metalSombra = misturar(metal, 0.62);
    const metalLuz = misturar(metal, 1.22);

    const guerreiro = classe === "guerreiro";
    const encapuzado = classe === "vidente" || (classe === "arqueiro" && faccao === "trevas");
    const realeza = faccao === "realeza";
    const celeste = faccao === "celestiais";

    const P = pintor();
    const add = P.add;

    const OMBRO = -40;
    const CINTURA = -26;
    const BARRA = guerreiro ? -12 : -6;
    const QUEIXO = -42;
    const TOPO_CABECA = -54;

    // ------------------------------------------------------------- asas
    if (celeste) {
      [-1, 1].forEach((lado) => {
        const claro = lado < 0 ? "#fdfaf0" : "#e6dfc8";
        const escuro = lado < 0 ? "#ded6bc" : "#c9c1a6";
        faixa(add, -46, -18, claro,
          (u) => 3.5 + Math.sin(u * Math.PI) * 4.5,
          (u) => lado * (11 + u * 5));
        faixa(add, -42, -22, escuro,
          (u) => 1.6 + Math.sin(u * Math.PI) * 2.2,
          (u) => lado * (13 + u * 5));
      });
    }

    // ------------------------------------------------------------- capa
    faixa(add, OMBRO - 1, BARRA + 3, m, (u) => 8.5 + u * u * 7);
    faixa(add, OMBRO - 1, BARRA + 3, mLuz, (u) => 2.4 + u * u * 2.4, (u) => -(6 + u * u * 4.6));
    faixa(add, OMBRO - 1, BARRA + 3, mSombra, (u) => 3 + u * u * 3.4, (u) => 5.4 + u * u * 4);
    faixa(add, BARRA + 1, BARRA + 4, misturar(m, 0.45), (u) => 15.4 - u * 3.4);
    if (realeza || celeste) {
      faixa(add, OMBRO - 1, BARRA + 2, ouroEscuro, () => 0.9, (u) => -(7.4 + u * u * 6.4));
      faixa(add, OMBRO - 1, BARRA + 2, ouroEscuro, () => 0.9, (u) => 7.4 + u * u * 6.4);
    }

    // gola da capa sobre os ombros
    faixa(add, OMBRO - 3, OMBRO + 4, m, (u) => 9.5 - Math.abs(u - 0.4) * 2.5);
    faixa(add, OMBRO - 3, OMBRO - 1, mLuz, () => 9.2);

    // ------------------------------------------------------- pernas e pés
    [-3.6, 3.6].forEach((x, i) => {
      faixa(add, BARRA - 1, -2, i ? tEscura : tSombra, () => 2.4, () => x);
      add(x - 3.2, -2.5, 6.4, 2.5, couro);
      add(x - 3.2, -2.5, 6.4, 1, misturar(couro, 1.35));
    });

    // ------------------------------------------------------------ túnica
    faixa(add, OMBRO, BARRA, t, (u) => 6.8 + u * (guerreiro ? 2.2 : 4.4));
    // sombra do lado direito e luz do lado esquerdo
    faixa(add, OMBRO, BARRA, tSombra, (u) => 2 + u * 1.2, (u) => 4.6 + u * (guerreiro ? 1.2 : 3));
    faixa(add, OMBRO, BARRA, tLuz, () => 0.9, (u) => -(6 + u * (guerreiro ? 2 : 3.8)));
    // dobras do tecido
    [-2.6, 1.4].forEach((x, i) => faixa(add, CINTURA + 2, BARRA - 1, tSombra, () => 0.55, () => x + i));
    // barra com fio de ouro
    faixa(add, BARRA - 2, BARRA, ouro, (u) => 6.8 + (1 + u * 0.1) * (guerreiro ? 2.2 : 4.4));

    // ------------------------------------------------------------- braços
    [-1, 1].forEach((lado) => {
      const corManga = lado < 0 ? t : tSombra;
      faixa(add, OMBRO - 1, -22, corManga,
        (u) => 2.2 + u * 1.6,
        (u) => lado * (7.6 + u * 1.8));
      // punho e mão
      const xm = lado * 9.8;
      add(xm - 2.2, -23, 4.4, 1.6, lado < 0 ? tLuz : tEscura);
      elipse(add, xm, -20.4, 2.2, 2.4, lado < 0 ? pele : peleSombra);
    });

    // ------------------------------------------------- peitoral e cinto
    if (guerreiro) {
      faixa(add, OMBRO - 1, CINTURA + 1, metal, (u) => 6.4 + Math.sin(u * 2.2) * 1.4);
      faixa(add, OMBRO - 1, CINTURA + 1, metalSombra, (u) => 1.8, (u) => 4.4 + u);
      faixa(add, OMBRO, CINTURA, metalLuz, () => 0.8, () => -5);
      faixa(add, OMBRO + 3, OMBRO + 5, ouro, (u) => 5.6 - u);
      // ombreiras
      [-1, 1].forEach((lado) => elipse(add, lado * 7.6, OMBRO + 1.5, 3.6, 3, lado < 0 ? metal : metalSombra));
      faixa(add, CINTURA - 1, CINTURA + 2, couro, () => 8.2);
      add(-1.6, CINTURA - 0.5, 3.2, 3, ouro);
    } else {
      faixa(add, CINTURA - 1, CINTURA + 2, misturar(m, 0.95), (u) => 7.6 + u * 0.6);
      faixa(add, CINTURA - 1, CINTURA, mLuz, () => 7.4);
      add(-1.8, CINTURA - 1, 3.6, 3.4, ouro);
      add(-1.1, CINTURA - 0.3, 2.2, 2, "#8f5ad8");
    }

    // estola do sacerdote / faixa do arauto
    if (classe === "sacerdote") {
      [-3.4, 3.4].forEach((x) => faixa(add, OMBRO + 2, BARRA - 2, misturar(m, 1.25), () => 1.3, () => x));
      [-3.4, 3.4].forEach((x) => faixa(add, BARRA - 4, BARRA - 2, ouro, () => 1.3, () => x));
    }
    if (classe === "arauto") {
      faixa(add, OMBRO + 1, CINTURA, misturar(m, 1.15), () => 1.6, (u) => -4.5 + u * 8);
    }

    // gola em V
    faixa(add, QUEIXO + 1, OMBRO + 4, peleSombra, (u) => 2.6 - u * 2.2);
    faixa(add, QUEIXO + 1, OMBRO + 5, ouro, () => 0.7, (u) => -(3.2 - u * 2.6));
    faixa(add, QUEIXO + 1, OMBRO + 5, ouro, () => 0.7, (u) => 3.2 - u * 2.6);

    // -------------------------------------------------------------- cabeça
    faixa(add, QUEIXO - 1, OMBRO + 1, peleSombra, () => 2.4);
    elipse(add, 0, -47.5, 5.9, 7, pele);
    elipse(add, -1.8, -49, 3.6, 4.4, peleLuz);
    add(-6.6, -48, 1.5, 2.6, peleSombra);
    add(5.1, -48, 1.5, 2.6, misturar(pele, 0.68));

    let olhosBrilhantes = false;

    if (encapuzado) {
      // capuz: cobre topo e laterais, deixando o rosto na penumbra
      elipse(add, 0, -49.5, 7.6, 8.4, m, null, -43);
      elipse(add, 0, -50.5, 7.6, 8, mLuz, null, -53);
      elipse(add, 0, -47.6, 4.8, 5.6, "rgba(12,8,20,0.62)", null, -43.5);
      faixa(add, -44, -39.5, m, (u) => 7.6 - u * 1.4);
      olhosBrilhantes = true;
    } else if (guerreiro) {
      // elmo: calota até a testa, com protetor nasal e guardas laterais
      elipse(add, 0, -51.5, 7.1, 5.8, metalSombra, null, -48.6);
      elipse(add, 0, -52, 6.6, 5.2, metal, null, -49.4);
      elipse(add, -2, -53, 3.4, 2.4, metalLuz, null, -51);
      faixa(add, -50.4, -49, misturar(m, 1.1), () => 7);
      faixa(add, -51, -43.5, metal, () => 1.5, () => -6.2);
      faixa(add, -51, -43.5, metalSombra, () => 1.5, () => 6.2);
      add(-1, -50, 2, 6.5, metalSombra);
      add(-1, -50, 0.9, 6.5, metal);
      // crista curta, na cor do manto
      faixa(add, -58, -51, m, (u) => 1.5 * Math.sin((u + 0.12) * 2.6));
      faixa(add, -58, -51, mLuz, () => 0.6, () => -0.6);
    } else {
      elipse(add, 0, -51, 6.3, 4.6, cabelo, null, -48.6);
      faixa(add, -53, -44.5, cabelo, () => 1.7, () => -5.8);
      faixa(add, -53, -44.5, misturar(cabelo, 0.78), () => 1.7, () => 5.8);
      elipse(add, -1.6, -53, 3.4, 2.2, cabeloLuz, null, -52);
    }

    // barba dos mais velhos
    const barbudo = classe === "vidente" || classe === "sacerdote" || (classe === "guerreiro" && faccao === "patriarcas");
    if (barbudo) {
      faixa(add, -44, -38.5, cabelo, (u) => 4.4 - u * 2.2);
      faixa(add, -44, -41, misturar(cabelo, 1.18), (u) => 4.2 - u * 1.4);
    }

    // ------------------------------------------- diadema, turbante, coroa
    if (realeza) {
      faixa(add, -56.5, -52.5, ouro, (u) => 6.6 + u * 0.8);
      faixa(add, -56.5, -55.5, ouroLuz, () => 6.8);
      [-4.8, 0, 4.8].forEach((x, i) => {
        const alturaPonta = i === 1 ? 4.6 : 3.2;
        faixa(add, -56.5 - alturaPonta, -56.5, ouro, (u) => 1.6 * (1 - u * 0.5), () => x);
        add(x - 1, -58 - alturaPonta * 0.55, 2, 2, "#8f5ad8");
      });
      add(-1.3, -55.2, 2.6, 2.2, "#8f5ad8");
      add(-0.8, -54.8, 1.3, 1.2, "#d9a8f5");
    } else if (!guerreiro) {
      if (classe === "sacerdote") {
        faixa(add, -56, -49.5, misturar(t, 1.32), (u) => 5.8 + Math.sin(u * Math.PI) * 1.5);
        faixa(add, -56, -54, misturar(t, 1.55), () => 5.6);
        add(-1.5, -53.5, 3, 2.4, ouro);
      } else if (classe === "arauto" || classe === "arqueiro") {
        faixa(add, -52.5, -50, misturar(m, 1.28), () => 6.4);
        add(-6.6, -52, 1.6, 4.2, misturar(m, 1.12));
      }
    }

    // ------------------------------------------------- olhos, sobrancelha, nariz
    const corOlho = olhosBrilhantes
      ? (faccao === "trevas" ? "#ff8a6a" : "#bfe0ff")
      : faccao === "trevas" ? "#e05a5a" : "#2a1d18";
    add(-3.3, -47.2, 2, 2, corOlho);
    add(1.3, -47.2, 2, 2, corOlho);
    if (olhosBrilhantes) {
      add(-3.6, -47.4, 2.6, 0.7, misturar(corOlho, 1.2));
      add(1, -47.4, 2.6, 0.7, misturar(corOlho, 1.2));
    } else {
      add(-3.6, -48.8, 2.6, 0.9, misturar(cabelo, 0.85));
      add(1, -48.8, 2.6, 0.9, misturar(cabelo, 0.85));
    }
    add(-0.6, -45.4, 1.2, 1.4, peleSombra);

    // auréola dos celestiais fica por conta da cena (desenhada por cima)
    return P.lista;
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

    // As bordas de cada retângulo são arredondadas junto com as do vizinho,
    // senão sobram frestas de um pixel entre as linhas em escalas quebradas.
    function pintar(deslocX, deslocY, corFixa) {
      formas.forEach(([x, y, w, h, cor]) => {
        const x0 = Math.round(ox + x * e) + deslocX;
        const y0 = Math.round(oy + y * e) + deslocY;
        const x1 = Math.round(ox + (x + w) * e) + deslocX;
        const y1 = Math.round(oy + (y + h) * e) + deslocY;
        ctx.fillStyle = corFixa || cor;
        ctx.fillRect(x0, y0, Math.max(1, x1 - x0), Math.max(1, y1 - y0));
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
  // Montados como o corpo — linha a linha — e desenhados à parte para poderem
  // girar junto com o golpe. A mão fica na origem (0, 0).
  function formaSimbolo(simbolo, cores) {
    const madeira = "#6b4a2a";
    const madeiraLuz = "#8f6a3f";
    const metal = "#c6cedb";
    const metalLuz = "#eef3fa";
    const metalSombra = "#7d879a";
    const ouro = "#e8c45a";
    const ouroLuz = "#fff0b8";
    const ouroSombra = "#a8832c";

    const P = pintor();
    const add = P.add;
    const el = (cx, cy, rx, ry, cor) => elipse(add, cx, cy, rx, ry, cor);
    const fx = (y0, y1, cor, meia, desl) => faixa(add, y0, y1, cor, meia, desl);
    const arco = (cx, cy, raio, de, ate, esp, cor) => {
      for (let a = de; a <= ate; a += 0.1) {
        add(cx + Math.cos(a) * raio - esp / 2, cy + Math.sin(a) * raio - esp / 2, esp, esp, cor);
      }
    };
    const haste = (yTopo, yBase) => {
      fx(yTopo, yBase, madeira, () => 1.3);
      fx(yTopo, yBase, madeiraLuz, () => 0.5, () => -0.7);
    };

    switch (simbolo) {
      case "cajado":
      case "manto":
        haste(-24, 8);
        arco(2.6, -24, 3.4, Math.PI, Math.PI * 1.95, 2.2, madeira);
        arco(2.6, -24, 3.4, Math.PI * 1.1, Math.PI * 1.5, 1.1, madeiraLuz);
        break;
      case "espada":
        fx(-26, -6, metal, (u) => 0.8 + u * 1.2);
        fx(-26, -6, metalLuz, () => 0.5, () => -0.6);
        fx(-6, -4, ouro, (u) => 4 - u * 0.6);
        fx(-4, 2, madeira, () => 1.1);
        el(0, 2.6, 1.6, 1.6, ouro);
        break;
      case "adaga":
        fx(-17, -5, metal, (u) => 0.7 + u * 1);
        fx(-17, -5, metalLuz, () => 0.4, () => -0.5);
        fx(-5, -3.6, ouroSombra, () => 2.6);
        fx(-3.6, 1, madeira, () => 1);
        break;
      case "espada_flamejante":
        fx(-28, -6, "#fff4d8", (u) => 0.9 + u * 1.3);
        el(0, -30, 2.6, 4.5, "#f0842a");
        el(0, -32, 1.6, 3, "#ffd98a");
        el(-1.4, -26, 1.6, 3.4, "#f5a23a");
        fx(-6, -4, ouro, (u) => 4.2 - u * 0.6);
        fx(-4, 2, "#5a3118", () => 1.1);
        break;
      case "lanca":
      case "chifre":
        haste(-30, 10);
        el(0, -32, 2.2, 5, metal);
        el(-0.7, -33, 1, 3.2, metalLuz);
        fx(-27, -25.5, ouro, () => 2);
        break;
      case "arco":
        arco(-3, -12, 12, -Math.PI / 2.2, Math.PI / 2.2, 2.4, madeira);
        arco(-3, -12, 12, -Math.PI / 2.6, Math.PI / 2.6, 1.1, madeiraLuz);
        fx(-24, 0, "#efe6cc", () => 0.45, () => 1.4);
        fx(-14, -12.6, metal, () => 3.5, () => -1);
        break;
      case "funda":
        arco(0, -12, 6.5, 0.15, Math.PI - 0.15, 1.2, "#9a865e");
        el(0, -5.5, 2.6, 2.2, "#8a8a8a");
        el(-0.6, -6, 1.2, 1, "#b4b4b4");
        break;
      case "escudo":
        fx(-17, 0, metalSombra, (u) => 5.4 * Math.sqrt(Math.max(0, 1 - u * u * 0.85)));
        fx(-17, -1, metal, (u) => 4.6 * Math.sqrt(Math.max(0, 1 - u * u * 0.85)), () => -0.4);
        fx(-15, -4, cores.manto, (u) => 2.8 - u * 1.2);
        el(0, -9, 1.7, 1.7, ouro);
        el(-0.5, -9.5, 0.8, 0.8, ouroLuz);
        break;
      case "machado":
        haste(-28, 10);
        fx(-30, -20, metal, (u) => 4.6 * Math.sin((u + 0.15) * 2.4), (u) => -3.4 - u * 0.6);
        fx(-30, -20, metalLuz, () => 0.7, (u) => -6.8 + u * 1.4);
        fx(-28, -23, metalSombra, () => 2, () => 3);
        break;
      case "harpa":
        fx(-20, 2, ouro, () => 1.2, () => -4.2);
        arco(-1.5, -12, 7.5, -Math.PI / 2, Math.PI / 2.4, 2.1, ouro);
        arco(-1.5, -12, 7.5, -Math.PI / 2.4, Math.PI / 3, 0.9, ouroLuz);
        for (let i = 0; i < 4; i++) fx(-17 + i * 1.6, 1, "#fff3c0", () => 0.35, () => -3 + i * 1.7);
        break;
      case "trombeta":
        fx(-11, -8, ouro, () => 5.5, (u) => -2 + u * 0.5);
        el(9, -9.5, 2.4, 4.6, ouro);
        el(8.4, -9.5, 1.5, 3.4, ouroLuz);
        fx(-10.6, -9.6, ouroLuz, () => 5.2, () => -2);
        break;
      case "coroa": // cetro: a coroa já está na cabeça
        fx(-20, 10, ouroSombra, () => 1.1);
        fx(-20, 10, ouro, () => 0.5, () => -0.6);
        el(0, -23, 3.2, 3.4, ouro);
        el(0, -23, 1.8, 2, "#8f5ad8");
        el(-0.6, -23.6, 0.8, 0.9, "#e0b8ff");
        fx(-26, -24.6, ouroLuz, (u) => 1.6 - u * 0.6);
        fx(-19, -17.6, ouroLuz, () => 2.2);
        el(0, 10.5, 1.6, 1.4, ouroSombra);
        break;
      case "chama":
      case "tocha":
      case "brasa":
        haste(-16, 10);
        el(0, -22, 3.4, 5, "#e0631f");
        el(0, -24, 2.2, 3.6, "#f5a23a");
        el(-0.4, -26, 1.2, 2.2, "#ffe6a0");
        el(2.4, -20, 1.4, 2.4, "#f0842a");
        break;
      case "pergaminho":
        fx(-13, 2, "#efe4c4", () => 4.6);
        fx(-13, 2, "#d8c9a0", () => 1, () => 3.6);
        el(-4.8, -13, 1.9, 1.9, "#c6b287");
        el(-4.8, 2, 1.9, 1.9, "#c6b287");
        el(4.8, -13, 1.9, 1.9, "#b9a87e");
        el(4.8, 2, 1.9, 1.9, "#b9a87e");
        for (let i = 0; i < 3; i++) fx(-9 + i * 3.4, -8.4 + i * 3.4, "#9a8a6a", () => 2.8 - i * 0.4);
        break;
      case "jarro":
        el(0, -6, 4.6, 5.4, "#b98a5a");
        el(-1.4, -7, 2.4, 3.4, "#d0a271");
        fx(-13, -9, "#a87a4a", (u) => 1.8 + u * 1.6);
        el(0, -13.4, 2.4, 1.2, "#8a5f3a");
        arco(4.6, -7, 3, -Math.PI / 2, Math.PI / 2, 1.5, "#a87a4a");
        break;
      case "serpente":
        haste(-22, 8);
        for (let i = 0; i < 4; i++) {
          const y = -19 + i * 4.2;
          fx(y, y + 2.4, i % 2 ? "#4f9a4f" : "#3f7a3f", () => 2.6, () => (i % 2 ? 1.6 : -1.6));
        }
        el(2.6, -24, 2.8, 2, "#57a857");
        add(3.6, -24.6, 1.2, 1, "#e0d060");
        break;
      case "peixe":
      case "agua":
        el(-0.6, -7, 5, 3.2, "#4f9ec0");
        el(-1.6, -8, 3, 1.6, "#7fc8e0");
        fx(-9, -5, "#35768f", (u) => 1 + u * 2.6, () => 6.4);
        add(-3.4, -7.6, 1.4, 1.4, "#0f2a38");
        break;
      case "olho":
        haste(-20, 8);
        el(0, -25, 5.2, 3.6, "#e8e0d0");
        el(0, -25, 2.4, 2.6, "#3a2a6a");
        el(0, -25, 1.1, 1.2, "#0f0a20");
        arco(0, -25, 5.6, Math.PI, Math.PI * 2, 1.1, "#b7a8dd");
        break;
      case "leao":
        fx(-15, 0, ouroSombra, (u) => 5 * Math.sqrt(Math.max(0, 1 - u * u * 0.8)));
        el(0, -8.5, 3.6, 3.6, "#c8973a");
        el(0, -8.5, 2.4, 2.4, "#e0b45a");
        add(-1.6, -9, 1.3, 1.3, "#2a1a10");
        add(0.4, -9, 1.3, 1.3, "#2a1a10");
        add(-0.6, -7, 1.3, 1, "#2a1a10");
        break;
      case "estrela":
        el(0, -26, 1.8, 1.8, ouroLuz);
        fx(-31, -21, "#fff0b0", (u) => 1.6 * (1 - Math.abs(u - 0.5) * 1.7));
        fx(-27.6, -24.4, "#fff0b0", () => 5 * 0.6, () => 0);
        arco(0, -26, 4.4, 0, Math.PI * 2, 1, "rgba(255,240,176,0.45)");
        break;
      case "espiga":
        fx(-18, 6, "#a8854a", () => 0.7);
        for (let i = 0; i < 4; i++) {
          const y = -20 + i * 3.2;
          el(-1.8, y, 1.6, 2, "#e8c87a");
          el(1.8, y + 1.4, 1.6, 2, "#d8b45a");
        }
        el(0, -22, 1.5, 2.4, "#fff0b8");
        break;
      case "roda":
        arco(0, -5, 8, 0, Math.PI * 2, 2.2, madeira);
        arco(0, -5, 8, Math.PI * 1.1, Math.PI * 1.9, 1, madeiraLuz);
        for (let i = 0; i < 4; i++) {
          const a = (i / 4) * Math.PI;
          fx(-5 - 8 * Math.sin(a), -5 + 8 * Math.sin(a), madeiraLuz, () => 0.55, (u) => Math.cos(a) * 8 * (1 - u * 2));
        }
        el(0, -5, 1.8, 1.8, madeira);
        break;
      case "coluna":
        fx(-26, 4, "#cfc6b0", (u) => 4.6 + Math.abs(u - 0.5) * 0.8, () => 4.5);
        fx(-26, 4, "#e6dfcc", () => 1, () => 1.2);
        fx(-26, 4, "#a89e88", () => 1.2, () => 8);
        fx(-29, -26, "#b8ae98", () => 6.4, () => 4.5);
        fx(4, 7, "#b8ae98", () => 6.4, () => 4.5);
        break;
      case "relogio":
        el(0, -7, 5, 5, "#cfd6e0");
        el(0, -7, 3.8, 3.8, "#2a3040");
        fx(-10, -7, ouro, () => 0.5, (u) => u * 1.6);
        add(-0.8, -7.8, 1.6, 1.6, ouro);
        break;
      case "asas":
        fx(-20, -2, "#fdfaf0", (u) => 1.6 + Math.sin(u * Math.PI) * 2.6, () => -3);
        fx(-18, -3, "#e4dcc4", (u) => 1.4 + Math.sin(u * Math.PI) * 2, () => 3.4);
        break;
      default:
        haste(-24, 8);
        el(0, -26, 2.4, 2.4, ouro);
    }
    return P.lista;
  }

  function desenharSimbolo(ctx, simbolo, e, cores) {
    const formas = formaSimbolo(simbolo, cores);
    const passo = Math.max(1, Math.round(e * 0.9));
    const pintar = (dx, dy, corFixa) => {
      formas.forEach(([x, y, w, h, cor]) => {
        const x0 = Math.round(x * e) + dx;
        const y0 = Math.round(y * e) + dy;
        const x1 = Math.round((x + w) * e) + dx;
        const y1 = Math.round((y + h) * e) + dy;
        ctx.fillStyle = corFixa || cor;
        ctx.fillRect(x0, y0, Math.max(1, x1 - x0), Math.max(1, y1 - y0));
      });
    };
    [[-passo, 0], [passo, 0], [0, -passo], [0, passo]].forEach(([dx, dy]) => pintar(dx, dy, CONTORNO));
    pintar(0, 0, null);
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
