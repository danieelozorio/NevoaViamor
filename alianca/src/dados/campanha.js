// Inimigos, capítulos da campanha e a Torre da Provação.
(function (global) {
  const Jogo = (global.Jogo = global.Jogo || {});

  // Tropas genéricas — os chefes reutilizam as fichas dos heróis das Trevas.
  const INIMIGOS = [
    {
      id: "serpente", nome: "Serpente Antiga", faccao: "trevas", classe: "vidente", raridade: "raro",
      arte: { tunica: "#3a5a3a", manto: "#1f2f1f", pele: "#7aa05a", cabelo: "#2a3a2a", simbolo: "serpente" },
      base: { vida: 980, atk: 132, def: 44, spd: 112, crit: 0.18, critDano: 1.7 },
      ult: { nome: "Sussurro", desc: "Veneno em área.", acoes: [{ tipo: "dot", alvo: "todos_inimigos", estilo: "veneno", mult: 0.28, duracao: 3 }] },
    },
    {
      id: "soldado_egipcio", nome: "Soldado do Egito", faccao: "trevas", classe: "guerreiro", raridade: "comum",
      arte: { tunica: "#c8a860", manto: "#2f4a6a", pele: "#c08858", cabelo: "#1a1410", simbolo: "lanca" },
      base: { vida: 1480, atk: 96, def: 74, spd: 94, crit: 0.1, critDano: 1.55 },
      ult: { nome: "Investida", desc: "Golpe único pesado.", acoes: [{ tipo: "dano", alvo: "alvo", mult: 1.6 }] },
    },
    {
      id: "arqueiro_amalequita", nome: "Arqueiro Amalequita", faccao: "trevas", classe: "arqueiro", raridade: "comum",
      arte: { tunica: "#8a6a4a", manto: "#4a3a2a", pele: "#b08050", cabelo: "#241a12", simbolo: "arco" },
      base: { vida: 900, atk: 138, def: 42, spd: 116, crit: 0.22, critDano: 1.7 },
      ult: { nome: "Saraivada", desc: "Três flechas em alvos aleatórios.", acoes: [{ tipo: "dano", alvo: "aleatorio_inimigos:3", mult: 0.7 }] },
    },
    {
      id: "sacerdote_baal", nome: "Sacerdote de Baal", faccao: "trevas", classe: "sacerdote", raridade: "raro",
      arte: { tunica: "#6a2a2a", manto: "#2a1a1a", pele: "#c08858", cabelo: "#1a1218", simbolo: "chama" },
      base: { vida: 1160, atk: 104, def: 58, spd: 106, crit: 0.1, critDano: 1.5 },
      ult: { nome: "Chamado de Baal", desc: "Cura os ímpios.", acoes: [{ tipo: "cura", alvo: "todos_aliados", mult: 0.9 }] },
    },
    {
      id: "carro_guerra", nome: "Carro de Guerra", faccao: "trevas", classe: "guerreiro", raridade: "raro",
      arte: { tunica: "#7a6a4a", manto: "#3a2a1a", pele: "#a07850", cabelo: "#1a1410", simbolo: "roda" },
      base: { vida: 1700, atk: 112, def: 82, spd: 104, crit: 0.12, critDano: 1.7 },
      ult: { nome: "Atropelo", desc: "Dano na linha de frente.", acoes: [{ tipo: "dano", alvo: "inimigos_frente", mult: 1.35 }] },
    },
    {
      id: "gafanhoto", nome: "Praga de Gafanhotos", faccao: "trevas", classe: "vidente", raridade: "comum",
      arte: { tunica: "#8a8a3a", manto: "#4a4a1a", pele: "#a0a050", cabelo: "#3a3a10", simbolo: "asas" },
      base: { vida: 860, atk: 126, def: 38, spd: 124, crit: 0.16, critDano: 1.6 },
      ult: { nome: "Nuvem Devoradora", desc: "Dano em toda a hoste.", acoes: [{ tipo: "dano", alvo: "todos_inimigos", mult: 0.8 }] },
    },
    {
      id: "nefilim", nome: "Nefilim", faccao: "trevas", classe: "guerreiro", raridade: "epico",
      arte: { tunica: "#5a4a6a", manto: "#2a1f3a", pele: "#8a7a9a", cabelo: "#1a1428", simbolo: "machado" },
      base: { vida: 2100, atk: 130, def: 90, spd: 90, crit: 0.14, critDano: 1.85 },
      ult: { nome: "Punho dos Gigantes", desc: "Esmaga e atordoa.", acoes: [{ tipo: "dano", alvo: "alvo", mult: 1.9 }, { tipo: "atordoar", alvo: "alvo", chance: 0.5, duracao: 1 }] },
    },
    {
      id: "filisteu", nome: "Guerreiro Filisteu", faccao: "juizes", classe: "guerreiro", raridade: "comum",
      arte: { tunica: "#6a7a8a", manto: "#3a4a5a", pele: "#c08858", cabelo: "#2a2018", simbolo: "espada" },
      base: { vida: 1520, atk: 100, def: 76, spd: 96, crit: 0.12, critDano: 1.6 },
      ult: { nome: "Golpe de Ferro", desc: "Ataque forte.", acoes: [{ tipo: "dano", alvo: "alvo", mult: 1.55 }] },
    },
    {
      id: "feiticeiro", nome: "Feiticeiro da Babilônia", faccao: "trevas", classe: "vidente", raridade: "epico",
      arte: { tunica: "#4a2a6a", manto: "#1f1030", pele: "#c08858", cabelo: "#d8d8d8", simbolo: "olho" },
      base: { vida: 1080, atk: 158, def: 50, spd: 108, crit: 0.2, critDano: 1.8 },
      ult: { nome: "Encantamento", desc: "Dano em área e fé drenada.", acoes: [{ tipo: "dano", alvo: "todos_inimigos", mult: 0.95 }, { tipo: "energia", alvo: "todos_inimigos", valor: -15 }] },
    },
    {
      id: "leviata", nome: "Leviatã", faccao: "trevas", classe: "guerreiro", raridade: "lendario",
      arte: { tunica: "#1f4a5a", manto: "#0f2a3a", pele: "#3a7a8a", cabelo: "#0f2028", simbolo: "serpente" },
      base: { vida: 2600, atk: 148, def: 96, spd: 94, crit: 0.16, critDano: 1.9 },
      ult: { nome: "Redemoinho", desc: "Arrasta toda a hoste.", acoes: [{ tipo: "dano", alvo: "todos_inimigos", mult: 1.3 }, { tipo: "mod", alvo: "todos_inimigos", stat: "spd", valor: -0.2, duracao: 2, nome: "Abismo" }] },
    },
    {
      id: "behemot", nome: "Beemote", faccao: "trevas", classe: "guerreiro", raridade: "lendario",
      arte: { tunica: "#5a4a2a", manto: "#2a2010", pele: "#7a6a4a", cabelo: "#2a2010", simbolo: "chifre" },
      base: { vida: 2900, atk: 138, def: 110, spd: 84, crit: 0.12, critDano: 1.8 },
      ult: { nome: "Pisada", desc: "Terremoto que atordoa a frente.", acoes: [{ tipo: "dano", alvo: "inimigos_frente", mult: 1.7 }, { tipo: "atordoar", alvo: "inimigos_frente", chance: 0.45, duracao: 1 }] },
    },
    {
      id: "legiao", nome: "Legião", faccao: "trevas", classe: "vidente", raridade: "lendario",
      arte: { tunica: "#3a1a3a", manto: "#140a18", pele: "#8a6a8a", cabelo: "#100810", simbolo: "olho" },
      base: { vida: 1500, atk: 168, def: 62, spd: 118, crit: 0.24, critDano: 1.9 },
      ult: { nome: "Somos Muitos", desc: "Cinco investidas caóticas.", acoes: [{ tipo: "dano", alvo: "aleatorio_inimigos:5", mult: 0.72 }] },
    },
  ];

  const porId = {};
  INIMIGOS.forEach((i) => (porId[i.id] = i));

  const CAPITULOS = [
    {
      nome: "Gênesis", subtitulo: "O Jardim e o Dilúvio",
      ceu: ["#1b2a3a", "#3a5a6a"], props: "arvores", chao: "#2c3f2c",
      tropas: ["serpente", "gafanhoto", "filisteu"], chefe: "nefilim",
      texto: "No princípio a névoa cobre a terra, e a serpente antiga já se move entre as árvores.",
    },
    {
      nome: "Êxodo", subtitulo: "Correntes do Egito",
      ceu: ["#3a2a1a", "#8a6a3a"], props: "piramides", chao: "#7a6a42",
      tropas: ["soldado_egipcio", "carro_guerra", "gafanhoto"], chefe: "farao",
      texto: "Dez pragas caem sobre o Nilo, mas o coração do rei continua endurecido.",
    },
    {
      nome: "Deserto", subtitulo: "Quarenta Anos de Pó",
      ceu: ["#4a3a2a", "#b89a5a"], props: "dunas", chao: "#8a7a4a",
      tropas: ["arqueiro_amalequita", "soldado_egipcio", "serpente"], chefe: "leviata",
      texto: "O maná cai de madrugada e os amalequitas atacam pela retaguarda.",
    },
    {
      nome: "Conquista", subtitulo: "As Muralhas de Jericó",
      ceu: ["#2a3a4a", "#6a8aa0"], props: "muralhas", chao: "#6a6a5a",
      tropas: ["filisteu", "carro_guerra", "nefilim"], chefe: "golias",
      texto: "Sete voltas, sete trombetas — e a pedra cai sobre a pedra.",
    },
    {
      nome: "Juízes", subtitulo: "Tempo sem Rei",
      ceu: ["#2a2a3a", "#5a4a6a"], props: "tendas", chao: "#3a4a3a",
      tropas: ["filisteu", "arqueiro_amalequita", "sacerdote_baal"], chefe: "nefilim",
      texto: "Cada um fazia o que parecia certo aos seus próprios olhos.",
    },
    {
      nome: "Reinos", subtitulo: "A Coroa e a Funda",
      ceu: ["#2a2a4a", "#6a6ab0"], props: "cidade", chao: "#4a5a3a",
      tropas: ["filisteu", "carro_guerra", "arqueiro_amalequita"], chefe: "saul",
      texto: "A lança voa contra o harpista, e a coroa pesa sobre uma cabeça atormentada.",
    },
    {
      nome: "Carmelo", subtitulo: "Fogo Contra Baal",
      ceu: ["#3a1a1a", "#c05a2a"], props: "altar", chao: "#5a4a3a",
      tropas: ["sacerdote_baal", "serpente", "feiticeiro"], chefe: "jezabel",
      texto: "Quatrocentos e cinquenta profetas gritam, mas somente um altar arde.",
    },
    {
      nome: "Exílio", subtitulo: "Rios da Babilônia",
      ceu: ["#1a2a3a", "#4a5a8a"], props: "zigurate", chao: "#3a3a4a",
      tropas: ["feiticeiro", "carro_guerra", "nefilim"], chefe: "nabucodonosor",
      texto: "Junto aos rios nos assentamos e choramos, lembrando de Sião.",
    },
    {
      nome: "Abismo", subtitulo: "Behemot e Leviatã",
      ceu: ["#101a28", "#2a3a5a"], props: "abismo", chao: "#22303a",
      tropas: ["leviata", "nefilim", "serpente"], chefe: "behemot",
      texto: "Das profundezas sobem as criaturas que nem Jó ousou nomear.",
    },
    {
      nome: "Última Trombeta", subtitulo: "A Batalha Final",
      ceu: ["#2a0f1f", "#a02a4a"], props: "chamas", chao: "#3a1a28",
      tropas: ["legiao", "behemot", "leviata", "feiticeiro"], chefe: "legiao",
      texto: "Houve batalha no céu: Miguel e os seus anjos contra o dragão.",
    },
  ];

  const ESTAGIOS_POR_CAPITULO = 10;

  Jogo.Inimigos = INIMIGOS;
  Jogo.inimigoPorId = (id) => porId[id] || (Jogo.heroiPorId ? Jogo.heroiPorId(id) : null);
  Jogo.Capitulos = CAPITULOS;
  Jogo.ESTAGIOS_POR_CAPITULO = ESTAGIOS_POR_CAPITULO;
  Jogo.TOTAL_ESTAGIOS = CAPITULOS.length * ESTAGIOS_POR_CAPITULO;
})(typeof window !== "undefined" ? window : globalThis);
