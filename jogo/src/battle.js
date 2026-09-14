// Cena de batalha por turnos: ordem por velocidade, tabela de tipos, captura,
// experiência, subida de nível e evolução.
(function (global) {
  const { Game, Input, UI, CaixaTexto, Menu } = Motor;

  const POS = {
    inimigoX: 156,
    inimigoY: 16,
    jogadorX: 34,
    jogadorY: 62,
    escala: 2,
  };

  class Batalha {
    constructor(save, selvagem, aoSair) {
      this.save = save;
      this.selvagem = selvagem;
      this.aoSair = aoSair;
      this.caixa = new CaixaTexto();
      this.fila = [];
      this.estado = "intro";
      this.tempo = 0;
      this.tremorInimigo = 0;
      this.tremorJogador = 0;
      this.pvMostradoJogador = null;
      this.pvMostradoInimigo = null;
      this.participantes = new Set();
      this.encerrando = false;

      this.menuPrincipal = new Menu({
        x: 118,
        y: 112,
        w: 118,
        h: 44,
        colunas: 2,
        itens: [
          { rotulo: "Lutar", acao: "lutar" },
          { rotulo: "Frasco", acao: "frasco" },
          { rotulo: "Equipe", acao: "equipe" },
          { rotulo: "Fugir", acao: "fugir" },
        ],
        aoEscolher: (item) => this.escolherAcao(item.acao),
      });
    }

    get ativo() {
      return this.save.equipe.find((m) => m.pv > 0) || this.save.equipe[0];
    }

    entrar() {
      this.lider = this.ativo;
      this.participantes.add(this.save.equipe.indexOf(this.lider));
      this.pvMostradoJogador = this.lider.pv;
      this.pvMostradoInimigo = this.selvagem.pv;
      this.caixa.mostrar(
        [`Um ${this.selvagem.nome} selvagem apareceu!`, `Vai, ${this.lider.nome}!`],
        () => (this.estado = "menu")
      );
      this.estado = "intro";
    }

    // ------------------------------------------------------------ utilidades
    texto(msgs, depois) {
      this.fila.push({ tipo: "texto", msgs: Array.isArray(msgs) ? msgs : [msgs], depois });
    }

    acao(fn) {
      this.fila.push({ tipo: "acao", fn });
    }

    processarFila() {
      if (this.caixa.ativo) return;
      const passo = this.fila.shift();
      if (!passo) {
        if (this.encerrando) this.sairDaBatalha();
        else this.estado = "menu";
        return;
      }
      if (passo.tipo === "texto") {
        this.caixa.mostrar(passo.msgs, passo.depois);
      } else {
        passo.fn();
      }
    }

    sairDaBatalha() {
      this.encerrando = false;
      const cb = this.aoSair;
      if (cb) cb();
    }

    // --------------------------------------------------------------- ações
    escolherAcao(acao) {
      if (acao === "lutar") {
        this.abrirGolpes();
      } else if (acao === "frasco") {
        this.usarFrasco();
      } else if (acao === "equipe") {
        Game.push(
          new global.MenuEquipe(this.save, {
            aoTrocar: (indice) => this.trocar(indice),
            emBatalha: true,
          })
        );
      } else if (acao === "fugir") {
        this.tentarFugir();
      }
    }

    abrirGolpes() {
      const mon = this.lider;
      this.menuGolpes = new Menu({
        x: 4,
        y: 112,
        w: 232,
        h: 44,
        colunas: 2,
        itens: mon.golpes.map((g) => {
          const golpe = Dados.GOLPES[g.id];
          return {
            rotulo: golpe.nome,
            direita: g.usos + "/" + golpe.usos,
            desabilitado: g.usos <= 0,
            cor: Dados.TIPOS[golpe.tipo].cor,
            id: g.id,
          };
        }),
        aoEscolher: (item) => {
          this.estado = "executando";
          this.resolverTurno({ tipo: "golpe", id: item.id });
        },
        aoCancelar: () => (this.estado = "menu"),
      });
      this.estado = "golpes";
    }

    trocar(indice) {
      const novo = this.save.equipe[indice];
      if (!novo || novo.pv <= 0 || novo === this.lider) return false;
      const anterior = this.lider;
      this.lider = novo;
      this.participantes.add(indice);
      this.pvMostradoJogador = novo.pv;
      this.estado = "executando";
      this.texto([`${anterior.nome}, volte!`, `Vai, ${novo.nome}!`]);
      if (anterior.pv > 0) this.acao(() => this.turnoInimigo());
      else this.acao(() => (this.estado = "menu"));
      return true;
    }

    usarFrasco() {
      if ((this.save.itens.frasco || 0) <= 0) {
        this.estado = "executando";
        this.texto("Você não tem nenhum Frasco de Névoa.");
        return;
      }
      this.save.itens.frasco--;
      this.estado = "executando";
      this.texto(`Você lançou um ${Dados.ITENS.frasco.nome}!`);
      this.acao(() => {
        const chance = Dados.chanceCaptura(this.selvagem, Dados.ITENS.frasco.bonus);
        const sorteio = Math.random() * 255;
        const preso = sorteio < chance;
        if (preso) {
          this.texto([
            "O frasco se fecha...",
            `${this.selvagem.nome} foi capturado!`,
          ]);
          this.acao(() => {
            if (this.save.equipe.length < 6) {
              this.save.equipe.push(this.selvagem);
              this.texto(`${this.selvagem.nome} entrou para a equipe.`);
            } else {
              this.texto("A equipe está cheia. O frasco foi guardado.");
            }
            this.acao(() => this.encerrar());
          });
        } else {
          this.texto(
            sorteio > chance * 2.5
              ? "Ah! Escapou na hora!"
              : "Quase! Faltou pouco para prender."
          );
          this.acao(() => this.turnoInimigo());
        }
      });
    }

    tentarFugir() {
      this.estado = "executando";
      const chance = (this.lider.velocidade * 128) / Math.max(1, this.selvagem.velocidade) + 30;
      if (Math.random() * 256 < chance) {
        this.texto("Você escapou em segurança!");
        this.acao(() => this.encerrar());
      } else {
        this.texto("Não deu para fugir!");
        this.acao(() => this.turnoInimigo());
      }
    }

    // -------------------------------------------------------------- turnos
    resolverTurno(acaoJogador) {
      const jogadorPrimeiro = this.lider.velocidade >= this.selvagem.velocidade;
      if (jogadorPrimeiro) {
        this.atacar(this.lider, this.selvagem, acaoJogador.id, true);
        this.acao(() => {
          if (this.selvagem.pv <= 0) this.vitoria();
          else this.turnoInimigo();
        });
      } else {
        this.turnoInimigo(() => {
          if (this.lider.pv > 0) {
            this.atacar(this.lider, this.selvagem, acaoJogador.id, true);
            this.acao(() => {
              if (this.selvagem.pv <= 0) this.vitoria();
              else this.estado = "menu";
            });
          }
        });
      }
    }

    turnoInimigo(depois) {
      this.acao(() => {
        if (this.selvagem.pv <= 0) {
          if (depois) depois();
          return;
        }
        const disponiveis = this.selvagem.golpes.filter((g) => g.usos > 0);
        const escolhido = disponiveis.length
          ? disponiveis[Math.floor(Math.random() * disponiveis.length)]
          : null;
        if (!escolhido) {
          this.texto(`${this.selvagem.nome} está sem forças para atacar.`);
        } else {
          this.atacar(this.selvagem, this.lider, escolhido.id, false);
        }
        this.acao(() => {
          if (this.lider.pv <= 0) this.derrotaDoLider();
          else if (depois) depois();
          else this.estado = "menu";
        });
      });
    }

    atacar(atacante, defensor, golpeId, doJogador) {
      const golpe = Dados.GOLPES[golpeId];
      const registro = atacante.golpes.find((g) => g.id === golpeId);
      this.acao(() => {
        if (registro) registro.usos = Math.max(0, registro.usos - 1);
        const nome = doJogador ? atacante.nome : `${atacante.nome} selvagem`;
        this.texto(`${nome} usou ${golpe.nome}!`);
        this.acao(() => {
          if (!Dados.acertou(golpeId)) {
            this.texto("Mas errou!");
            return;
          }
          const { dano, mult } = Dados.calcularDano(atacante, defensor, golpeId);
          defensor.pv = Math.max(0, defensor.pv - dano);
          if (doJogador) this.tremorInimigo = 0.35;
          else this.tremorJogador = 0.35;
          if (mult > 1) this.texto("Foi muito eficaz!");
          else if (mult < 1) this.texto("Não foi muito eficaz...");
          this.acao(() => {
            if (defensor.pv <= 0) {
              const nomeAlvo = doJogador ? `${defensor.nome} selvagem` : defensor.nome;
              this.texto(`${nomeAlvo} desmaiou!`);
            }
          });
        });
      });
    }

    // ------------------------------------------------------- fim de batalha
    vitoria() {
      const ganho = Dados.xpGanho(this.selvagem.especie, this.selvagem.nivel);
      const indices = Array.from(this.participantes).filter(
        (i) => this.save.equipe[i] && this.save.equipe[i].pv > 0
      );
      const porMon = Math.max(1, Math.floor(ganho / Math.max(1, indices.length)));

      for (const i of indices) {
        const mon = this.save.equipe[i];
        this.texto(`${mon.nome} ganhou ${porMon} de experiência!`);
        this.acao(() => this.aplicarXp(mon, porMon));
      }
      this.acao(() => this.encerrar());
    }

    aplicarXp(mon, quantidade) {
      mon.xp += quantidade;
      while (mon.nivel < 60 && mon.xp >= Dados.xpParaProximo(mon.nivel)) {
        mon.xp -= Dados.xpParaProximo(mon.nivel);
        mon.nivel++;
        Dados.recalcular(mon);
        this.texto(`${mon.nome} subiu para o nível ${mon.nivel}!`);

        const aprendidos = mon.golpes.map((g) => g.id);
        const novos = Dados.ESPECIES[mon.especie].aprende
          .filter(([lv, id]) => lv === mon.nivel && !aprendidos.includes(id))
          .map(([, id]) => id);
        for (const id of novos) {
          this.acao(() => {
            if (mon.golpes.length < 4) {
              mon.golpes.push({ id, usos: Dados.GOLPES[id].usos });
              this.texto(`${mon.nome} aprendeu ${Dados.GOLPES[id].nome}!`);
            } else {
              const esquecido = mon.golpes.shift();
              mon.golpes.push({ id, usos: Dados.GOLPES[id].usos });
              this.texto([
                `${mon.nome} esqueceu ${Dados.GOLPES[esquecido.id].nome}...`,
                `E aprendeu ${Dados.GOLPES[id].nome}!`,
              ]);
            }
          });
        }

        const evolucao = Dados.ESPECIES[mon.especie].evolui;
        if (evolucao && mon.nivel >= evolucao.nivel) {
          this.acao(() => {
            const antigo = mon.nome;
            mon.especie = evolucao.em;
            mon.nome = Dados.ESPECIES[evolucao.em].nome;
            Dados.recalcular(mon);
            this.texto([`O quê? ${antigo} está mudando!`, `${antigo} evoluiu para ${mon.nome}!`]);
          });
        }
      }
    }

    derrotaDoLider() {
      const proximo = this.save.equipe.findIndex((m) => m.pv > 0);
      if (proximo === -1) {
        this.texto(["Toda a sua equipe caiu...", "Você voltou correndo para casa."]);
        this.acao(() => {
          for (const mon of this.save.equipe) {
            mon.pv = mon.pvMax;
            for (const g of mon.golpes) g.usos = Dados.GOLPES[g.id].usos;
          }
          this.save.pos = { x: 5, y: 6, dir: "baixo" };
          this.encerrar();
        });
      } else {
        this.acao(() => {
          this.lider = this.save.equipe[proximo];
          this.participantes.add(proximo);
          this.pvMostradoJogador = this.lider.pv;
          this.texto(`Vai, ${this.lider.nome}!`);
          this.acao(() => (this.estado = "menu"));
        });
      }
    }

    encerrar() {
      this.encerrando = true;
      global.Save.salvar(this.save);
    }

    // ------------------------------------------------------------- laço
    atualizar(dt) {
      this.tempo += dt;
      this.tremorInimigo = Math.max(0, this.tremorInimigo - dt);
      this.tremorJogador = Math.max(0, this.tremorJogador - dt);

      const alvoJog = this.lider ? this.lider.pv : 0;
      const alvoIni = this.selvagem.pv;
      const passo = 60 * dt;
      if (this.pvMostradoJogador !== null) {
        const d = alvoJog - this.pvMostradoJogador;
        this.pvMostradoJogador += Math.sign(d) * Math.min(Math.abs(d), passo);
      }
      if (this.pvMostradoInimigo !== null) {
        const d = alvoIni - this.pvMostradoInimigo;
        this.pvMostradoInimigo += Math.sign(d) * Math.min(Math.abs(d), passo);
      }

      this.caixa.atualizar(dt);

      if (this.estado === "intro") return;
      if (this.estado === "executando") {
        this.processarFila();
        return;
      }
      if (this.caixa.ativo) return;
      if (this.estado === "menu") this.menuPrincipal.atualizar();
      else if (this.estado === "golpes") this.menuGolpes.atualizar();
    }

    // ---------------------------------------------------------- desenho
    desenhar(ctx) {
      this.fundo(ctx);

      const tremIni = this.tremorInimigo > 0 ? (Math.random() * 4 - 2) | 0 : 0;
      const tremJog = this.tremorJogador > 0 ? (Math.random() * 4 - 2) | 0 : 0;

      const spriteIni = Sprites.creature(this.selvagem.especie);
      ctx.drawImage(
        spriteIni,
        POS.inimigoX + tremIni,
        POS.inimigoY + Math.sin(this.tempo * 2) * 1,
        24 * POS.escala,
        24 * POS.escala
      );

      if (this.lider) {
        const spriteJog = Sprites.creature(this.lider.especie);
        ctx.drawImage(
          spriteJog,
          POS.jogadorX + tremJog,
          POS.jogadorY,
          24 * POS.escala,
          24 * POS.escala
        );
      }

      this.painelInimigo(ctx);
      if (this.lider) this.painelJogador(ctx);

      if (this.estado === "menu" && !this.caixa.ativo) {
        UI.janela(ctx, 4, 112, 110, 44);
        Font.draw(ctx, "O que fazer?", 12, 126, UI.CORES.texto);
        this.menuPrincipal.desenhar(ctx);
      } else if (this.estado === "golpes" && !this.caixa.ativo) {
        this.menuGolpes.desenhar(ctx);
        const sel = this.menuGolpes.itens[this.menuGolpes.indice];
        if (sel) {
          const golpe = Dados.GOLPES[sel.id];
          Font.draw(
            ctx,
            "Tipo " + Dados.TIPOS[golpe.tipo].nome + "   Poder " + golpe.poder,
            12,
            140,
            UI.CORES.texto
          );
        }
      }

      this.caixa.desenhar(ctx);
    }

    fundo(ctx) {
      const g = ctx.createLinearGradient(0, 0, 0, Motor.ALTURA);
      g.addColorStop(0, "#cfe3f5");
      g.addColorStop(0.7, "#eef3dc");
      g.addColorStop(1, "#cfd9b8");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, Motor.LARGURA, Motor.ALTURA);

      ctx.fillStyle = "#b9cf9a";
      ctx.beginPath();
      ctx.ellipse(POS.inimigoX + 24, POS.inimigoY + 48, 36, 9, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(POS.jogadorX + 24, POS.jogadorY + 48, 40, 10, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "rgba(255,255,255,0.35)";
      for (let i = 0; i < 6; i++) {
        const x = ((this.tempo * 6 + i * 47) % 280) - 40;
        ctx.fillRect(x, 20 + i * 13, 30, 2);
      }
    }

    painelInimigo(ctx) {
      const w = 104;
      UI.janela(ctx, 8, 8, w, 26);
      Font.draw(ctx, this.selvagem.nome, 14, 11, UI.CORES.texto);
      const nivel = "N" + this.selvagem.nivel;
      Font.draw(ctx, nivel, 8 + w - 8 - Font.measure(nivel), 11, UI.CORES.texto);
      const razao = this.pvMostradoInimigo / this.selvagem.pvMax;
      UI.barra(ctx, 16, 25, w - 26, razao, UI.corPV(razao));
    }

    painelJogador(ctx) {
      const w = 108;
      const x = 124;
      const y = 60;
      UI.janela(ctx, x, y, w, 44);
      Font.draw(ctx, this.lider.nome, x + 6, y + 4, UI.CORES.texto);
      const nivel = "N" + this.lider.nivel;
      Font.draw(ctx, nivel, x + w - 8 - Font.measure(nivel), y + 4, UI.CORES.texto);
      const razao = this.pvMostradoJogador / this.lider.pvMax;
      UI.barra(ctx, x + 8, y + 18, w - 18, razao, UI.corPV(razao));
      const pv = Math.max(0, Math.round(this.pvMostradoJogador)) + "/" + this.lider.pvMax;
      Font.draw(ctx, pv, x + w - 8 - Font.measure(pv), y + 22, UI.CORES.texto);
      Font.draw(ctx, "XP", x + 8, y + 22, "#6b6180");
      const xpRazao = this.lider.xp / Dados.xpParaProximo(this.lider.nivel);
      UI.barra(ctx, x + 8, y + 36, w - 18, xpRazao, UI.CORES.xp);
    }
  }

  global.Batalha = Batalha;
})(window);
