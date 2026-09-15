// Camada de interface: navegação, barra de recursos, avisos, modal e o
// acoplamento entre a simulação de combate e a cena animada.
(function (global) {
  const Jogo = (global.Jogo = global.Jogo || {});
  const E = Jogo.Estado;
  const U = Jogo.Util;
  const F = Jogo.Formulas;

  const UI = { telaAtual: "campanha", filtroHerois: "todos" };
  Jogo.Telas = {};

  UI.el = function (tag, classe, texto) {
    const n = document.createElement(tag);
    if (classe) n.className = classe;
    if (texto != null) n.textContent = texto;
    return n;
  };

  UI.aviso = function (texto) {
    const caixa = document.getElementById("avisos");
    const n = UI.el("div", "aviso", texto);
    caixa.appendChild(n);
    setTimeout(() => n.remove(), 2200);
  };

  UI.abrirModal = function (conteudo) {
    const alvo = document.getElementById("modal-conteudo");
    alvo.innerHTML = "";
    alvo.appendChild(conteudo);
    document.getElementById("modal").classList.remove("oculta");
  };

  UI.fecharModal = function () {
    document.getElementById("modal").classList.add("oculta");
  };

  UI.retrato = function (heroi, tamanho) {
    const canvas = UI.el("canvas");
    canvas.style.width = tamanho + "px";
    canvas.style.height = tamanho + "px";
    setTimeout(() => Jogo.Arte.retrato(canvas, heroi, { tamanho }), 0);
    return canvas;
  };

  UI.estrelas = function (n) {
    return "★".repeat(n);
  };

  UI.recursoIcone = { ouro: "🪙", essencia: "🫒", pergaminhos: "📜", fe: "✦" };
  UI.recursoNome = { ouro: "Ouro", essencia: "Óleo", pergaminhos: "Pergaminhos", fe: "Fé" };

  UI.atualizarRecursos = function () {
    const barra = document.getElementById("recursos");
    barra.innerHTML = "";
    ["ouro", "essencia", "pergaminhos", "fe"].forEach((chave) => {
      const n = UI.el("div", "recurso");
      n.appendChild(UI.el("span", null, UI.recursoIcone[chave]));
      const valor = UI.el("b", null, U.numero(E.dados.recursos[chave] || 0));
      n.appendChild(valor);
      n.title = UI.recursoNome[chave];
      barra.appendChild(n);
    });
    const c = E.dados.campanha;
    document.getElementById("subtitulo").textContent =
      Jogo.Capitulos[c.capitulo].nome + " · estágio " + (c.estagio + 1) + " · poder " + U.numero(E.poderTotal());
  };

  UI.irPara = function (tela) {
    UI.telaAtual = tela;
    document.querySelectorAll(".aba").forEach((b) => b.classList.toggle("ativa", b.dataset.tela === tela));
    UI.render();
  };

  UI.render = function () {
    const alvo = document.getElementById("tela");
    alvo.innerHTML = "";
    const construtor = Jogo.Telas[UI.telaAtual];
    if (construtor) alvo.appendChild(construtor());
    UI.atualizarRecursos();
    alvo.scrollTop = 0;
  };

  UI.listaGanhos = function (ganho) {
    const n = UI.el("div", "ganhos");
    Object.keys(ganho).forEach((k) => {
      if (!ganho[k]) return;
      const item = UI.el("span");
      item.innerHTML = UI.recursoIcone[k] + " <b>" + U.numero(ganho[k]) + "</b>";
      n.appendChild(item);
    });
    return n;
  };

  // ---------------------------------------------------------------- batalha
  UI.iniciarBatalha = function (config) {
    const equipe = E.equipeDeBatalha();
    if (!equipe.length) {
      UI.aviso("Escolha ao menos um herói na aba Hoste.");
      return;
    }

    const resultado = Jogo.Combate.simular({ aliados: equipe, inimigos: config.inimigos });
    const painel = document.getElementById("batalha");
    document.getElementById("batalha-titulo").textContent = config.titulo || "Batalha";
    document.getElementById("batalha-sub").textContent = config.sub || "";
    document.getElementById("resultado").classList.add("oculta");
    painel.classList.remove("oculta");

    Jogo.Cena.definirVelocidade(UI.velocidadeBatalha || 1);
    marcarVelocidade(UI.velocidadeBatalha || 1);

    Jogo.Cena.iniciar({
      resultado,
      cenario: config.cenario,
      aoTerminar: (r) => mostrarResultado(r, config),
    });
  };

  function marcarVelocidade(v) {
    document.querySelectorAll("[data-velocidade]").forEach((b) => {
      b.classList.toggle("ativa", Number(b.dataset.velocidade) === v);
    });
  }

  function mostrarResultado(resultado, config) {
    const vitoria = resultado.vencedor === "aliados";
    const info = config.aoFim ? config.aoFim(resultado) : {};
    const caixa = document.getElementById("resultado");
    caixa.innerHTML = "";
    caixa.classList.remove("oculta");

    const titulo = UI.el("h2", vitoria ? "vitoria" : "derrota", vitoria ? "Vitória" : "Derrota");
    caixa.appendChild(titulo);
    caixa.appendChild(UI.el("p", "legenda", info.texto || (vitoria ? "A hoste prevalece." : "A hoste recua para reagrupar.")));

    if (info.ganho) caixa.appendChild(UI.listaGanhos(info.ganho));

    const sobreviventes = resultado.unidades.filter((u) => u.lado === "aliados" && u.vidaFinal > 0).length;
    caixa.appendChild(
      UI.el("p", "legenda", "Sobreviventes: " + sobreviventes + "/" + resultado.unidades.filter((u) => u.lado === "aliados").length + " · turnos: " + resultado.acoes)
    );

    (info.botoes || [{ texto: "Continuar", acao: UI.fecharBatalha }]).forEach((b) => {
      const botao = UI.el("button", "botao" + (b.secundario ? " secundario" : ""), b.texto);
      botao.onclick = b.acao;
      caixa.appendChild(botao);
    });
  }

  UI.fecharBatalha = function () {
    Jogo.Cena.encerrar();
    document.getElementById("batalha").classList.add("oculta");
    document.getElementById("resultado").classList.add("oculta");
    UI.render();
  };

  // Resolve a batalha sem animação — usado na varredura rápida.
  UI.batalhaRapida = function (inimigos) {
    const equipe = E.equipeDeBatalha();
    if (!equipe.length) return null;
    return Jogo.Combate.simular({ aliados: equipe, inimigos });
  };

  UI.ligarControles = function () {
    document.querySelectorAll(".aba").forEach((b) => {
      b.onclick = () => UI.irPara(b.dataset.tela);
    });
    document.querySelectorAll("[data-velocidade]").forEach((b) => {
      b.onclick = () => {
        const v = Number(b.dataset.velocidade);
        UI.velocidadeBatalha = v;
        Jogo.Cena.definirVelocidade(v);
        marcarVelocidade(v);
      };
    });
    document.getElementById("pular").onclick = () => Jogo.Cena.pular();
    document.getElementById("modal-fechar").onclick = UI.fecharModal;
    document.getElementById("modal").onclick = (ev) => {
      if (ev.target.id === "modal") UI.fecharModal();
    };
  };

  Jogo.UI = UI;
})(typeof window !== "undefined" ? window : globalThis);
