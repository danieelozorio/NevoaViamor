// Cena de batalha: consome a lista de eventos da simulação e a anima no canvas.
(function (global) {
  const Jogo = (global.Jogo = global.Jogo || {});
  const A = Jogo.Arte;
  const F = Jogo.Formulas;

  const L = 480; // largura lógica
  const H = 280; // altura lógica mínima
  const ALTURA_MAXIMA = 500;
  const LARGURA_MAXIMA = 760;
  const HORIZONTE = 118;
  const ESCALA_UNIDADE = 1.25;
  const ALTO_SPRITE = Math.round(38 * ESCALA_UNIDADE);

  const C = {
    canvas: null,
    ctx: null,
    log: null,
    estado: null,
    animacao: null,
    velocidade: 1,
  };

  C.configurar = function (canvas, log) {
    C.canvas = canvas;
    C.ctx = canvas.getContext("2d");
    C.log = log;
    redimensionar();
    global.addEventListener("resize", redimensionar);
  };

  // O palco preenche o espaço livre: a largura dita a escala e a altura
  // lógica cresce para ocupar a tela, mantendo o chão sempre visível.
  function redimensionar() {
    if (!C.canvas) return;
    const dpr = global.devicePixelRatio || 1;
    const painel = C.canvas.parentElement;
    const topo = painel.querySelector(".batalha-topo");
    const largura = Math.min(painel.clientWidth || L, LARGURA_MAXIMA);
    const proporcao = largura / L;
    const alturaLivre =
      (painel.clientHeight || 0) - (topo ? topo.offsetHeight : 0) - (C.log ? C.log.offsetHeight : 0) - 6;

    const alturaMinima = H * proporcao;
    const alturaMaxima = ALTURA_MAXIMA * proporcao;
    const alturaFinal = Math.round(Math.max(alturaMinima, Math.min(alturaLivre, alturaMaxima)));

    C.canvas.width = Math.round(largura * dpr);
    C.canvas.height = alturaFinal * dpr;
    C.canvas.style.width = largura + "px";
    C.canvas.style.height = alturaFinal + "px";
    C.escala = (largura * dpr) / L;
    C.alturaLogica = alturaFinal / proporcao;
  }

  // ------------------------------------------------------------ preparação
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
      t += e.t === "acao" && e.estilo === "ult" ? 780 : duracoes[e.t] || 60;
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
        lunge: null,
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
      cenario: config.cenario || { ceu: ["#1b2a3a", "#3a5a6a"], chao: "#2c3f2c" },
      titulo: config.titulo || "",
      banner: null,
      brilho: 0,
      tremor: 0,
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

  // ---------------------------------------------------------- eventos
  function aplicar(evento, silencioso) {
    const e = C.estado;
    const u = evento.uid ? e.unidades[evento.uid] : null;

    switch (evento.t) {
      case "acao": {
        const ator = e.unidades[evento.uid];
        const alvo = e.unidades[evento.alvo];
        if (!ator) break;
        const dir = ator.dados.lado === "aliados" ? 1 : -1;
        ator.lunge = { inicio: e.relogio, dur: evento.estilo === "ult" ? 600 : 320, dir };
        if (evento.estilo === "ult") {
          e.banner = { texto: ator.dados.nome, sub: evento.nome, ate: e.relogio + 900, lado: ator.dados.lado };
          e.brilho = 1;
          e.tremor = 8;
          if (!silencioso) escreverLog("✦ " + ator.dados.nome + " invoca " + evento.nome + "!", ator.dados.lado === "aliados" ? "log-aliado" : "log-inimigo");
        }
        break;
      }
      case "dano": {
        if (!u) break;
        u.vida = evento.vida != null ? evento.vida : Math.max(0, u.vida - evento.valor);
        u.flash = 1;
        if (evento.imune) popup(u, "imune", "#8ad8f0");
        else popup(u, "-" + Jogo.Util.numero(evento.valor) + (evento.critico ? "!" : ""), evento.critico ? "#ffd05a" : "#ff7a6a");
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
        break;
      case "escudo":
        if (!u) break;
        u.escudo += evento.valor;
        popup(u, "escudo", "#9ad0ff");
        break;
      case "energia":
        if (!u) break;
        u.energia = evento.energia;
        break;
      case "status":
        if (!u) break;
        u.etiqueta = { texto: evento.nome, ate: C.estado.relogio + 900, estilo: evento.estilo };
        break;
      case "passiva":
        if (!u) break;
        u.etiqueta = { texto: evento.nome, ate: C.estado.relogio + 900, estilo: "passiva" };
        if (!silencioso) escreverLog("● " + u.dados.nome + ": " + evento.nome, "log-passiva");
        break;
      case "atordoado":
        if (!u) break;
        u.etiqueta = { texto: "atordoado", ate: C.estado.relogio + 700, estilo: "atordoado" };
        break;
      case "morte":
        if (!u) break;
        u.morto = true;
        u.vida = 0;
        if (!silencioso) escreverLog("✝ " + u.dados.nome + " tomba.", u.dados.lado === "aliados" ? "log-inimigo" : "log-aliado");
        break;
      case "reviver":
        if (!u) break;
        u.morto = false;
        u.vida = evento.vida;
        popup(u, "de pé!", "#ffe08a");
        if (!silencioso) escreverLog("✚ " + u.dados.nome + " volta à luta!", "log-aliado");
        break;
      case "fim":
        if (!silencioso)
          escreverLog(evento.vencedor === "aliados" ? "★ Vitória da hoste!" : "☠ A hoste foi derrotada.", evento.vencedor === "aliados" ? "log-aliado" : "log-inimigo");
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
    const s = C.escala;
    ctx.setTransform(s, 0, 0, s, 0, 0);
    ctx.imageSmoothingEnabled = false;

    const tremor = e.tremor > 0.2 ? (Math.random() - 0.5) * e.tremor : 0;
    e.tremor *= 0.88;
    ctx.save();
    ctx.translate(tremor, tremor * 0.4);

    const HL = C.alturaLogica || H;

    // céu e chão
    const g = ctx.createLinearGradient(0, 0, 0, HL);
    g.addColorStop(0, e.cenario.ceu[0]);
    g.addColorStop(1, e.cenario.ceu[1]);
    ctx.fillStyle = g;
    ctx.fillRect(-10, -10, L + 20, HL + 20);

    ctx.fillStyle = "rgba(255,255,255,0.05)";
    for (let i = 0; i < 18; i++) {
      const x = ((i * 97) % L) + 5;
      const y = ((i * 53) % 90) + 6;
      ctx.fillRect(x, y, 2, 2);
    }

    // silhuetas ao fundo
    ctx.fillStyle = A.escurecer(e.cenario.chao, 0.6);
    for (let i = 0; i < 7; i++) {
      const x = i * 78 - 20;
      const alturaMonte = 34 + ((i * 37) % 30);
      ctx.beginPath();
      ctx.moveTo(x, HORIZONTE);
      ctx.lineTo(x + 40, HORIZONTE - alturaMonte);
      ctx.lineTo(x + 80, HORIZONTE);
      ctx.closePath();
      ctx.fill();
    }

    const chao = ctx.createLinearGradient(0, HORIZONTE, 0, HL);
    chao.addColorStop(0, A.escurecer(e.cenario.chao, 1.15));
    chao.addColorStop(1, A.escurecer(e.cenario.chao, 0.65));
    ctx.fillStyle = chao;
    ctx.fillRect(-10, HORIZONTE, L + 20, HL);
    ctx.fillStyle = "rgba(0,0,0,0.18)";
    ctx.fillRect(-10, HORIZONTE, L + 20, 4);

    // tufos e pedras espalhados pelo campo
    for (let i = 0; i < 26; i++) {
      const x = (i * 131) % (L + 20) - 10;
      const y = HORIZONTE + 12 + ((i * 71) % Math.max(20, HL - HORIZONTE - 20));
      ctx.fillStyle = i % 3 === 0 ? "rgba(0,0,0,0.16)" : "rgba(255,255,255,0.05)";
      ctx.fillRect(x, y, i % 3 === 0 ? 5 : 3, 2);
    }

    // unidades, do fundo para a frente
    const lista = Object.values(e.unidades).sort((a, b) => a.y - b.y);
    lista.forEach((u) => desenharUnidade(ctx, u));

    // clarão da suprema
    if (e.brilho > 0.01) {
      ctx.fillStyle = "rgba(255,240,200," + (e.brilho * 0.45).toFixed(3) + ")";
      ctx.fillRect(-10, -10, L + 20, HL + 20);
      e.brilho *= 0.86;
    }

    if (e.banner && e.relogio < e.banner.ate) {
      const alpha = Math.min(1, (e.banner.ate - e.relogio) / 300);
      ctx.globalAlpha = alpha;
      const faixaY = HORIZONTE - 46;
      ctx.fillStyle = "rgba(10,8,18,0.72)";
      ctx.fillRect(0, faixaY, L, 40);
      ctx.fillStyle = e.banner.lado === "aliados" ? "#f5d98a" : "#f08a8a";
      ctx.font = "bold 17px Georgia, serif";
      ctx.textAlign = "center";
      ctx.fillText(e.banner.sub, L / 2, faixaY + 24);
      ctx.fillStyle = "#cfc6b8";
      ctx.font = "10px Georgia, serif";
      ctx.fillText(e.banner.texto, L / 2, faixaY + 36);
      ctx.globalAlpha = 1;
    }

    ctx.restore();
  }

  function desenharUnidade(ctx, u) {
    const e = C.estado;
    let x = u.x;
    const y = u.y;

    if (u.lunge && e.relogio - u.lunge.inicio < u.lunge.dur) {
      const p = (e.relogio - u.lunge.inicio) / u.lunge.dur;
      x += Math.sin(p * Math.PI) * 26 * u.lunge.dir;
    }

    u.vidaExibida += (u.vida - u.vidaExibida) * 0.25;

    ctx.save();
    if (u.morto) ctx.globalAlpha = 0.22;

    const heroi = u.dados;
    A.desenharHeroi(ctx, heroi.arte, x, y, ESCALA_UNIDADE, {
      espelhar: heroi.lado === "inimigos",
      halo: heroi.faccao === "celestiais",
      aura: heroi.faccao === "trevas" ? "rgba(150,60,180,0.9)" : null,
    });

    if (u.flash > 0.02) {
      ctx.globalAlpha = u.flash * 0.6;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(x - 16, y - ALTO_SPRITE, 32, ALTO_SPRITE);
      ctx.globalAlpha = u.morto ? 0.22 : 1;
      u.flash *= 0.8;
    }
    ctx.restore();

    if (!u.morto) {
      // barra de vida
      const largura = 30;
      const topoBarra = y - ALTO_SPRITE - 8;
      const pct = Math.max(0, u.vidaExibida / u.vidaMax);
      ctx.fillStyle = "rgba(0,0,0,0.6)";
      ctx.fillRect(x - largura / 2, topoBarra, largura, 3);
      ctx.fillStyle = heroi.lado === "aliados" ? "#6fd08a" : "#e06a6a";
      ctx.fillRect(x - largura / 2, topoBarra, largura * pct, 3);
      if (u.escudo > 0) {
        ctx.fillStyle = "rgba(150,210,255,0.85)";
        ctx.fillRect(x - largura / 2, topoBarra - 2, largura * Math.min(1, u.escudo / u.vidaMax), 2);
      }
      // barra de fé
      ctx.fillStyle = "rgba(0,0,0,0.5)";
      ctx.fillRect(x - largura / 2, topoBarra + 4, largura, 2);
      ctx.fillStyle = "#f0c05a";
      ctx.fillRect(x - largura / 2, topoBarra + 4, largura * (u.energia / 100), 2);

      const faccao = F.FACCOES[heroi.faccao];
      ctx.fillStyle = faccao.cor;
      ctx.fillRect(x - largura / 2 - 3, topoBarra, 2, 6);
    }

    if (u.etiqueta && e.relogio < u.etiqueta.ate) {
      ctx.font = "8px Georgia, serif";
      ctx.textAlign = "center";
      ctx.fillStyle =
        u.etiqueta.estilo === "debuff" || u.etiqueta.estilo === "atordoado" ? "#f0a0a0"
        : u.etiqueta.estilo === "passiva" ? "#ffe9a0" : "#a0e0c0";
      ctx.fillText(u.etiqueta.texto, x, y - ALTO_SPRITE - 14);
    }

    // números flutuantes
    u.popups = u.popups.filter((p) => e.relogio - p.nascimento < 900);
    u.popups.forEach((p) => {
      const idade = (e.relogio - p.nascimento) / 900;
      ctx.globalAlpha = 1 - idade;
      ctx.fillStyle = p.cor;
      ctx.font = "bold 11px Georgia, serif";
      ctx.textAlign = "center";
      ctx.fillText(p.texto, x + p.dx, y - ALTO_SPRITE + 4 - idade * 26);
      ctx.globalAlpha = 1;
    });
  }

  Jogo.Cena = C;
})(typeof window !== "undefined" ? window : globalThis);
