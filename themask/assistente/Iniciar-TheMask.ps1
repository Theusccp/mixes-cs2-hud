param([switch]$Keyboard)
$ErrorActionPreference = 'Stop'
$helperPath = Join-Path $PSScriptRoot 'themask-helper.cjs'
$runtimePath = $null
$nodeCommand = Get-Command node.exe -ErrorAction SilentlyContinue
if ($nodeCommand) { $runtimePath = $nodeCommand.Source }
if (-not $runtimePath) {
    $process = Get-Process -Name 'JTs Hud Manager' -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($process) { $runtimePath = $process.Path }
}
if (-not $runtimePath) {
    Write-Host 'Abra o JTs Hud Manager primeiro e execute este assistente novamente.'
    Read-Host 'Pressione Enter para fechar'
    exit 1
}
$oldRunAsNode = $env:ELECTRON_RUN_AS_NODE
$oldTransport = $env:THEMASK_AUTO_TRANSPORT
$oldCfg = $env:THEMASK_CS2_CFG_DIR
try {
    if ($Keyboard) {
        $cs2Executable = (Get-Process -Name 'cs2' -ErrorAction SilentlyContinue | Select-Object -First 1).Path
        if (-not $cs2Executable) { throw 'Abra o CS2 normal antes deste assistente.' }
        $gameDirectory = Split-Path (Split-Path (Split-Path $cs2Executable -Parent) -Parent) -Parent
        $cfgDirectory = Join-Path $gameDirectory 'csgo\cfg'
        if (-not (Test-Path $cfgDirectory -PathType Container)) { throw 'Pasta game\csgo\cfg nao encontrada pelo caminho do CS2.' }
        $env:THEMASK_AUTO_TRANSPORT = 'keyboard'
        $env:THEMASK_CS2_CFG_DIR = $cfgDirectory
        Write-Host 'No console do CS2, configure: bind F10 "exec themask_autospec_bridge"'
        Write-Host 'F10 fica reservado para o AutoSpec. O CS2 precisa permanecer em foco.'
    }
    $env:ELECTRON_RUN_AS_NODE = '1'
    & $runtimePath $helperPath
} finally {
    $env:ELECTRON_RUN_AS_NODE = $oldRunAsNode
    $env:THEMASK_AUTO_TRANSPORT = $oldTransport
    $env:THEMASK_CS2_CFG_DIR = $oldCfg
}
