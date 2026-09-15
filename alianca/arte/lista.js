// Heróis que já têm ilustração própria em alianca/arte/<id>.png.
// Para usar uma imagem nova: salve o arquivo com o id do herói (por exemplo
// "salomao.png") nesta pasta e acrescente o id na lista abaixo.
// Quem não estiver aqui continua com o boneco desenhado por código.
(function (global) {
  const Jogo = (global.Jogo = global.Jogo || {});
  Jogo.ArteDisponivel = [
    // "salomao",
    // "davi",
  ];
})(typeof window !== "undefined" ? window : globalThis);
