$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$envPath = Join-Path $projectRoot ".env"

$defaultModels = [ordered]@{
    openrouter = "openai/gpt-4.1-mini"
    gemini = "gemini-3.5-flash"
    openai = "gpt-4o-mini"
    anthropic = "claude-sonnet-4-5"
}
$keyVariables = @{
    openrouter = "OPENROUTER_API_KEY"
    gemini = "AI_API_KEY"
    openai = "OPENAI_API_KEY"
    anthropic = "ANTHROPIC_API_KEY"
}
# OpenRouter serves both learner tiers, so the setup script pins the everyday (free) model
# and leaves OPENROUTER_PAID_MODEL to its Claude default.
$modelVariables = @{
    openrouter = "OPENROUTER_FREE_MODEL"
    gemini = "AI_MODEL"
    openai = "OPENAI_MODEL"
    anthropic = "ANTHROPIC_MODEL"
}

function Set-EnvValue {
    param([string[]]$Lines, [string]$Key, [string]$Value)
    $found = $false
    $result = @(foreach ($line in $Lines) {
        if ($line -match '^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=') {
            if ($Matches[1] -eq $Key) { $found = $true; "$Key=$Value" } else { $line }
        } else {
            $line
        }
    })
    if (-not $found) { $result += "$Key=$Value" }
    return ,($result)
}

Write-Host "Supported providers: gemini, openai, anthropic"
$provider = (Read-Host "Which AI provider should Orbit use first (gemini/openai/anthropic)").Trim().ToLower()
if (-not $defaultModels.Contains($provider)) {
    throw "Please enter gemini, openai, or anthropic. No .env file was written."
}

$model = (Read-Host "Model for $provider [$($defaultModels[$provider])]").Trim()
if ([string]::IsNullOrWhiteSpace($model)) { $model = $defaultModels[$provider] }

$secureKey = Read-Host "$provider API key (input is hidden)" -AsSecureString
if ($secureKey.Length -lt 10) {
    throw "The API key looks too short. No .env file was written."
}

$pointer = [IntPtr]::Zero
try {
    $pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureKey)
    $apiKey = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer)
    $lines = @()
    if (Test-Path $envPath) { $lines = @([System.IO.File]::ReadAllLines($envPath)) }
    $lines = Set-EnvValue -Lines $lines -Key "AI_PROVIDER" -Value $provider
    $lines = Set-EnvValue -Lines $lines -Key $modelVariables[$provider] -Value $model
    $lines = Set-EnvValue -Lines $lines -Key $keyVariables[$provider] -Value $apiKey
    if (-not ($lines | Where-Object { $_ -match '^\s*AI_FALLBACK_PROVIDERS\s*=' })) {
        $others = @($defaultModels.Keys | Where-Object { $_ -ne $provider })
        $lines = Set-EnvValue -Lines $lines -Key "AI_FALLBACK_PROVIDERS" -Value ($others -join ",")
    }
    $encoding = New-Object System.Text.UTF8Encoding($false)
    [System.IO.File]::WriteAllText($envPath, ($lines -join "`n") + "`n", $encoding)
}
finally {
    if ($pointer -ne [IntPtr]::Zero) {
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer)
    }
    $apiKey = $null
    $secureKey.Dispose()
}

Write-Host "$($provider) key saved in the local, Git-ignored .env file."
Write-Host "Other provider keys already in .env stay there and are used automatically if $($provider) runs out of quota."
Write-Host "Restart Orbit with: npm start"
