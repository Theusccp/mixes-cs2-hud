# The Mask Cup — Broadcast

Variante independente da MixES, baseada na referência visual fornecida pelo usuário: azul CT `#2B93E0`, dourado TR `#E4AE35`, painéis escuros, avatares hexagonais, placar superior e dez jogadores na base. A camada do jogo fica livre no centro e o fundo é transparente em uso ao vivo.

## Instalar no JTs e OBS

1. Gere o pacote em Windows com `py -3 scripts/package-themask.py` ou, em Linux/macOS, com `python3 scripts/package-themask.py`.
2. No JTs, importe `dist/TheMask-HUD-v1.8.zip`, sem descompactar.
3. Inicie **The Mask Cup — Broadcast**. Cadastre times, logos, jogadores e fotos no gerenciador como na Echo/MixES.
4. Copie a URL para uma fonte Navegador do OBS, em **1920 × 1080**.
5. Abra o painel da HUD no JTs para configurar nome do campeonato, cores, melhor de, tamanho e encaixe das fotos.

Alt+O alterna a HUD, Alt+L alterna a logo, Alt+T inverte os times na HUD e Alt+F continua sendo o atalho de atualização do JTs. Há botões Mostrar/Ocultar e Inverter times no painel. A inversão troca placar, nomes, logos, jogadores e economia entre esquerda/direita, mantendo as cores de CT/TR. Pressione novamente para voltar. A escolha vale enquanto a HUD estiver aberta e não altera os times no servidor.

A versão 1.8 amplia a faixa dos jogadores para leitura na transmissão: nomes de 18 para 24 px, vida de 21 para 30 px, dinheiro de 15 para 20 px e armas de 13 para 18 px. O nome usa uma linha inteira e o rodapé separa arma e granadas. O cartão central também tem nome e números maiores. A largura total permanece dentro da tela em 1920 × 1080 e acompanha a escala da fonte de navegador.

## Prévia local

Na pasta do repositório, inicie `python3 -m http.server 8765` (Windows: `py -3 -m http.server 8765`) e abra:

```text
http://localhost:8765/themask/index.html?demo=1
```

A prévia tem botões para bomba, rodada ao vivo, compra, pausa, desarme, vitória, troca de lados e ausência de fotos. Usa dados de exemplo e imagens locais; o fundo escuro aparece somente na prévia. A fonte da transmissão deve usar a URL de produção do JTs, sem `demo=1`.

## Interface do CS2

Esta variante usa o killfeed nativo e inclui radar próprio TheMask. O layout compacto de referência pode ser usado com `themask/cfg/themaskon.cfg`, que oculta também o radar nativo. Para restaurar, use `themask/cfg/themaskoff.cfg`. Copie esses dois arquivos para `game/csgo/cfg` do cliente CS2 e execute `exec themaskon` ou `exec themaskoff` no console. Os atalhos do JTs controlam a camada externa; as CFGs controlam o jogo.

## Radar, inventário, fotos e mouse (v1.2)

O radar usa as imagens e calibrações já presentes na base Echo para Mirage, Dust2, Inferno, Nuke, Train, Overpass, Ancient, Anubis, Vertigo e Cache. Mostra os slots dos jogadores, orientação, assistido, mortos, C4 e fumaças. Nuke e Vertigo usam as regras de andar da calibração original. Mapas desconhecidos exibem um aviso em vez de posições sobre uma imagem errada. Assets de mapa e calibração devem ser atualizados juntos quando um mapa do CS2 mudar.

O radar tem fundo transparente, sem painel escuro, borda ou rodapé. Apenas o mapa, os marcadores e um cabeçalho discreto ficam sobre o jogo. O inventário mantém os hexágonos e exibe silhuetas vetoriais para HE, flashbang, smoke, molotov/incendiária e decoy. Duas flashes aparecem como dois ícones.

O painel permite ajustar o radar de 240 a 480 px (padrão 380) ou ocultá-lo. As cores acompanham CT/TR. Nomes genéricos Contra-Terroristas/Terroristas aparecem como CT/TR; nomes de equipes cadastradas são preservados.

Avatares públicos da Steam usam a versão full quando a URL aponta para um thumbnail. Retratos personalizados mantêm o arquivo original; não há recompressão ou filtro de nitidez na HUD. A escala desnecessária por transform foi removida das imagens. Para um retrato personalizado, prefira PNG original com 800 × 834 px ou mais na proporção 400:417. A HUD não consegue recuperar detalhes ausentes da imagem cadastrada.

A camada de transmissão tem `pointer-events: none`, seleção e cursor desativados. Ela não gerencia o foco do Windows ou a captura do cursor do CS2; um cursor escapando da janela do jogo precisa ser conferido no ambiente do jogo/OBS. Use a fonte em 1920×1080 para evitar cortes ou reamostragem adicional.

