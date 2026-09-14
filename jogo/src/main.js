// Tela de título, escolha da primeira criatura, menus de pausa/equipe e o save.
(function (global) {
  const { Game, Input, UI, CaixaTexto, Menu } = Motor;
  const CHAVE = "nevoa_viamor_jogo_v1";

  const Save = {
    carregar() {
      try {
        const cru = localStorage.getItem(CHAVE);
        if (!cru) return null;
        const dados = JSON.parse(cru);
        if (!dados || !Array.isArray(dados.equipe) || !dados.equipe.length) return null;
        return dados;
      } catch (e) {
        return null;
      }
    },
    salvar(save) {
      try {
        localStorage.setItem(CHAVE, JSON.stringify(save));
        return true;
      } catch (e) {
        return false;
      }
    },
    novo(especieId) {
      return {
        equipe: [Dados.criar(especieId, 5)],
        itens: { frasco: 8, erva: 3 },
        pos: { x: 5, y: 6, dir: "baixo" },
      };
    },
    apagar() {
      try {
        localStorage.removeItem(CHAVE);
      } catch (e) {
        /* armazenamento indisponível: o jogo segue sem salvar */
      }
    },
  };

  function textoGrande(ctx, texto, x, y, escala, cor, sombra) {
    ctx.save();
    ctx.scale(escala, escala);
    Font.draw(ctx, texto, x / escala, y / escala, cor, sombra);
    ctx.restore();
  }

  // ------------------------------------------------------------ tela título
  class TelaTitulo {
    constructor() {
      this.tempo = 0;
      this.save = Save.carregar();
      this.menu = new Menu({
        x: 70,
        y: 100,
        w: 100,
        h: this.save ? 42 : 30,
        itens: this.save
          ? [
              { rotulo: "Continuar", acao: "continuar" },
              { rotulo: "Novo jogo", acao: "novo" },
            ]
          : [{ rotulo: "Começar", acao: "novo" }],
        aoEscolher: (item) => {
          if (item.acao === "continuar") {
            Game.replace(new global.Mundo(this.save));
          } else {
            Game.replace(new EscolhaInicial());
          }
        },
      });
    }

    atualizar(dt) {
      this.tempo += dt;
      this.menu.atualizar();
    }

    desenhar(ctx) {
      const g = ctx.createLinearGradient(0, 0, 0, Motor.ALTURA);
      g.addColorStop(0, "#2b2340");
      g.addColorStop(0.6, "#4a3f6b");
      g.addColorStop(1, "#8f83b5");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, Motor.LARGURA, Motor.ALTURA);

      for (let i = 0; i < 5; i++) {
        const y = 40 + i * 22;
        const x = ((this.tempo * (8 + i * 3) + i * 60) % 320) - 60;
        ctx.fillStyle = "rgba(230,224,255,0.12)";
        ctx.fillRect(x, y, 90, 6);
      }

      const flutuar = Math.sin(this.tempo * 1.6) * 2;
      ctx.drawImage(Sprites.creature("neblim"), 8, 48 + flutuar, 44, 44);
      ctx.drawImage(Sprites.creature("vultor"), 188, 44 - flutuar, 44, 44);

      const titulo = Font.measure("Névoa") * 3;
      const subtitulo = Font.measure("de Viamor") * 2;
      textoGrande(ctx, "Névoa", (Motor.LARGURA - titulo) / 2, 26, 3, "#f4f0ff", "#241a2e");
      textoGrande(ctx, "de Viamor", (Motor.LARGURA - subtitulo) / 2, 56, 2, "#d8ccff", "#241a2e");

      this.menu.desenhar(ctx);

      if (Math.floor(this.tempo * 1.5) % 2 === 0) {
        const dica = "Z confirma   X volta   Setas movem";
        Font.draw(ctx, dica, (Motor.LARGURA - Font.measure(dica)) / 2, 146, "#e8e0ff");
      }
    }
  }

  // ------------------------------------------------------- escolha inicial
  class EscolhaInicial {
    constructor() {
      this.opcoes = ["fagulho", "gotim", "brotim"];
      this.indice = 0;
      this.caixa = new CaixaTexto();
      this.estado = "intro";
      this.tempo = 0;
      this.caixa.mostrar(
        [
          "Antes de sair, escolha quem vai com você.",
          "Use as setas para ver cada uma e Z para escolher.",
        ],
        () => (this.estado = "escolhendo")
      );
    }

    atualizar(dt) {
      this.tempo += dt;
      this.caixa.atualizar(dt);
      if (this.estado !== "escolhendo" || this.caixa.ativo) return;

      if (Input.justPressed("dir")) this.indice = (this.indice + 1) % this.opcoes.length;
      if (Input.justPressed("esq"))
        this.indice = (this.indice + this.opcoes.length - 1) % this.opcoes.length;
      if (Input.justPressed("a")) {
        const escolhida = this.opcoes[this.indice];
        this.estado = "confirmado";
        const save = Save.novo(escolhida);
        Save.salvar(save);
        this.caixa.mostrar(
          [`${Dados.ESPECIES[escolhida].nome} vai com você!`, "Boa sorte no vale."],
          () => Game.replace(new global.Mundo(save))
        );
      }
    }

    desenhar(ctx) {
      const g = ctx.createLinearGradient(0, 0, 0, Motor.ALTURA);
      g.addColorStop(0, "#3a3157");
      g.addColorStop(1, "#6f6394");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, Motor.LARGURA, Motor.ALTURA);

      for (let i = 0; i < this.opcoes.length; i++) {
        const id = this.opcoes[i];
        const esp = Dados.ESPECIES[id];
        const selecionada = i === this.indice;
        const x = 22 + i * 70;
        const y = 34 + (selecionada ? Math.sin(this.tempo * 4) * 2 : 6);
        const escala = selecionada ? 2 : 1.5;
        const tam = 24 * escala;
        ctx.drawImage(Sprites.creature(id), x + (48 - tam) / 2, y, tam, tam);
        const nome = esp.nome;
        Font.draw(
          ctx,
          nome,
          x + (48 - Font.measure(nome)) / 2,
          88,
          selecionada ? "#ffffff" : "#c9bfe0"
        );
        const tipo = Dados.TIPOS[esp.tipo].nome;
        Font.draw(
          ctx,
          tipo,
          x + (48 - Font.measure(tipo)) / 2,
          98,
          selecionada ? Dados.TIPOS[esp.tipo].cor : "#9a90b5"
        );
      }

      if (this.estado === "escolhendo" && !this.caixa.ativo) {
        const esp = Dados.ESPECIES[this.opcoes[this.indice]];
        UI.janela(ctx, 4, 112, 232, 44);
        Font.draw(ctx, esp.desc, 12, 120, UI.CORES.texto);
        Font.draw(ctx, "Z para escolher", 12, 134, UI.CORES.destaque);
      }
      this.caixa.desenhar(ctx);
    }
  }

  // ------------------------------------------------------------ menu pausa
  class MenuPausa {
    constructor(save) {
      this.save = save;
      this.aviso = "";
      this.avisoTempo = 0;
      this.menu = new Menu({
        x: 148,
        y: 8,
        w: 86,
        h: 74,
        itens: [
          { rotulo: "Equipe", acao: "equipe" },
          { rotulo: "Mochila", acao: "mochila" },
          { rotulo: "Salvar", acao: "salvar" },
          { rotulo: "Voltar", acao: "voltar" },
        ],
        aoEscolher: (item) => this.escolher(item.acao),
        aoCancelar: () => Game.pop(),
      });
    }

    escolher(acao) {
      if (acao === "equipe") Game.push(new MenuEquipe(this.save, {}));
      else if (acao === "mochila") Game.push(new MenuMochila(this.save));
      else if (acao === "salvar") {
        this.aviso = Save.salvar(this.save) ? "Jogo salvo!" : "Não foi possível salvar.";
        this.avisoTempo = 1.6;
      } else Game.pop();
    }

    atualizar(dt) {
      this.avisoTempo = Math.max(0, this.avisoTempo - dt);
      this.menu.atualizar();
    }

    desenhar(ctx) {
      ctx.fillStyle = "rgba(20,16,32,0.45)";
      ctx.fillRect(0, 0, Motor.LARGURA, Motor.ALTURA);
      this.menu.desenhar(ctx);
      if (this.avisoTempo > 0) {
        UI.janela(ctx, 4, 130, 130, 26);
        Font.draw(ctx, this.aviso, 12, 138, UI.CORES.texto);
      }
    }
  }

  // ----------------------------------------------------------- menu equipe
  class MenuEquipe {
    constructor(save, opcoes) {
      this.save = save;
      this.opcoes = opcoes || {};
      this.indice = 0;
      this.aviso = "";
      this.avisoTempo = 0;
    }

    atualizar(dt) {
      this.avisoTempo = Math.max(0, this.avisoTempo - dt);
      const total = this.save.equipe.length;
      if (Input.justPressed("baixo")) this.indice = (this.indice + 1) % total;
      if (Input.justPressed("cima")) this.indice = (this.indice + total - 1) % total;
      if (Input.justPressed("b")) {
        Game.pop();
        return;
      }
      if (Input.justPressed("a") && this.opcoes.emBatalha) {
        const mon = this.save.equipe[this.indice];
        if (mon.pv <= 0) {
          this.aviso = mon.nome + " não pode lutar.";
          this.avisoTempo = 1.5;
        } else if (this.opcoes.aoTrocar && this.opcoes.aoTrocar(this.indice)) {
          Game.pop();
        } else {
          this.aviso = mon.nome + " já está em campo.";
          this.avisoTempo = 1.5;
        }
      }
    }

    desenhar(ctx) {
      ctx.fillStyle = "#3a3157";
      ctx.fillRect(0, 0, Motor.LARGURA, Motor.ALTURA);
      Font.draw(ctx, "Equipe", 8, 6, "#f4f0ff");

      for (let i = 0; i < this.save.equipe.length; i++) {
        const mon = this.save.equipe[i];
        const y = 18 + i * 23;
        const selecionado = i === this.indice;
        UI.janela(ctx, 6, y, 228, 21);
        ctx.drawImage(Sprites.creature(mon.especie), 12, y + 4, 12, 12);
        Font.draw(ctx, mon.nome, 34, y + 3, UI.CORES.texto);
        Font.draw(ctx, "N" + mon.nivel, 110, y + 3, UI.CORES.texto);
        const razao = mon.pv / mon.pvMax;
        UI.barra(ctx, 140, y + 8, 60, razao, UI.corPV(razao));
        Font.draw(ctx, mon.pv + "/" + mon.pvMax, 204, y + 3, UI.CORES.texto);
        if (selecionado) UI.cursor(ctx, 1, y + 7);
      }

      const rodape = this.opcoes.emBatalha ? "Z troca   X volta" : "X volta";
      Font.draw(ctx, rodape, 8, 148, "#d8ccff");
      if (this.avisoTempo > 0) {
        UI.janela(ctx, 90, 130, 144, 22);
        Font.draw(ctx, this.aviso, 96, 136, UI.CORES.texto);
      }
    }
  }

  // ---------------------------------------------------------- menu mochila
  class MenuMochila {
    constructor(save) {
      this.save = save;
      this.menu = new Menu({
        x: 20,
        y: 30,
        w: 200,
        h: 70,
        itens: Object.keys(Dados.ITENS).map((id) => ({
          rotulo: Dados.ITENS[id].nome,
          direita: "×" + (save.itens[id] || 0),
          id,
        })),
        aoEscolher: () => {},
        aoCancelar: () => Game.pop(),
      });
    }

    atualizar() {
      this.menu.atualizar();
    }

    desenhar(ctx) {
      ctx.fillStyle = "#3a3157";
      ctx.fillRect(0, 0, Motor.LARGURA, Motor.ALTURA);
      Font.draw(ctx, "Mochila", 8, 10, "#f4f0ff");
      this.menu.desenhar(ctx);
      const sel = this.menu.itens[this.menu.indice];
      if (sel) {
        UI.janela(ctx, 20, 108, 200, 30);
        Font.draw(ctx, Dados.ITENS[sel.id].desc, 28, 116, UI.CORES.texto);
      }
      Font.draw(ctx, "X volta", 8, 146, "#d8ccff");
    }
  }

  global.Save = Save;
  global.MenuPausa = MenuPausa;
  global.MenuEquipe = MenuEquipe;

  // ------------------------------------------------------------------ boot
  function ligarControlesTouch() {
    document.querySelectorAll("[data-botao]").forEach((el) => {
      const botao = el.getAttribute("data-botao");
      const pressionar = (e) => {
        e.preventDefault();
        Input.press(botao);
      };
      const soltar = (e) => {
        e.preventDefault();
        Input.release(botao);
      };
      el.addEventListener("touchstart", pressionar, { passive: false });
      el.addEventListener("touchend", soltar, { passive: false });
      el.addEventListener("touchcancel", soltar, { passive: false });
      el.addEventListener("mousedown", pressionar);
      el.addEventListener("mouseup", soltar);
      el.addEventListener("mouseleave", soltar);
    });
  }

  window.addEventListener("load", () => {
    Game.init(document.getElementById("tela"));
    ligarControlesTouch();
    Game.push(new TelaTitulo());
  });
})(window);
