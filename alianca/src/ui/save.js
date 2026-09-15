// Guardar e restaurar: gera um código com todo o progresso e o lê de volta,
// por texto ou por arquivo. Serve de backup e de ponte entre aparelhos.
(function (global) {
  const Jogo = (global.Jogo = global.Jogo || {});
  const UI = Jogo.UI;
  const E = Jogo.Estado;

  function cartaoSave() {
    const c = UI.el("div", "cartao");
    c.appendChild(UI.el("h2", null, "Guardar e restaurar"));
    c.appendChild(
      UI.el("p", null,
        "O progresso fica salvo neste navegador. Gere um código para ter cópia de segurança " +
        "ou para continuar a jornada em outro aparelho.")
    );

    const r = E.resumo();
    c.appendChild(
      UI.el("p", "legenda",
        r.herois + " heróis · " + r.vencidos + " estágios vencidos · capítulo " + r.capitulo +
        "-" + r.estagio + " · torre no andar " + r.torre)
    );

    const gerar = UI.el("button", "botao", "Gerar código de save");
    gerar.onclick = mostrarCodigo;
    c.appendChild(gerar);

    const restaurar = UI.el("button", "botao secundario pequeno", "Restaurar de um código");
    restaurar.onclick = telaRestaurar;
    c.appendChild(restaurar);

    if (E.temBackup()) {
      const desfazer = UI.el("button", "botao secundario pequeno", "Desfazer a última restauração");
      desfazer.onclick = () => {
        const r2 = E.desfazerImportacao();
        if (!r2.ok) return UI.aviso(r2.motivo);
        UI.aviso("Save anterior recuperado.");
        UI.selCapitulo = null;
        UI.render();
      };
      c.appendChild(desfazer);
    }

    return c;
  }

  async function mostrarCodigo() {
    let codigo;
    try {
      codigo = await E.exportar();
    } catch (e) {
      return UI.aviso("Não consegui gerar o código neste navegador.");
    }

    const caixa = UI.el("div");
    caixa.appendChild(UI.el("h2", null, "Seu código de save"));
    caixa.appendChild(
      UI.el("p", null,
        "Copie e guarde onde quiser (anotações, e-mail, conversa consigo mesmo). " +
        "No outro aparelho, abra o jogo e use “Restaurar de um código”.")
    );

    const campo = UI.el("textarea", "campo-save");
    campo.value = codigo;
    campo.readOnly = true;
    campo.onclick = () => campo.select();
    caixa.appendChild(campo);

    caixa.appendChild(UI.el("p", "legenda", codigo.length.toLocaleString("pt-BR") + " caracteres"));

    const linha = UI.el("div", "linha-botoes");

    const copiar = UI.el("button", "botao pequeno", "Copiar código");
    copiar.onclick = async () => {
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(codigo);
        } else {
          campo.select();
          document.execCommand("copy");
        }
        UI.aviso("Código copiado!");
      } catch (e) {
        campo.select();
        UI.aviso("Copie manualmente: o texto já está selecionado.");
      }
    };
    linha.appendChild(copiar);

    const baixar = UI.el("button", "botao secundario pequeno", "Baixar arquivo");
    baixar.onclick = () => {
      try {
        const nome = "alianca-save-" + new Date().toISOString().slice(0, 10) + ".txt";
        const url = URL.createObjectURL(new Blob([codigo], { type: "text/plain" }));
        const a = document.createElement("a");
        a.href = url;
        a.download = nome;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 2000);
      } catch (e) {
        UI.aviso("Este navegador não deixou baixar — use o botão de copiar.");
      }
    };
    linha.appendChild(baixar);
    caixa.appendChild(linha);

    UI.abrirModal(caixa);
    campo.select();
  }

  function telaRestaurar() {
    const caixa = UI.el("div");
    caixa.appendChild(UI.el("h2", null, "Restaurar um save"));
    caixa.appendChild(
      UI.el("p", null,
        "Cole o código abaixo ou escolha o arquivo baixado. O progresso atual deste aparelho " +
        "será substituído — mas fica guardado, e dá para desfazer logo depois.")
    );

    const campo = UI.el("textarea", "campo-save");
    campo.placeholder = "ALIANCA1.g...";
    caixa.appendChild(campo);

    const arquivo = UI.el("input");
    arquivo.type = "file";
    arquivo.accept = ".txt,.json,text/plain";
    arquivo.className = "campo-arquivo";
    arquivo.onchange = () => {
      const f = arquivo.files && arquivo.files[0];
      if (!f) return;
      const leitor = new FileReader();
      leitor.onload = () => {
        campo.value = String(leitor.result || "").trim();
        UI.aviso("Arquivo carregado — confira e restaure.");
      };
      leitor.onerror = () => UI.aviso("Não consegui ler o arquivo.");
      leitor.readAsText(f);
    };
    caixa.appendChild(arquivo);

    const confirmar = UI.el("button", "botao", "Restaurar este save");
    confirmar.onclick = async () => {
      confirmar.disabled = true;
      const r = await E.importar(campo.value);
      confirmar.disabled = false;
      if (!r.ok) return UI.aviso(r.motivo);
      UI.fecharModal();
      UI.selCapitulo = null;
      UI.filtroHerois = "todos";
      UI.render();
      UI.aviso("Save restaurado: " + r.resumo.herois + " heróis, " + r.resumo.vencidos + " estágios.");
    };
    caixa.appendChild(confirmar);

    const cancelar = UI.el("button", "botao secundario pequeno", "Cancelar");
    cancelar.onclick = UI.fecharModal;
    caixa.appendChild(cancelar);

    UI.abrirModal(caixa);
  }

  Jogo.UI.cartaoSave = cartaoSave;
})(typeof window !== "undefined" ? window : globalThis);