## Ranking, destaque e economia (v1.3)

Durante compra, pausas e fim de mapa, o ranking ocupa o lugar do radar à esquerda. São exibidos os dez jogadores, abates, mortes e K/D em ordem decrescente de K/D. Zero mortes usa o divisor 1, como na base Echo, sem gerar infinito. Durante a rodada, o ranking se oculta e o radar volta.

O destaque da última rodada aparece à direita no encerramento, na compra, nas pausas e no fim do mapa. Desde a v1.5, o fim informado por `round.phase` prevalece sobre contadores/bomba atrasados, os maiores valores de abates/dano são preservados mesmo se o último pacote ao vivo já vier zerado e há exibição mínima de oito segundos após o encerramento. No fim de mapa, o cartão também permanece se o servidor desconectar. Segue o critério da base Echo: mais abates, com dano como desempate. O retrato, o nome e os números são guardados antes de o CS2 zerar os contadores da próxima rodada. Uma sessão sem rodada encerrada não inventa um destaque.

A faixa abaixo do placar mostra o dinheiro somado dos jogadores de cada equipe e o bônus de derrota durante compra/pausa. O bônus usa o contador recebido pelo GSI e o cálculo padrão da Echo: 1400 + 500 por nível, limitado a 3400. Servidores com pagamentos personalizados precisam adequar esse cálculo. Valores desconhecidos aparecem como travessão. As cores acompanham o lado das equipes.

No painel de personalização, é possível ocultar ranking, destaque ou economia separadamente. Quando o ranking está desativado, o radar mantém sua configuração de visibilidade normal.

## Transições de transmissão (v1.4)

A troca entre ranking e radar tem recolhimento e revelação suaves, inspirados no vídeo de referência. O ranking entra com as linhas em sequência; destaque e economia acompanham as mudanças de fase. Atualizações frequentes do GSI preservam as linhas e não reiniciam as animações. Trocas rápidas de fase cancelam a transição anterior. A preferência do sistema por movimento reduzido desativa esses efeitos. O radar transparente agora mede 380 px por padrão (ajustável de 240 a 480 px).

## Assistente local: fotos da Steam e foco da janela (v1.5)

Algumas versões do JTs devolvem a mesma foto cadastrada em `custom` e `steam`, ou ambos vazios, sem consultar a Steam. A v1.5 mantém prioridade da foto cadastrada e usa a URL Steam fornecida pelo gerenciador quando disponível. Se estiver ausente, o assistente consulta o perfil público pelo SteamID64 e devolve o avatar full. URLs personalizadas que falham também tentam a Steam antes da logo. A busca funciona sem chave de API; indisponibilidade da Steam mantém a logo e permite nova tentativa.

Para usar sobre o próprio CS2:

1. Importe o ZIP completo no JTs normalmente, sem descompactar.
2. Extraia **uma cópia** do ZIP em uma pasta sua. Abra o JTs e execute `assistente/INICIAR-THEMASK.cmd` dessa cópia. Deixe a janela do assistente aberta durante a transmissão. Ele usa Node instalado ou o runtime do próprio JTs aberto.
3. Inicie a HUD e use Alt+Tab para selecionar **Counter-Strike 2** uma vez. O assistente ajusta somente a janela chamada `JTs Hud Manager Overlay`, do processo `JTs Hud Manager`, para ignorar ativação e cliques. Não altera o CS2, o executável do JTs, arquivos da instalação ou limites do cursor. Fechar/reabrir a janela da HUD remove os estilos aplicados; o assistente aberto os reaplica.
4. Copie `cfg/themaskobserver.cfg` para `game/csgo/cfg`. Já no CS2 como espectador, execute `exec themaskobserver`: F7 anterior, F8 próximo, F9 modo de câmera; 1–0 usa os slots nativos. Esse arquivo redefine F7/F8/F9 e o método dos números. Se usa slots personalizados do JTs, reaplique **Spectator Binds** depois ou use apenas os binds F7/F8/F9 do arquivo.

A fonte Navegador do OBS com a URL do JTs em 1920×1080 continua disponível como alternativa à janela sobre o jogo. O CSS da HUD sozinho não controla o foco da janela do Windows.

O serviço de fotos escuta somente em `127.0.0.1:23416`, aceita consultas de leitura de páginas locais e mantém cache de seis horas em `assistente/cache/steam-avatars.json`. Não envia comandos ao jogo. A consulta da Steam exige internet e pode levar cerca de 30 segundos para tentar novamente se o assistente foi aberto depois da HUD.

A busca real de um perfil Steam e os testes de HTTP/cache/fallback passaram. O código de foco é específico de Windows e precisa ser conferido no computador da transmissão; não foi executado contra uma janela real do JTs/CS2 neste ambiente.

## Implementação e manutenção

