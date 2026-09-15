# Ilustrações dos heróis

Esta pasta guarda as ilustrações próprias. **Nada aqui é obrigatório**: herói sem imagem continua
com o boneco desenhado por código, então dá para ilustrar aos poucos, na ordem que quiser.

## Como adicionar uma

1. Salve o arquivo como `<id>.png` — por exemplo `salomao.png`. Os ids estão no fim deste arquivo.
2. Acrescente o id na lista de `lista.js`.
3. Pronto: o retrato aparece no elenco, na invocação, na ficha e na prévia dos inimigos.

## O que a imagem precisa ter

| Requisito | Por quê |
| --- | --- |
| **PNG com fundo transparente** | só assim a figura também vira boneco de batalha |
| **Quadrada** (512×512 serve bem) | é o formato do retrato |
| **Personagem inteiro, de frente, em pé** | para casar com os outros em campo |
| **Sem moldura, sem nome, sem estrelas** | o jogo desenha tudo isso por cima, com o nível e a raridade de cada um |
| **Sem sombra no chão** | a sombra é desenhada pelo jogo, acompanhando a animação |

Enquadramento não precisa ser exato: o jogo mede as margens vazias, recorta a figura e ajusta a
altura sozinho, para todo mundo ficar do mesmo tamanho em campo.

Imagem **sem** fundo transparente ainda funciona como retrato, mas a batalha segue com o boneco
desenhado — uma ilustração de fundo fechado viraria um retângulo flutuando no campo.

Peso: cada arquivo abaixo de ~300 KB. Com os 43 ilustrados isso dá uns 10 MB, que o GitHub Pages
serve bem, mas pesa no celular de quem entra pela primeira vez.

## Instruções prontas

O arquivo [PROMPTS.md](PROMPTS.md) traz uma instrução por herói — mesmo estilo, com as cores, a
classe, a facção e o adereço de cada um — para colar num gerador de imagem. Foi gerado a partir da
própria ficha dos heróis por `ferramentas/gerar-prompts.js`, então basta rodar o script de novo
quando o elenco mudar.

## Os 43 ids

- **Lendários** — moises (Moisés), abraao (Abraão), sansao (Sansão), josue (Josué), elias (Elias), davi (Davi), salomao (Salomão), miguel (Miguel), gabriel (Gabriel), jezabel (Jezabel), nabucodonosor (Nabucodonosor)
- **Ungidos** — noe (Noé), jose (José), debora (Débora), gideao (Gideão), eliseu (Eliseu), daniel (Daniel), ezequiel (Ezequiel), joaobatista (João Batista), ester (Ester), rafael (Rafael), serafim (Serafim), querubim (Querubim), golias (Golias), farao (Faraó), saul (Saul)
- **Escolhidos** — jaco (Jacó), isaque (Isaque), jefte (Jefté), baraque (Baraque), isaias (Isaías), jeremias (Jeremias), ezequias (Ezequias), josias (Josias), hama (Hamã)
- **Fiéis** — jonas (Jonas), rute (Rute), adao (Adão), eva (Eva), calebe (Calebe), miria (Miriã), jonatas (Jônatas), obadias (Obadias)
