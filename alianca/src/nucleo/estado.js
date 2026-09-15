// Estado persistente do jogador: recursos, elenco, formação, campanha,
// recompensas ociosas (AFK) e invocação.
(function (global) {
  const Jogo = (global.Jogo = global.Jogo || {});
  const U = Jogo.Util;
  const F = Jogo.Formulas;

  const CHAVE = "alianca.save.v1";
  const TETO_OCIOSO_MS = 12 * 3600 * 1000;
  const ESCALA_INIMIGA = 1.088;
  const ELENCO_INICIAL = ["jonas", "rute", "baraque", "jeremias", "isaias"];

  const FRAGMENTOS_DUPLICADO = { comum: 12, raro: 25, epico: 45, lendario: 70 };
  const TAXAS = { comum: 0.42, raro: 0.32, epico: 0.19, lendario: 0.07 };

  const E = {};
  E.dados = null;

  function hoje() {
    return new Date().toISOString().slice(0, 10);
  }

  function novoJogo() {
    const dados = {
      versao: 1,
      criadoEm: Date.now(),
      recursos: { ouro: 2000, essencia: 800, pergaminhos: 10, fe: 100 },
      herois: {},
      fragmentos: {},
      formacao: [],
      campanha: { capitulo: 0, estagio: 0, vencidos: 0 },
      torre: { andar: 1, melhor: 0 },
      ocioso: { desde: Date.now() },
      invocacoes: { total: 0, pityEpico: 0, pityLendario: 0 },
      missoes: { dia: hoje(), batalhas: 0, invocacoes: 0, melhorias: 0, coletas: 0, resgatadas: [] },
      estatisticas: { vitorias: 0, derrotas: 0, batalhas: 0 },
      vistos: {},
    };
    ELENCO_INICIAL.forEach((id) => adicionarHeroi(dados, id));
    dados.formacao = ELENCO_INICIAL.slice(0, 5);
    return dados;
  }

  function adicionarHeroi(dados, id) {
    if (dados.herois[id]) {
      const def = Jogo.heroiPorId(id);
      const frag = FRAGMENTOS_DUPLICADO[def.raridade];
      dados.fragmentos[id] = (dados.fragmentos[id] || 0) + frag;
      dados.herois[id].copias += 1;
      return { novo: false, fragmentos: frag };
    }
    dados.herois[id] = { nivel: 1, estrelas: 1, reliquias: [0, 0, 0, 0], copias: 1 };
    return { novo: true, fragmentos: 0 };
  }

  // Confere e conserta um save vindo de fora (arquivo antigo, código colado,
  // versão anterior do jogo) antes de deixá-lo entrar em uso.
  function normalizar(dados) {
    if (!dados || typeof dados !== "object" || !dados.versao) return null;
    const d = dados;

    d.recursos = Object.assign({ ouro: 0, essencia: 0, pergaminhos: 0, fe: 0 }, d.recursos || {});
    Object.keys(d.recursos).forEach((k) => {
      const v = Number(d.recursos[k]);
      d.recursos[k] = isFinite(v) && v > 0 ? Math.floor(v) : 0;
    });

    d.herois = d.herois && typeof d.herois === "object" ? d.herois : {};
    Object.keys(d.herois).forEach((id) => {
      const def = Jogo.heroiPorId(id);
      if (!def) {
        delete d.herois[id];
        return;
      }
      const f = d.herois[id] || {};
      f.nivel = U.limitar(Math.floor(f.nivel || 1), 1, F.NIVEL_MAXIMO_ABSOLUTO);
      f.estrelas = U.limitar(Math.floor(f.estrelas || 1), 1, F.RARIDADES[def.raridade].estrelasMax);
      f.reliquias = Array.isArray(f.reliquias) ? f.reliquias.slice(0, 4) : [];
      while (f.reliquias.length < 4) f.reliquias.push(0);
      f.reliquias = f.reliquias.map((v) => U.limitar(Math.floor(v || 0), 0, 20));
      f.copias = Math.max(1, Math.floor(f.copias || 1));
      d.herois[id] = f;
    });

    d.fragmentos = d.fragmentos && typeof d.fragmentos === "object" ? d.fragmentos : {};
    Object.keys(d.fragmentos).forEach((id) => {
      if (!Jogo.heroiPorId(id)) delete d.fragmentos[id];
      else d.fragmentos[id] = Math.max(0, Math.floor(d.fragmentos[id] || 0));
    });

    d.formacao = (Array.isArray(d.formacao) ? d.formacao : []).filter((id) => d.herois[id]).slice(0, 5);
    if (!d.formacao.length) d.formacao = Object.keys(d.herois).slice(0, 5);

    d.campanha = Object.assign({ capitulo: 0, estagio: 0, vencidos: 0 }, d.campanha || {});
    d.campanha.capitulo = U.limitar(Math.floor(d.campanha.capitulo || 0), 0, Jogo.Capitulos.length - 1);
    d.campanha.estagio = U.limitar(Math.floor(d.campanha.estagio || 0), 0, Jogo.ESTAGIOS_POR_CAPITULO - 1);
    d.campanha.vencidos = U.limitar(Math.floor(d.campanha.vencidos || 0), 0, Jogo.TOTAL_ESTAGIOS);

    d.torre = Object.assign({ andar: 1, melhor: 0 }, d.torre || {});
    d.torre.andar = Math.max(1, Math.floor(d.torre.andar || 1));
    d.torre.melhor = Math.max(0, Math.floor(d.torre.melhor || 0));

    d.ocioso = d.ocioso || {};
    if (!d.ocioso.desde || !isFinite(d.ocioso.desde) || d.ocioso.desde > Date.now()) d.ocioso.desde = Date.now();

    d.invocacoes = Object.assign({ total: 0, pityEpico: 0, pityLendario: 0 }, d.invocacoes || {});
    d.estatisticas = Object.assign({ vitorias: 0, derrotas: 0, batalhas: 0 }, d.estatisticas || {});
    d.missoes = Object.assign(
      { dia: hoje(), batalhas: 0, invocacoes: 0, melhorias: 0, coletas: 0, resgatadas: [] },
      d.missoes || {}
    );
    if (!Array.isArray(d.missoes.resgatadas)) d.missoes.resgatadas = [];
    d.vistos = d.vistos || {};
    return d;
  }

  // ----------------------------------------------------------- persistência
  E.carregar = function () {
    let salvo = null;
    try {
      salvo = JSON.parse(localStorage.getItem(CHAVE));
    } catch (e) {
      salvo = null;
    }
    E.dados = normalizar(salvo) || novoJogo();
    E.checarDia();
    return E.dados;
  };

  E.salvar = function () {
    try {
      localStorage.setItem(CHAVE, JSON.stringify(E.dados));
    } catch (e) {
      /* armazenamento indisponível: o jogo segue apenas em memória */
    }
  };

  E.reiniciar = function () {
    E.dados = novoJogo();
    E.salvar();
  };

  E.checarDia = function () {
    const d = E.dados;
    if (d.missoes.dia !== hoje()) {
      d.missoes = { dia: hoje(), batalhas: 0, invocacoes: 0, melhorias: 0, coletas: 0, resgatadas: [] };
    }
  };

  // -------------------------------------------------------------- recursos
  E.temRecursos = function (custo) {
    const r = E.dados.recursos;
    return Object.keys(custo).every((k) => (r[k] || 0) >= custo[k]);
  };

  E.gastar = function (custo) {
    if (!E.temRecursos(custo)) return false;
    Object.keys(custo).forEach((k) => (E.dados.recursos[k] -= custo[k]));
    return true;
  };

  E.ganhar = function (ganhos) {
    Object.keys(ganhos).forEach((k) => {
      E.dados.recursos[k] = (E.dados.recursos[k] || 0) + ganhos[k];
    });
  };

  // ---------------------------------------------------------------- heróis
  E.fichaDe = function (id) {
    return E.dados.herois[id] || null;
  };

  E.atributosDe = function (id) {
    const def = Jogo.heroiPorId(id);
    return F.atributos(def, E.dados.herois[id] || { nivel: 1, estrelas: 1, reliquias: [0, 0, 0, 0] });
  };

  E.poderDe = function (id) {
    return F.poder(E.atributosDe(id));
  };

  E.poderTotal = function () {
    return E.dados.formacao.reduce((total, id) => total + (id ? E.poderDe(id) : 0), 0);
  };

  E.nivelMaximo = function () {
    return F.nivelMaximo(E.dados.campanha.vencidos);
  };

  E.subirNivel = function (id, vezes) {
    const ficha = E.dados.herois[id];
    if (!ficha) return { ok: false, motivo: "Herói não recrutado." };
    const teto = E.nivelMaximo();
    let subiu = 0;
    for (let i = 0; i < (vezes || 1); i++) {
      if (ficha.nivel >= teto) break;
      const custo = F.custoNivel(ficha.nivel);
      if (!E.gastar(custo)) break;
      ficha.nivel += 1;
      subiu += 1;
    }
    if (subiu) {
      E.dados.missoes.melhorias += subiu;
      E.salvar();
      return { ok: true, subiu };
    }
    return { ok: false, motivo: ficha.nivel >= teto ? "Nível máximo da campanha atingido." : "Recursos insuficientes." };
  };

  E.subirEstrela = function (id) {
    const ficha = E.dados.herois[id];
    const def = Jogo.heroiPorId(id);
    if (!ficha) return { ok: false, motivo: "Herói não recrutado." };
    const max = F.RARIDADES[def.raridade].estrelasMax;
    if (ficha.estrelas >= max) return { ok: false, motivo: "Ascensão máxima." };
    const custo = F.custoEstrela(ficha.estrelas, def.raridade);
    if ((E.dados.fragmentos[id] || 0) < custo.fragmentos)
      return { ok: false, motivo: "Faltam fragmentos: " + custo.fragmentos };
    E.dados.fragmentos[id] -= custo.fragmentos;
    ficha.estrelas += 1;
    E.dados.missoes.melhorias += 1;
    E.salvar();
    return { ok: true, estrelas: ficha.estrelas };
  };

  E.subirReliquia = function (id, slot) {
    const ficha = E.dados.herois[id];
    if (!ficha) return { ok: false, motivo: "Herói não recrutado." };
    const nivelAtual = ficha.reliquias[slot] || 0;
    if (nivelAtual >= 20) return { ok: false, motivo: "Relíquia no máximo." };
    const custo = F.custoReliquia(nivelAtual);
    if (!E.gastar(custo)) return { ok: false, motivo: "Ouro insuficiente." };
    ficha.reliquias[slot] = nivelAtual + 1;
    E.dados.missoes.melhorias += 1;
    E.salvar();
    return { ok: true };
  };

  // -------------------------------------------------------------- formação
  E.definirFormacao = function (lista) {
    E.dados.formacao = lista.filter(Boolean).slice(0, 5);
    E.salvar();
  };

  E.alternarNaFormacao = function (id) {
    const f = E.dados.formacao;
    const pos = f.indexOf(id);
    if (pos >= 0) {
      f.splice(pos, 1);
    } else {
      if (f.length >= 5) return { ok: false, motivo: "A hoste já tem 5 heróis." };
      f.push(id);
    }
    E.salvar();
    return { ok: true };
  };

  E.equipeDeBatalha = function () {
    return E.dados.formacao
      .filter((id) => E.dados.herois[id])
      .map((id) => ({
        def: Jogo.heroiPorId(id),
        stats: E.atributosDe(id),
        nivel: E.dados.herois[id].nivel,
        estrelas: E.dados.herois[id].estrelas,
      }));
  };

  // -------------------------------------------------------------- campanha
  E.indiceEstagio = function (capitulo, estagio) {
    return capitulo * Jogo.ESTAGIOS_POR_CAPITULO + estagio;
  };

  E.montarInimigos = function (capitulo, estagio, opcoes) {
    opcoes = opcoes || {};
    const cap = Jogo.Capitulos[Math.min(capitulo, Jogo.Capitulos.length - 1)];
    const indice = E.indiceEstagio(capitulo, estagio);
    const chefe = estagio === Jogo.ESTAGIOS_POR_CAPITULO - 1;
    const escala = Math.pow(ESCALA_INIMIGA, indice) * (opcoes.escala || 1);
    const rng = opcoes.rng || Math.random;

    const quantidade = Math.min(5, 3 + Math.floor(indice / 12));
    const ids = [];
    if (chefe) ids.push(cap.chefe);
    const sorteio = U.embaralhar(cap.tropas, rng);
    let i = 0;
    while (ids.length < quantidade) {
      ids.push(sorteio[i % sorteio.length]);
      i += 1;
    }

    return ids.map((id, i) => {
      const def = Jogo.inimigoPorId(id) || Jogo.Inimigos[0];
      const multChefe = chefe && i === 0 ? 1.45 : 1;
      const base = def.base;
      const rar = F.RARIDADES[def.raridade].mult;
      const mult = escala * rar * multChefe;
      return {
        def,
        nivel: 1 + Math.floor(indice * 2.1),
        estrelas: 1,
        stats: {
          vida: Math.round(base.vida * mult),
          vidaMax: Math.round(base.vida * mult),
          atk: Math.round(base.atk * mult * 0.95),
          def: Math.round(base.def * mult),
          spd: base.spd + Math.floor(indice / 8),
          crit: base.crit,
          critDano: base.critDano,
        },
      };
    });
  };

  E.recompensaEstagio = function (capitulo, estagio, primeiraVez) {
    const indice = E.indiceEstagio(capitulo, estagio);
    const escala = Math.pow(1.095, indice);
    const r = {
      ouro: Math.round(260 * escala),
      essencia: Math.round(110 * escala),
    };
    if (primeiraVez) {
      r.fe = 20 + capitulo * 5;
      if (estagio === Jogo.ESTAGIOS_POR_CAPITULO - 1) {
        r.pergaminhos = 5;
        r.fe += 60;
      } else if (indice % 3 === 0) {
        r.pergaminhos = 1;
      }
    }
    return r;
  };

  E.registrarVitoria = function (capitulo, estagio) {
    const c = E.dados.campanha;
    const atual = E.indiceEstagio(c.capitulo, c.estagio);
    const jogado = E.indiceEstagio(capitulo, estagio);
    const primeiraVez = jogado >= atual;
    const ganho = E.recompensaEstagio(capitulo, estagio, primeiraVez);
    E.ganhar(ganho);
    if (primeiraVez) {
      c.vencidos = Math.max(c.vencidos, jogado + 1);
      if (c.estagio + 1 >= Jogo.ESTAGIOS_POR_CAPITULO) {
        if (c.capitulo + 1 < Jogo.Capitulos.length) {
          c.capitulo += 1;
          c.estagio = 0;
        } else {
          c.estagio = Jogo.ESTAGIOS_POR_CAPITULO - 1;
        }
      } else {
        c.estagio += 1;
      }
    }
    E.dados.estatisticas.vitorias += 1;
    E.dados.estatisticas.batalhas += 1;
    E.dados.missoes.batalhas += 1;
    E.salvar();
    return { ganho, primeiraVez };
  };

  E.registrarDerrota = function () {
    E.dados.estatisticas.derrotas += 1;
    E.dados.estatisticas.batalhas += 1;
    E.dados.missoes.batalhas += 1;
    E.salvar();
  };

  // ------------------------------------------------------------ recompensa ociosa
  E.taxaOciosa = function () {
    const v = E.dados.campanha.vencidos;
    const escala = Math.pow(1.098, v);
    return {
      ouro: 400 * escala,
      essencia: 160 * escala,
      pergaminhos: 0.8 + v * 0.05,
      fe: 6 + v * 0.4,
    };
  };

  E.tempoOcioso = function () {
    return Math.max(0, Math.min(TETO_OCIOSO_MS, Date.now() - E.dados.ocioso.desde));
  };

  E.recompensaOciosa = function () {
    const horas = E.tempoOcioso() / 3600000;
    const taxa = E.taxaOciosa();
    const r = {};
    Object.keys(taxa).forEach((k) => (r[k] = Math.floor(taxa[k] * horas)));
    return r;
  };

  E.coletarOcioso = function () {
    const r = E.recompensaOciosa();
    const total = Object.values(r).reduce((a, b) => a + b, 0);
    if (total <= 0) return { ok: false, motivo: "Ainda não há nada acumulado." };
    E.ganhar(r);
    E.dados.ocioso.desde = Date.now();
    E.dados.missoes.coletas += 1;
    E.salvar();
    return { ok: true, recompensa: r };
  };

  E.tetoOciosoMs = TETO_OCIOSO_MS;

  // ------------------------------------------------------------- invocação
  function sortearRaridade(rng) {
    const inv = E.dados.invocacoes;
    if (inv.pityLendario >= 59) return "lendario";
    if (inv.pityEpico >= 9) return ["epico", "lendario"][rng() < 0.2 ? 1 : 0];
    let r = rng();
    for (const chave of ["lendario", "epico", "raro", "comum"]) {
      if (r < TAXAS[chave]) return chave;
      r -= TAXAS[chave];
    }
    return "comum";
  }

  E.invocar = function (vezes) {
    vezes = vezes || 1;
    const custo = { pergaminhos: vezes };
    if (!E.temRecursos(custo)) return { ok: false, motivo: "Pergaminhos insuficientes." };
    E.gastar(custo);

    const resultados = [];
    for (let i = 0; i < vezes; i++) {
      const raridade = sortearRaridade(Math.random);
      const candidatos = Jogo.Herois.filter((h) => h.raridade === raridade);
      const escolhido = U.escolher(candidatos);
      const resultado = adicionarHeroi(E.dados, escolhido.id);

      const inv = E.dados.invocacoes;
      inv.total += 1;
      inv.pityEpico = raridade === "epico" || raridade === "lendario" ? 0 : inv.pityEpico + 1;
      inv.pityLendario = raridade === "lendario" ? 0 : inv.pityLendario + 1;

      resultados.push({ heroi: escolhido, novo: resultado.novo, fragmentos: resultado.fragmentos });
      if (resultado.novo && E.dados.formacao.length < 5) E.dados.formacao.push(escolhido.id);
    }
    E.dados.missoes.invocacoes += vezes;
    E.salvar();
    return { ok: true, resultados };
  };

  // ---------------------------------------------------------------- torre
  E.inimigosTorre = function (andar) {
    const capitulo = Math.min(Jogo.Capitulos.length - 1, Math.floor((andar - 1) / 8));
    const estagio = (andar - 1) % Jogo.ESTAGIOS_POR_CAPITULO;
    return E.montarInimigos(capitulo, estagio, { escala: Math.pow(1.055, andar) * 1.1 });
  };

  E.vencerTorre = function () {
    const t = E.dados.torre;
    const ganho = { fe: 30 + t.andar * 4, pergaminhos: t.andar % 5 === 0 ? 2 : 0, ouro: Math.round(700 * Math.pow(1.09, t.andar)) };
    E.ganhar(ganho);
    t.andar += 1;
    t.melhor = Math.max(t.melhor, t.andar - 1);
    E.dados.estatisticas.vitorias += 1;
    E.dados.missoes.batalhas += 1;
    E.salvar();
    return ganho;
  };

  // -------------------------------------------------------------- missões
  E.MISSOES = [
    { id: "batalhas", nome: "Travar 5 batalhas", meta: 5, campo: "batalhas", premio: { fe: 40, ouro: 1500 } },
    { id: "invocacoes", nome: "Invocar 1 herói", meta: 1, campo: "invocacoes", premio: { fe: 30, essencia: 600 } },
    { id: "melhorias", nome: "Evoluir heróis 5 vezes", meta: 5, campo: "melhorias", premio: { pergaminhos: 2, ouro: 1200 } },
    { id: "coletas", nome: "Recolher a oferta ociosa", meta: 1, campo: "coletas", premio: { fe: 25, pergaminhos: 1 } },
  ];

  E.resgatarMissao = function (id) {
    const missao = E.MISSOES.find((m) => m.id === id);
    const m = E.dados.missoes;
    if (!missao) return { ok: false };
    if (m.resgatadas.indexOf(id) >= 0) return { ok: false, motivo: "Já resgatada hoje." };
    if ((m[missao.campo] || 0) < missao.meta) return { ok: false, motivo: "Missão incompleta." };
    E.ganhar(missao.premio);
    m.resgatadas.push(id);
    E.salvar();
    return { ok: true, premio: missao.premio };
  };

  // ------------------------------------------------ código de save (backup)
  // Formato: ALIANCA1.<g|p>.<assinatura>.<base64>  (g = comprimido com gzip)
  const MARCA = "ALIANCA1";
  const CHAVE_BACKUP = "alianca.save.anterior";

  function assinatura(texto) {
    let h = 0x811c9dc5;
    for (let i = 0; i < texto.length; i++) {
      h ^= texto.charCodeAt(i);
      h = Math.imul(h, 0x01000193) >>> 0;
    }
    return h.toString(36);
  }

  function paraBase64(bytes) {
    let bruto = "";
    const passo = 8192;
    for (let i = 0; i < bytes.length; i += passo) {
      bruto += String.fromCharCode.apply(null, bytes.subarray(i, i + passo));
    }
    return btoa(bruto);
  }

  function deBase64(texto) {
    const bruto = atob(texto);
    const bytes = new Uint8Array(bruto.length);
    for (let i = 0; i < bruto.length; i++) bytes[i] = bruto.charCodeAt(i);
    return bytes;
  }

  async function comprimir(bytes) {
    if (typeof global.CompressionStream === "undefined") return null;
    const fluxo = new Blob([bytes]).stream().pipeThrough(new global.CompressionStream("gzip"));
    return new Uint8Array(await new Response(fluxo).arrayBuffer());
  }

  async function descomprimir(bytes) {
    const fluxo = new Blob([bytes]).stream().pipeThrough(new global.DecompressionStream("gzip"));
    return new Uint8Array(await new Response(fluxo).arrayBuffer());
  }

  E.exportar = async function () {
    E.salvar();
    const texto = JSON.stringify(E.dados);
    const bytes = new TextEncoder().encode(texto);
    let corpo = null;
    let modo = "p";
    try {
      const comprimido = await comprimir(bytes);
      if (comprimido) {
        corpo = paraBase64(comprimido);
        modo = "g";
      }
    } catch (e) {
      corpo = null;
    }
    if (!corpo) corpo = paraBase64(bytes);
    return [MARCA, modo, assinatura(texto), corpo].join(".");
  };

  E.importar = async function (codigo) {
    if (!codigo || !String(codigo).trim()) return { ok: false, motivo: "Cole o código do save." };
    const partes = String(codigo).replace(/\s+/g, "").split(".");
    if (partes.length !== 4 || partes[0] !== MARCA)
      return { ok: false, motivo: "Isso não parece um código de save deste jogo." };

    let texto;
    try {
      let bytes = deBase64(partes[3]);
      if (partes[1] === "g") bytes = await descomprimir(bytes);
      texto = new TextDecoder().decode(bytes);
    } catch (e) {
      return { ok: false, motivo: "Código incompleto ou corrompido — copie-o inteiro." };
    }
    if (assinatura(texto) !== partes[2])
      return { ok: false, motivo: "Código corrompido: a assinatura não confere." };

    let dados;
    try {
      dados = JSON.parse(texto);
    } catch (e) {
      return { ok: false, motivo: "Código ilegível." };
    }

    const limpo = normalizar(dados);
    if (!limpo) return { ok: false, motivo: "Esse save não é válido." };

    try {
      localStorage.setItem(CHAVE_BACKUP, JSON.stringify(E.dados));
    } catch (e) {
      /* sem espaço para o backup: a restauração segue mesmo assim */
    }
    E.dados = limpo;
    E.checarDia();
    E.salvar();
    return { ok: true, resumo: E.resumo() };
  };

  E.resumo = function (dados) {
    const d = dados || E.dados;
    return {
      herois: Object.keys(d.herois).length,
      vencidos: d.campanha.vencidos,
      capitulo: d.campanha.capitulo + 1,
      estagio: d.campanha.estagio + 1,
      torre: d.torre.andar,
    };
  };

  E.temBackup = function () {
    try {
      return !!localStorage.getItem(CHAVE_BACKUP);
    } catch (e) {
      return false;
    }
  };

  E.desfazerImportacao = function () {
    let bruto = null;
    try {
      bruto = localStorage.getItem(CHAVE_BACKUP);
    } catch (e) {
      bruto = null;
    }
    if (!bruto) return { ok: false, motivo: "Não há save anterior guardado." };
    let anterior;
    try {
      anterior = normalizar(JSON.parse(bruto));
    } catch (e) {
      anterior = null;
    }
    if (!anterior) return { ok: false, motivo: "O save anterior está corrompido." };
    E.dados = anterior;
    E.salvar();
    try {
      localStorage.removeItem(CHAVE_BACKUP);
    } catch (e) {
      /* nada a fazer */
    }
    return { ok: true };
  };

  E.TAXAS = TAXAS;

  Jogo.Estado = E;
})(typeof window !== "undefined" ? window : globalThis);
