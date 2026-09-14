// Dados do jogo: tipos, golpes, espécies. Universo original — nenhuma criatura,
// nome ou marca de terceiros é usada aqui.
(function (global) {
  const TIPOS = {
    brasa: { nome: "Brasa", cor: "#e2662f" },
    orvalho: { nome: "Orvalho", cor: "#3f86c4" },
    folha: { nome: "Folha", cor: "#4f9e43" },
    bruma: { nome: "Bruma", cor: "#8f7fc4" },
  };

  // Multiplicador de dano: EFICACIA[atacante][defensor]
  const EFICACIA = {
    brasa: { brasa: 0.5, orvalho: 0.5, folha: 2, bruma: 1 },
    orvalho: { brasa: 2, orvalho: 0.5, folha: 0.5, bruma: 1 },
    folha: { brasa: 0.5, orvalho: 2, folha: 0.5, bruma: 1 },
    bruma: { brasa: 1, orvalho: 1, folha: 1, bruma: 2 },
  };

  const GOLPES = {
    investida: { nome: "Investida", tipo: "bruma", poder: 35, precisao: 100, usos: 30 },
    arranhao: { nome: "Arranhão", tipo: "bruma", poder: 30, precisao: 100, usos: 35 },
    sopro_nevoa: { nome: "Sopro de Névoa", tipo: "bruma", poder: 40, precisao: 100, usos: 25 },
    veu_espectral: { nome: "Véu Espectral", tipo: "bruma", poder: 65, precisao: 90, usos: 12 },
    brasa_viva: { nome: "Brasa Viva", tipo: "brasa", poder: 40, precisao: 100, usos: 25 },
    labareda: { nome: "Labareda", tipo: "brasa", poder: 65, precisao: 90, usos: 12 },
    jato_orvalho: { nome: "Jato de Orvalho", tipo: "orvalho", poder: 40, precisao: 100, usos: 25 },
    maremoto: { nome: "Maremoto", tipo: "orvalho", poder: 65, precisao: 90, usos: 12 },
    folha_cortante: { nome: "Folha Cortante", tipo: "folha", poder: 40, precisao: 100, usos: 25 },
    chicote_vegetal: { nome: "Chicote Vegetal", tipo: "folha", poder: 65, precisao: 90, usos: 12 },
  };

  // base: [pv, ataque, defesa, velocidade]
  const ESPECIES = {
    fagulho: {
      nome: "Fagulho",
      tipo: "brasa",
      base: [39, 52, 43, 65],
      captura: 90,
      xp: 62,
      evolui: { em: "cinzel", nivel: 14 },
      aprende: [
        [1, "arranhao"],
        [1, "brasa_viva"],
        [9, "investida"],
        [16, "labareda"],
      ],
      desc: "Cospe fagulhas quando fica nervoso.",
    },
    gotim: {
      nome: "Gotim",
      tipo: "orvalho",
      base: [44, 48, 50, 43],
      captura: 90,
      xp: 63,
      aprende: [
        [1, "investida"],
        [1, "jato_orvalho"],
        [11, "sopro_nevoa"],
        [18, "maremoto"],
      ],
      desc: "Dorme boiando nas poças da estrada.",
    },
    brotim: {
      nome: "Brotim",
      tipo: "folha",
      base: [45, 49, 49, 45],
      captura: 90,
      xp: 64,
      aprende: [
        [1, "investida"],
        [1, "folha_cortante"],
        [10, "sopro_nevoa"],
        [17, "chicote_vegetal"],
      ],
      desc: "O broto na cabeça vira flor no verão.",
    },
    neblim: {
      nome: "Neblim",
      tipo: "bruma",
      base: [40, 45, 40, 56],
      captura: 150,
      xp: 51,
      evolui: { em: "vultor", nivel: 16 },
      aprende: [
        [1, "arranhao"],
        [1, "sopro_nevoa"],
        [12, "investida"],
        [19, "veu_espectral"],
      ],
      desc: "Aparece onde a névoa fica mais densa.",
    },
    cinzel: {
      nome: "Cinzel",
      tipo: "brasa",
      base: [58, 64, 58, 80],
      captura: 45,
      xp: 142,
      aprende: [
        [1, "arranhao"],
        [1, "brasa_viva"],
        [1, "labareda"],
        [22, "veu_espectral"],
      ],
      desc: "As chamas das costas acendem à noite.",
    },
    vultor: {
      nome: "Vultor",
      tipo: "bruma",
      base: [60, 65, 55, 85],
      captura: 45,
      xp: 145,
      aprende: [
        [1, "sopro_nevoa"],
        [1, "veu_espectral"],
        [1, "investida"],
        [24, "labareda"],
      ],
      desc: "Plana sem fazer barulho sobre o vale.",
    },
  };

  // Tabelas de encontro por região do mapa.
  const ENCONTROS = {
    campo: [
      { id: "neblim", peso: 40, min: 2, max: 5 },
      { id: "brotim", peso: 30, min: 2, max: 5 },
      { id: "gotim", peso: 20, min: 3, max: 6 },
      { id: "fagulho", peso: 10, min: 3, max: 6 },
    ],
  };

  const ITENS = {
    frasco: { nome: "Frasco de Névoa", bonus: 1.5, desc: "Prende criaturas selvagens." },
    erva: { nome: "Erva Calmante", cura: 20, desc: "Recupera 20 PV." },
  };

  // ------------------------------------------------------------ construção
  function statPV(base, nivel) {
    return Math.floor((2 * base * nivel) / 100) + nivel + 10;
  }

  function stat(base, nivel) {
    return Math.floor((2 * base * nivel) / 100) + 5;
  }

  function golpesNoNivel(especieId, nivel) {
    const esp = ESPECIES[especieId];
    const lista = esp.aprende.filter(([lv]) => lv <= nivel).map(([, id]) => id);
    // mantém os quatro mais recentes, como nos RPGs do gênero
    return lista.slice(-4);
  }

  function criar(especieId, nivel) {
    const esp = ESPECIES[especieId];
    const pvMax = statPV(esp.base[0], nivel);
    return {
      especie: especieId,
      nome: esp.nome,
      nivel,
      pv: pvMax,
      pvMax,
      ataque: stat(esp.base[1], nivel),
      defesa: stat(esp.base[2], nivel),
      velocidade: stat(esp.base[3], nivel),
      xp: 0,
      golpes: golpesNoNivel(especieId, nivel).map((id) => ({ id, usos: GOLPES[id].usos })),
    };
  }

  function recalcular(mon) {
    const esp = ESPECIES[mon.especie];
    const pvMaxAntes = mon.pvMax;
    mon.pvMax = statPV(esp.base[0], mon.nivel);
    mon.ataque = stat(esp.base[1], mon.nivel);
    mon.defesa = stat(esp.base[2], mon.nivel);
    mon.velocidade = stat(esp.base[3], mon.nivel);
    mon.pv = Math.min(mon.pvMax, mon.pv + (mon.pvMax - pvMaxAntes));
    return mon;
  }

  function xpParaProximo(nivel) {
    return Math.floor(Math.pow(nivel + 1, 3) * 0.8) - Math.floor(Math.pow(nivel, 3) * 0.8);
  }

  function xpGanho(especieId, nivelDerrotado) {
    return Math.max(1, Math.floor((ESPECIES[especieId].xp * nivelDerrotado) / 7));
  }

  function eficacia(tipoGolpe, tipoAlvo) {
    return (EFICACIA[tipoGolpe] && EFICACIA[tipoGolpe][tipoAlvo]) || 1;
  }

  function calcularDano(atacante, defensor, golpeId) {
    const golpe = GOLPES[golpeId];
    const esp = ESPECIES[defensor.especie];
    const mult = eficacia(golpe.tipo, esp.tipo);
    const mesmoTipo = ESPECIES[atacante.especie].tipo === golpe.tipo ? 1.5 : 1;
    const aleatorio = 0.85 + Math.random() * 0.15;
    const bruto =
      Math.floor(
        ((((2 * atacante.nivel) / 5 + 2) * golpe.poder * atacante.ataque) / defensor.defesa / 50)
      ) + 2;
    return {
      dano: Math.max(1, Math.floor(bruto * mult * mesmoTipo * aleatorio)),
      mult,
    };
  }

  function acertou(golpeId) {
    return Math.random() * 100 < GOLPES[golpeId].precisao;
  }

  // Chance de captura no mesmo espírito do gênero: vida baixa ajuda muito.
  function chanceCaptura(alvo, bonusItem) {
    const taxa = ESPECIES[alvo.especie].captura;
    const a = ((3 * alvo.pvMax - 2 * alvo.pv) * taxa * (bonusItem || 1)) / (3 * alvo.pvMax);
    return Math.min(255, a);
  }

  function sorteioEncontro(tabela) {
    const lista = ENCONTROS[tabela] || ENCONTROS.campo;
    const total = lista.reduce((s, e) => s + e.peso, 0);
    let r = Math.random() * total;
    for (const e of lista) {
      r -= e.peso;
      if (r <= 0) {
        const nivel = e.min + Math.floor(Math.random() * (e.max - e.min + 1));
        return criar(e.id, nivel);
      }
    }
    return criar("neblim", 3);
  }

  global.Dados = {
    TIPOS,
    GOLPES,
    ESPECIES,
    ITENS,
    criar,
    recalcular,
    golpesNoNivel,
    xpParaProximo,
    xpGanho,
    eficacia,
    calcularDano,
    acertou,
    chanceCaptura,
    sorteioEncontro,
  };
})(window);
