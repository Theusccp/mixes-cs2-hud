# MixES — HUD CS2 em português

HUD para transmissão de CS2 no JTs HUD Manager e OBS, baseada no Echo 1.0.2 de cshuds.com. Esta é a versão `1.0.2-mixes.3`: textos em português, cores MixES, logo menor e mais alta, atalhos de visibilidade e controle de tamanho das fotos dos jogadores.

## Instalar e usar

1. Gere o ZIP com o comando abaixo.
2. Feche a HUD anterior no JTs.
3. Em **HUDs > Import HUD**, selecione `dist/MixES-HUD-PTBR-v3.zip`, sem descompactar.
4. Inicie **MixES — Echo PT-BR** em **Launch** e copie sua URL em **Copy URL**.
5. No OBS, use essa URL em uma fonte **Navegador**, com **1920 × 1080**.
6. Abra **Panel** no JTs para configurar cores, fotos, patrocinadores e visibilidade.

Mantenha o JTs aberto e esta HUD iniciada. Os dados da partida dependem da integração de CS2/GSI do gerenciador. Este repositório contém a HUD; ele não instala nem configura o CS2 ou o JTs.

## Comandos rápidos

| Atalho | Função |
| --- | --- |
| **Alt+O** | Mostrar ou ocultar toda a HUD |
| **Alt+L** | Mostrar ou ocultar a logo MixES |
| **Alt+F** | Atualizar a HUD: atalho global do JTs |

Se um atalho conflitar com outro programa, use **Mostrar HUD** e **Ocultar HUD** no painel. Para trocar Alt+O/Alt+L, edite `hud/keybinds.json`, gere o ZIP novamente e reimporte. Alt+F pertence ao gerenciador.

Depois de atualizar ou reabrir, a HUD volta visível. Detalhes em [docs/COMANDOS.md](docs/COMANDOS.md).

## Limpar a interface do CS2 para transmitir

Copie `cfg/mixeson.cfg` e `cfg/mixesoff.cfg` para a pasta `game/csgo/cfg` da instalação do seu **cliente CS2**. Depois use no console:

```text
exec mixeson
```

Isso limpa a interface padrão, mantém a mira e o killfeed e oculta o radar nativo. Para restaurar a interface do jogo:

```text
exec mixesoff
```

As CFGs ajustam o CS2; a camada MixES no OBS é controlada pelo JTs com **Alt+O**. As CFGs ficam fora do pacote de importação do JTs e devem ser copiadas separadamente. Instalação e detalhes em [cfg/README.md](cfg/README.md).

## Personalização

Em **Panel > MixES — Personalização**, preencha os campos e salve.

| Campo | Padrão / uso |
| --- | --- |
| Cor TR | Azul claro `#65D4F5` |
| Cor CT | Rosa `#F51B95` |
| Ocultar logo MixES | Oculta a logo pelo painel |
| Tamanho da foto lateral | `100`; aceita de `70` a `200` |
| Tamanho da foto central | `100`; aceita de `70` a `200` |

As cores acompanham TR/CT quando os times trocam de lado. Use o formato `#RRGGBB`. Campos vazios usam as cores padrão; tamanhos vazios ou inválidos usam `100`.

Os botões de preset de cores são temporários. Para manter uma escolha depois de reabrir, preencha os campos de cor e salve.

Para as fotos, recomendamos PNG transparente com proporção **400:417**, por exemplo **400 × 417 px** ou **800 × 834 px**. Centralize a pessoa da cabeça até a cintura com uma pequena margem. Se ainda ficar grande, diminua o tamanho no painel. Os modelos padrão do jogo mantêm a escala original.

## Baixar o repositório

```bash
git clone https://github.com/Theusccp/mixes-cs2-hud.git
cd mixes-cs2-hud
```

Também é possível usar **Code > Download ZIP** no GitHub e descompactar.

## Gerar o ZIP

Requer Python 3.8 ou mais recente, sem bibliotecas adicionais. Execute na pasta do repositório.

Windows:

```powershell
py -3 scripts/package.py
```

Linux/macOS:

```bash
python3 scripts/package.py
```

O resultado fica em `dist/MixES-HUD-PTBR-v3.zip`. O pacote contém **somente o conteúdo de `hud/`**, com `hud.json` na raiz, como exige a importação no JTs. O ZIP de **Code > Download ZIP** do GitHub é o repositório completo e deve ser descompactado antes de executar esse comando.

## Validar alterações

Para os testes de controles, use Node.js 18 ou mais recente:

```bash
node tests/controls.cjs
```

Esse teste verifica visibilidade, ações do painel, atalhos, logo, cores, configuração, patrocinadores e textos PT-BR. A geração do pacote também valida os JSONs e os arquivos necessários. Confira a aparência e o funcionamento em partida real no Windows/CS2/OBS após importar.

## Arquivos para editar

| Arquivo | Uso |
| --- | --- |
| `hud/assets/mixes-custom.js` | Controles, cores e escala das fotos |
| `hud/assets/mixes-custom.css` | Estilos, tamanho e posição da logo |
| `hud/assets/mixes-logo.png` | Logo do evento |
| `hud/panel.json` | Campos, textos e botões do painel |
| `hud/keybinds.json` | Atalhos próprios da HUD |
| `hud/hud.json` | Nome e versão da HUD |
| `hud/assets/index-7d7a885a.js` | Bundle compilado do Echo com traduções e integração da extensão |

Esta distribuição usa os arquivos já compilados do Echo. Não inclui o projeto-fonte original nem um processo de build React/Vite. Para empacotar, basta Python; não é necessário `npm install`.

## Histórico

- **v1:** cores, tradução PT-BR, logo e controles.
- **v2:** logo reduzida para 78 px e elevada; legendas de economia ajustadas.
- **v3:** fotos personalizadas sem o zoom dos modelos; escala lateral e central no painel.

## Créditos

Base **Echo HUD 1.0.2**, de **cshuds.com**. Personalização **MixES**. O crédito original foi preservado. Os arquivos de terceiros não recebem uma nova licença neste repositório.

Gerenciador usado: [JTs HUD Manager](https://github.com/JohnTimmermann/JTs-Hud).
