// Ilustrações próprias dos heróis (alianca/arte/<id>.png).
// Quem tiver arquivo usa a ilustração; quem não tiver continua com o boneco
// desenhado por código. A imagem é recortada e redimensionada aqui mesmo.
(function (global) {
  const Jogo = (global.Jogo = global.Jogo || {});
  const X = {};
  const CAMINHO = "arte/";
  const registro = {};
  let aoCarregar = null;

  X.definirCallback = function (fn) {
    aoCarregar = fn;
  };

  X.iniciar = function () {
    const lista = Jogo.ArteDisponivel || [];
    lista.forEach((id) => {
      if (registro[id]) return;
      registro[id] = { estado: "carregando" };
      const img = new Image();
      img.onload = () => processar(id, img);
      img.onerror = () => {
        registro[id] = { estado: "ausente" };
      };
      img.src = CAMINHO + id + ".png";
    });
  };

  // Mede as bordas transparentes para recortar a figura.
  function medir(img) {
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(img, 0, 0);

    const dados = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    let x0 = canvas.width;
    let y0 = canvas.height;
    let x1 = 0;
    let y1 = 0;
    let transparentes = 0;

    for (let y = 0; y < canvas.height; y++) {
      for (let x = 0; x < canvas.width; x++) {
        const alfa = dados[(y * canvas.width + x) * 4 + 3];
        if (alfa < 12) {
          transparentes++;
          continue;
        }
        if (x < x0) x0 = x;
        if (y < y0) y0 = y;
        if (x > x1) x1 = x;
        if (y > y1) y1 = y;
      }
    }

    const temFundoVazado = transparentes > canvas.width * canvas.height * 0.05;
    if (!temFundoVazado || x1 <= x0 || y1 <= y0) {
      return { x0: 0, y0: 0, largura: canvas.width, altura: canvas.height, recortada: false };
    }
    return { x0, y0, largura: x1 - x0 + 1, altura: y1 - y0 + 1, recortada: true };
  }

  function processar(id, img) {
    let limites;
    try {
      limites = medir(img);
    } catch (e) {
      // canvas "manchado" (acontece ao abrir por file://): usa a imagem inteira
      limites = { x0: 0, y0: 0, largura: img.naturalWidth, altura: img.naturalHeight, recortada: false };
    }
    registro[id] = { estado: "pronta", img, limites, escalas: {} };
    if (aoCarregar) aoCarregar(id);
  }

  X.pronta = function (id) {
    const r = registro[id];
    return !!(r && r.estado === "pronta");
  };

  // Só vira boneco de batalha quem veio com fundo vazado; ilustração de fundo
  // fechado ficaria como um retângulo flutuando no campo.
  X.temSprite = function (id) {
    const r = registro[id];
    return !!(r && r.estado === "pronta" && r.limites.recortada);
  };

  X.imagem = function (id) {
    const r = registro[id];
    return r && r.estado === "pronta" ? r : null;
  };

  // Devolve a figura já desenhada na altura pedida, em pixels reais de tela,
  // para o desenho sair nítido em vez de esticado.
  X.sprite = function (id, alturaPx) {
    const r = registro[id];
    if (!r || r.estado !== "pronta") return null;
    const altura = Math.max(16, Math.round(alturaPx));
    if (r.escalas[altura]) return r.escalas[altura];

    const proporcao = r.limites.largura / r.limites.altura;
    const largura = Math.max(8, Math.round(altura * proporcao));

    const canvas = document.createElement("canvas");
    canvas.width = largura;
    canvas.height = altura;
    const ctx = canvas.getContext("2d");
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(
      r.img,
      r.limites.x0, r.limites.y0, r.limites.largura, r.limites.altura,
      0, 0, largura, altura
    );

    // silhueta branca para o clarão de quando a unidade apanha
    const brilho = document.createElement("canvas");
    brilho.width = largura;
    brilho.height = altura;
    const ctxBrilho = brilho.getContext("2d");
    ctxBrilho.drawImage(canvas, 0, 0);
    ctxBrilho.globalCompositeOperation = "source-in";
    ctxBrilho.fillStyle = "#ffffff";
    ctxBrilho.fillRect(0, 0, largura, altura);

    const pronto = { canvas, brilho, largura, altura };
    r.escalas[altura] = pronto;
    return pronto;
  };

  Jogo.ArteExterna = X;
})(typeof window !== "undefined" ? window : globalThis);
