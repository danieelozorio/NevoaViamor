// Núcleo: tela de 240x160 (resolução real de um portátil da era GBA) escalada
// por número inteiro, laço de jogo, entrada e os widgets de interface.
(function (global) {
  const LARGURA = 240;
  const ALTURA = 160;

  const TECLAS = {
    ArrowUp: "cima",
    ArrowDown: "baixo",
    ArrowLeft: "esq",
    ArrowRight: "dir",
    KeyW: "cima",
    KeyS: "baixo",
    KeyA: "esq",
    KeyD: "dir",
    KeyZ: "a",
    Enter: "a",
    Space: "a",
    KeyX: "b",
    Escape: "b",
    Backspace: "b",
    ShiftLeft: "start",
  };

  const Input = {
    down: {},
    pressed: {},
    consumido: {},
    press(botao) {
      if (!this.down[botao]) this.pressed[botao] = true;
      this.down[botao] = true;
    },
    release(botao) {
      this.down[botao] = false;
    },
    isDown(botao) {
      return !!this.down[botao];
    },
    justPressed(botao) {
      return !!this.pressed[botao];
    },
    // Evita que uma única tecla seja lida por dois widgets no mesmo quadro
    // (fechar a caixa de texto e já confirmar o menu atrás dela, por exemplo).
    consumir(botao) {
      delete this.pressed[botao];
    },
    limpar() {
      this.pressed = {};
    },
    zerar() {
      this.down = {};
      this.pressed = {};
    },
  };

  const Game = {
    ctx: null,
    canvas: null,
    cenas: [],
    ultimo: 0,
    tempo: 0,

    init(canvas) {
      this.canvas = canvas;
      canvas.width = LARGURA;
      canvas.height = ALTURA;
      this.ctx = canvas.getContext("2d");
      this.ctx.imageSmoothingEnabled = false;

      window.addEventListener("keydown", (e) => {
        const botao = TECLAS[e.code];
        if (botao) {
          e.preventDefault();
          Input.press(botao);
        }
      });
      window.addEventListener("keyup", (e) => {
        const botao = TECLAS[e.code];
        if (botao) {
          e.preventDefault();
          Input.release(botao);
        }
      });
      window.addEventListener("blur", () => Input.zerar());

      this.ajustarEscala();
      window.addEventListener("resize", () => this.ajustarEscala());

      this.ultimo = performance.now();
      requestAnimationFrame((t) => this.laco(t));
    },

    ajustarEscala() {
      const palco = this.canvas.parentElement;
      const disponivelL = palco.clientWidth;
      const disponivelA = palco.clientHeight;
      const escala = Math.max(
        1,
        Math.floor(Math.min(disponivelL / LARGURA, disponivelA / ALTURA))
      );
      this.canvas.style.width = LARGURA * escala + "px";
      this.canvas.style.height = ALTURA * escala + "px";
    },

    push(cena) {
      this.cenas.push(cena);
      if (cena.entrar) cena.entrar();
    },
    pop() {
      const cena = this.cenas.pop();
      if (cena && cena.sair) cena.sair();
      const topo = this.topo();
      if (topo && topo.retomar) topo.retomar();
    },
    replace(cena) {
      while (this.cenas.length) {
        const c = this.cenas.pop();
        if (c && c.sair) c.sair();
      }
      this.push(cena);
    },
    topo() {
      return this.cenas[this.cenas.length - 1];
    },

    laco(agora) {
      const dt = Math.min(0.05, (agora - this.ultimo) / 1000);
      this.ultimo = agora;
      this.tempo += dt;

      const topo = this.topo();
      if (topo && topo.atualizar) topo.atualizar(dt);

      this.ctx.fillStyle = "#000";
      this.ctx.fillRect(0, 0, LARGURA, ALTURA);
      for (const cena of this.cenas) {
        if (cena.desenhar) cena.desenhar(this.ctx);
      }

      Input.limpar();
      requestAnimationFrame((t) => this.laco(t));
    },
  };

  // ------------------------------------------------------------------- UI
  const UI = {
    CORES: {
      janela: "#f8f4ff",
      janelaSombra: "#c8bede",
      borda: "#3b2f52",
      texto: "#2a2338",
      textoClaro: "#f4f0ff",
      destaque: "#d94f4f",
      pvAlto: "#4fc46b",
      pvMedio: "#e8c44f",
      pvBaixo: "#e0524f",
      xp: "#4fa8e8",
    },

    janela(ctx, x, y, w, h) {
      ctx.fillStyle = this.CORES.borda;
      ctx.fillRect(x, y, w, h);
      ctx.fillStyle = this.CORES.janelaSombra;
      ctx.fillRect(x + 1, y + 1, w - 2, h - 2);
      ctx.fillStyle = this.CORES.janela;
      ctx.fillRect(x + 2, y + 2, w - 4, h - 5);
      ctx.fillStyle = this.CORES.borda;
      ctx.fillRect(x + 2, y, w - 4, 1);
      ctx.fillRect(x + 2, y + h - 1, w - 4, 1);
      ctx.fillRect(x, y + 2, 1, h - 4);
      ctx.fillRect(x + w - 1, y + 2, 1, h - 4);
    },

    cursor(ctx, x, y) {
      ctx.fillStyle = this.CORES.destaque;
      for (let i = 0; i < 4; i++) ctx.fillRect(x + i, y + i, 1, 7 - i * 2);
    },

    barra(ctx, x, y, w, razao, cor) {
      ctx.fillStyle = this.CORES.borda;
      ctx.fillRect(x - 1, y - 1, w + 2, 5);
      ctx.fillStyle = "#6b6180";
      ctx.fillRect(x, y, w, 3);
      const preenchido = Math.max(0, Math.round(w * Math.max(0, Math.min(1, razao))));
      ctx.fillStyle = cor;
      ctx.fillRect(x, y, preenchido, 3);
      ctx.fillStyle = "rgba(255,255,255,0.35)";
      ctx.fillRect(x, y, preenchido, 1);
    },

    corPV(razao) {
      if (razao > 0.5) return this.CORES.pvAlto;
      if (razao > 0.2) return this.CORES.pvMedio;
      return this.CORES.pvBaixo;
    },
  };

  // Caixa de diálogo com efeito de máquina de escrever, como nos RPGs do gênero.
  class CaixaTexto {
    constructor(opcoes) {
      opcoes = opcoes || {};
      this.x = opcoes.x !== undefined ? opcoes.x : 4;
      this.y = opcoes.y !== undefined ? opcoes.y : 112;
      this.w = opcoes.w || LARGURA - 8;
      this.h = opcoes.h || 44;
      this.velocidade = opcoes.velocidade || 38; // caracteres por segundo
      this.fila = [];
      this.linhas = [];
      this.revelado = 0;
      this.ativo = false;
      this.aoTerminar = null;
      this.piscar = 0;
    }

    mostrar(mensagens, aoTerminar) {
      const lista = Array.isArray(mensagens) ? mensagens : [mensagens];
      this.fila = lista.slice();
      this.aoTerminar = aoTerminar || null;
      this.ativo = true;
      this.proxima();
    }

    proxima() {
      const msg = this.fila.shift();
      if (msg === undefined) {
        this.ativo = false;
        const cb = this.aoTerminar;
        this.aoTerminar = null;
        if (cb) cb();
        return;
      }
      this.linhas = Font.wrap(msg, this.w - 16).slice(0, 2);
      const sobra = Font.wrap(msg, this.w - 16).slice(2);
      if (sobra.length) this.fila.unshift(sobra.join(" "));
      this.revelado = 0;
    }

    get completo() {
      return this.revelado >= this.totalCaracteres();
    }

    totalCaracteres() {
      return this.linhas.reduce((s, l) => s + l.length, 0);
    }

    atualizar(dt) {
      if (!this.ativo) return;
      this.piscar += dt;
      if (!this.completo) {
        this.revelado = Math.min(this.totalCaracteres(), this.revelado + this.velocidade * dt);
        if (Input.justPressed("a") || Input.justPressed("b")) {
          this.revelado = this.totalCaracteres();
          Input.consumir("a");
          Input.consumir("b");
        }
      } else if (Input.justPressed("a")) {
        Input.consumir("a");
        this.proxima();
      }
    }

    desenhar(ctx) {
      if (!this.ativo) return;
      UI.janela(ctx, this.x, this.y, this.w, this.h);
      let restante = Math.floor(this.revelado);
      for (let i = 0; i < this.linhas.length; i++) {
        const linha = this.linhas[i];
        const visivel = linha.slice(0, Math.max(0, restante));
        restante -= linha.length;
        Font.draw(ctx, visivel, this.x + 8, this.y + 8 + i * Font.LINE_H, UI.CORES.texto);
      }
      if (this.completo && Math.floor(this.piscar * 2) % 2 === 0) {
        ctx.fillStyle = UI.CORES.destaque;
        ctx.fillRect(this.x + this.w - 10, this.y + this.h - 12, 4, 2);
        ctx.fillRect(this.x + this.w - 9, this.y + this.h - 10, 2, 2);
      }
    }
  }

  // Menu vertical ou em grade, navegável pelo direcional.
  class Menu {
    constructor(opcoes) {
      this.itens = opcoes.itens || [];
      this.x = opcoes.x || 0;
      this.y = opcoes.y || 0;
      this.w = opcoes.w || 100;
      this.h = opcoes.h || 40;
      this.colunas = opcoes.colunas || 1;
      this.indice = 0;
      this.aoEscolher = opcoes.aoEscolher || function () {};
      this.aoCancelar = opcoes.aoCancelar || null;
      this.linhaAltura = opcoes.linhaAltura || Font.LINE_H;
      this.desenharJanela = opcoes.desenharJanela !== false;
    }

    atualizar() {
      const linhas = Math.ceil(this.itens.length / this.colunas);
      if (Input.justPressed("dir") && this.colunas > 1) {
        if (this.indice % this.colunas < this.colunas - 1 && this.indice + 1 < this.itens.length) {
          this.indice++;
        }
      }
      if (Input.justPressed("esq") && this.colunas > 1) {
        if (this.indice % this.colunas > 0) this.indice--;
      }
      if (Input.justPressed("baixo")) {
        const alvo = this.indice + this.colunas;
        if (alvo < this.itens.length) this.indice = alvo;
      }
      if (Input.justPressed("cima")) {
        const alvo = this.indice - this.colunas;
        if (alvo >= 0) this.indice = alvo;
      }
      if (Input.justPressed("a")) {
        const item = this.itens[this.indice];
        if (item && !item.desabilitado) this.aoEscolher(item, this.indice);
      }
      if (Input.justPressed("b") && this.aoCancelar) this.aoCancelar();
      return linhas;
    }

    desenhar(ctx) {
      if (this.desenharJanela) UI.janela(ctx, this.x, this.y, this.w, this.h);
      const colLargura = (this.w - 12) / this.colunas;
      for (let i = 0; i < this.itens.length; i++) {
        const item = this.itens[i];
        const col = i % this.colunas;
        const linha = Math.floor(i / this.colunas);
        const ix = this.x + 8 + col * colLargura;
        const iy = this.y + 6 + linha * this.linhaAltura;
        const cor = item.desabilitado ? "#9d95ad" : item.cor || UI.CORES.texto;
        Font.draw(ctx, item.rotulo, ix + 6, iy, cor);
        if (item.direita) {
          const larguraDireita = Font.measure(item.direita);
          Font.draw(ctx, item.direita, this.x + this.w - 8 - larguraDireita, iy, cor);
        }
        if (i === this.indice) UI.cursor(ctx, ix, iy + Font.ASCENT);
      }
    }
  }

  global.Motor = { Game, Input, UI, CaixaTexto, Menu, LARGURA, ALTURA };
})(window);
