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
try {
    $env:ELECTRON_RUN_AS_NODE = '1'
    & $runtimePath $helperPath
} finally {
    $env:ELECTRON_RUN_AS_NODE = $oldRunAsNode
}
