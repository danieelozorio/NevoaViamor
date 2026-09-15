// Motor de combate automático por turnos.
// A simulação é "headless": devolve a lista de eventos que a cena anima depois,
// o que permite resolver batalhas ociosas instantaneamente.
(function (global) {
  const Jogo = (global.Jogo = global.Jogo || {});
  const U = Jogo.Util;
  const F = Jogo.Formulas;

  const ENERGIA_MAXIMA = 100;
  const ENERGIA_ATAQUE = 25;
  const ENERGIA_DANO = 10;
  const LIMITE_ACOES = 260;
  const GAUGE = 1000;

  // ------------------------------------------------------------- unidades
  function criarUnidade(spec, lado, posicao) {
    const def = spec.def;
    const stats = spec.stats;
    const u = {
      uid: (lado === "aliados" ? "a" : "i") + posicao,
      id: def.id,
      nome: def.nome,
      titulo: def.titulo || "",
      lado,
      posicao,
      classe: def.classe,
      faccao: def.faccao,
      raridade: def.raridade,
      arte: def.arte,
      nivel: spec.nivel || 1,
      estrelas: spec.estrelas || 1,
      linha: F.CLASSES[def.classe].linha,
      max: stats,
      vida: stats.vida,
      vidaMax: stats.vida,
      energia: 0,
      escudo: 0,
      status: [],
      vivo: true,
      gauge: 0,
      ult: def.ult,
      passiva: def.passiva || null,
      flags: {},
      gatilhosUsados: {},
      dano: 0,
      curado: 0,
    };
    lerFlags(u);
    return u;
  }

  // Passivas puramente estáticas viram bandeiras lidas durante os cálculos.
  function lerFlags(u) {
    if (!u.passiva) return;
    (u.passiva.acoes || []).forEach((a) => {
      switch (a.tipo) {
        case "penetracao": u.flags.penetracao = a.valor; break;
        case "amplifica_cura": u.flags.amplificaCura = a.valor; break;
        case "reducao_dano_equipe": u.flags.reducaoEquipe = a.valor; break;
        case "protege_tras": u.flags.protegeTras = a.valor; break;
        case "resistencia_classe": u.flags.resistenciaClasse = { classes: a.classes, valor: a.valor }; break;
        case "crit_contra_feridos": u.flags.critFeridos = a.valor; break;
        case "reflexo": u.flags.reflexo = a.valor; break;
        case "renascer": u.flags.renascer = a.pct; break;
      }
    });
  }

  // --------------------------------------------------------------- estado
  function criarContexto(config) {
    const rng = config.semente != null ? U.semente(config.semente) : Math.random;
    const aliados = config.aliados.map((s, i) => criarUnidade(s, "aliados", i));
    const inimigos = config.inimigos.map((s, i) => criarUnidade(s, "inimigos", i));
    return {
      rng,
      aliados,
      inimigos,
      todos: aliados.concat(inimigos),
      eventos: [],
      acoes: 0,
      rodada: 0,
      ultimoAlvo: null,
      ultimoCurado: null,
    };
  }

  const vivos = (lista) => lista.filter((u) => u.vivo);
  const aliadosDe = (ctx, u) => (u.lado === "aliados" ? ctx.aliados : ctx.inimigos);
  const inimigosDe = (ctx, u) => (u.lado === "aliados" ? ctx.inimigos : ctx.aliados);

  function ev(ctx, evento) {
    ctx.eventos.push(evento);
  }

  // ------------------------------------------------------------ atributos
  function stat(u, chave) {
    let soma = 0;
    for (const s of u.status) if (s.tipo === "mod" && s.stat === chave) soma += s.valor;
    const base = u.max[chave] || 0;
    if (chave === "crit") return U.limitar(base + soma, 0, 1);
    return Math.max(base * 0.2, base * (1 + U.limitar(soma, -0.8, 3)));
  }

  function modCura(u) {
    let soma = 0;
    for (const s of u.status) if (s.tipo === "mod" && s.stat === "cura") soma += s.valor;
    return U.limitar(1 + soma, 0, 3);
  }

  const temStatus = (u, tipo) => u.status.some((s) => s.tipo === tipo);

  // --------------------------------------------------------------- alvos
  function selecionar(ctx, origem, seletor, alvoAtual) {
    const inimigos = vivos(inimigosDe(ctx, origem));
    const aliados = vivos(aliadosDe(ctx, origem));
    const caidos = aliadosDe(ctx, origem).filter((u) => !u.vivo);

    if (seletor && seletor.indexOf(":") > 0) {
      const [nome, qtd] = seletor.split(":");
      const n = parseInt(qtd, 10);
      if (nome === "aleatorio_inimigos") {
        const saida = [];
        for (let i = 0; i < n && inimigos.length; i++) saida.push(U.escolher(inimigos, ctx.rng));
        return saida;
      }
      if (nome === "aliados_menor_energia") {
        return aliados.slice().sort((a, b) => a.energia - b.energia).slice(0, n);
      }
      if (nome === "aleatorio_aliados") {
        return U.embaralhar(aliados, ctx.rng).slice(0, n);
      }
    }

    switch (seletor) {
      case "self": return [origem];
      case "alvo": {
        if (alvoAtual && alvoAtual.vivo) return [alvoAtual];
        const outro = escolherAlvo(ctx, origem);
        return outro ? [outro] : [];
      }
      case "todos_inimigos": return inimigos;
      case "todos_aliados": return aliados;
      case "inimigos_frente": {
        const frente = inimigos.filter((u) => u.linha === "frente");
        return frente.length ? frente : inimigos;
      }
      case "inimigos_tras": {
        const tras = inimigos.filter((u) => u.linha === "tras");
        return tras.length ? tras : inimigos;
      }
      case "inimigo_frente": {
        const frente = inimigos.filter((u) => u.linha === "frente");
        return (frente.length ? frente : inimigos).slice(0, 1);
      }
      case "inimigo_maior_atk":
        return inimigos.slice().sort((a, b) => stat(b, "atk") - stat(a, "atk")).slice(0, 1);
      case "inimigo_menor_vida":
        return inimigos.slice().sort((a, b) => a.vida / a.vidaMax - b.vida / b.vidaMax).slice(0, 1);
      case "aliado_menor_vida":
        return aliados.slice().sort((a, b) => a.vida / a.vidaMax - b.vida / b.vidaMax).slice(0, 1);
      case "aliado_menor_energia":
        return aliados.slice().sort((a, b) => a.energia - b.energia).slice(0, 1);
      case "aliado_caido":
        return caidos.slice(0, 1);
      case "ultimo_curado":
        return ctx.ultimoCurado && ctx.ultimoCurado.vivo ? [ctx.ultimoCurado] : [];
      default:
        return alvoAtual ? [alvoAtual] : [];
    }
  }

  // Escolha de alvo do ataque básico, conforme a classe.
  function escolherAlvo(ctx, origem) {
    const inimigos = vivos(inimigosDe(ctx, origem));
    if (!inimigos.length) return null;

    const provocadores = inimigos.filter((u) => temStatus(u, "provocador"));
    if (provocadores.length) return provocadores[0];

    if (origem.classe === "guerreiro") {
      const frente = inimigos.filter((u) => u.linha === "frente");
      return (frente.length ? frente : inimigos)[0];
    }
    if (origem.classe === "arqueiro") {
      return inimigos.slice().sort((a, b) => a.vida / a.vidaMax - b.vida / b.vidaMax)[0];
    }
    if (origem.classe === "vidente") {
      return inimigos.slice().sort((a, b) => b.vidaMax - a.vidaMax)[0];
    }
    return U.escolher(inimigos, ctx.rng);
  }

  // ---------------------------------------------------------------- dano
  function auraReducao(ctx, alvo) {
    let reducao = 0;
    for (const a of vivos(aliadosDe(ctx, alvo))) {
      if (a.flags.reducaoEquipe) reducao += a.flags.reducaoEquipe;
      if (a.flags.protegeTras && alvo.linha === "tras" && a !== alvo) reducao += a.flags.protegeTras;
    }
    return U.limitar(reducao, 0, 0.6);
  }

  function aplicarDano(ctx, origem, alvo, mult, opcoes = {}) {
    if (!alvo || !alvo.vivo) return 0;

    if (temStatus(alvo, "imune")) {
      ev(ctx, { t: "dano", uid: alvo.uid, valor: 0, imune: true, vida: alvo.vida });
      return 0;
    }

    const atk = stat(origem, "atk");
    const pen = origem.flags.penetracao || 0;
    const def = stat(alvo, "def") * (1 - pen);
    const mitigacao = U.limitar(def / (def + 2.1 * atk), 0, 0.55);

    let critChance = stat(origem, "crit");
    if (origem.flags.critFeridos && alvo.vida / alvo.vidaMax < 0.5) critChance += origem.flags.critFeridos;
    const critico = opcoes.criticoGarantido || ctx.rng() < critChance;

    let bruto = atk * mult * (1 - mitigacao);
    bruto *= F.vantagem(origem.faccao, alvo.faccao);
    if (critico) bruto *= origem.max.critDano;
    bruto *= 0.95 + ctx.rng() * 0.1;
    bruto *= 1 - auraReducao(ctx, alvo);

    const resistencia = alvo.flags.resistenciaClasse;
    if (resistencia && resistencia.classes.indexOf(origem.classe) >= 0) bruto *= 1 - resistencia.valor;
    if (opcoes.multiplicadorExtra) bruto *= opcoes.multiplicadorExtra;

    let valor = Math.max(1, Math.round(bruto));
    let absorvido = 0;
    if (alvo.escudo > 0) {
      absorvido = Math.min(alvo.escudo, valor);
      alvo.escudo -= absorvido;
      valor -= absorvido;
    }

    alvo.vida -= valor;
    origem.dano += valor + absorvido;

    ev(ctx, {
      t: "dano",
      uid: alvo.uid,
      de: origem.uid,
      valor: valor + absorvido,
      critico,
      escudo: absorvido,
      vida: Math.max(0, alvo.vida),
      vantagem: F.vantagem(origem.faccao, alvo.faccao) > 1,
    });

    if (critico) disparar(ctx, origem, "ao_critico", alvo);

    if (alvo.vida > 0) {
      ganharEnergia(ctx, alvo, ENERGIA_DANO);
      disparar(ctx, alvo, "ao_receber_dano", origem);
      if (alvo.flags.reflexo && origem.vivo) {
        const retorno = Math.max(1, Math.round((valor + absorvido) * alvo.flags.reflexo));
        origem.vida -= retorno;
        ev(ctx, { t: "dano", uid: origem.uid, de: alvo.uid, valor: retorno, reflexo: true, vida: Math.max(0, origem.vida) });
        if (origem.vida <= 0) matar(ctx, origem, alvo);
      }
      if (alvo.vida / alvo.vidaMax <= 0.45) {
        disparar(ctx, alvo, "vida_baixa", origem, true);
        aliadosDe(ctx, alvo).forEach((a) => {
          if (a.vivo && a.passiva && a.passiva.gatilho === "aliado_ferido") disparar(ctx, a, "aliado_ferido", alvo);
        });
      }
    } else {
      matar(ctx, alvo, origem);
    }

    if (opcoes.roubo && origem.vivo) {
      curar(ctx, origem, origem, 0, { valorFixo: Math.round((valor + absorvido) * opcoes.roubo) });
    }
    return valor + absorvido;
  }

  function matar(ctx, alvo, algoz) {
    // "Segunda chance": quem tem renascimento escapa do golpe fatal uma vez.
    if (alvo.flags.renascer && !alvo.gatilhosUsados.renascer) {
      alvo.gatilhosUsados.renascer = true;
      alvo.vida = Math.round(alvo.vidaMax * alvo.flags.renascer);
      ev(ctx, { t: "passiva", uid: alvo.uid, nome: alvo.passiva ? alvo.passiva.nome : "Renascer" });
      ev(ctx, { t: "cura", uid: alvo.uid, valor: alvo.vida, vida: alvo.vida });
      return;
    }
    alvo.vivo = false;
    alvo.vida = 0;
    alvo.escudo = 0;
    alvo.status = [];
    ev(ctx, { t: "morte", uid: alvo.uid });
    if (algoz && algoz.vivo) disparar(ctx, algoz, "ao_matar", alvo);
    aliadosDe(ctx, alvo).forEach((a) => {
      if (a.vivo && a.passiva && a.passiva.gatilho === "aliado_caiu") disparar(ctx, a, "aliado_caiu", alvo);
    });
  }

  function curar(ctx, origem, alvo, mult, opcoes = {}) {
    if (!alvo || !alvo.vivo) return;
    let valor = opcoes.valorFixo != null ? opcoes.valorFixo : stat(origem, "atk") * mult;
    if (opcoes.pctVida) valor += alvo.vidaMax * opcoes.pctVida;
    valor *= 1 + (origem.flags.amplificaCura || 0);
    valor *= modCura(alvo);
    valor = Math.round(valor);
    if (valor <= 0) return;
    const antes = alvo.vida;
    alvo.vida = Math.min(alvo.vidaMax, alvo.vida + valor);
    origem.curado += alvo.vida - antes;
    ctx.ultimoCurado = alvo;
    ev(ctx, { t: "cura", uid: alvo.uid, valor: alvo.vida - antes, vida: alvo.vida });
    if (origem.passiva && origem.passiva.gatilho === "ao_curar") disparar(ctx, origem, "ao_curar", alvo);
  }

  function ganharEnergia(ctx, u, valor) {
    if (!u.vivo) return;
    const antes = u.energia;
    u.energia = U.limitar(u.energia + valor, 0, ENERGIA_MAXIMA);
    if (u.energia !== antes) ev(ctx, { t: "energia", uid: u.uid, energia: u.energia });
  }

  function aplicarStatus(ctx, alvo, status) {
    if (!alvo.vivo) return;
    if (status.unico && alvo.status.some((s) => s.nome === status.nome)) return;
    alvo.status.push(status);
    ev(ctx, {
      t: "status",
      uid: alvo.uid,
      nome: status.nome || status.tipo,
      estilo: status.estilo || (status.tipo === "mod" ? (status.valor >= 0 ? "buff" : "debuff") : status.tipo),
      duracao: status.duracao,
    });
  }

  // ------------------------------------------------------------- efeitos
  function executarAcoes(ctx, origem, acoes, alvoAtual, origemNome) {
    for (const acao of acoes || []) {
      const alvos = selecionar(ctx, origem, acao.alvo, alvoAtual);
      switch (acao.tipo) {
        case "dano":
          alvos.forEach((alvo) => aplicarDano(ctx, origem, alvo, acao.mult, { criticoGarantido: acao.criticoGarantido }));
          break;
        case "roubo":
          alvos.forEach((alvo) => aplicarDano(ctx, origem, alvo, acao.mult, { roubo: acao.roubo }));
          break;
        case "executar":
          alvos.forEach((alvo) => {
            const fraco = alvo.vida / alvo.vidaMax <= acao.limiar;
            aplicarDano(ctx, origem, alvo, acao.mult, { multiplicadorExtra: fraco ? acao.bonus : 1 });
          });
          break;
        case "cura":
          alvos.forEach((alvo) => curar(ctx, origem, alvo, acao.mult || 0, { pctVida: acao.pctVida }));
          break;
        case "escudo":
          alvos.forEach((alvo) => {
            if (!alvo.vivo) return;
            const valor = Math.round(stat(origem, "atk") * acao.mult);
            alvo.escudo += valor;
            ev(ctx, { t: "escudo", uid: alvo.uid, valor });
          });
          break;
        case "mod":
          alvos.forEach((alvo) =>
            aplicarStatus(ctx, alvo, {
              tipo: "mod", stat: acao.stat, valor: acao.valor,
              duracao: acao.duracao, nome: acao.nome || origemNome, unico: acao.unico,
            })
          );
          break;
        case "mod_condicional": {
          const equipe = vivos(aliadosDe(ctx, origem));
          if (equipe.some((a) => a !== origem && a.classe === acao.requerClasse)) {
            alvos.forEach((alvo) =>
              aplicarStatus(ctx, alvo, { tipo: "mod", stat: acao.stat, valor: acao.valor, duracao: acao.duracao, nome: acao.nome })
            );
          }
          break;
        }
        case "mod_faccao":
          alvos
            .filter((a) => a.faccao === acao.faccao)
            .forEach((alvo) =>
              aplicarStatus(ctx, alvo, { tipo: "mod", stat: acao.stat, valor: acao.valor, duracao: acao.duracao, nome: acao.nome })
            );
          break;
        case "dot":
          alvos.forEach((alvo) =>
            aplicarStatus(ctx, alvo, {
              tipo: "dot", estilo: acao.estilo, duracao: acao.duracao,
              valor: Math.round(stat(origem, "atk") * acao.mult), nome: acao.estilo,
            })
          );
          break;
        case "regen":
          alvos.forEach((alvo) =>
            aplicarStatus(ctx, alvo, {
              tipo: "regen", duracao: acao.duracao,
              valor: Math.round(stat(origem, "atk") * acao.mult), nome: "Regeneração", estilo: "buff",
            })
          );
          break;
        case "atordoar":
          alvos.forEach((alvo) => {
            if (temStatus(alvo, "imune")) return;
            if (ctx.rng() < (acao.chance != null ? acao.chance : 1))
              aplicarStatus(ctx, alvo, { tipo: "atordoado", duracao: acao.duracao, nome: "Atordoado", estilo: "atordoado" });
          });
          break;
        case "provocar":
          // A provocação marca quem provoca: os inimigos passam a mirá-lo.
          aplicarStatus(ctx, origem, { tipo: "provocador", duracao: acao.duracao, nome: "Provocação", estilo: "buff" });
          break;
        case "imune":
          alvos.forEach((alvo) => aplicarStatus(ctx, alvo, { tipo: "imune", duracao: acao.duracao, nome: "Imune", estilo: "buff" }));
          break;
        case "energia":
          alvos.forEach((alvo) => ganharEnergia(ctx, alvo, acao.valor));
          break;
        case "purificar":
          alvos.forEach((alvo) => {
            const antes = alvo.status.length;
            alvo.status = alvo.status.filter(
              (s) => !(s.tipo === "dot" || s.tipo === "atordoado" || (s.tipo === "mod" && s.valor < 0))
            );
            if (alvo.status.length !== antes) ev(ctx, { t: "status", uid: alvo.uid, nome: "Purificado", estilo: "buff", duracao: 0 });
          });
          break;
        case "reviver":
          alvos.forEach((alvo) => {
            if (alvo.vivo) return;
            alvo.vivo = true;
            alvo.vida = Math.round(alvo.vidaMax * acao.pct);
            alvo.energia = 0;
            ev(ctx, { t: "reviver", uid: alvo.uid, vida: alvo.vida });
          });
          break;
        case "sacrificio": {
          const custo = Math.round(origem.vidaMax * acao.pct);
          origem.vida = Math.max(1, origem.vida - custo);
          ev(ctx, { t: "dano", uid: origem.uid, de: origem.uid, valor: custo, sacrificio: true, vida: origem.vida });
          break;
        }
        case "furia": {
          const faltando = 1 - origem.vida / origem.vidaMax;
          origem.status = origem.status.filter((s) => s.nome !== "Fúria");
          if (faltando > 0.02) {
            origem.status.push({ tipo: "mod", stat: "atk", valor: acao.max * faltando, duracao: 2, nome: "Fúria" });
          }
          break;
        }
        default:
          break; // bandeiras estáticas já foram lidas na criação
      }
    }
  }

  function disparar(ctx, u, gatilho, alvo, umaVez) {
    if (!u.vivo || !u.passiva || u.passiva.gatilho !== gatilho) return;
    if (umaVez || gatilho === "vida_baixa" || gatilho === "aliado_ferido") {
      const chave = gatilho;
      if (gatilho === "vida_baixa" && u.gatilhosUsados[chave]) return;
      if (gatilho === "aliado_ferido" && ctx.acoes - (u.gatilhosUsados[chave] || -9) < 2) return;
      u.gatilhosUsados[chave] = gatilho === "vida_baixa" ? true : ctx.acoes;
    }
    if (gatilho === "ao_receber_dano") {
      const unico = (u.passiva.acoes || []).some((a) => a.unico);
      if (unico && u.gatilhosUsados.recebeu) return;
      u.gatilhosUsados.recebeu = true;
    }
    ev(ctx, { t: "passiva", uid: u.uid, nome: u.passiva.nome });
    executarAcoes(ctx, u, u.passiva.acoes, alvo, u.passiva.nome);
  }

  // ---------------------------------------------------------------- turno
  function tiquesDeStatus(ctx, u) {
    for (const s of u.status.slice()) {
      if (s.tipo === "dot" && u.vivo) {
        u.vida -= s.valor;
        ev(ctx, { t: "dano", uid: u.uid, valor: s.valor, dot: s.estilo, vida: Math.max(0, u.vida) });
        if (u.vida <= 0) matar(ctx, u, null);
      } else if (s.tipo === "regen" && u.vivo) {
        u.vida = Math.min(u.vidaMax, u.vida + s.valor);
        ev(ctx, { t: "cura", uid: u.uid, valor: s.valor, vida: u.vida });
      }
    }
    u.status.forEach((s) => (s.duracao -= 1));
    u.status = u.status.filter((s) => s.duracao > 0);
  }

  function agir(ctx, u) {
    ctx.acoes += 1;
    ev(ctx, { t: "turno", uid: u.uid });

    tiquesDeStatus(ctx, u);
    if (!u.vivo) return;

    if (temStatus(u, "atordoado")) {
      ev(ctx, { t: "atordoado", uid: u.uid });
      return;
    }

    disparar(ctx, u, "cada_turno", null);
    if (!u.vivo) return;

    const alvo = escolherAlvo(ctx, u);
    if (!alvo) return;

    if (u.energia >= ENERGIA_MAXIMA && u.ult) {
      u.energia = 0;
      ev(ctx, { t: "acao", uid: u.uid, estilo: "ult", nome: u.ult.nome, alvo: alvo.uid });
      ev(ctx, { t: "energia", uid: u.uid, energia: 0 });
      ctx.ultimoAlvo = alvo;
      executarAcoes(ctx, u, u.ult.acoes, alvo, u.ult.nome);
      disparar(ctx, u, "ao_usar_ult", alvo);
    } else {
      ev(ctx, { t: "acao", uid: u.uid, estilo: "basico", nome: "Ataque", alvo: alvo.uid });
      ctx.ultimoAlvo = alvo;
      const multBasico = u.classe === "guerreiro" ? 1.15 : u.classe === "arqueiro" ? 1.3 : 1.05;
      aplicarDano(ctx, u, alvo, multBasico);
      ganharEnergia(ctx, u, ENERGIA_ATAQUE);
      disparar(ctx, u, "ao_atacar", alvo);
    }
  }

  function fimDeJogo(ctx) {
    if (!vivos(ctx.aliados).length) return "inimigos";
    if (!vivos(ctx.inimigos).length) return "aliados";
    return null;
  }

  function vidaRelativa(lista) {
    const total = lista.reduce((a, u) => a + u.vidaMax, 0) || 1;
    return lista.reduce((a, u) => a + Math.max(0, u.vida), 0) / total;
  }

  // -------------------------------------------------------------- público
  function simular(config) {
    const ctx = criarContexto(config);

    ctx.todos.forEach((u) => disparar(ctx, u, "inicio", null));

    let vencedor = fimDeJogo(ctx);
    while (!vencedor && ctx.acoes < LIMITE_ACOES) {
      const ativos = vivos(ctx.todos);
      if (!ativos.length) break;

      // Avança o relógio até que alguém complete a barra de ação.
      let menor = Infinity;
      for (const u of ativos) menor = Math.min(menor, (GAUGE - u.gauge) / Math.max(1, stat(u, "spd")));
      for (const u of ativos) u.gauge += stat(u, "spd") * menor;

      const prontos = ativos
        .filter((u) => u.gauge >= GAUGE - 0.001)
        .sort((a, b) => stat(b, "spd") - stat(a, "spd"));

      for (const u of prontos) {
        if (!u.vivo) continue;
        u.gauge -= GAUGE;
        agir(ctx, u);
        vencedor = fimDeJogo(ctx);
        if (vencedor) break;
      }
      ctx.rodada += 1;
    }

    if (!vencedor) {
      vencedor = vidaRelativa(ctx.aliados) >= vidaRelativa(ctx.inimigos) ? "aliados" : "inimigos";
    }

    ev(ctx, { t: "fim", vencedor, rodadas: ctx.rodada });

    return {
      vencedor,
      rodadas: ctx.rodada,
      acoes: ctx.acoes,
      eventos: ctx.eventos,
      unidades: ctx.todos.map((u) => ({
        uid: u.uid, id: u.id, nome: u.nome, lado: u.lado, posicao: u.posicao,
        classe: u.classe, faccao: u.faccao, raridade: u.raridade, arte: u.arte,
        linha: u.linha, vidaMax: u.vidaMax, nivel: u.nivel, estrelas: u.estrelas,
        ult: u.ult ? u.ult.nome : "", dano: u.dano, curado: u.curado,
        vidaFinal: Math.max(0, u.vida),
      })),
      sobreviventes: vivos(ctx.aliados).length,
      vidaRestante: vidaRelativa(ctx.aliados),
    };
  }

  Jogo.Combate = { simular, ENERGIA_MAXIMA };
})(typeof window !== "undefined" ? window : globalThis);
