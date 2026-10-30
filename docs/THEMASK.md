# The Mask Cup — Broadcast

Variante independente da MixES, baseada na referência visual fornecida pelo usuário: azul CT `#2B93E0`, dourado TR `#E4AE35`, painéis escuros, avatares hexagonais, placar superior e dez jogadores na base. A camada do jogo fica livre no centro e o fundo é transparente em uso ao vivo.

## Instalar no JTs e OBS

1. Gere o pacote em Windows com `py -3 scripts/package-themask.py` ou, em Linux/macOS, com `python3 scripts/package-themask.py`.
2. No JTs, importe `dist/TheMask-HUD-v1.1.zip`, sem descompactar.
3. Inicie **The Mask Cup — Broadcast**. Cadastre times, logos, jogadores e fotos no gerenciador como na Echo/MixES.
4. Copie a URL para uma fonte Navegador do OBS, em **1920 × 1080**.
5. Abra o painel da HUD no JTs para configurar nome do campeonato, cores, melhor de, tamanho e encaixe das fotos.

Alt+O alterna a HUD, Alt+L alterna a logo e Alt+F continua sendo o atalho de atualização do JTs. Há botões Mostrar/Ocultar no painel.

## Prévia local

Na pasta do repositório, inicie `python3 -m http.server 8765` (Windows: `py -3 -m http.server 8765`) e abra:

```text
http://localhost:8765/themask/index.html?demo=1
```

A prévia tem botões para bomba, rodada ao vivo, compra, pausa, desarme, vitória, troca de lados e ausência de fotos. Usa dados de exemplo e imagens locais; o fundo escuro aparece somente na prévia. A fonte da transmissão deve usar a URL de produção do JTs, sem `demo=1`.

## Interface do CS2

Esta variante usa o killfeed nativo e inclui radar próprio TheMask. O layout compacto de referência pode ser usado com `themask/cfg/themaskon.cfg`, que oculta também o radar nativo. Para restaurar, use `themask/cfg/themaskoff.cfg`. Copie esses dois arquivos para `game/csgo/cfg` do cliente CS2 e execute `exec themaskon` ou `exec themaskoff` no console. Os atalhos do JTs controlam a camada externa; as CFGs controlam o jogo.

## Radar, fotos e mouse (v1.1)

O radar usa as imagens e calibrações já presentes na base Echo para Mirage, Dust2, Inferno, Nuke, Train, Overpass, Ancient, Anubis, Vertigo e Cache. Mostra os slots dos jogadores, orientação, assistido, mortos, C4 e fumaças. Nuke e Vertigo usam as regras de andar da calibração original. Mapas desconhecidos exibem um aviso em vez de posições sobre uma imagem errada. Assets de mapa e calibração devem ser atualizados juntos quando um mapa do CS2 mudar.

O painel permite ajustar o radar de 240 a 420 px (padrão 320) ou ocultá-lo. As cores acompanham CT/TR. Nomes genéricos Contra-Terroristas/Terroristas aparecem como CT/TR; nomes de equipes cadastradas são preservados.

Avatares públicos da Steam usam a versão full quando a URL aponta para um thumbnail. Retratos personalizados mantêm o arquivo original; não há recompressão ou filtro de nitidez na HUD. A escala desnecessária por transform foi removida das imagens. Para um retrato personalizado, prefira PNG original com 800 × 834 px ou mais na proporção 400:417. A HUD não consegue recuperar detalhes ausentes da imagem cadastrada.

A camada de transmissão tem `pointer-events: none`, seleção e cursor desativados. Ela não gerencia o foco do Windows ou a captura do cursor do CS2; um cursor escapando da janela do jogo precisa ser conferido no ambiente do jogo/OBS. Use a fonte em 1920×1080 para evitar cortes ou reamostragem adicional.

## Implementação e manutenção

- `themask/assets/themask.css`: layout da referência e ajustes locais.
- `themask/assets/themask-renderer.js`: atualização dos elementos, fotos, relógio e ação da bomba.
- `themask/assets/themask-radar.js` e `themask-radar-maps.json`: projeção do radar e calibrações dos assets.
- `themask/assets/themask-state.js`: conversão dos dados enriquecidos do JTs para a apresentação.
- `themask/assets/themask-integration.js`: assinatura de dados, API de times, painel e atalhos.
- `themask/assets/themask-engine.js`: bundle Echo com a entrada visual substituída, preservando registro Socket.IO, GSI e dados dos jogadores.
- `themask/panel.json`: campos do gerenciador.

Para validar a conversão de dados, execute `node --test tests/themask-state.mjs` (Node.js 18+). A prévia foi conferida em Chromium em 1920×1080 e 1280×720. Uma simulação local validou o transporte Socket.IO, o processamento GSI da base, fotos, registro, painel, atalhos, desarme, transparência e escape de textos. A instalação em JTs e a transmissão real devem ser conferidas no Windows/CS2/OBS antes de uma live. Prévia e simulação de dados não substituem essa verificação.

## Créditos

Referência visual e marca: The Mask Cup, fornecidas pelo usuário. Integração baseada em Echo 1.0.2/cshuds.com, com os créditos preservados no pacote. Oswald e Rajdhani foram obtidas do Google Fonts e incluídas localmente; os arquivos de licença estão em `themask/assets/licenses/`. As fotografias da demonstração vieram dos avatares públicos exibidos na referência e são usadas somente no modo de prévia.
