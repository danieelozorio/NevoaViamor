// Fórmulas de progressão: atributos por nível/estrela/relíquia, custos e vantagens.
(function (global) {
  const Jogo = (global.Jogo = global.Jogo || {});
  const F = {};

  F.RARIDADES = {
    comum: { nome: "Fiel", mult: 1.0, cor: "#8fa3b8", estrelasMax: 3, ordem: 0 },
    raro: { nome: "Escolhido", mult: 1.14, cor: "#5ec3f0", estrelasMax: 4, ordem: 1 },
    epico: { nome: "Ungido", mult: 1.3, cor: "#c081f5", estrelasMax: 5, ordem: 2 },
    lendario: { nome: "Lendário", mult: 1.5, cor: "#f0b429", estrelasMax: 6, ordem: 3 },
  };

  F.FACCOES = {
    patriarcas: { nome: "Patriarcas", cor: "#e0c47a", icone: "🜃", vence: "juizes" },
    juizes: { nome: "Juízes", cor: "#d8734a", icone: "⚔", vence: "profetas" },
    profetas: { nome: "Profetas", cor: "#6fbf8f", icone: "🜂", vence: "realeza" },
    realeza: { nome: "Realeza", cor: "#7b8ff0", icone: "♛", vence: "patriarcas" },
    celestiais: { nome: "Celestiais", cor: "#f5f0d0", icone: "✦", vence: "trevas" },
    trevas: { nome: "Trevas", cor: "#9b5ca8", icone: "☾", vence: "celestiais" },
  };

  F.CLASSES = {
    guerreiro: { nome: "Guerreiro", icone: "🛡", linha: "frente", desc: "Segura a linha de frente e absorve o castigo." },
    arqueiro: { nome: "Arqueiro", icone: "🏹", linha: "tras", desc: "Dano concentrado em um único alvo." },
    vidente: { nome: "Vidente", icone: "✶", linha: "tras", desc: "Dano em área e maldições." },
    sacerdote: { nome: "Sacerdote", icone: "✚", linha: "tras", desc: "Cura, escudos e ressurreição." },
    arauto: { nome: "Arauto", icone: "♪", linha: "tras", desc: "Fortalece aliados e enfraquece inimigos." },
  };

  F.CRESC_NIVEL = 1.043; // crescimento por nível
  F.NIVEL_MAXIMO_ABSOLUTO = 240;

  // Vantagem de facção: +30% de dano causado contra a facção dominada.
  F.vantagem = function (atacante, defensor) {
    const a = F.FACCOES[atacante];
    const d = F.FACCOES[defensor];
    if (!a || !d) return 1;
    if (a.vence === defensor) return 1.3;
    if (d.vence === atacante) return 0.82;
    return 1;
  };

  F.multEstrela = (estrelas) => 1 + 0.13 * (estrelas - 1);
  F.multReliquia = (soma) => 1 + 0.018 * soma;

  // Atributos finais de um herói já considerando nível, estrelas e relíquias.
  F.atributos = function (definicao, ficha) {
    const nivel = ficha && ficha.nivel ? ficha.nivel : 1;
    const estrelas = ficha && ficha.estrelas ? ficha.estrelas : 1;
    const reliquias = (ficha && ficha.reliquias) || [0, 0, 0, 0];
    const somaRel = reliquias.reduce((a, b) => a + b, 0);

    const mult =
      Math.pow(F.CRESC_NIVEL, nivel - 1) *
      F.RARIDADES[definicao.raridade].mult *
      F.multEstrela(estrelas) *
      F.multReliquia(somaRel);

    const b = definicao.base;
    return {
      vida: Math.round(b.vida * mult),
      atk: Math.round(b.atk * mult),
      def: Math.round(b.def * mult),
      spd: b.spd + Math.floor((nivel - 1) / 12) + (estrelas - 1),
      crit: Math.min(0.75, b.crit + 0.01 * (estrelas - 1)),
      critDano: b.critDano,
      vidaMax: Math.round(b.vida * mult),
    };
  };

  F.poder = function (stats) {
    return Math.round(
      stats.vida * 0.55 + stats.atk * 7 + stats.def * 5 + stats.spd * 3 + stats.crit * 900
    );
  };

  // Custos de evolução.
  F.custoNivel = function (nivel) {
    return {
      ouro: Math.floor(100 * Math.pow(1.062, nivel)),
      essencia: Math.floor(30 * Math.pow(1.058, nivel)),
    };
  };

  F.custoEstrela = function (estrelas, raridade) {
    const pesoRaridade = { comum: 1, raro: 1.5, epico: 2.2, lendario: 3 }[raridade] || 1;
    return { fragmentos: Math.round(20 * Math.pow(2.1, estrelas - 1) * pesoRaridade) };
  };

  F.custoReliquia = function (nivelReliquia) {
    return { ouro: Math.floor(400 * Math.pow(1.16, nivelReliquia)) };
  };

  // O teto de nível acompanha a campanha, como nos jogos ociosos.
  F.nivelMaximo = function (estagiosVencidos) {
    return Math.min(F.NIVEL_MAXIMO_ABSOLUTO, 12 + Math.floor(estagiosVencidos * 2));
  };

  Jogo.Formulas = F;
})(typeof window !== "undefined" ? window : globalThis);
