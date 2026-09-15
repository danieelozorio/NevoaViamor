// Utilidades gerais: números, tempo, sorteio e geração pseudoaleatória.
(function (global) {
  const Jogo = (global.Jogo = global.Jogo || {});
  const U = {};

  U.limitar = (v, min, max) => Math.min(max, Math.max(min, v));

  U.inteiro = (min, max, rng = Math.random) =>
    Math.floor(rng() * (max - min + 1)) + min;

  U.escolher = (lista, rng = Math.random) =>
    lista[Math.floor(rng() * lista.length)];

  U.embaralhar = function (lista, rng = Math.random) {
    const copia = lista.slice();
    for (let i = copia.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [copia[i], copia[j]] = [copia[j], copia[i]];
    }
    return copia;
  };

  // Gerador com semente (mulberry32) para batalhas reproduzíveis.
  U.semente = function (semente) {
    let a = semente >>> 0;
    return function () {
      a += 0x6d2b79f5;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };

  U.numero = function (n) {
    n = Math.floor(n);
    if (n < 1000) return String(n);
    if (n < 1e6) return (n / 1e3).toFixed(n < 1e4 ? 1 : 0) + "K";
    if (n < 1e9) return (n / 1e6).toFixed(n < 1e7 ? 1 : 0) + "M";
    return (n / 1e9).toFixed(2) + "B";
  };

  U.tempo = function (ms) {
    const total = Math.max(0, Math.floor(ms / 1000));
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    if (h > 0) return h + "h " + String(m).padStart(2, "0") + "m";
    if (m > 0) return m + "m " + String(s).padStart(2, "0") + "s";
    return s + "s";
  };

  U.porcento = (v) => Math.round(v * 100) + "%";

  Jogo.Util = U;
})(typeof window !== "undefined" ? window : globalThis);
