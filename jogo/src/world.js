// Cena do mundo: mapa em tiles, caminhada em grade, NPCs e encontros no mato.
(function (global) {
  const { Game, Input, UI, CaixaTexto } = Motor;
  const TILE = 16;
  const TELA_TILES_X = Motor.LARGURA / TILE;
  const TELA_TILES_Y = Motor.ALTURA / TILE;

  const MAPA_BRUTO = [
    "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
    "A............................A",
    "A..RRRR......A....A..........A",
    "A..RRRR....A....A....~~~~....A",
    "A..##D#......A.....~~~~~~~...A",
    "A....C.......,....~~~~~~~~~..A",
    "A....C....,.......~~~~~~~~...A",
    "A....CCCCCCCCCCCCCC~~~~~~....A",
    "A....C............C..~~~.....A",
    "A..,.C...AA.......C..........A",
    "A....C..AAAA......C....A.....A",
    "A....C...AA.......CCCCCCCC...A",
    "A....C............C......C...A",
    "A..SSSSS..........C......C...A",
    "A.SWWWWWS.........C...~~~C...A",
    "A.SWWWWWS.........C..~~~~C...A",
    "A.SWWWWWS.........C..~~~~C...A",
    "A..SSSSS..........CCCCCCCC...A",
    "A............................A",
    "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
  ];

  const LARGURA_MAPA = 30;
  const MAPA = MAPA_BRUTO.map((linha) =>
    linha.length >= LARGURA_MAPA
      ? linha.slice(0, LARGURA_MAPA)
      : linha.padEnd(LARGURA_MAPA, ".")
  );
  const ALTURA_MAPA = MAPA.length;

  const TIPO_TILE = {
    ".": "grama",
    ",": "flor",
    "~": "mato",
    A: "arvore",
    W: "agua",
    C: "caminho",
    S: "areia",
    "#": "parede",
    R: "telhado",
    D: "porta",
  };

  const SOLIDO = { arvore: true, agua: true, parede: true, telhado: true, porta: true };

  const NPCS = [
    {
      x: 10,
      y: 8,
      dir: "baixo",
      falas: [
        "A névoa desce cedo por aqui.",
        "Dizem que criaturas se escondem no mato alto quando ela chega.",
      ],
    },
    {
      x: 21,
      y: 11,
      dir: "esq",
      falas: [
        "Cuidado com o mato alto!",
        "Se sua criatura cair, volte pra casa: sua mãe cura a equipe inteira.",
      ],
    },
  ];

  function tileEm(x, y) {
    if (x < 0 || y < 0 || x >= LARGURA_MAPA || y >= ALTURA_MAPA) return "arvore";
    return TIPO_TILE[MAPA[y][x]] || "grama";
  }

  const DELTA = {
    cima: [0, -1],
    baixo: [0, 1],
    esq: [-1, 0],
    dir: [1, 0],
  };

  class Mundo {
    constructor(save) {
      this.save = save;
      this.jogador = {
        x: save.pos ? save.pos.x : 5,
        y: save.pos ? save.pos.y : 6,
        dir: save.pos ? save.pos.dir : "baixo",
        deslocX: 0,
        deslocY: 0,
        frame: 0,
        passos: 0,
      };
      this.estado = "livre";
      this.tempoPasso = 0;
      this.caixa = new CaixaTexto();
      this.flash = 0;
      this.tempo = 0;
      this.mensagemInicial = true;
    }

    entrar() {
      if (this.mensagemInicial) {
        this.mensagemInicial = false;
        this.estado = "texto";
        this.caixa.mostrar(
          [
            "Vale de Viamor. A névoa ainda não levantou.",
            "Setas para andar, Z para falar e confirmar, X para voltar.",
          ],
          () => (this.estado = "livre")
        );
      }
    }

    retomar() {
      if (this.estado === "batalha") this.estado = "livre";
      Input.zerar();
    }

    npcEm(x, y) {
      return NPCS.find((n) => n.x === x && n.y === y);
    }

    podeAndar(x, y) {
      if (SOLIDO[tileEm(x, y)]) return false;
      if (this.npcEm(x, y)) return false;
      return true;
    }

    interagir() {
      const [dx, dy] = DELTA[this.jogador.dir];
      const alvoX = this.jogador.x + dx;
      const alvoY = this.jogador.y + dy;

      const npc = this.npcEm(alvoX, alvoY);
      if (npc) {
        this.estado = "texto";
        this.caixa.mostrar(npc.falas, () => (this.estado = "livre"));
        return;
      }

      if (tileEm(alvoX, alvoY) === "porta") {
        this.estado = "texto";
        const curou = this.save.equipe.some((m) => m.pv < m.pvMax);
        for (const mon of this.save.equipe) {
          mon.pv = mon.pvMax;
          for (const g of mon.golpes) g.usos = Dados.GOLPES[g.id].usos;
        }
        this.caixa.mostrar(
          curou
            ? ["Sua mãe serve um chá quente.", "Toda a equipe foi curada!"]
            : ["Sua mãe acena da porta.", "Vá com cuidado lá fora."],
          () => (this.estado = "livre")
        );
        return;
      }

      if (tileEm(alvoX, alvoY) === "agua") {
        this.estado = "texto";
        this.caixa.mostrar("A água está gelada e escura.", () => (this.estado = "livre"));
      }
    }

    tentarEncontro() {
      if (tileEm(this.jogador.x, this.jogador.y) !== "mato") return false;
      if (Math.random() > 0.14) return false;
      this.estado = "transicao";
      this.flash = 0;
      return true;
    }

    atualizar(dt) {
      this.tempo += dt;

      if (this.estado === "texto") {
        this.caixa.atualizar(dt);
        return;
      }

      if (this.estado === "transicao") {
        this.flash += dt;
        if (this.flash > 0.75) {
          this.estado = "batalha";
          const selvagem = Dados.sorteioEncontro("campo");
          Game.push(new global.Batalha(this.save, selvagem, () => Game.pop()));
        }
        return;
      }

      if (this.estado === "andando") {
        this.tempoPasso += dt;
        const duracao = 0.16;
        const t = Math.min(1, this.tempoPasso / duracao);
        this.jogador.deslocX = this.alvoDeslocX * (1 - t);
        this.jogador.deslocY = this.alvoDeslocY * (1 - t);
        if (t >= 1) {
          this.jogador.deslocX = 0;
          this.jogador.deslocY = 0;
          this.estado = "livre";
          this.jogador.passos++;
          this.jogador.frame = this.jogador.passos % 2;
          this.tentarEncontro();
        }
        return;
      }

      // estado livre
      if (Input.justPressed("a")) {
        this.interagir();
        return;
      }
      if (Input.justPressed("start") || Input.justPressed("b")) {
        Game.push(new global.MenuPausa(this.save));
        return;
      }

      let dir = null;
      if (Input.isDown("cima")) dir = "cima";
      else if (Input.isDown("baixo")) dir = "baixo";
      else if (Input.isDown("esq")) dir = "esq";
      else if (Input.isDown("dir")) dir = "dir";

      if (dir) {
        this.jogador.dir = dir;
        const [dx, dy] = DELTA[dir];
        const nx = this.jogador.x + dx;
        const ny = this.jogador.y + dy;
        if (this.podeAndar(nx, ny)) {
          this.jogador.x = nx;
          this.jogador.y = ny;
          this.alvoDeslocX = -dx * TILE;
          this.alvoDeslocY = -dy * TILE;
          this.jogador.deslocX = this.alvoDeslocX;
          this.jogador.deslocY = this.alvoDeslocY;
          this.tempoPasso = 0;
          this.estado = "andando";
          this.save.pos = { x: nx, y: ny, dir };
        } else {
          this.jogador.frame = 0;
        }
      }
    }

    camera() {
      const centroX = this.jogador.x * TILE + this.jogador.deslocX + TILE / 2;
      const centroY = this.jogador.y * TILE + this.jogador.deslocY + TILE / 2;
      const maxX = LARGURA_MAPA * TILE - Motor.LARGURA;
      const maxY = ALTURA_MAPA * TILE - Motor.ALTURA;
      return {
        x: Math.max(0, Math.min(maxX, Math.round(centroX - Motor.LARGURA / 2))),
        y: Math.max(0, Math.min(maxY, Math.round(centroY - Motor.ALTURA / 2))),
      };
    }

    desenhar(ctx) {
      const cam = this.camera();
      const inicioX = Math.floor(cam.x / TILE);
      const inicioY = Math.floor(cam.y / TILE);

      for (let ty = inicioY; ty <= inicioY + TELA_TILES_Y; ty++) {
        for (let tx = inicioX; tx <= inicioX + TELA_TILES_X; tx++) {
          const tipo = tileEm(tx, ty);
          const sx = tx * TILE - cam.x;
          const sy = ty * TILE - cam.y;
          ctx.drawImage(Sprites.tile(tipo, ((tx * 7 + ty * 13) % 5) + 1), sx, sy);
        }
      }

      for (const npc of NPCS) {
        ctx.drawImage(
          Sprites.hero(dirParaSprite(npc.dir), 0, true),
          npc.x * TILE - cam.x,
          npc.y * TILE - cam.y - 4
        );
      }

      const px = this.jogador.x * TILE + this.jogador.deslocX - cam.x;
      const py = this.jogador.y * TILE + this.jogador.deslocY - cam.y - 4;
      const frame = this.estado === "andando" ? (Math.floor(this.tempo * 8) % 2) : 0;
      ctx.drawImage(Sprites.hero(dirParaSprite(this.jogador.dir), frame), px, py);

      // mato desenhado por cima dos pés dá a sensação de estar dentro dele
      if (tileEm(this.jogador.x, this.jogador.y) === "mato") {
        const matoTile = Sprites.tile("mato", ((this.jogador.x * 7 + this.jogador.y * 13) % 5) + 1);
        ctx.drawImage(
          matoTile,
          0,
          8,
          TILE,
          8,
          this.jogador.x * TILE + this.jogador.deslocX - cam.x,
          this.jogador.y * TILE + this.jogador.deslocY - cam.y + 8,
          TILE,
          8
        );
      }

      this.desenharHudLocal(ctx);
      this.caixa.desenhar(ctx);

      if (this.estado === "transicao") {
        const pulso = Math.floor(this.flash * 12) % 2 === 0;
        ctx.fillStyle = pulso ? "rgba(255,255,255,0.75)" : "rgba(30,20,50,0.75)";
        ctx.fillRect(0, 0, Motor.LARGURA, Motor.ALTURA);
      }
    }

    desenharHudLocal(ctx) {
      if (this.estado === "texto") return;
      const lider = this.save.equipe[0];
      if (!lider) return;
      const w = 74;
      UI.janela(ctx, 2, 2, w, 26);
      Font.draw(ctx, lider.nome, 7, 5, UI.CORES.texto);
      Font.draw(ctx, "N" + lider.nivel, w - 18, 5, UI.CORES.texto);
      UI.barra(ctx, 8, 19, w - 16, lider.pv / lider.pvMax, UI.corPV(lider.pv / lider.pvMax));
    }
  }

  function dirParaSprite(dir) {
    if (dir === "cima") return "up";
    if (dir === "baixo") return "down";
    if (dir === "esq") return "left";
    return "right";
  }

  global.Mundo = Mundo;
})(window);
