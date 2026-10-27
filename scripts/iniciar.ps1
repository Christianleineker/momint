param([switch]$SemAbrirNavegador)

$ErrorActionPreference = 'Stop'
$raizMomint = Split-Path -Parent $PSScriptRoot
$logsMomint = Join-Path $raizMomint 'logs'
$nodeMomint = (Get-Command node.exe -ErrorAction Stop).Source
New-Item -ItemType Directory -Path $logsMomint -Force | Out-Null

function Testar-Porta([int]$Porta) {
    $conexao = New-Object System.Net.Sockets.TcpClient
    try {
        $tarefa = $conexao.ConnectAsync('127.0.0.1', $Porta)
        return ($tarefa.Wait(1000) -and $conexao.Connected)
    } catch { return $false }
    finally { $conexao.Dispose() }
}

function Testar-Url([string]$Url) {
    try { return (Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 5).StatusCode -eq 200 }
    catch { return $false }
}

function Iniciar-Processo([string]$Nome, [string]$Diretorio, [string]$Argumentos) {
    $processo = Start-Process -FilePath $nodeMomint -ArgumentList $Argumentos `
        -WorkingDirectory $Diretorio -WindowStyle Hidden `
        -RedirectStandardOutput (Join-Path $logsMomint "$Nome.stdout.log") `
        -RedirectStandardError (Join-Path $logsMomint "$Nome.stderr.log") -PassThru
    Write-Host "$Nome iniciado (PID $($processo.Id))."
    return $processo
}

function Aguardar-Servico([string]$Nome, [scriptblock]$Teste, $Processo) {
    for ($tentativa = 0; $tentativa -lt 60; $tentativa++) {
        if (& $Teste) { return }
        if ($Processo -and $Processo.HasExited) {
            throw "$Nome encerrou antes de iniciar. Consulte $logsMomint\$Nome.stderr.log"
        }
        Start-Sleep -Seconds 1
    }
    throw "$Nome demorou para iniciar. Consulte os arquivos em $logsMomint"
}

try {
    if (-not (Test-Path -LiteralPath (Join-Path $raizMomint 'apps\api\.env'))) {
        throw 'Falta apps\api\.env. Configure o ambiente antes de iniciar.'
    }
    if (-not (Test-Path -LiteralPath (Join-Path $raizMomint 'node_modules\next\dist\bin\next'))) {
        throw 'Dependencias ausentes. Execute npm install na pasta do projeto.'
    }
    if (-not (Testar-Porta 5433)) {
        Write-Host 'Iniciando banco local...'
        $bancoMomint = Iniciar-Processo 'banco' $raizMomint 'scripts/pg-local.mjs'
        Aguardar-Servico 'banco' { Testar-Porta 5433 } $bancoMomint
    }
    if (-not (Testar-Url 'http://localhost:4000/api/health')) {
        if (Testar-Porta 4000) { throw 'A porta 4000 esta ocupada por outro servico.' }
        $apiMomint = Iniciar-Processo 'api' (Join-Path $raizMomint 'apps\api') '../../node_modules/tsx/dist/cli.mjs watch src/main.ts'
        Aguardar-Servico 'api' { Testar-Url 'http://localhost:4000/api/health' } $apiMomint
    }
    if (-not (Testar-Url 'http://localhost:3000/login')) {
        if (Testar-Porta 3000) { throw 'A porta 3000 esta ocupada por outro servico.' }
        $webMomint = Iniciar-Processo 'web' (Join-Path $raizMomint 'apps\web') '../../node_modules/next/dist/bin/next dev -p 3000'
        Aguardar-Servico 'web' { Testar-Url 'http://localhost:3000/login' } $webMomint
    }
    Write-Host ''
    Write-Host 'Momint pronto: http://localhost:3000/login' -ForegroundColor Green
    Write-Host "Banco, API e interface continuam rodando em segundo plano. Logs: $logsMomint"
    if (-not $SemAbrirNavegador) { Start-Process 'http://localhost:3000/login' }
} catch {
    Write-Host "Nao foi possivel iniciar: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
