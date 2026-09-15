// Cena de batalha: consome a lista de eventos da simulação e a anima no canvas.
// O cenário é montado uma vez por batalha num canvas fora de tela; por cima
// ficam as unidades, as partículas e a interface do combate.
(function (global) {
  const Jogo = (global.Jogo = global.Jogo || {});
  const A = Jogo.Arte;
  const F = Jogo.Formulas;
  const Ef = Jogo.Efeitos;

  const L = 480; // largura lógica
  const H = 280; // altura lógica mínima
  const ALTURA_MAXIMA = 500;
  const LARGURA_MAXIMA = 760;
  const HORIZONTE = 118;
  const ESCALA_UNIDADE = 1.25;
  const ALTO_SPRITE = Math.round(48 * ESCALA_UNIDADE);

  const C = { canvas: null, ctx: null, log: null, estado: null, animacao: null, velocidade: 1 };
  let fundoCache = { chave: null, canvas: null };
  let vinhetaCache = { chave: null, canvas: null };

  C.configurar = function (canvas, log) {
    C.canvas = canvas;
    C.ctx = canvas.getContext("2d");
    C.log = log;
    redimensionar();
    global.addEventListener("resize", () => {
      redimensionar();
      fundoCache.chave = null;
      vinhetaCache.chave = null;
    });
  };

  function redimensionar() {
    if (!C.canvas) return;
    const dpr = global.devicePixelRatio || 1;
    const painel = C.canvas.parentElement;
    const topo = painel.querySelector(".batalha-topo");
    const largura = Math.min(painel.clientWidth || L, LARGURA_MAXIMA);
    const proporcao = largura / L;
    const alturaLivre =
      (painel.clientHeight || 0) - (topo ? topo.offsetHeight : 0) - (C.log ? C.log.offsetHeight : 0) - 6;

    const alturaFinal = Math.round(
      Math.max(H * proporcao, Math.min(alturaLivre, ALTURA_MAXIMA * proporcao))
    );

    C.canvas.width = Math.round(largura * dpr);
    C.canvas.height = alturaFinal * dpr;
    C.canvas.style.width = largura + "px";
    C.canvas.style.height = alturaFinal + "px";
    C.escala = (largura * dpr) / L;
    C.alturaLogica = alturaFinal / proporcao;
  }

  // ------------------------------------------------------------- cenário
  function tri(ctx, x1, y1, x2, y2, x3, y3, cor) {
    ctx.fillStyle = cor;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.lineTo(x3, y3);
    ctx.closePath();
    ctx.fill();
  }

  const CENARIOS = {
    arvores(ctx, cor, luz) {
      for (let i = 0; i < 10; i++) {
        const x = 8 + i * 50 + (i % 2) * 14;
        const alt = 30 + ((i * 17) % 20);
        ctx.fillStyle = A.escurecer(cor, 0.4);
        ctx.fillRect(x - 2, HORIZONTE - alt + 12, 4, alt - 10);
        ctx.beginPath();
        ctx.ellipse(x, HORIZONTE - alt + 8, 14, 11, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = A.comAlfa(luz, 0.18);
        ctx.beginPath();
        ctx.ellipse(x - 4, HORIZONTE - alt + 4, 7, 5, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    },
    piramides(ctx, cor, luz) {
      [[70, 62], [180, 92], [320, 54], [420, 74]].forEach(([x, h]) => {
        tri(ctx, x - h * 0.9, HORIZONTE, x, HORIZONTE - h, x + h * 0.9, HORIZONTE, A.escurecer(cor, 0.55));
        tri(ctx, x, HORIZONTE - h, x + h * 0.9, HORIZONTE, x, HORIZONTE, A.escurecer(cor, 0.38));
        ctx.fillStyle = A.comAlfa(luz, 0.25);
        ctx.fillRect(x - 1, HORIZONTE - h, 2, h);
      });
    },
    dunas(ctx, cor, luz) {
      for (let i = 0; i < 4; i++) {
        ctx.fillStyle = A.escurecer(cor, 0.5 + i * 0.12);
        ctx.beginPath();
        ctx.moveTo(-20 + i * 30, HORIZONTE);
        ctx.quadraticCurveTo(120 + i * 90, HORIZONTE - 46 + i * 9, 300 + i * 120, HORIZONTE);
        ctx.lineTo(520, HORIZONTE);
        ctx.lineTo(-20, HORIZONTE);
        ctx.fill();
      }
      ctx.fillStyle = A.comAlfa(luz, 0.2);
      ctx.fillRect(0, HORIZONTE - 2, L, 2);
    },
    muralhas(ctx, cor, luz) {
      const base = HORIZONTE - 54;
      ctx.fillStyle = A.escurecer(cor, 0.5);
      ctx.fillRect(0, base + 14, L, 54);
      for (let x = 0; x < L; x += 22) ctx.fillRect(x, base + 4, 14, 12);
      [60, 250, 420].forEach((x) => {
        ctx.fillStyle = A.escurecer(cor, 0.62);
        ctx.fillRect(x - 18, base - 16, 36, 70);
        for (let i = 0; i < 3; i++) ctx.fillRect(x - 18 + i * 14, base - 24, 9, 10);
        ctx.fillStyle = "rgba(0,0,0,0.45)";
        ctx.fillRect(x - 6, base + 4, 12, 18);
      });
      ctx.fillStyle = A.comAlfa(luz, 0.16);
      ctx.fillRect(0, base + 14, L, 3);
    },
    tendas(ctx, cor, luz) {
      for (let i = 0; i < 8; i++) {
        const x = 20 + i * 62;
        const h = 26 + ((i * 11) % 14);
        tri(ctx, x - h * 0.8, HORIZONTE, x, HORIZONTE - h, x + h * 0.8, HORIZONTE, A.escurecer(cor, 0.48));
        ctx.fillStyle = A.comAlfa(luz, 0.2);
        ctx.fillRect(x - 1, HORIZONTE - h - 6, 2, 8);
        ctx.fillStyle = "rgba(0,0,0,0.5)";
        ctx.fillRect(x - 4, HORIZONTE - 12, 8, 12);
      }
    },
    cidade(ctx, cor, luz) {
      for (let i = 0; i < 14; i++) {
        const x = i * 36;
        const h = 24 + ((i * 29) % 46);
        ctx.fillStyle = A.escurecer(cor, 0.42 + (i % 3) * 0.08);
        ctx.fillRect(x, HORIZONTE - h, 30, h);
        ctx.fillStyle = A.comAlfa(luz, 0.35);
        for (let j = 0; j < 3; j++) ctx.fillRect(x + 6 + j * 8, HORIZONTE - h + 8 + (j % 2) * 10, 3, 4);
      }
      ctx.fillStyle = A.escurecer(cor, 0.6);
      ctx.fillRect(228, HORIZONTE - 86, 34, 86);
      tri(ctx, 224, HORIZONTE - 86, 245, HORIZONTE - 108, 266, HORIZONTE - 86, A.comAlfa(luz, 0.5));
    },
    altar(ctx, cor, luz) {
      ctx.fillStyle = A.escurecer(cor, 0.45);
      ctx.beginPath();
      ctx.moveTo(-20, HORIZONTE);
      ctx.quadraticCurveTo(240, HORIZONTE - 74, 500, HORIZONTE);
      ctx.fill();
      ctx.fillStyle = A.escurecer(cor, 0.7);
      ctx.fillRect(218, HORIZONTE - 62, 44, 24);
      ctx.fillRect(210, HORIZONTE - 40, 60, 8);
      const fogo = ctx.createLinearGradient(240, HORIZONTE - 62, 240, HORIZONTE - 106);
      fogo.addColorStop(0, "#ffd98a");
      fogo.addColorStop(0.5, "#f0842a");
      fogo.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = fogo;
      ctx.fillRect(226, HORIZONTE - 106, 28, 44);
      ctx.fillStyle = A.comAlfa(luz, 0.18);
      ctx.fillRect(0, HORIZONTE - 2, L, 2);
    },
    zigurate(ctx, cor, luz) {
      const niveis = 5;
      for (let i = 0; i < niveis; i++) {
        const larg = 180 - i * 30;
        ctx.fillStyle = A.escurecer(cor, 0.45 + i * 0.07);
        ctx.fillRect(240 - larg / 2, HORIZONTE - 16 - i * 15, larg, 16);
        ctx.fillStyle = A.comAlfa(luz, 0.12);
        ctx.fillRect(240 - larg / 2, HORIZONTE - 16 - i * 15, larg, 2);
      }
      ctx.fillStyle = A.comAlfa(luz, 0.3);
      ctx.fillRect(232, HORIZONTE - 100, 16, 14);
      [70, 400].forEach((x) => {
        ctx.fillStyle = A.escurecer(cor, 0.55);
        ctx.fillRect(x - 10, HORIZONTE - 52, 20, 52);
      });
    },
    abismo(ctx, cor, luz) {
      for (let i = 0; i < 9; i++) {
        const x = i * 58 - 10;
        const h = 40 + ((i * 23) % 44);
        tri(ctx, x, HORIZONTE, x + 26, HORIZONTE - h, x + 52, HORIZONTE, A.escurecer(cor, 0.4 + (i % 2) * 0.12));
      }
      for (let i = 0; i < 3; i++) {
        ctx.fillStyle = A.comAlfa(luz, 0.08);
        ctx.fillRect(0, HORIZONTE - 30 + i * 12, L, 6);
      }
    },
    chamas(ctx, cor, luz) {
      const brilho = ctx.createLinearGradient(0, HORIZONTE - 70, 0, HORIZONTE);
      brilho.addColorStop(0, "rgba(0,0,0,0)");
      brilho.addColorStop(1, A.comAlfa(luz, 0.5));
      ctx.fillStyle = brilho;
      ctx.fillRect(0, HORIZONTE - 70, L, 70);
      for (let i = 0; i < 16; i++) {
        const x = i * 31;
        const h = 18 + ((i * 19) % 26);
        tri(ctx, x, HORIZONTE, x + 10, HORIZONTE - h, x + 20, HORIZONTE, A.comAlfa("#f0842a", 0.5));
        tri(ctx, x + 4, HORIZONTE, x + 10, HORIZONTE - h * 0.6, x + 16, HORIZONTE, A.comAlfa("#ffd98a", 0.45));
      }
      ctx.fillStyle = A.escurecer(cor, 0.35);
      ctx.fillRect(0, HORIZONTE, L, 6);
    },
    torre(ctx, cor, luz) {
      ctx.fillStyle = A.escurecer(cor, 0.5);
      ctx.fillRect(200, HORIZONTE - 108, 80, 108);
      for (let i = 0; i < 5; i++) ctx.fillRect(196 + i * 18, HORIZONTE - 116, 12, 10);
      ctx.fillStyle = A.comAlfa(luz, 0.28);
      for (let i = 0; i < 4; i++) ctx.fillRect(214 + (i % 2) * 34, HORIZONTE - 96 + i * 22, 10, 14);
      ctx.fillStyle = A.escurecer(cor, 0.62);
      ctx.fillRect(120, HORIZONTE - 46, 50, 46);
      ctx.fillRect(320, HORIZONTE - 58, 46, 58);
    },
  };

  function montarFundo(cenario, HL) {
    const chave = [cenario.props, cenario.ceu[0], cenario.ceu[1], cenario.chao, C.canvas.width, C.canvas.height].join("|");
    if (fundoCache.chave === chave) return fundoCache.canvas;

    const canvas = document.createElement("canvas");
    canvas.width = C.canvas.width;
    canvas.height = C.canvas.height;
    const ctx = canvas.getContext("2d");
    ctx.setTransform(C.escala, 0, 0, C.escala, 0, 0);
    ctx.imageSmoothingEnabled = false;

    const luz = cenario.ceu[1];

    // céu
    const ceu = ctx.createLinearGradient(0, 0, 0, HORIZONTE + 20);
    ceu.addColorStop(0, cenario.ceu[0]);
    ceu.addColorStop(1, cenario.ceu[1]);
    ctx.fillStyle = ceu;
    ctx.fillRect(0, 0, L, HORIZONTE + 20);

    // astro e estrelas
    ctx.fillStyle = A.comAlfa(luz, 0.5);
    ctx.beginPath();
    ctx.arc(392, 40, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.75)";
    ctx.beginPath();
    ctx.arc(392, 40, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.35)";
    for (let i = 0; i < 26; i++) {
      const x = (i * 97) % L;
      const y = ((i * 53) % 84) + 4;
      ctx.fillRect(x, y, i % 4 === 0 ? 2 : 1, i % 4 === 0 ? 2 : 1);
    }

    // nuvens finas
    ctx.fillStyle = "rgba(255,255,255,0.06)";
    for (let i = 0; i < 5; i++) {
      const x = (i * 121) % L;
      const y = 26 + ((i * 37) % 44);
      ctx.fillRect(x, y, 70 + (i % 3) * 30, 4);
      ctx.fillRect(x + 16, y - 4, 40, 4);
    }

    // serras ao longe: quanto mais distante, mais perto da cor do céu
    for (let i = 0; i < 8; i++) {
      const x = i * 70 - 30;
      const h = 30 + ((i * 41) % 26);
      tri(ctx, x, HORIZONTE, x + 45, HORIZONTE - h, x + 90, HORIZONTE, A.escurecer(luz, 0.62));
    }
    ctx.fillStyle = A.comAlfa(luz, 0.25);
    ctx.fillRect(0, HORIZONTE - 22, L, 22);
    for (let i = 0; i < 6; i++) {
      const x = i * 96 - 10;
      const h = 44 + ((i * 53) % 30);
      tri(ctx, x, HORIZONTE, x + 55, HORIZONTE - h, x + 110, HORIZONTE, A.escurecer(luz, 0.42));
    }
    ctx.fillStyle = A.comAlfa(luz, 0.16);
    ctx.fillRect(0, HORIZONTE - 10, L, 10);

    // elemento do capítulo
    const props = CENARIOS[cenario.props];
    if (props) props(ctx, cenario.chao, luz);

    // chão
    const chao = ctx.createLinearGradient(0, HORIZONTE, 0, HL);
    chao.addColorStop(0, A.escurecer(cenario.chao, 1.2));
    chao.addColorStop(0.35, cenario.chao);
    chao.addColorStop(1, A.escurecer(cenario.chao, 0.55));
    ctx.fillStyle = chao;
    ctx.fillRect(0, HORIZONTE, L, HL - HORIZONTE + 4);
    ctx.fillStyle = "rgba(0,0,0,0.25)";
    ctx.fillRect(0, HORIZONTE, L, 3);

    // caminho central e detalhes do solo
    ctx.fillStyle = "rgba(255,255,255,0.03)";
    ctx.beginPath();
    ctx.moveTo(L / 2 - 30, HORIZONTE);
    ctx.lineTo(L / 2 + 30, HORIZONTE);
    ctx.lineTo(L / 2 + 120, HL);
    ctx.lineTo(L / 2 - 120, HL);
    ctx.fill();

    for (let i = 0; i < 40; i++) {
      const x = (i * 131) % (L + 20) - 10;
      const y = HORIZONTE + 8 + ((i * 71) % Math.max(20, HL - HORIZONTE - 14));
      const escuro = i % 3 === 0;
      ctx.fillStyle = escuro ? "rgba(0,0,0,0.18)" : "rgba(255,255,255,0.05)";
      ctx.fillRect(x, y, escuro ? 5 : 3, 2);
      if (i % 5 === 0) {
        ctx.fillStyle = A.escurecer(cenario.chao, 0.7);
        ctx.fillRect(x, y - 3, 2, 4);
        ctx.fillRect(x + 3, y - 2, 2, 3);
      }
    }

    fundoCache = { chave, canvas };
    return canvas;
  }

  function montarVinheta() {
    const chave = C.canvas.width + "x" + C.canvas.height;
    if (vinhetaCache.chave === chave) return vinhetaCache.canvas;
    const canvas = document.createElement("canvas");
    canvas.width = C.canvas.width;
    canvas.height = C.canvas.height;
    const ctx = canvas.getContext("2d");
    const g = ctx.createRadialGradient(
      canvas.width / 2, canvas.height / 2, canvas.height * 0.3,
      canvas.width / 2, canvas.height / 2, canvas.height * 0.95
    );
    g.addColorStop(0, "rgba(0,0,0,0)");
    g.addColorStop(1, "rgba(6,4,12,0.55)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    vinhetaCache = { chave, canvas };
    return canvas;
  }

  // ---------------------------------------------------------- preparação
  function posicoes(unidades, lado, alturaLogica) {
    const meus = unidades.filter((u) => u.lado === lado);
    const frente = meus.filter((u) => u.linha === "frente");
    const tras = meus.filter((u) => u.linha === "tras");
    const mapa = {};
    const sinal = lado === "aliados" ? -1 : 1;
    const centro = L / 2;
    const chaoTopo = HORIZONTE + 34;
    const chaoBase = alturaLogica - 16;
    const meio = (chaoTopo + chaoBase) / 2;

    function distribuir(lista, x) {
      const total = lista.length;
      const espaco = Math.min(62, Math.max(30, (chaoBase - chaoTopo) / (total + 0.6)));
      const inicio = meio - ((total - 1) * espaco) / 2 + 14;
      lista.forEach((u, i) => {
        mapa[u.uid] = { x: x + sinal * (i % 2 ? 22 : 0), y: inicio + i * espaco };
      });
    }
    distribuir(frente, centro + sinal * 62);
    distribuir(tras, centro + sinal * 146);
    return mapa;
  }

  function construirLinha(eventos) {
    const duracoes = {
      turno: 40, acao: 340, dano: 110, cura: 90, escudo: 80, status: 60,
      energia: 0, passiva: 240, morte: 240, reviver: 320, atordoado: 240, fim: 400,
    };
    let t = 0;
    const linha = eventos.map((e) => {
      const item = { tempo: t, evento: e };
      t += e.t === "acao" && e.estilo === "ult" ? 820 : duracoes[e.t] || 60;
      return item;
    });
    return { linha, duracao: t + 600 };
  }

  // -------------------------------------------------------------- execução
  C.iniciar = function (config) {
    cancelar();
    redimensionar();
    const resultado = config.resultado;
    const alturaLogica = C.alturaLogica || H;
    const mapaAliados = posicoes(resultado.unidades, "aliados", alturaLogica);
    const mapaInimigos = posicoes(resultado.unidades, "inimigos", alturaLogica);

    const unidades = {};
    resultado.unidades.forEach((u) => {
      const pos = (u.lado === "aliados" ? mapaAliados : mapaInimigos)[u.uid];
      unidades[u.uid] = {
        dados: u,
        x: pos.x,
        y: pos.y,
        vida: u.vidaMax,
        vidaExibida: u.vidaMax,
        vidaMax: u.vidaMax,
        energia: 0,
        escudo: 0,
        morto: false,
        flash: 0,
        pose: "parado",
        poseInicio: -9999,
        poseDuracao: 0,
        fase: Math.random() * Math.PI * 2,
        popups: [],
        etiqueta: null,
      };
    });

    const { linha, duracao } = construirLinha(resultado.eventos);
    C.estado = {
      resultado,
      unidades,
      linha,
      duracao,
      indice: 0,
      relogio: 0,
      ultimoFrame: performance.now(),
      cenario: config.cenario || { ceu: ["#1b2a3a", "#3a5a6a"], chao: "#2c3f2c", props: "arvores" },
      efeitos: Ef.criar(),
      banner: null,
      brilho: 0,
      corBrilho: "#ffe9a0",
      tremor: 0,
      ativo: null,
      aoTerminar: config.aoTerminar || function () {},
      terminado: false,
    };
    if (C.log) C.log.innerHTML = "";
    quadro();
  };

  function cancelar() {
    if (C.animacao) cancelAnimationFrame(C.animacao);
    C.animacao = null;
  }

  C.definirVelocidade = function (v) {
    C.velocidade = v;
  };

  C.pular = function () {
    const e = C.estado;
    if (!e || e.terminado) return;
    while (e.indice < e.linha.length) aplicar(e.linha[e.indice++].evento, true);
    finalizar();
  };

  C.encerrar = function () {
    cancelar();
    C.estado = null;
  };

  function finalizar() {
    const e = C.estado;
    if (!e || e.terminado) return;
    e.terminado = true;
    cancelar();
    e.aoTerminar(e.resultado);
  }

  function escreverLog(texto, classe) {
    if (!C.log) return;
    const div = document.createElement("div");
    div.className = "linha-log " + (classe || "");
    div.textContent = texto;
    C.log.appendChild(div);
    while (C.log.childElementCount > 40) C.log.removeChild(C.log.firstChild);
    C.log.scrollTop = C.log.scrollHeight;
  }

  function popup(u, texto, cor) {
    u.popups.push({ texto, cor, nascimento: C.estado.relogio, dx: (Math.random() - 0.5) * 18 });
  }

  function definirPose(u, pose, duracao) {
    if (u.morto) return;
    u.pose = pose;
    u.poseInicio = C.estado.relogio;
    u.poseDuracao = duracao;
  }

  const vivos = (lado) =>
    Object.values(C.estado.unidades).filter((u) => u.dados.lado === lado && !u.morto);

  // ------------------------------------------------- efeitos das supremas
  function efeitoDeUlt(ator) {
    const e = C.estado;
    const definicao = Jogo.inimigoPorId ? Jogo.inimigoPorId(ator.dados.id) : null;
    const cls = Ef.classificar(definicao);
    const cores = cls.cores;
    e.corBrilho = cores.cor;
    e.brilho = 1;
    e.tremor = 8;

    const ladoAlvo =
      cls.alvo === "aliados" ? ator.dados.lado : ator.dados.lado === "aliados" ? "inimigos" : "aliados";
    const alvos = vivos(ladoAlvo);
    const direcao = ator.dados.lado === "aliados" ? 1 : -1;

    alvos.forEach((alvo) => {
      const x = alvo.x;
      const y = alvo.y;
      switch (cls.elemento) {
        case "fogo":
          Ef.forma(e.efeitos, "coluna", x, y, { cor: cores.cor, cor2: cores.cor2, raio: 22, altura: 70, duracao: 560 });
          Ef.emitir(e.efeitos, "brasa", x, y - 10, { cor: cores.cor, cor2: cores.cor2, quantidade: 12, velocidade: 0.05 });
          break;
        case "agua":
          Ef.forma(e.efeitos, "onda", x - 60 * direcao, y, { cor: cores.cor, cor2: cores.cor2, largura: 120, altura: 54, direcao, duracao: 620 });
          Ef.emitir(e.efeitos, "gota", x, y - 16, { cor: cores.cor, cor2: cores.cor2, quantidade: 10, velocidade: 0.07 });
          break;
        case "luz":
          Ef.forma(e.efeitos, "raio", x, y, { cor: cores.cor, cor2: cores.cor2, altura: y - 8, duracao: 420 });
          Ef.emitir(e.efeitos, "luz", x, y - 18, { cor: cores.cor, cor2: cores.cor2, quantidade: 10 });
          break;
        case "raio":
          Ef.forma(e.efeitos, "raio", x, y, { cor: cores.cor, cor2: cores.cor2, altura: y - 8, duracao: 380 });
          Ef.emitir(e.efeitos, "faisca", x, y - 12, { cor: cores.cor, cor2: cores.cor2, quantidade: 12, velocidade: 0.09 });
          break;
        case "sombra":
        case "veneno":
          Ef.forma(e.efeitos, "anel", x, y, { cor: cores.cor, raio: 30, duracao: 560 });
          Ef.emitir(e.efeitos, "sombra", x, y - 14, { cor: cores.cor, cor2: cores.cor2, quantidade: 12, velocidade: 0.03 });
          break;
        case "corte":
          Ef.forma(e.efeitos, "corte", x, y - 22, { cor: cores.cor, cor2: cores.cor2, raio: 26, duracao: 360 });
          Ef.emitir(e.efeitos, "faisca", x, y - 20, { cor: cores.cor, cor2: cores.cor2, quantidade: 10, velocidade: 0.08 });
          break;
        case "pedra":
          Ef.emitir(e.efeitos, "faisca", x, y - 18, { cor: cores.cor, cor2: cores.cor2, quantidade: 12, velocidade: 0.1 });
          Ef.forma(e.efeitos, "anel", x, y, { cor: cores.cor, raio: 22, duracao: 340 });
          break;
        case "cura":
          Ef.emitir(e.efeitos, "cura", x, y - 14, { cor: cores.cor, cor2: cores.cor2, quantidade: 10, tamanho: 3 });
          Ef.forma(e.efeitos, "anel", x, y, { cor: cores.cor, raio: 24, duracao: 500 });
          break;
        case "escudo":
          Ef.forma(e.efeitos, "domo", x, y, { cor: cores.cor, raio: 26, duracao: 620 });
          break;
        default:
          Ef.forma(e.efeitos, "estrela", x, y - 22, { cor: cores.cor, raio: 24, duracao: 560 });
          Ef.emitir(e.efeitos, "luz", x, y - 16, { cor: cores.cor, cor2: cores.cor2, quantidade: 8 });
      }
    });

    if (cls.alvo !== "aliados") {
      Ef.forma(e.efeitos, "anel", ator.x, ator.y, { cor: cores.cor, raio: 26, duracao: 420 });
    }
    Ef.emitir(e.efeitos, "luz", ator.x, ator.y - 24, { cor: cores.cor, cor2: cores.cor2, quantidade: 8 });
  }

  // ---------------------------------------------------------- eventos
  function aplicar(evento, silencioso) {
    const e = C.estado;
    const u = evento.uid ? e.unidades[evento.uid] : null;

    switch (evento.t) {
      case "turno":
        e.ativo = evento.uid;
        break;
      case "acao": {
        const ator = e.unidades[evento.uid];
        if (!ator) break;
        definirPose(ator, "ataque", evento.estilo === "ult" ? 620 : 330);
        Ef.emitir(e.efeitos, "poeira", ator.x, ator.y, { quantidade: 4, velocidade: 0.03, espalhar: 8 });
        if (evento.estilo === "ult") {
          e.banner = { texto: ator.dados.nome, sub: evento.nome, ate: e.relogio + 950, lado: ator.dados.lado };
          efeitoDeUlt(ator);
          if (!silencioso)
            escreverLog("✦ " + ator.dados.nome + " invoca " + evento.nome + "!",
              ator.dados.lado === "aliados" ? "log-aliado" : "log-inimigo");
        }
        break;
      }
      case "dano": {
        if (!u) break;
        u.vida = evento.vida != null ? evento.vida : Math.max(0, u.vida - evento.valor);
        u.flash = 1;
        if (!u.morto && !evento.dot) definirPose(u, "atingido", 240);
        if (evento.imune) {
          popup(u, "imune", "#8ad8f0");
        } else {
          popup(u, "-" + Jogo.Util.numero(evento.valor) + (evento.critico ? "!" : ""),
            evento.critico ? "#ffd05a" : "#ff7a6a");
          Ef.emitir(e.efeitos, evento.dot ? "sombra" : "faisca", u.x, u.y - 22, {
            cor: evento.dot === "queimadura" ? "#f0842a" : evento.dot === "veneno" ? "#6fbf6f" : evento.critico ? "#ffd05a" : "#ffb0a0",
            cor2: "#fff0d0",
            quantidade: evento.critico ? 10 : 6,
            velocidade: evento.critico ? 0.09 : 0.06,
          });
        }
        if (evento.critico) {
          e.tremor = Math.max(e.tremor, 5);
          const de = evento.de ? e.unidades[evento.de] : null;
          if (!silencioso && de)
            escreverLog("✷ " + de.dados.nome + " acerta um crítico em " + u.dados.nome + " (−" + Jogo.Util.numero(evento.valor) + ")",
              de.dados.lado === "aliados" ? "log-aliado" : "log-inimigo");
        }
        break;
      }
      case "cura":
        if (!u) break;
        u.vida = evento.vida != null ? evento.vida : u.vida + evento.valor;
        popup(u, "+" + Jogo.Util.numero(evento.valor), "#7fe0a0");
        Ef.emitir(e.efeitos, "cura", u.x, u.y - 16, { cor: "#7fe0a0", cor2: "#e8fff0", quantidade: 6, tamanho: 3 });
        break;
      case "escudo":
        if (!u) break;
        u.escudo += evento.valor;
        popup(u, "escudo", "#9ad0ff");
        Ef.forma(e.efeitos, "domo", u.x, u.y, { cor: "#9ad0ff", raio: 24, duracao: 520 });
        break;
      case "energia":
        if (!u) break;
        u.energia = evento.energia;
        break;
      case "status":
        if (!u) break;
        u.etiqueta = { texto: evento.nome, ate: e.relogio + 900, estilo: evento.estilo };
        break;
      case "passiva":
        if (!u) break;
        u.etiqueta = { texto: evento.nome, ate: e.relogio + 900, estilo: "passiva" };
        Ef.emitir(e.efeitos, "luz", u.x, u.y - 26, { cor: "#ffe9a0", cor2: "#fffbe8", quantidade: 6 });
        if (!silencioso) escreverLog("● " + u.dados.nome + ": " + evento.nome, "log-passiva");
        break;
      case "atordoado":
        if (!u) break;
        u.etiqueta = { texto: "atordoado", ate: e.relogio + 700, estilo: "atordoado" };
        break;
      case "morte":
        if (!u) break;
        u.morto = true;
        u.pose = "morto";
        u.vida = 0;
        u.escudo = 0;
        Ef.emitir(e.efeitos, "sombra", u.x, u.y - 18, { cor: "#3a2a4a", cor2: "#6a5a7a", quantidade: 14, velocidade: 0.04 });
        if (!silencioso) escreverLog("✝ " + u.dados.nome + " tomba.", u.dados.lado === "aliados" ? "log-inimigo" : "log-aliado");
        break;
      case "reviver":
        if (!u) break;
        u.morto = false;
        u.pose = "parado";
        u.vida = evento.vida;
        popup(u, "de pé!", "#ffe08a");
        Ef.forma(e.efeitos, "estrela", u.x, u.y - 20, { cor: "#ffe9a0", raio: 26, duracao: 620 });
        if (!silencioso) escreverLog("✚ " + u.dados.nome + " volta à luta!", "log-aliado");
        break;
      case "fim":
        if (!silencioso)
          escreverLog(evento.vencedor === "aliados" ? "★ Vitória da hoste!" : "☠ A hoste foi derrotada.",
            evento.vencedor === "aliados" ? "log-aliado" : "log-inimigo");
        break;
    }
  }

  // ------------------------------------------------------------ desenho
  function quadro() {
    const e = C.estado;
    if (!e) return;
    const agora = performance.now();
    const dt = Math.min(64, agora - e.ultimoFrame);
    e.ultimoFrame = agora;
    e.relogio += dt * C.velocidade;

    while (e.indice < e.linha.length && e.linha[e.indice].tempo <= e.relogio) {
      aplicar(e.linha[e.indice].evento, false);
      e.indice += 1;
    }

    Ef.atualizar(e.efeitos, dt * C.velocidade);
    Object.values(e.unidades).forEach((u) => {
      u.fase += dt * 0.004;
      if (u.pose !== "parado" && u.pose !== "morto" && e.relogio - u.poseInicio > u.poseDuracao) u.pose = "parado";
    });

    desenhar();

    if (e.indice >= e.linha.length && e.relogio > e.duracao) {
      finalizar();
      return;
    }
    C.animacao = requestAnimationFrame(quadro);
  }

  function desenhar() {
    const e = C.estado;
    const ctx = C.ctx;
    const HL = C.alturaLogica || H;

    const tremor = e.tremor > 0.2 ? (Math.random() - 0.5) * e.tremor : 0;
    e.tremor *= 0.88;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, C.canvas.width, C.canvas.height);
    ctx.save();
    ctx.translate(tremor * C.escala, tremor * 0.4 * C.escala);
    ctx.drawImage(montarFundo(e.cenario, HL), 0, 0);
    ctx.restore();

    ctx.setTransform(C.escala, 0, 0, C.escala, 0, 0);
    ctx.translate(tremor, tremor * 0.4);
    ctx.imageSmoothingEnabled = false;

    // unidades, do fundo para a frente
    const lista = Object.values(e.unidades).sort((a, b) => a.y - b.y);
    lista.forEach((u) => desenharUnidade(ctx, u));

    Ef.desenhar(e.efeitos, ctx);
    desenharPrimeiroPlano(ctx, HL, e.cenario);

    // clarão da suprema
    if (e.brilho > 0.01) {
      ctx.fillStyle = A.comAlfa(e.corBrilho, e.brilho * 0.4);
      ctx.fillRect(-10, -10, L + 20, HL + 20);
      e.brilho *= 0.86;
    }

    if (e.banner && e.relogio < e.banner.ate) {
      const alpha = Math.min(1, (e.banner.ate - e.relogio) / 300);
      const faixaY = HORIZONTE - 52;
      ctx.globalAlpha = alpha;
      const g = ctx.createLinearGradient(0, faixaY, L, faixaY);
      g.addColorStop(0, "rgba(10,8,18,0)");
      g.addColorStop(0.5, "rgba(10,8,18,0.82)");
      g.addColorStop(1, "rgba(10,8,18,0)");
      ctx.fillStyle = g;
      ctx.fillRect(0, faixaY, L, 42);
      ctx.fillStyle = A.comAlfa(e.corBrilho, 0.75);
      ctx.fillRect(L / 2 - 90, faixaY + 40, 180, 1);
      ctx.fillStyle = e.banner.lado === "aliados" ? "#f5d98a" : "#f08a8a";
      ctx.font = "bold 17px Georgia, serif";
      ctx.textAlign = "center";
      ctx.fillText(e.banner.sub, L / 2, faixaY + 24);
      ctx.fillStyle = "#cfc6b8";
      ctx.font = "10px Georgia, serif";
      ctx.fillText(e.banner.texto, L / 2, faixaY + 36);
      ctx.globalAlpha = 1;
    }

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(montarVinheta(), 0, 0);
  }

  // Silhuetas na borda inferior, só para dar profundidade ao campo.
  function desenharPrimeiroPlano(ctx, HL, cenario) {
    const cor = A.escurecer(cenario.chao, 0.35);
    ctx.fillStyle = cor;
    for (let i = 0; i < 7; i++) {
      const x = -20 + i * 82 + ((i * 37) % 30);
      const y = HL + 4 - ((i * 23) % 10);
      ctx.beginPath();
      ctx.ellipse(x, y, 16 + ((i * 13) % 12), 7, 0, Math.PI, Math.PI * 2);
      ctx.fill();
      for (let j = 0; j < 4; j++) {
        const gx = x - 10 + j * 6;
        ctx.fillRect(gx, y - 10 - ((j * 5) % 6), 2, 10 + ((j * 5) % 6));
      }
    }
  }

  function desenharUnidade(ctx, u) {
    const e = C.estado;
    const heroi = u.dados;
    const x = u.x;
    const y = u.y;
    const progresso =
      u.poseDuracao > 0 ? Math.min(1, (e.relogio - u.poseInicio) / u.poseDuracao) : 0;

    u.vidaExibida += (u.vida - u.vidaExibida) * 0.25;

    // marca de quem está agindo
    if (e.ativo === heroi.uid && !u.morto) {
      ctx.save();
      ctx.strokeStyle = heroi.lado === "aliados" ? "rgba(232,196,90,0.75)" : "rgba(224,106,106,0.7)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.ellipse(x, y, 15, 5, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    A.desenharHeroi(ctx, heroi.arte, x, y, ESCALA_UNIDADE, {
      id: heroi.id,
      espelhar: heroi.lado === "inimigos",
      classe: heroi.classe,
      faccao: heroi.faccao,
      halo: heroi.faccao === "celestiais",
      aura: heroi.faccao === "trevas" ? "rgba(150,60,180,0.9)" : null,
      pose: u.pose,
      progresso,
      fase: u.fase,
      flash: u.morto ? 0 : u.flash,
    });
    if (u.flash > 0.02) u.flash *= 0.82;

    if (!u.morto) {
      const largura = 30;
      const topoBarra = y - ALTO_SPRITE - 10;
      const pct = Math.max(0, u.vidaExibida / u.vidaMax);

      ctx.fillStyle = "rgba(0,0,0,0.65)";
      ctx.fillRect(x - largura / 2 - 1, topoBarra - 1, largura + 2, 8);
      ctx.fillStyle = heroi.lado === "aliados" ? "#6fd08a" : "#e06a6a";
      ctx.fillRect(x - largura / 2, topoBarra, largura * pct, 3);
      ctx.fillStyle = "rgba(255,255,255,0.25)";
      ctx.fillRect(x - largura / 2, topoBarra, largura * pct, 1);

      if (u.escudo > 0) {
        ctx.fillStyle = "rgba(150,210,255,0.9)";
        ctx.fillRect(x - largura / 2, topoBarra - 3, largura * Math.min(1, u.escudo / u.vidaMax), 2);
      }

      ctx.fillStyle = "rgba(0,0,0,0.5)";
      ctx.fillRect(x - largura / 2, topoBarra + 4, largura, 2);
      ctx.fillStyle = u.energia >= 100 ? "#fff0a0" : "#f0c05a";
      ctx.fillRect(x - largura / 2, topoBarra + 4, largura * (u.energia / 100), 2);

      const faccao = F.FACCOES[heroi.faccao];
      if (faccao) {
        ctx.fillStyle = faccao.cor;
        ctx.fillRect(x - largura / 2 - 4, topoBarra, 2, 6);
      }
    }

    if (u.etiqueta && e.relogio < u.etiqueta.ate) {
      ctx.font = "8px Georgia, serif";
      ctx.textAlign = "center";
      ctx.fillStyle =
        u.etiqueta.estilo === "debuff" || u.etiqueta.estilo === "atordoado" ? "#f0a0a0"
        : u.etiqueta.estilo === "passiva" ? "#ffe9a0" : "#a0e0c0";
      ctx.fillText(u.etiqueta.texto, x, y - ALTO_SPRITE - 16);
    }

    u.popups = u.popups.filter((p) => e.relogio - p.nascimento < 900);
    u.popups.forEach((p) => {
      const idade = (e.relogio - p.nascimento) / 900;
      ctx.globalAlpha = 1 - idade;
      ctx.fillStyle = "rgba(0,0,0,0.6)";
      ctx.font = "bold 11px Georgia, serif";
      ctx.textAlign = "center";
      ctx.fillText(p.texto, x + p.dx + 1, y - ALTO_SPRITE + 5 - idade * 26);
      ctx.fillStyle = p.cor;
      ctx.fillText(p.texto, x + p.dx, y - ALTO_SPRITE + 4 - idade * 26);
      ctx.globalAlpha = 1;
    });
  }

  C.CENARIOS = CENARIOS;
  Jogo.Cena = C;
})(typeof window !== "undefined" ? window : globalThis);
