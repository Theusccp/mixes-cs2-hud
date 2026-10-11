# CFGs da transmissão MixES

Copie `mixeson.cfg` e `mixesoff.cfg` para a pasta do seu **cliente CS2**:

```text
...\Steam\steamapps\common\Counter-Strike Global Offensive\game\csgo\cfg\
```

Na Steam, abra as propriedades do CS2, vá em **Arquivos instalados > Explorar** e entre em `game/csgo/cfg`. A biblioteca Steam pode estar em outro disco; use a pasta do jogo instalada no seu computador.

Ative o console de desenvolvedor nas configurações do CS2, abra o console e execute:

| Console | Resultado |
| --- | --- |
| `exec mixeson` | Limpa a interface padrão do CS2, mantendo mira e killfeed; oculta o radar nativo |
| `exec mixesoff` | Restaura a interface padrão, com radar e killfeed no comportamento padrão |

O nome `mixeson` significa **modo transmissão ligado**. A MixES usa radar próprio e killfeed nativo. Essas CFGs ajustam a imagem do jogo; para mostrar/ocultar a camada externa no OBS, use **Alt+O** no JTs ou os botões do painel.

## Comandos usados

| Cvar | mixeson | mixesoff | Uso |
| --- | --- | --- | --- |
| `cl_drawhud` | `1` | `1` | Mantém a renderização do HUD ativa |
| `cl_draw_only_deathnotices` | `1` | `0` | Alterna o modo que mostra somente mira e eliminações |
| `cl_drawhud_force_deathnotices` | `1` | `0` | Mantém eliminações visíveis; volta ao comportamento padrão ao sair |
| `cl_drawhud_force_radar` | `-1` | `0` | Oculta o radar nativo; volta ao comportamento padrão ao sair |

`mixesoff` aplica valores padrão para essas opções, sem recuperar ajustes personalizados que você usava antes. As CFGs não alteram `sv_cheats` nem configurações do servidor.

`cl_drawhud` está marcado como `cheat` no dump atual do CS2 e pode ser bloqueado conforme o contexto. Ele já é `1` por padrão; o comando principal para limpar a interface aqui é `cl_draw_only_deathnotices 1`, marcado como `release`. Se estiver em uma partida e o console recusar `cl_drawhud`, confira o resultado dos outros comandos. O funcionamento visual deve ser conferido no seu CS2 em modo espectador/GOTV.

## Referências

- [Dump das cvars do próprio CS2](https://github.com/SteamTracking/GameTracking-CS2/blob/master/DumpSource2/convars.txt): nomes, valores padrão, flags e descrições.
- [Valve Developer Community — comandos do CS2](https://developer.valvesoftware.com/wiki/List_of_Counter-Strike_2_console_commands_and_variables).
