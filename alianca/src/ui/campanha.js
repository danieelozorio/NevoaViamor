// Telas de Campanha (com a oferta ociosa), Torre da Provação e Missões.
(function (global) {
  const Jogo = (global.Jogo = global.Jogo || {});
  const UI = Jogo.UI;
  const E = Jogo.Estado;
  const U = Jogo.Util;
  const F = Jogo.Formulas;

  // ------------------------------------------------------- oferta ociosa
  function cartaoOcioso() {
    const c = UI.el("div", "cartao");
    c.appendChild(UI.el("h2", null, "Oferta da Vigília"));
    c.appendChild(
      UI.el("p", null, "A hoste combate sozinha enquanto você descansa. O altar guarda até 12 horas de oferta.")
    );

    const ms = E.tempoOcioso();
    const barra = UI.el("div", "barra-ociosa");
    const preenchimento = UI.el("span");
    preenchimento.style.width = Math.min(100, (ms / E.tetoOciosoMs) * 100) + "%";
    barra.appendChild(preenchimento);
    c.appendChild(barra);

    const recompensa = E.recompensaOciosa();
    const info = UI.el("div", "legenda", U.tempo(ms) + " acumulados" + (ms >= E.tetoOciosoMs ? " (altar cheio)" : ""));
    c.appendChild(info);
    c.appendChild(UI.listaGanhos(recompensa));

    const taxa = E.taxaOciosa();
    c.appendChild(
      UI.el(
        "p",
        "legenda",
        "Por hora: " + U.numero(taxa.ouro) + " ouro · " + U.numero(taxa.essencia) + " óleo · " +
          taxa.pergaminhos.toFixed(1) + " pergaminhos · " + taxa.fe.toFixed(1) + " fé"
      )
    );

    const botao = UI.el("button", "botao", "Recolher oferta");
    botao.onclick = () => {
      const r = E.coletarOcioso();
      if (!r.ok) return UI.aviso(r.motivo);
      UI.aviso("Oferta recolhida!");
      UI.render();
    };
    c.appendChild(botao);
    return c;
  }

  // ------------------------------------------------------------- campanha
  function cenarioDe(capitulo) {
    const cap = Jogo.Capitulos[capitulo];
    return { ceu: cap.ceu, chao: cap.chao };
  }

  function selecionados() {
    if (UI.selCapitulo == null) {
      UI.selCapitulo = E.dados.campanha.capitulo;
      UI.selEstagio = E.dados.campanha.estagio;
    }
    return { capitulo: UI.selCapitulo, estagio: UI.selEstagio };
  }

  function desbloqueado(capitulo, estagio) {
    const c = E.dados.campanha;
    return E.indiceEstagio(capitulo, estagio) <= E.indiceEstagio(c.capitulo, c.estagio);
  }

  function telaCampanha() {
    const frag = document.createDocumentFragment();
    frag.appendChild(cartaoOcioso());

    const sel = selecionados();
    const cap = Jogo.Capitulos[sel.capitulo];
    const c = UI.el("div", "cartao");

    const topo = UI.el("div", "cabecalho-capitulo");
    const esquerda = UI.el("div");
    esquerda.appendChild(UI.el("h2", null, (sel.capitulo + 1) + ". " + cap.nome));
    esquerda.appendChild(UI.el("div", "legenda", cap.subtitulo));
    topo.appendChild(esquerda);

    const selo = UI.el("div", "selo-estagio");
    selo.innerHTML = "<b>" + (sel.estagio + 1) + "</b>estágio";
    topo.appendChild(selo);
    c.appendChild(topo);

    c.appendChild(UI.el("p", null, cap.texto));

    // navegação de capítulos
    const nav = UI.el("div", "linha-botoes");
    const anterior = UI.el("button", "botao secundario pequeno", "‹ Capítulo");
    anterior.disabled = sel.capitulo === 0;
    anterior.onclick = () => {
      UI.selCapitulo -= 1;
      UI.selEstagio = 0;
      UI.render();
    };
    const proximo = UI.el("button", "botao secundario pequeno", "Capítulo ›");
    proximo.disabled = sel.capitulo >= E.dados.campanha.capitulo || sel.capitulo >= Jogo.Capitulos.length - 1;
    proximo.onclick = () => {
      UI.selCapitulo += 1;
      UI.selEstagio = 0;
      UI.render();
    };
    nav.appendChild(anterior);
    nav.appendChild(proximo);
    c.appendChild(nav);

    // grade de estágios
    const grade = UI.el("div", "grade-estagios");
    for (let i = 0; i < Jogo.ESTAGIOS_POR_CAPITULO; i++) {
      const b = UI.el("button", "filtro" + (i === sel.estagio ? " ativo" : ""), String(i + 1));
      const aberto = desbloqueado(sel.capitulo, i);
      if (!aberto) {
        b.textContent = "🔒";
        b.disabled = true;
      } else {
        b.onclick = () => {
          UI.selEstagio = i;
          UI.render();
        };
      }
      grade.appendChild(b);
    }
    c.appendChild(grade);

    // prévia dos inimigos
    const inimigos = E.montarInimigos(sel.capitulo, sel.estagio, { rng: U.semente(sel.capitulo * 100 + sel.estagio) });
    const fileira = UI.el("div", "fileira-retratos");
    inimigos.forEach((i) => {
      const item = UI.el("div", "retrato-mini");
      item.appendChild(UI.retrato(i.def, 46));
      item.appendChild(UI.el("small", null, i.def.nome));
      fileira.appendChild(item);
    });
    c.appendChild(fileira);

    const meuPoder = E.poderTotal();
    const poderInimigo = inimigos.reduce((t, i) => t + F.poder(i.stats), 0);
    const poderes = UI.el("div", "poderes");
    const a = UI.el("div", "poder aliado");
    a.innerHTML = "<small>Sua hoste</small><b>" + U.numero(meuPoder) + "</b>";
    const vs = UI.el("div", "poder-vs", "vs");
    const b = UI.el("div", "poder inimigo");
    b.innerHTML = "<small>Inimigos</small><b>" + U.numero(poderInimigo) + "</b>";
    poderes.appendChild(a);
    poderes.appendChild(vs);
    poderes.appendChild(b);
    c.appendChild(poderes);

    const chance = meuPoder / (poderInimigo || 1);
    c.appendChild(
      UI.el("p", "legenda", chance > 1.35 ? "A vitória parece certa." : chance > 0.95 ? "Combate equilibrado." : chance > 0.7 ? "A hoste está em desvantagem." : "Reforce a hoste antes de avançar.")
    );

    const batalhar = UI.el("button", "botao", "Marchar para a batalha");
    batalhar.onclick = () => lutarCampanha(sel.capitulo, sel.estagio);
    c.appendChild(batalhar);

    if (desbloqueado(sel.capitulo, sel.estagio) && E.indiceEstagio(sel.capitulo, sel.estagio) < E.indiceEstagio(E.dados.campanha.capitulo, E.dados.campanha.estagio)) {
      const rapida = UI.el("button", "botao secundario pequeno", "Varredura rápida (sem animação)");
      rapida.onclick = () => {
        const r = UI.batalhaRapida(E.montarInimigos(sel.capitulo, sel.estagio));
        if (!r) return UI.aviso("Escolha ao menos um herói.");
        if (r.vencedor === "aliados") {
          const res = E.registrarVitoria(sel.capitulo, sel.estagio);
          UI.aviso("Vitória rápida! +" + U.numero(res.ganho.ouro) + " ouro");
        } else {
          E.registrarDerrota();
          UI.aviso("A hoste foi derrotada.");
        }
        UI.render();
      };
      c.appendChild(rapida);
    }

    frag.appendChild(c);
    return frag;
  }

  function lutarCampanha(capitulo, estagio) {
    const cap = Jogo.Capitulos[capitulo];
    const chefe = estagio === Jogo.ESTAGIOS_POR_CAPITULO - 1;
    UI.iniciarBatalha({
      inimigos: E.montarInimigos(capitulo, estagio),
      titulo: cap.nome + " " + (capitulo + 1) + "-" + (estagio + 1),
      sub: chefe ? "Confronto com o guardião do capítulo" : cap.subtitulo,
      cenario: cenarioDe(capitulo),
      aoFim: (resultado) => {
        if (resultado.vencedor === "aliados") {
          const r = E.registrarVitoria(capitulo, estagio);
          UI.selCapitulo = E.dados.campanha.capitulo;
          UI.selEstagio = E.dados.campanha.estagio;
          return {
            texto: r.primeiraVez ? "Novo estágio conquistado — a oferta da vigília aumenta." : "Estágio repetido.",
            ganho: r.ganho,
            botoes: [
              { texto: "Próxima batalha", acao: () => { UI.fecharBatalha(); lutarCampanha(E.dados.campanha.capitulo, E.dados.campanha.estagio); } },
              { texto: "Voltar", acao: UI.fecharBatalha, secundario: true },
            ],
          };
        }
        E.registrarDerrota();
        return {
          texto: "Evolua a hoste, ascenda heróis ou invoque reforços antes de tentar de novo.",
          botoes: [
            { texto: "Tentar de novo", acao: () => { UI.fecharBatalha(); lutarCampanha(capitulo, estagio); } },
            { texto: "Voltar", acao: UI.fecharBatalha, secundario: true },
          ],
        };
      },
    });
  }

  // ----------------------------------------------------------------- torre
  function telaTorre() {
    const frag = document.createDocumentFragment();
    const t = E.dados.torre;
    const c = UI.el("div", "cartao");
    c.appendChild(UI.el("h2", null, "Torre da Provação"));
    c.appendChild(UI.el("p", null, "Andares sem fim. Cada degrau é mais duro que o anterior e paga em fé — a moeda das invocações raras."));

    const selo = UI.el("div", "selo-estagio");
    selo.innerHTML = "<b>" + t.andar + "</b>andar atual";
    c.appendChild(selo);
    c.appendChild(UI.el("p", "legenda", "Melhor marca: andar " + (t.melhor || 0)));

    const inimigos = E.inimigosTorre(t.andar);
    const fileira = UI.el("div", "fileira-retratos");
    inimigos.forEach((i) => {
      const item = UI.el("div", "retrato-mini");
      item.appendChild(UI.retrato(i.def, 46));
      item.appendChild(UI.el("small", null, i.def.nome));
      fileira.appendChild(item);
    });
    c.appendChild(fileira);

    const poderes = UI.el("div", "poderes");
    poderes.innerHTML =
      '<div class="poder aliado"><small>Sua hoste</small><b>' + U.numero(E.poderTotal()) +
      '</b></div><div class="poder-vs">vs</div><div class="poder inimigo"><small>Andar ' + t.andar + '</small><b>' +
      U.numero(inimigos.reduce((s, i) => s + F.poder(i.stats), 0)) + "</b></div>";
    c.appendChild(poderes);

    const botao = UI.el("button", "botao", "Subir o andar " + t.andar);
    botao.onclick = () => {
      UI.iniciarBatalha({
        inimigos: E.inimigosTorre(t.andar),
        titulo: "Torre da Provação",
        sub: "Andar " + t.andar,
        cenario: { ceu: ["#161228", "#3a2a5a"], chao: "#2a2438" },
        aoFim: (resultado) => {
          if (resultado.vencedor === "aliados") {
            const ganho = E.vencerTorre();
            return {
              texto: "O andar cede. A hoste sobe mais um degrau.",
              ganho,
              botoes: [
                { texto: "Próximo andar", acao: () => { UI.fecharBatalha(); UI.irPara("torre"); } },
                { texto: "Voltar", acao: UI.fecharBatalha, secundario: true },
              ],
            };
          }
          E.registrarDerrota();
          return { texto: "A provação continua. Volte mais forte." };
        },
      });
    };
    c.appendChild(botao);
    frag.appendChild(c);
    return frag;
  }

  // -------------------------------------------------------------- missões
  function telaMissoes() {
    const frag = document.createDocumentFragment();
    E.checarDia();

    const c = UI.el("div", "cartao");
    c.appendChild(UI.el("h2", null, "Missões do dia"));
    c.appendChild(UI.el("p", null, "Reiniciam a cada dia. Cumpra-as para acelerar a hoste."));

    E.MISSOES.forEach((m) => {
      const progresso = Math.min(m.meta, E.dados.missoes[m.campo] || 0);
      const feita = E.dados.missoes.resgatadas.indexOf(m.id) >= 0;
      const linha = UI.el("div", "missao");
      const info = UI.el("div", "info");
      info.appendChild(UI.el("div", null, m.nome));
      const premio = Object.keys(m.premio).map((k) => UI.recursoIcone[k] + " " + U.numero(m.premio[k])).join("  ");
      info.appendChild(UI.el("small", null, progresso + "/" + m.meta + " · " + premio));
      const barra = UI.el("div", "barra-missao");
      const preenchido = UI.el("span");
      preenchido.style.width = (progresso / m.meta) * 100 + "%";
      barra.appendChild(preenchido);
      info.appendChild(barra);
      linha.appendChild(info);

      const botao = UI.el("button", "botao-mini", feita ? "Resgatada" : "Resgatar");
      botao.disabled = feita || progresso < m.meta;
      botao.onclick = () => {
        const r = E.resgatarMissao(m.id);
        if (!r.ok) return UI.aviso(r.motivo || "Indisponível");
        UI.aviso("Recompensa recebida!");
        UI.render();
      };
      linha.appendChild(botao);
      c.appendChild(linha);
    });
    frag.appendChild(c);

    // facções
    const f = UI.el("div", "cartao");
    f.appendChild(UI.el("h2", null, "Roda das facções"));
    f.appendChild(UI.el("p", null, "Quem domina causa +30% de dano e recebe menos. Celestiais e Trevas se anulam mutuamente."));
    const ciclo = UI.el("p", "legenda");
    ciclo.innerHTML = "Patriarcas ▸ Juízes ▸ Profetas ▸ Realeza ▸ Patriarcas<br>Celestiais ◂▸ Trevas";
    f.appendChild(ciclo);
    const lista = UI.el("div", "filtros");
    Object.keys(F.FACCOES).forEach((chave) => {
      const n = UI.el("span", "filtro", F.FACCOES[chave].icone + " " + F.FACCOES[chave].nome);
      n.style.color = F.FACCOES[chave].cor;
      lista.appendChild(n);
    });
    f.appendChild(lista);
    frag.appendChild(f);

    // estatísticas
    const s = UI.el("div", "cartao");
    s.appendChild(UI.el("h2", null, "Crônicas"));
    const est = E.dados.estatisticas;
    const grade = UI.el("div", "atributos");
    const linhas = [
      ["Batalhas", est.batalhas],
      ["Vitórias", est.vitorias],
      ["Derrotas", est.derrotas],
      ["Estágios vencidos", E.dados.campanha.vencidos + "/" + Jogo.TOTAL_ESTAGIOS],
      ["Heróis recrutados", Object.keys(E.dados.herois).length + "/" + Jogo.Herois.length],
      ["Invocações", E.dados.invocacoes.total],
      ["Nível máximo atual", E.nivelMaximo()],
      ["Poder da hoste", U.numero(E.poderTotal())],
    ];
    linhas.forEach(([nome, valor]) => {
      const d = UI.el("div");
      d.appendChild(UI.el("span", null, nome));
      d.appendChild(UI.el("b", null, String(valor)));
      grade.appendChild(d);
    });
    s.appendChild(grade);

    const reiniciar = UI.el("button", "botao secundario pequeno", "Recomeçar a jornada");
    reiniciar.onclick = () => {
      const caixa = UI.el("div");
      caixa.appendChild(UI.el("h2", null, "Recomeçar?"));
      caixa.appendChild(UI.el("p", null, "Todo o progresso — heróis, níveis e campanha — será perdido. Não há como desfazer."));
      const sim = UI.el("button", "botao", "Sim, recomeçar do início");
      sim.onclick = () => {
        E.reiniciar();
        UI.fecharModal();
        UI.selCapitulo = null;
        UI.irPara("campanha");
        UI.aviso("Uma nova jornada começa.");
      };
      const nao = UI.el("button", "botao secundario", "Cancelar");
      nao.onclick = UI.fecharModal;
      caixa.appendChild(sim);
      caixa.appendChild(nao);
      UI.abrirModal(caixa);
    };
    s.appendChild(reiniciar);
    frag.appendChild(s);

    return frag;
  }

  Jogo.Telas.campanha = telaCampanha;
  Jogo.Telas.torre = telaTorre;
  Jogo.Telas.missoes = telaMissoes;
})(typeof window !== "undefined" ? window : globalThis);
