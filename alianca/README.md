# Crônicas da Aliança

RPG **idle** de combate por turnos com personagens da Bíblia, no espírito de *AFK Journey*:
a hoste luta sozinha, acumula recompensas enquanto você está fora e evolui entre uma batalha e outra.

Abra `alianca/index.html` no navegador — não há instalação, servidor nem dependências.
O progresso é salvo no `localStorage` do próprio navegador.

## Como se joga

| Aba | O que faz |
| --- | --- |
| **Campanha** | 10 capítulos × 10 estágios, de Gênesis à Última Trombeta. Cada estágio vencido aumenta a renda ociosa e o teto de nível. |
| **Hoste** | Elenco de 43 heróis, formação de até 5, evolução (nível, ascensão em estrelas, 4 relíquias por herói) e o Códex. |
| **Invocação** | Gacha com pergaminhos sagrados; heróis repetidos viram fragmentos de ascensão. Garantia de Ungido a cada 10 e de Lendário a cada 60. |
| **Torre** | Andares infinitos, cada vez mais duros, pagos em fé. |
| **Missões** | Metas diárias, roda das facções e as crônicas da sua jornada. |

### Guardar e restaurar
O progresso vive no `localStorage`, ou seja: preso ao navegador e ao endereço do site. Para não
depender só disso, a aba **Missões** tem o cartão *Guardar e restaurar*:

- **Gerar código de save** — empacota todo o progresso num código de texto (copiar ou baixar como
  arquivo). Formato `ALIANCA1.<g|p>.<assinatura>.<base64>`, comprimido com gzip pela
  `CompressionStream` do próprio navegador quando disponível, com queda para base64 puro quando não.
  Um save completo — 43 heróis no nível máximo — cabe em menos de mil caracteres.
- **Restaurar de um código** — aceita texto colado ou arquivo. Antes de valer, o save passa por
  conferência de assinatura e saneamento: herói que não existe mais é descartado, níveis, estrelas e
  relíquias voltam para dentro dos limites, valores negativos ou inválidos viram zero e um relógio
  adiantado não vira oferta ociosa de graça.
- **Desfazer a última restauração** — o save anterior é guardado à parte, então restaurar por engano
  não custa a jornada.

Salvar em nuvem de verdade (sincronizar sozinho entre aparelhos) exige um serviço externo com login,
já que o GitHub Pages é hospedagem estática. O código de save resolve backup e troca de aparelho
sem depender de nada disso.

### Oferta da Vigília (o "AFK")
O altar acumula ouro, óleo, pergaminhos e fé mesmo com o jogo fechado, até o teto de **12 horas**.
A taxa por hora cresce a cada estágio vencido — avançar na campanha é o que acelera todo o resto.

### Combate
Automático, por turnos, com barra de ação ditada pela velocidade. Cada herói acumula **fé** ao agir
e ao apanhar; com 100 de fé libera sua **suprema** — em média a primeira sai na segunda rodada e
uma batalha equilibrada tem de 4 a 12 supremas. Controles de velocidade (×1/×2/×4) e "Pular".

- **Classes** — Guerreiro (linha de frente), Arqueiro (alvo único), Vidente (área), Sacerdote (cura), Arauto (suporte).
- **Facções** — Patriarcas ▸ Juízes ▸ Profetas ▸ Realeza ▸ Patriarcas; Celestiais ◂▸ Trevas.
  Quem domina causa +30% de dano e sofre menos.

### Visual
Tudo é desenhado por código, sem uma única imagem externa:

- **Sprites** montados com retângulos, com contorno, sombreamento e silhueta própria por classe
  (elmo com crista, capuz do vidente, turbante do sacerdote, diadema do arauto), mais coroa da
  Realeza, asas e auréola dos Celestiais e aura roxa das Trevas. Cada corpo é renderizado uma vez
  num canvas fora de tela e reaproveitado; só o adereço da mão gira junto com o golpe.
- **Animação** — respiração parada, investida no ataque, recuo ao apanhar, clarão branco na
  silhueta, tombo com rotação na morte e anel dourado sob quem está agindo.
- **Cenário em camadas** por capítulo: céu em degradê com astro, nuvens e estrelas, duas serras com
  perspectiva atmosférica, um elemento próprio de cada capítulo (árvores do Éden, pirâmides, dunas,
  as muralhas de Jericó, tendas, a cidade, o altar do Carmelo, o zigurate da Babilônia, o abismo e o
  horizonte em chamas), chão com trilha central e silhuetas em primeiro plano, tudo sob vinheta.
- **Ilustrações próprias (opcional)** — largar um `alianca/arte/<id>.png` com fundo transparente
  substitui o boneco daquele herói no elenco e no campo de batalha; quem não tiver arquivo segue
  desenhado por código, então dá para ilustrar aos poucos. O jogo recorta as margens vazias e
  normaliza a altura sozinho. Ver `alianca/arte/LEIA-ME.md` e as instruções prontas em
  `alianca/arte/PROMPTS.md`.
- **Efeitos das supremas** deduzidos da própria ficha do herói: colunas de fogo, onda d'água,
  raios de luz, anéis de sombra, cortes, domos de escudo e partículas de cura — com clarão colorido,
  tremor de tela e faixa com o nome da habilidade.

## Estrutura

```
alianca/
├── index.html
├── css/estilo.css
├── arte/           ilustrações opcionais (<id>.png) + lista.js + PROMPTS.md
├── ferramentas/    gerar-prompts.js
└── src/
    ├── nucleo/      util.js · formulas.js (progressão) · estado.js (save, AFK, gacha, códigos de save)
    ├── dados/       herois.js (43 heróis) · campanha.js (inimigos e capítulos)
    ├── combate/     motor.js (simulação) · arte.js (pixel art) · arte-externa.js · efeitos.js · cena.js
    ├── ui/          interface.js · campanha.js · herois.js · save.js
    └── main.js
```

O motor de combate é *headless*: `Jogo.Combate.simular({aliados, inimigos})` devolve o vencedor e a
lista de eventos, que a cena anima depois — por isso a "varredura rápida" resolve a batalha na hora.

## Balanceamento

Calibrado por simulação: um jogador que só recolhe a oferta ociosa e evolui a hoste termina o
capítulo 1 em algumas horas, o capítulo 5 em ~3 dias e a campanha inteira em ~21 dias.
Ficar 20% abaixo do teto de nível trava o avanço nos capítulos finais — é o que empurra
para ascender heróis, subir relíquias e invocar reforços.
