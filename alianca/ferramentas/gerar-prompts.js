// Gera alianca/arte/PROMPTS.md a partir da ficha dos heróis: uma instrução
// pronta por herói, no mesmo estilo, para colar num gerador de imagem.
// Uso:  node alianca/ferramentas/gerar-prompts.js
const fs = require("fs");
const path = require("path");

const raiz = path.join(__dirname, "..");
global.window = undefined;
eval(fs.readFileSync(path.join(raiz, "src/nucleo/util.js"), "utf8"));
eval(fs.readFileSync(path.join(raiz, "src/nucleo/formulas.js"), "utf8"));
eval(fs.readFileSync(path.join(raiz, "src/dados/herois.js"), "utf8"));
const Jogo = globalThis.Jogo;

const NOMES = {
  moises: "Moses", abraao: "Abraham", noe: "Noah", jose: "Joseph son of Jacob",
  jaco: "Jacob", isaque: "Isaac", adao: "Adam", eva: "Eve",
  sansao: "Samson", josue: "Joshua", debora: "Deborah the judge", gideao: "Gideon",
  jefte: "Jephthah", baraque: "Barak", calebe: "Caleb",
  elias: "Elijah", eliseu: "Elisha", daniel: "Daniel", ezequiel: "Ezekiel",
  isaias: "Isaiah", jeremias: "Jeremiah", jonas: "Jonah", joaobatista: "John the Baptist",
  miria: "Miriam the prophetess", obadias: "Obadiah the steward",
  davi: "King David", salomao: "King Solomon", ester: "Queen Esther",
  ezequias: "King Hezekiah", josias: "young King Josiah", rute: "Ruth the Moabite",
  jonatas: "Jonathan son of Saul",
  miguel: "the archangel Michael", gabriel: "the archangel Gabriel",
  rafael: "the archangel Raphael", serafim: "a seraph", querubim: "a cherub guardian",
  jezabel: "Queen Jezebel", nabucodonosor: "King Nebuchadnezzar", golias: "the giant Goliath",
  farao: "the Pharaoh of the Exodus", hama: "Haman the schemer", saul: "the tormented King Saul",
};

const TITULOS = {
  moises: "the deliverer who parted the sea", abraao: "father of faith",
  noe: "the righteous man of the flood", jose: "the dream interpreter, vizier of Egypt",
  jaco: "the one who wrestled the angel", isaque: "son of the promise",
  adao: "the first man", eva: "mother of all living",
  sansao: "the nazirite strongman", josue: "the conqueror of Jericho",
  debora: "the judge under the palm tree", gideao: "leader of the three hundred",
  jefte: "the vow of Gilead", baraque: "captain of Israel", calebe: "the faithful spy",
  elias: "the fire of Carmel", eliseu: "heir of the mantle",
  daniel: "survivor of the lions' den", ezequiel: "prophet of the valley of dry bones",
  isaias: "lips touched by a burning coal", jeremias: "the weeping prophet",
  jonas: "swallowed by the great fish", joaobatista: "the voice in the wilderness",
  miria: "the prophetess with the timbrel", obadias: "the faithful steward",
  davi: "the anointed shepherd king", salomao: "the wise king",
  ester: "the intercessor queen", ezequias: "the king who prayed",
  josias: "the boy king who restored the temple", rute: "the faithful Moabite",
  jonatas: "friend of the anointed",
  miguel: "prince of the heavenly host", gabriel: "the messenger",
  rafael: "the healing of God", serafim: "the burning one", querubim: "guardian of Eden",
  jezabel: "queen of Baal", nabucodonosor: "king of Babylon", golias: "the giant of Gath",
  farao: "the hardened heart", hama: "the treacherous counselor", saul: "the tormented king",
};

const CLASSES = {
  guerreiro: "sturdy warrior build, armored torso and helmet, braced stance",
  arqueiro: "lean scout build, light leather garb, alert stance",
  vidente: "hooded seer, long robe, eyes shadowed by the hood",
  sacerdote: "priestly vestments with a sash, serene open hands",
  arauto: "herald in flowing garments, one arm raised in proclamation",
};

const FACCOES = {
  celestiais: "large feathered wings and a thin golden halo, radiant white and gold garments",
  trevas: "ominous palette, faint violet aura, cold hostile expression",
  realeza: "golden crown and a royal mantle with gem accents",
  patriarcas: "ancient desert garments, weathered and dignified",
  juizes: "rugged tribal garb, leather straps and worn cloth",
  profetas: "coarse prophet's mantle over a simple tunic",
};

const SIMBOLOS = {
  cajado: "holding a tall wooden staff", manto: "holding a folded mantle and a staff",
  espada: "holding a short sword", adaga: "holding a curved dagger",
  espada_flamejante: "holding a burning sword wreathed in flame",
  lanca: "holding a long spear", chifre: "holding a horned war spear",
  arco: "holding a wooden bow", funda: "holding a leather sling with a stone",
  escudo: "holding a round bronze shield", machado: "holding a war axe",
  harpa: "holding a small golden harp", trombeta: "holding a golden trumpet",
  coroa: "holding a golden crown", chama: "holding a torch with a live flame",
  tocha: "holding a burning torch", brasa: "holding tongs with a glowing coal",
  pergaminho: "holding an open scroll", jarro: "holding a clay jar",
  serpente: "holding a staff with a bronze serpent coiled around it",
  peixe: "holding a large fish", agua: "water streaming around the hands",
  olho: "holding a staff topped with an all-seeing eye",
  leao: "holding a shield with a lion emblem", estrela: "a star shining above the raised hand",
  espiga: "holding a sheaf of wheat", roda: "beside a wooden chariot wheel",
  coluna: "gripping a cracked stone pillar", relogio: "holding a sundial",
  asas: "wings spread wide",
};

