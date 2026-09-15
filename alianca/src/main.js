// Ponto de entrada: carrega o save, mostra o resumo da ausência e liga a interface.
(function (global) {
  const Jogo = global.Jogo;
  const UI = Jogo.UI;
  const E = Jogo.Estado;
  const U = Jogo.Util;

  function boasVindas() {
    const ms = E.tempoOcioso();
    if (ms < 60000) return;
    const r = E.recompensaOciosa();
    const total = Object.values(r).reduce((a, b) => a + b, 0);
    if (total <= 0) return;

    const caixa = UI.el("div");
    caixa.appendChild(UI.el("h2", null, "A hoste vigiou por você"));
    caixa.appendChild(UI.el("p", null, "Enquanto esteve ausente (" + U.tempo(ms) + "), seus heróis seguiram lutando."));
    caixa.appendChild(UI.listaGanhos(r));
    const botao = UI.el("button", "botao", "Recolher a oferta");
    botao.onclick = () => {
      E.coletarOcioso();
      UI.fecharModal();
      UI.render();
    };
    const depois = UI.el("button", "botao secundario", "Depois");
    depois.onclick = UI.fecharModal;
    caixa.appendChild(botao);
    caixa.appendChild(depois);
    UI.abrirModal(caixa);
  }

  function iniciar() {
    E.carregar();

    if (Jogo.ArteExterna) {
      let pendente = null;
      Jogo.ArteExterna.definirCallback(() => {
        clearTimeout(pendente);
        pendente = setTimeout(() => UI.render(), 200);
      });
      Jogo.ArteExterna.iniciar();
    }

    Jogo.Cena.configurar(document.getElementById("palco"), document.getElementById("log"));
    UI.ligarControles();
    UI.irPara("campanha");
    boasVindas();

    // A barra da oferta ociosa avança sozinha enquanto a aba está aberta.
    setInterval(() => {
      if (UI.telaAtual === "campanha" && document.getElementById("batalha").classList.contains("oculta")) UI.render();
    }, 30000);

    global.addEventListener("beforeunload", () => E.salvar());
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") E.salvar();
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", iniciar);
  else iniciar();
})(typeof window !== "undefined" ? window : globalThis);
