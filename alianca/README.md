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

### Oferta da Vigília (o "AFK")
O altar acumula ouro, óleo, pergaminhos e fé mesmo com o jogo fechado, até o teto de **12 horas**.
A taxa por hora cresce a cada estágio vencido — avançar na campanha é o que acelera todo o resto.

### Combate
Automático, por turnos, com barra de ação ditada pela velocidade. Cada herói acumula **fé** ao agir
e ao apanhar; com 100 de fé libera sua **suprema**. Controles de velocidade (×1/×2/×4) e "Pular".

- **Classes** — Guerreiro (linha de frente), Arqueiro (alvo único), Vidente (área), Sacerdote (cura), Arauto (suporte).
- **Facções** — Patriarcas ▸ Juízes ▸ Profetas ▸ Realeza ▸ Patriarcas; Celestiais ◂▸ Trevas.
  Quem domina causa +30% de dano e sofre menos.

## Estrutura

```
alianca/
├── index.html
├── css/estilo.css
└── src/
    ├── nucleo/      util.js · formulas.js (progressão) · estado.js (save, AFK, gacha)
    ├── dados/       herois.js (43 heróis) · campanha.js (inimigos e capítulos)
    ├── combate/     motor.js (simulação) · arte.js (pixel art) · cena.js (animação)
    ├── ui/          interface.js · campanha.js · herois.js
    └── main.js
```

O motor de combate é *headless*: `Jogo.Combate.simular({aliados, inimigos})` devolve o vencedor e a
lista de eventos, que a cena anima depois — por isso a "varredura rápida" resolve a batalha na hora.

## Balanceamento

Calibrado por simulação: um jogador que só recolhe a oferta ociosa e evolui a hoste termina o
capítulo 1 em algumas horas, o capítulo 5 em ~4 dias e a campanha inteira em ~24 dias.
Ficar 20% abaixo do teto de nível trava o avanço nos capítulos finais — é o que empurra
para ascender heróis, subir relíquias e invocar reforços.
