// Partículas e efeitos das habilidades. O tipo de efeito é deduzido da própria
// ficha do herói (facção, classe e o que a suprema faz), sem dado extra.
(function (global) {
  const Jogo = (global.Jogo = global.Jogo || {});
  const Ef = {};

  const ELEMENTOS = {
    fogo: { cor: "#f0842a", cor2: "#ffd98a", particula: "brasa" },
    agua: { cor: "#4f9ec0", cor2: "#bfe8f5", particula: "gota" },
    luz: { cor: "#ffe9a0", cor2: "#fffbe8", particula: "luz" },
    sombra: { cor: "#9b5ca8", cor2: "#4a2a5a", particula: "sombra" },
    veneno: { cor: "#6fbf6f", cor2: "#c8f0a0", particula: "sombra" },
    raio: { cor: "#bfe0ff", cor2: "#ffffff", particula: "faisca" },
    corte: { cor: "#f2f6ff", cor2: "#cfd6e0", particula: "faisca" },
    pedra: { cor: "#c8b89a", cor2: "#8a7a5a", particula: "faisca" },
    cura: { cor: "#7fe0a0", cor2: "#e8fff0", particula: "cura" },
    escudo: { cor: "#9ad0ff", cor2: "#e0f0ff", particula: "luz" },
    aura: { cor: "#e8c45a", cor2: "#fff3c0", particula: "luz" },
  };

  const PERSONALIZADOS = {
    moises: "agua", elias: "fogo", josue: "raio", davi: "pedra", sansao: "corte",
    jezabel: "veneno", gabriel: "luz", miguel: "fogo", nabucodonosor: "aura",
    serafim: "fogo", jonas: "agua", noe: "agua", joaobatista: "agua",
    farao: "sombra", golias: "corte", leviata: "agua", behemot: "pedra",
    legiao: "sombra", feiticeiro: "sombra", ezequiel: "sombra", salomao: "luz",
  };

  // Deduz elemento e alvo do efeito a partir da suprema.
  Ef.classificar = function (definicao) {
    if (!definicao || !definicao.ult) return { elemento: "aura", alvo: "inimigos" };
    const acoes = definicao.ult.acoes || [];
    const tem = (t) => acoes.some((a) => a.tipo === t);
    const dano = tem("dano") || tem("roubo") || tem("executar");

    let alvo = "inimigos";
    if (!dano) {
      if (tem("cura") || tem("regen") || tem("reviver")) alvo = "aliados";
      else if (tem("escudo") || tem("imune") || tem("energia") || tem("mod")) {
        const paraAliados = acoes.some(
          (a) => a.alvo && (a.alvo.indexOf("aliad") >= 0 || a.alvo === "self")
        );
        alvo = paraAliados ? "aliados" : "inimigos";
      }
    }

    let elemento = PERSONALIZADOS[definicao.id];
    if (!elemento) {
      if (!dano && (tem("cura") || tem("regen") || tem("reviver"))) elemento = "cura";
      else if (!dano && tem("escudo")) elemento = "escudo";
      else if (!dano) elemento = "aura";
      else if (definicao.faccao === "celestiais") elemento = "luz";
      else if (definicao.faccao === "trevas") elemento = "sombra";
      else if (definicao.classe === "vidente") elemento = "fogo";
      else if (definicao.classe === "arqueiro") elemento = "pedra";
      else elemento = "corte";
    }
    return { elemento, alvo, cores: ELEMENTOS[elemento] || ELEMENTOS.aura };
  };

  Ef.cor = (elemento) => (ELEMENTOS[elemento] || ELEMENTOS.aura).cor;

  // ------------------------------------------------------------- sistema
  Ef.criar = function () {
    return { particulas: [], formas: [] };
  };

  function novaParticula(sis, p) {
    if (sis.particulas.length > 260) sis.particulas.shift();
    sis.particulas.push(p);
  }

  Ef.emitir = function (sis, tipo, x, y, opcoes) {
    opcoes = opcoes || {};
    const n = opcoes.quantidade || 8;
    const cor = opcoes.cor || "#ffd05a";
    const cor2 = opcoes.cor2 || cor;

    for (let i = 0; i < n; i++) {
      const a = opcoes.angulo != null ? opcoes.angulo + (Math.random() - 0.5) : Math.random() * Math.PI * 2;
      const v = (opcoes.velocidade || 0.05) * (0.4 + Math.random());
      const base = {
        x: x + (Math.random() - 0.5) * (opcoes.espalhar || 10),
        y: y + (Math.random() - 0.5) * (opcoes.espalhar || 10),
        vx: Math.cos(a) * v,
        vy: Math.sin(a) * v,
        grav: 0.00018,
        vida: 0,
        duracao: opcoes.duracao || 520,
        tam: opcoes.tamanho || 2,
        cor: Math.random() < 0.5 ? cor : cor2,
        tipo,
      };

      if (tipo === "brasa") {
        base.vy = -Math.abs(base.vy) - 0.02;
        base.grav = -0.00004;
        base.duracao = 700;
      } else if (tipo === "cura" || tipo === "luz") {
        base.vx *= 0.4;
        base.vy = -0.02 - Math.random() * 0.03;
        base.grav = 0;
        base.duracao = 800;
      } else if (tipo === "sombra") {
        base.vy = -0.01 - Math.random() * 0.02;
        base.grav = -0.00002;
        base.tam = (opcoes.tamanho || 2) + 1;
        base.duracao = 760;
      } else if (tipo === "gota") {
        base.grav = 0.00035;
      } else if (tipo === "poeira") {
        base.vy = -Math.abs(base.vy) * 0.4;
        base.grav = 0.00012;
        base.duracao = 420;
        base.cor = "rgba(210,200,180,0.55)";
      }
      novaParticula(sis, base);
    }
  };

  // Formas maiores: anéis, cortes, colunas de fogo, raios e domos.
  Ef.forma = function (sis, tipo, x, y, opcoes) {
    opcoes = opcoes || {};
    sis.formas.push({
      tipo,
      x,
      y,
      vida: 0,
      duracao: opcoes.duracao || 520,
      raio: opcoes.raio || 40,
      cor: opcoes.cor || "#ffd05a",
      cor2: opcoes.cor2 || "#ffffff",
      largura: opcoes.largura || 120,
      altura: opcoes.altura || 70,
      direcao: opcoes.direcao || 1,
    });
  };

  Ef.atualizar = function (sis, dt) {
    for (let i = sis.particulas.length - 1; i >= 0; i--) {
      const p = sis.particulas[i];
      p.vida += dt;
      if (p.vida >= p.duracao) {
        sis.particulas.splice(i, 1);
        continue;
      }
      p.vy += p.grav * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
    for (let i = sis.formas.length - 1; i >= 0; i--) {
      const f = sis.formas[i];
      f.vida += dt;
      if (f.vida >= f.duracao) sis.formas.splice(i, 1);
    }
  };

  Ef.desenhar = function (sis, ctx) {
    sis.formas.forEach((f) => desenharForma(ctx, f));

    sis.particulas.forEach((p) => {
      const t = p.vida / p.duracao;
      ctx.globalAlpha = Math.max(0, 1 - t * t);
      ctx.fillStyle = p.cor;
      const tam = p.tipo === "sombra" ? p.tam * (1 + t) : p.tam * (1 - t * 0.5);
      if (p.tipo === "cura") {
        ctx.fillRect(p.x - tam, p.y - 0.6, tam * 2, 1.4);
        ctx.fillRect(p.x - 0.6, p.y - tam, 1.4, tam * 2);
      } else {
        ctx.fillRect(p.x - tam / 2, p.y - tam / 2, tam, tam);
      }
    });
    ctx.globalAlpha = 1;
  };

  function desenharForma(ctx, f) {
    const t = f.vida / f.duracao;
    const alfa = Math.max(0, 1 - t);
    ctx.save();
    ctx.globalAlpha = alfa;

    switch (f.tipo) {
      case "anel": {
        ctx.strokeStyle = f.cor;
        ctx.lineWidth = 3 * (1 - t) + 0.5;
        ctx.beginPath();
        ctx.ellipse(f.x, f.y, f.raio * (0.3 + t * 1.1), f.raio * 0.32 * (0.3 + t * 1.1), 0, 0, Math.PI * 2);
        ctx.stroke();
        break;
      }
      case "corte": {
        ctx.strokeStyle = f.cor2;
        ctx.lineWidth = 4 * (1 - t) + 0.6;
        ctx.beginPath();
        const giro = -0.9 + t * 1.6;
        ctx.arc(f.x, f.y, f.raio, giro, giro + 1.5);
        ctx.stroke();
        ctx.strokeStyle = f.cor;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(f.x, f.y, f.raio + 3, giro, giro + 1.2);
        ctx.stroke();
        break;
      }
      case "coluna": {
        const altura = f.altura * Math.min(1, t * 2.2);
        const larg = f.raio * (1 - t * 0.35);
        const g = ctx.createLinearGradient(f.x, f.y, f.x, f.y - altura);
        g.addColorStop(0, f.cor2);
        g.addColorStop(0.5, f.cor);
        g.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = g;
        ctx.fillRect(f.x - larg / 2, f.y - altura, larg, altura);
        break;
      }
      case "onda": {
        const avanco = t * f.largura;
        const g = ctx.createLinearGradient(f.x, 0, f.x + f.largura * f.direcao, 0);
        g.addColorStop(0, "rgba(0,0,0,0)");
        g.addColorStop(0.6, f.cor);
        g.addColorStop(1, f.cor2);
        ctx.fillStyle = g;
        ctx.globalAlpha = alfa * 0.75;
        ctx.beginPath();
        ctx.moveTo(f.x + (avanco - 30) * f.direcao, f.y + 16);
        ctx.quadraticCurveTo(
          f.x + avanco * f.direcao, f.y - f.altura,
          f.x + (avanco + 26) * f.direcao, f.y + 16
        );
        ctx.closePath();
        ctx.fill();
        break;
      }
      case "raio": {
        ctx.strokeStyle = f.cor2;
        ctx.lineWidth = 2.5 * (1 - t) + 0.8;
        ctx.beginPath();
        let x = f.x;
        ctx.moveTo(x, f.y - f.altura);
        for (let y = f.y - f.altura; y < f.y; y += 12) {
          x += (Math.random() - 0.5) * 12;
          ctx.lineTo(x, y);
        }
        ctx.lineTo(f.x, f.y);
        ctx.stroke();
        break;
      }
      case "domo": {
        ctx.strokeStyle = f.cor;
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.ellipse(f.x, f.y - 14, f.raio * (0.7 + t * 0.4), f.raio * (0.9 + t * 0.4), 0, Math.PI, Math.PI * 2);
        ctx.stroke();
        break;
      }
      case "estrela": {
        ctx.strokeStyle = f.cor;
        ctx.lineWidth = 2 * (1 - t) + 0.4;
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2 + t * 1.2;
          const r1 = f.raio * 0.3 * (1 + t);
          const r2 = f.raio * (0.8 + t * 0.5);
          ctx.beginPath();
          ctx.moveTo(f.x + Math.cos(a) * r1, f.y + Math.sin(a) * r1 * 0.5);
          ctx.lineTo(f.x + Math.cos(a) * r2, f.y + Math.sin(a) * r2 * 0.5);
          ctx.stroke();
        }
        break;
      }
    }
    ctx.restore();
  }

  Jogo.Efeitos = Ef;
})(typeof window !== "undefined" ? window : globalThis);
