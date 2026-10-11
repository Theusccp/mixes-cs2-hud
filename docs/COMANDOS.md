# Comandos e controles da MixES

## Console do CS2

Copie os dois arquivos da pasta `cfg/` do repositório para `game/csgo/cfg` na instalação do seu cliente CS2.

| Console | Resultado |
| --- | --- |
| `exec mixeson` | Ativa o modo transmissão: interface do CS2 limpa, mira e killfeed mantidos, radar nativo oculto |
| `exec mixesoff` | Restaura a interface padrão do CS2 |

[Guia de instalação e conteúdo das CFGs](../cfg/README.md).

## Durante a transmissão

| Comando | Resultado |
| --- | --- |
| Alt+O | Alterna a visibilidade de toda a HUD, incluindo logo e crédito |
| Alt+L | Alterna a logo MixES |
| Alt+F | Atualiza a HUD pelo JTs; a HUD volta visível |
| Panel > MixES — Controles > Mostrar HUD | Força a HUD a aparecer |
| Panel > MixES — Controles > Ocultar HUD | Força a HUD a ficar oculta |
| Panel > MixES — Controles > Cores dos lados | Aplica um preset de cores temporário |
| Panel > MixES — Personalização | Ajusta cores, visibilidade da logo e tamanho das fotos; salve para aplicar |
| Panel > Patrocinadores | Seleciona imagens PNG, alterna exibição e modo branco |

Se **Ocultar logo MixES** estiver marcado e salvo, Alt+L não consegue mostrar a logo. Desmarque a opção primeiro.

Os controles desta tabela são atalhos do JTs e botões do painel. As CFGs acima são executadas no console do CS2. Para transmitir, execute `exec mixeson` no jogo e mantenha a MixES visível no JTs; para voltar à interface do jogo, execute `exec mixesoff` e oculte a camada externa com Alt+O.

## Manutenção do repositório

Execute na pasta do repositório.

```bash
# Verificar a lógica dos controles (requer Node.js 18+)
node tests/controls.cjs

# Gerar o pacote de importação no Linux/macOS
python3 scripts/package.py

# Ver alterações locais
git status
git diff

# Salvar as alterações
git add .
git commit -m "Atualiza HUD MixES"

# Enviar para um remoto já configurado
git push origin main
```

No Windows, substitua `python3 scripts/package.py` por `py -3 scripts/package.py`.

Após mudar a HUD, gere um novo ZIP e reimporte no JTs. Atualizar o GitHub não atualiza automaticamente a HUD que já foi importada.

## Baixar o repositório

```bash
git clone https://github.com/Theusccp/mixes-cs2-hud.git
cd mixes-cs2-hud
```

Depois de editar, validar e gerar o ZIP, envie suas alterações com os comandos de manutenção acima. O envio requer permissão no repositório e autenticação do GitHub configurada no Git.

## Atalhos não respondem

1. Feche a HUD anterior e mantenha apenas a MixES iniciada no JTs.
2. Confirme que o JTs continua aberto.
3. Use os botões do painel para verificar se a HUD responde.
4. Se houver conflito de teclas, altere `hud/keybinds.json`, gere o ZIP e reimporte.
5. Feche e abra a HUD para registrar os novos atalhos.

## Foto muito grande

Use uma foto PNG com fundo transparente e enquadramento da cabeça até a cintura. Comece em `100` nos dois campos de tamanho; diminua até `70` se necessário. Salve no painel. O enquadramento dentro do próprio arquivo também influencia o resultado.
