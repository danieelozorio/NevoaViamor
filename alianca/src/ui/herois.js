// Telas da Hoste (elenco, formação, evolução) e da Invocação.
(function (global) {
  const Jogo = (global.Jogo = global.Jogo || {});
  const UI = Jogo.UI;
  const E = Jogo.Estado;
  const U = Jogo.Util;
  const F = Jogo.Formulas;

  const NOMES_RELIQUIA = ["Arma", "Vestes", "Elmo", "Sandálias"];

  // ------------------------------------------------------------- formação
  function cartaoFormacao() {
    const c = UI.el("div", "cartao");
    c.appendChild(UI.el("h2", null, "Hoste de batalha"));
    c.appendChild(UI.el("p", null, "Até cinco heróis. Guerreiros seguram a linha de frente; os demais atacam da retaguarda."));

    const fileira = UI.el("div", "fileira-retratos");
    for (let i = 0; i < 5; i++) {
      const id = E.dados.formacao[i];
      const item = UI.el("div", "retrato-mini");
      if (id) {
        const def = Jogo.heroiPorId(id);
        item.appendChild(UI.retrato(def, 46));
        item.appendChild(UI.el("small", null, def.nome));
        item.onclick = () => abrirDetalhe(id);
      } else {
        const vazio = UI.el("canvas");
        vazio.style.width = "46px";
        vazio.style.height = "46px";
        vazio.style.opacity = "0.25";
        item.appendChild(vazio);
        item.appendChild(UI.el("small", null, "vazio"));
      }
      fileira.appendChild(item);
    }
    c.appendChild(fileira);
    c.appendChild(UI.el("p", "legenda", "Poder total: " + U.numero(E.poderTotal()) + " · teto de nível: " + E.nivelMaximo()));
    return c;
  }

  // ---------------------------------------------------------------- lista
  function telaHerois() {
    const frag = document.createDocumentFragment();
    frag.appendChild(cartaoFormacao());

    const c = UI.el("div", "cartao");
    c.appendChild(UI.el("h2", null, "Elenco"));

    const filtros = UI.el("div", "filtros");
    const opcoes = [["todos", "Todos"], ["hoste", "Na hoste"]]
      .concat(Object.keys(F.FACCOES).map((k) => [k, F.FACCOES[k].nome]))
      .concat([["codex", "Códex"]]);
    opcoes.forEach(([chave, nome]) => {
      const b = UI.el("button", "filtro" + (UI.filtroHerois === chave ? " ativo" : ""), nome);
      b.onclick = () => {
        UI.filtroHerois = chave;
        UI.render();
      };
      filtros.appendChild(b);
    });
    c.appendChild(filtros);

    const codex = UI.filtroHerois === "codex";
    let lista = codex ? Jogo.Herois.slice() : Jogo.Herois.filter((h) => E.dados.herois[h.id]);
    if (UI.filtroHerois === "hoste") lista = lista.filter((h) => E.dados.formacao.indexOf(h.id) >= 0);
    else if (F.FACCOES[UI.filtroHerois]) lista = lista.filter((h) => h.faccao === UI.filtroHerois);

    lista.sort((a, b) => {
      const ta = E.dados.herois[a.id] ? E.poderDe(a.id) : -1;
      const tb = E.dados.herois[b.id] ? E.poderDe(b.id) : -1;
      return tb - ta;
    });

    const grade = UI.el("div", "grade-herois");
    lista.forEach((h) => grade.appendChild(cartaHeroi(h)));
    if (!lista.length) c.appendChild(UI.el("p", "legenda", "Nenhum herói aqui ainda."));
    c.appendChild(grade);
    frag.appendChild(c);
    return frag;
  }

  function cartaHeroi(heroi) {
    const ficha = E.fichaDe(heroi.id);
    const n = UI.el("div", "carta-heroi" + (E.dados.formacao.indexOf(heroi.id) >= 0 ? " na-hoste" : ""));
    const canvas = UI.el("canvas");
    n.appendChild(canvas);
    setTimeout(() => Jogo.Arte.retrato(canvas, heroi, {}), 0);

    if (!ficha) {
      n.style.opacity = "0.4";
      n.appendChild(UI.el("span", "nome", heroi.nome));
      n.appendChild(UI.el("span", "estrelas", "não recrutado"));
    } else {
      const nivel = UI.el("span", "nivel", "Nv " + ficha.nivel);
      n.appendChild(nivel);
      n.appendChild(UI.el("span", "nome", heroi.nome));
      n.appendChild(UI.el("span", "estrelas", UI.estrelas(ficha.estrelas)));
    }
    const classe = UI.el("span", "classe", F.CLASSES[heroi.classe].icone);
    n.appendChild(classe);
    const faixa = UI.el("span", "faixa-raridade");
    faixa.style.background = F.RARIDADES[heroi.raridade].cor;
    n.appendChild(faixa);
    n.onclick = () => abrirDetalhe(heroi.id);
    return n;
  }

  // -------------------------------------------------------------- detalhe
  function abrirDetalhe(id) {
    const heroi = Jogo.heroiPorId(id);
    const ficha = E.fichaDe(id);
    const caixa = UI.el("div");

    const topo = UI.el("div", "detalhe-topo");
    const canvas = UI.el("canvas");
    topo.appendChild(canvas);
    setTimeout(() => Jogo.Arte.retrato(canvas, heroi, { tamanho: 104 }), 0);

    const info = UI.el("div");
    info.appendChild(UI.el("h2", null, heroi.nome));
    info.appendChild(UI.el("div", "legenda", heroi.titulo));
    const etiquetas = UI.el("div", "filtros");
    const fac = UI.el("span", "filtro", F.FACCOES[heroi.faccao].icone + " " + F.FACCOES[heroi.faccao].nome);
    fac.style.color = F.FACCOES[heroi.faccao].cor;
    const cls = UI.el("span", "filtro", F.CLASSES[heroi.classe].icone + " " + F.CLASSES[heroi.classe].nome);
    const rar = UI.el("span", "filtro", F.RARIDADES[heroi.raridade].nome);
    rar.style.color = F.RARIDADES[heroi.raridade].cor;
    etiquetas.appendChild(fac);
    etiquetas.appendChild(cls);
    etiquetas.appendChild(rar);
    info.appendChild(etiquetas);
    if (ficha) info.appendChild(UI.el("div", "legenda", "Nível " + ficha.nivel + " · " + UI.estrelas(ficha.estrelas)));
    topo.appendChild(info);
    caixa.appendChild(topo);

    if (!ficha) {
      caixa.appendChild(UI.el("p", null, "Ainda não recrutado. Invoque-o com pergaminhos sagrados."));
      caixa.appendChild(descricaoHabilidades(heroi));
      UI.abrirModal(caixa);
      return;
    }

    // atributos
    const s = E.atributosDe(id);
    const grade = UI.el("div", "atributos");
    [
      ["Vida", U.numero(s.vida)],
      ["Ataque", U.numero(s.atk)],
      ["Defesa", U.numero(s.def)],
      ["Velocidade", s.spd],
      ["Crítico", U.porcento(s.crit)],
      ["Dano crítico", "×" + s.critDano.toFixed(2)],
      ["Poder", U.numero(F.poder(s))],
      ["Fragmentos", (E.dados.fragmentos[id] || 0)],
    ].forEach(([nome, valor]) => {
      const d = UI.el("div");
      d.appendChild(UI.el("span", null, nome));
      d.appendChild(UI.el("b", null, String(valor)));
      grade.appendChild(d);
    });
    caixa.appendChild(grade);

    caixa.appendChild(descricaoHabilidades(heroi));

    // evolução
    const teto = E.nivelMaximo();
    const custo = F.custoNivel(ficha.nivel);
    const evolucao = UI.el("div", "cartao");
    evolucao.appendChild(UI.el("h3", null, "Evolução"));
    evolucao.appendChild(
      UI.el("p", "legenda", ficha.nivel >= teto
        ? "Teto de nível atingido — avance na campanha para elevá-lo."
        : "Próximo nível: " + U.numero(custo.ouro) + " ouro + " + U.numero(custo.essencia) + " óleo")
    );

    const linha = UI.el("div", "linha-botoes");
    [1, 10].forEach((vezes) => {
      const b = UI.el("button", "botao pequeno", "Subir ×" + vezes);
      b.disabled = ficha.nivel >= teto;
      b.onclick = () => {
        const r = E.subirNivel(id, vezes);
        if (!r.ok) return UI.aviso(r.motivo);
        UI.aviso("Nível " + E.fichaDe(id).nivel + "!");
        abrirDetalhe(id);
        UI.atualizarRecursos();
      };
      linha.appendChild(b);
    });
    evolucao.appendChild(linha);

    const maxEstrelas = F.RARIDADES[heroi.raridade].estrelasMax;
    const custoEstrela = F.custoEstrela(ficha.estrelas, heroi.raridade);
    const ascender = UI.el("button", "botao secundario pequeno",
      ficha.estrelas >= maxEstrelas
        ? "Ascensão máxima (" + UI.estrelas(maxEstrelas) + ")"
        : "Ascender — " + custoEstrela.fragmentos + " fragmentos");
    ascender.disabled = ficha.estrelas >= maxEstrelas;
    ascender.onclick = () => {
      const r = E.subirEstrela(id);
      if (!r.ok) return UI.aviso(r.motivo);
      UI.aviso(heroi.nome + " ascende a " + UI.estrelas(r.estrelas));
      abrirDetalhe(id);
      UI.atualizarRecursos();
    };
    evolucao.appendChild(ascender);
    caixa.appendChild(evolucao);

    // relíquias
    const rel = UI.el("div", "cartao");
    rel.appendChild(UI.el("h3", null, "Relíquias"));
    rel.appendChild(UI.el("p", "legenda", "Cada nível de relíquia soma 1,8% a todos os atributos."));
    const grelha = UI.el("div", "reliquias");
    NOMES_RELIQUIA.forEach((nome, slot) => {
      const nivel = ficha.reliquias[slot] || 0;
      const custoRel = F.custoReliquia(nivel);
      const n = UI.el("div", "reliquia");
      n.innerHTML = "<b>+" + nivel + "</b>" + nome + "<br><small>" + U.numero(custoRel.ouro) + " 🪙</small>";
      n.onclick = () => {
        const r = E.subirReliquia(id, slot);
        if (!r.ok) return UI.aviso(r.motivo);
        UI.aviso(nome + " reforçada!");
        abrirDetalhe(id);
        UI.atualizarRecursos();
      };
      grelha.appendChild(n);
    });
    rel.appendChild(grelha);
    caixa.appendChild(rel);

    // formação
    const naHoste = E.dados.formacao.indexOf(id) >= 0;
    const botaoHoste = UI.el("button", "botao", naHoste ? "Retirar da hoste" : "Convocar para a hoste");
    botaoHoste.onclick = () => {
      const r = E.alternarNaFormacao(id);
      if (!r.ok) return UI.aviso(r.motivo);
      UI.fecharModal();
      UI.render();
    };
    caixa.appendChild(botaoHoste);

    UI.abrirModal(caixa);
  }

  function descricaoHabilidades(heroi) {
    const n = UI.el("div");
    const ult = UI.el("div", "habilidade");
    ult.innerHTML = "<b>✦ " + heroi.ult.nome + "</b> <small>" + heroi.ult.desc + "</small>";
    n.appendChild(ult);
    if (heroi.passiva) {
      const p = UI.el("div", "habilidade");
      p.innerHTML = "<b>● " + heroi.passiva.nome + "</b> <small>" + heroi.passiva.desc + "</small>";
      n.appendChild(p);
    }
    if (heroi.versiculo) n.appendChild(UI.el("p", "legenda", "“" + heroi.versiculo + "”"));
    return n;
  }

  // ------------------------------------------------------------ invocação
  const CUSTO_FE_PERGAMINHO = 60;

  function telaInvocacao() {
    const frag = document.createDocumentFragment();
    const c = UI.el("div", "cartao");
    c.appendChild(UI.el("h2", null, "Invocação"));
    c.appendChild(UI.el("p", null, "Acenda o altar e chame os heróis das Escrituras. Heróis repetidos viram fragmentos para a ascensão."));

    const inv = E.dados.invocacoes;
    c.appendChild(
      UI.el("p", "legenda",
        "Pergaminhos: " + U.numero(E.dados.recursos.pergaminhos) +
        " · garantia de Ungido em " + (10 - (inv.pityEpico % 10)) +
        " · Lendário em " + (60 - (inv.pityLendario % 60)))
    );

    const taxas = UI.el("div", "taxas");
    Object.keys(F.RARIDADES).reverse().forEach((chave) => {
      const t = Math.round((E.TAXAS[chave] || 0) * 100);
      const n = UI.el("span");
      n.innerHTML = "<b style='color:" + F.RARIDADES[chave].cor + "'>" + F.RARIDADES[chave].nome + "</b> " + t + "%";
      taxas.appendChild(n);
    });
    c.appendChild(taxas);

    const linha = UI.el("div", "linha-botoes");
    [1, 10].forEach((vezes) => {
      const b = UI.el("button", "botao", "Invocar ×" + vezes);
      b.disabled = (E.dados.recursos.pergaminhos || 0) < vezes;
      b.onclick = () => invocar(vezes);
      linha.appendChild(b);
    });
    c.appendChild(linha);

    const trocar = UI.el("button", "botao secundario pequeno", "Trocar " + CUSTO_FE_PERGAMINHO + " fé por 1 pergaminho");
    trocar.disabled = (E.dados.recursos.fe || 0) < CUSTO_FE_PERGAMINHO;
    trocar.onclick = () => {
      if (!E.gastar({ fe: CUSTO_FE_PERGAMINHO })) return UI.aviso("Fé insuficiente.");
      E.ganhar({ pergaminhos: 1 });
      E.salvar();
      UI.aviso("Pergaminho adquirido.");
      UI.render();
    };
    c.appendChild(trocar);

    if (UI.ultimaInvocacao && UI.ultimaInvocacao.length) {
      const res = UI.el("div", "resultado-invocacao");
      UI.ultimaInvocacao.forEach((r) => {
        const n = UI.el("div", "novo-heroi");
        const canvas = UI.el("canvas");
        n.appendChild(canvas);
        setTimeout(() => Jogo.Arte.retrato(canvas, r.heroi, {}), 0);
        n.appendChild(UI.el("span", "nome", r.heroi.nome));
        const etiqueta = UI.el("span", "estrelas", r.novo ? F.RARIDADES[r.heroi.raridade].nome : "+" + r.fragmentos + " frag.");
        etiqueta.style.color = F.RARIDADES[r.heroi.raridade].cor;
        n.appendChild(etiqueta);
        if (r.novo) n.appendChild(UI.el("span", "selo-novo", "NOVO"));
        n.onclick = () => abrirDetalhe(r.heroi.id);
        res.appendChild(n);
      });
      c.appendChild(res);
    }

    frag.appendChild(c);
    return frag;
  }

  function invocar(vezes) {
    const r = E.invocar(vezes);
    if (!r.ok) return UI.aviso(r.motivo);
    UI.ultimaInvocacao = r.resultados;
    const novos = r.resultados.filter((x) => x.novo).length;
    const lendarios = r.resultados.filter((x) => x.heroi.raridade === "lendario");
    UI.render();
    if (lendarios.length) UI.aviso("✦ " + lendarios[0].heroi.nome + " atende ao chamado!");
    else UI.aviso(novos ? novos + " novo(s) herói(s)!" : "Fragmentos recebidos.");
  }

  Jogo.Telas.herois = telaHerois;
  Jogo.Telas.invocacao = telaInvocacao;
  Jogo.UI.abrirDetalheHeroi = abrirDetalhe;
})(typeof window !== "undefined" ? window : globalThis);