// Nome aproximado da cor, mais útil que o código hexadecimal na instrução.
function nomeDaCor(hex) {
  const n = parseInt(hex.slice(1), 16);
  const r = ((n >> 16) & 255) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  let h = 0;
  if (d !== 0) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }

  if (l > 0.9 && s < 0.2) return "ivory white";
  if (l < 0.12) return "near black";
  if (s < 0.12) return l > 0.6 ? "light gray" : l > 0.35 ? "stone gray" : "dark gray";

  const tom = l > 0.68 ? "pale " : l < 0.3 ? "deep " : "";
  if (h < 15 || h >= 345) return tom + "red";
  if (h < 40) return l < 0.45 ? "brown" : tom + "orange";
  if (h < 55) return l < 0.45 ? "bronze" : tom + "amber";
  if (h < 70) return tom + "gold";
  if (h < 95) return tom + "olive";
  if (h < 160) return tom + "green";
  if (h < 190) return tom + "teal";
  if (h < 210) return tom + "sky blue";
  if (h < 255) return tom + "blue";
  if (h < 285) return tom + "indigo";
  if (h < 320) return tom + "purple";
  return tom + "magenta";
}

const ESTILO =
  "16-bit pixel art character, full body, front view, standing idle pose, " +
  "thick dark outline, limited palette with 3 to 4 shades per material, soft light from the upper left, " +
  "gold trim and gemstone accents, clean readable silhouette, crisp pixels, no anti-aliasing, " +
  "character centered and filling about 85% of the frame with the feet near the bottom, " +
  "transparent background, no card frame, no border, no text, no name label, no stars, no ground shadow";

const linhas = [];
linhas.push("# Ilustrações dos heróis");
linhas.push("");
linhas.push("Instruções prontas para gerar as ilustrações num gerador de imagem, todas no mesmo estilo.");
linhas.push("Não precisa fazer as 43: cada herói ilustrado usa a imagem, o resto continua com o boneco");
linhas.push("desenhado por código. Comece pelos Lendários, que aparecem mais.");
linhas.push("");
linhas.push("## Como usar cada imagem");
linhas.push("");
linhas.push("1. Gere a imagem com a instrução do herói (uma por vez).");
linhas.push("2. Salve como **PNG com fundo transparente**, quadrado, 512×512, com o nome do id do herói —");
linhas.push("   por exemplo `salomao.png` — dentro de `alianca/arte/`.");
linhas.push("3. Acrescente o id na lista de `alianca/arte/lista.js`.");
linhas.push("");
linhas.push("O jogo recorta as margens vazias sozinho e ajusta o tamanho, então não precisa acertar o");
linhas.push("enquadramento na mão. Imagem **sem** fundo transparente ainda serve de retrato no elenco,");
linhas.push("mas a batalha segue com o boneco desenhado, para não virar um retângulo flutuando no campo.");
linhas.push("");
linhas.push("## Estilo comum a todas");
linhas.push("");
linhas.push("```");
linhas.push(ESTILO);
linhas.push("```");
linhas.push("");

const ordem = { lendario: 0, epico: 1, raro: 2, comum: 3 };
const titulos = { lendario: "Lendários", epico: "Ungidos (épicos)", raro: "Escolhidos (raros)", comum: "Fiéis (comuns)" };
const porRaridade = {};
Jogo.Herois.forEach((h) => (porRaridade[h.raridade] = porRaridade[h.raridade] || []).push(h));

Object.keys(porRaridade)
  .sort((a, b) => ordem[a] - ordem[b])
  .forEach((raridade) => {
    linhas.push("## " + titulos[raridade]);
    linhas.push("");
    porRaridade[raridade].forEach((h) => {
      const quem = NOMES[h.id] || h.nome;
      const partes = [
        ESTILO,
        "subject: " + quem + ", " + (TITULOS[h.id] || h.titulo.toLowerCase()),
        CLASSES[h.classe],
        FACCOES[h.faccao],
        "tunic in " + nomeDaCor(h.arte.tunica) + ", mantle in " + nomeDaCor(h.arte.manto),
        h.faccao === "realeza" && h.arte.simbolo === "coroa"
          ? "holding a golden scepter" // a coroa já está na cabeça
          : SIMBOLOS[h.arte.simbolo] || "holding a wooden staff",
      ];
      linhas.push("### " + h.nome + " — `" + h.id + ".png`");
      linhas.push("");
      linhas.push("*" + h.titulo + " · " + Jogo.Formulas.FACCOES[h.faccao].nome + " · " + Jogo.Formulas.CLASSES[h.classe].nome + " · " + h.versiculo + "*");
      linhas.push("");
      linhas.push("```");
      linhas.push(partes.join(", "));
      linhas.push("```");
      linhas.push("");
    });
  });

const destino = path.join(raiz, "arte/PROMPTS.md");
fs.writeFileSync(destino, linhas.join("\n"));
console.log("PROMPTS.md gerado com " + Jogo.Herois.length + " heróis em " + destino);