- `themask/assets/themask.css`: layout da referência e ajustes locais.
- `themask/assets/themask-renderer.js`: atualização dos elementos, fotos, relógio e ação da bomba.
- `themask/assets/themask-radar.js` e `themask-radar-maps.json`: projeção do radar e calibrações dos assets.
- `themask/assets/themask-motion.js`: transições canceláveis, acionadas apenas quando a visibilidade muda.
- `themask/assets/themask-panels.js`: ranking, snapshot do destaque e renderização da economia.
- `themask/assets/themask-state.js`: conversão dos dados enriquecidos do JTs para a apresentação.
- `themask/assets/themask-photos.js`: resolução de fotos, prioridade de retratos e recuperação via Steam.
- `themask/assistente/`: serviço local de avatares e ajuste da janela no Windows.
- `themask/assets/themask-integration.js`: assinatura de dados, API de times, painel e atalhos.
- `themask/assets/themask-engine.js`: bundle Echo com a entrada visual substituída, preservando registro Socket.IO, GSI e dados dos jogadores.
- `themask/panel.json`: campos do gerenciador.

Para validar a conversão de dados, execute `node --test tests/themask-state.mjs tests/themask-helper.cjs` (Node.js 18+). A prévia foi conferida em Chromium em 1920×1080 e 1280×720. Uma simulação local validou o transporte Socket.IO, o processamento GSI da base, fotos, registro, painel, atalhos, desarme, transparência e escape de textos. As transições também foram verificadas com trocas rápidas de fase, atualizações repetidas do GSI, movimento reduzido e radar em 380/480 px. A instalação em JTs e a transmissão real devem ser conferidas no Windows/CS2/OBS antes de uma live. Prévia e simulação de dados não substituem essa verificação.

## Créditos

Referência visual e marca: The Mask Cup, fornecidas pelo usuário. Integração baseada em Echo 1.0.2/cshuds.com, com os créditos preservados no pacote. Oswald e Rajdhani foram obtidas do Google Fonts e incluídas localmente; os arquivos de licença estão em `themask/assets/licenses/`. As fotografias da demonstração vieram dos avatares públicos exibidos na referência e são usadas somente no modo de prévia.

## Pacote de importação 1.5.1

O ZIP entregue da v1.5 estava truncado, sem o registro final do diretório ZIP. O pacote foi reconstruído dos arquivos do repositório. O empacotador agora grava em arquivo temporário, fecha e sincroniza a escrita, confere CRC e conteúdo de todas as entradas e só então publica o nome final. A cópia salva da entrega 1.5.1 foi recuperada e comparada com o arquivo local por tamanho e SHA256. O teste `tests/themask-import.cjs`, executado com `adm-zip` 0.5.16 e o fonte atual `hud.routes.ts` do JTs, extraiu e comparou os 94 arquivos pelo próprio handler de importação; um ZIP truncado foi rejeitado pelo mesmo handler.

## Retratos e estatísticas 1.6

Quando não há foto cadastrada nem avatar Steam utilizável, as fotos dos jogadores usam os agentes CT/TR originais da Echo como reserva, inclusive no ranking e no destaque. A tabela passou a 400 px com linhas de 44 px; o destaque passou a 318 × 390 px, com retrato e números maiores.

O teste de diretor automático está em uma variante Echo independente, gerada com `python3 scripts/package-echo-spec.py`. Consulte `docs/ECHO-AUTOSPEC-LEIA-ME.txt`. A TheMask normal não ativa cortes automáticos. O assistente compartilhado inclui o serviço, mas só a Echo de teste envia quadros e controles do diretor.

## Transporte de espectador no Windows normal (Echo AutoSpec 0.2)

O uso ao vivo revelou que o workaround Netcon/Workshop Tools não atende ao servidor protegido deste usuário. A ponte alternativa de teclado mantém o jogo normal: `INICIAR-AUTOSPEC-SEM-TOOLS.cmd` detecta `game/csgo/cfg`, cria somente uma CFG identificada do projeto e executa cortes por F10 após a configuração manual do bind. O pacote pequeno é gerado por `scripts/package-autospec-helper.py` e funciona com a Echo de teste já instalada. Não requer reimportar a HUD.

O envio verifica a janela em primeiro plano e modificadores antes da preparação e antes da tecla. Fora do CS2 aguarda e retoma ao voltar. Isso exige manter CS2 em foco; não substitui um controlador em segundo plano para quem opera OBS com o mouse. Cortes expirados ou cancelados pelo modo manual não são enviados. Falta de confirmação GSI continua interrompendo o automático.

Testes mock verificam escrita da CFG, neutralização, recusa de arquivos alheios, validação de comandos, foco perdido e retomada. A chamada Win32/tecla no CS2 não foi executada neste ambiente. Não há afirmação de compatibilidade universal com regras de plataformas/anti-cheat. O uso projetado é somente espectador, sem alterar memória ou DLLs do jogo.
