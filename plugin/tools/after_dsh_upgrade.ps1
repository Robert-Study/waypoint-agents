<#
.SYNOPSIS
    Waypoint for dsh: run after every dsh upgrade (npm i -g @deepseek-ai/dsh). Safe to run any time.
.DESCRIPTION
    1. Build              node tools\build.mjs -> lib\client.js
    2. Compat check       python tools\compat_check.py (types, bundle, profile install; live part if dsh is up on 3080)
    3. Waypoint Core      GET http://127.0.0.1:8751/health (2 s). Down is a note, not a failure.
                          An "api" other than 1 fails: this plugin needs Core API 1.
    4. In-dsh smoke test  node tools\smoke_dsh.mjs (only if dsh is up on 3080; Windows with Edge)
    Prints each step, then exactly one line: "VERDICT: OK - ..." or "VERDICT: FAIL - <what>. Next: <what to do>".
    Writes nothing except lib\client.js. Never touches the dsh install or any cordis.patch.yml.
    Exit 0 = every step that ran passed, 1 = something failed.
.PARAMETER Python
    Python 3.11+ to use. Default: $env:WAYPOINT_PYTHON, then the Waypoint repo helper if present, then python on PATH.
.PARAMETER SkipSmoke
    Skip the headless Edge smoke test.
.PARAMETER SkipLive
    Skip everything that reads the live dsh: profile install checks, the running-dsh check and the smoke test.
.EXAMPLE
    powershell -NoProfile -File tools\after_dsh_upgrade.ps1
#>
param(
    [string]$Python = "",
    [switch]$SkipSmoke,
    [switch]$SkipLive
)

$ErrorActionPreference = "Continue"
$plugin = Split-Path -Parent $PSScriptRoot
if (-not $Python) { $Python = $env:WAYPOINT_PYTHON }
if (-not $Python) {
    # Inside the Waypoint repo the shared helper knows the pinned interpreter.
    $helper = Join-Path (Split-Path -Parent $plugin) "scripts\waypoint_config.ps1"
    if (Test-Path $helper) { try { . $helper; $Python = Get-WaypointPython } catch { $Python = "" } }
}
if (-not $Python) { $Python = (Get-Command python -ErrorAction SilentlyContinue).Source }
if (-not $Python) { $Python = "python" }
$node = (Get-Command node -ErrorAction SilentlyContinue).Source
if (-not $node -and $env:ProgramFiles) { $node = Join-Path $env:ProgramFiles "nodejs\node.exe" }
if (-not $node) { $node = "node" }

function Invoke-Step([string]$label, [string]$exe, [string[]]$argv) {
    # Write-Host, not Write-Output: anything written to the pipeline here would become the return value.
    Write-Host "--- $label"
    Push-Location $plugin
    try {
        $out = & $exe @argv 2>&1 | ForEach-Object { "$_" }
        $code = $LASTEXITCODE
    } catch {
        $out = @("$_"); $code = 1
    } finally { Pop-Location }
    $out | ForEach-Object { Write-Host "    $_" }
    return [pscustomobject]@{ Ok = ($code -eq 0); Lines = @($out) }
}

function Test-Port([int]$port) {
    $c = New-Object System.Net.Sockets.TcpClient
    try { return $c.ConnectAsync("127.0.0.1", $port).Wait(500) -and $c.Connected } catch { return $false } finally { $c.Dispose() }
}

# Inside the Waypoint repo the familiar wrapper exists; the product tree has only tools\install.py.
$installCmd = if (Test-Path (Join-Path (Split-Path -Parent $plugin) "scripts\install_plugin.py")) { "python scripts\install_plugin.py" } else { "python tools\install.py install" }
$dshUp = (-not $SkipLive) -and (Test-Port 3080)
$verdict = $null
$next = $null
$notes = @()
if ($SkipLive) { $notes += "live dsh checks skipped" }

# 1. build
$build = Invoke-Step "build" $node @("tools\build.mjs")
if (-not $build.Ok) {
    $verdict = "build failed"
    $next = "see build output above (a file listed in src\ORDER may be missing or not parse)"
}

# 2. compat
if (-not $verdict) {
    $compatArgs = @("tools\compat_check.py")
    $why = ""
    if ($SkipLive) { $compatArgs += @("--no-live", "--no-profile"); $why = " (live dsh skipped)" }
    elseif (-not $dshUp) { $compatArgs += "--no-live"; $why = " (dsh not running: live check skipped)" }
    $compat = Invoke-Step ("compat check" + $why) $Python $compatArgs
    if (-not $compat.Ok) {
        $fails = @($compat.Lines | Where-Object { $_ -like "FAIL*" })
        $first = if ($fails.Count) { $fails[0] } else { "" }
        $oldThere = @($fails | Where-Object { $_ -like "FAIL  profile has no old*" }).Count -gt 0
        switch -Wildcard ($first) {
            "FAIL  dsh installed*"            { $verdict = "dsh not found"; $next = "set DSH_INSTALL to the dsh npm package folder, or check DEFAULT_DSH in tools\compat_check.py" ; break }
            "FAIL  bundle loads*"             { $verdict = "the built bundle does not load"; $next = "see compat output; run the plugin tests: node tools\test.mjs" ; break }
            "FAIL  bundle *"                  { $verdict = "the built bundle misbehaves in a test load"; $next = "see compat output; run the plugin tests: node tools\test.mjs" ; break }
            "FAIL  slot *"                    { $verdict = "slot renamed or moved"; $next = "see compat output; find the new slot name in the dsh types and update SLOTS in tools\compat_check.py and the plugin" ; break }
            "FAIL  brand slot *"              { $verdict = "brand slot renamed or moved"; $next = "see compat output; update CC.BRAND_SLOTS in src\brand.js" ; break }
            "FAIL  service *"                 { $verdict = "a dsh service changed"; $next = "see compat output; check the dsh types for the new name" ; break }
            "FAIL  layout.*"                  { $verdict = "layout service changed"; $next = "see compat output; check layout service.d.ts for the new name" ; break }
            "FAIL  cordis major*"             { $verdict = "cordis major version changed"; $next = "see compat output; the bundle's cordis peer range may need updating" ; break }
            "FAIL  profile selects bundle*"   {
                if ($oldThere) { $verdict = "Waypoint for dsh is not installed in the dsh profile (the old dsh Control Centre package still is)" }
                else { $verdict = "Waypoint for dsh is not installed in the dsh profile" }
                $next = "$installCmd, restart dsh, then run this again"; break
            }
            "FAIL  profile*"                  { $verdict = "Waypoint for dsh is only partly installed in the dsh profile"; $next = "$installCmd, then restart dsh" ; break }
            "FAIL  link*"                     { $verdict = "the profile link to this plugin folder is missing"; $next = "$installCmd" ; break }
            "FAIL  running dsh boots*"        { $verdict = "running dsh has not loaded Waypoint for dsh"; $next = "restart dsh, then run this again" ; break }
            default                           { $verdict = "compat check failed"; $next = "see compat output above" ; break }
        }
        if ($fails.Count -gt 1) { $verdict += " (+$($fails.Count - 1) more)" }
    }
}

# 3. Waypoint server (runs even after a failure above: it is cheap and informative)
# 2.0: the tabs read the Waypoint server (Core's runner/waypoint_runner/wpc_http.py) on 127.0.0.1:8762, which the
# plugin's host half starts with dsh. The 1.x engine on 8751 is retired in Waypoint 1.2.
Write-Host "--- Waypoint server (http://127.0.0.1:8762/health)"
try {
    $health = Invoke-RestMethod -Uri "http://127.0.0.1:8762/health" -TimeoutSec 3 -ErrorAction Stop
    Write-Host "    PASS  Waypoint server answers (data folder $($health.data_dir))"
} catch {
    Write-Host "    NOTE  Waypoint server not running (dsh starts it; see INSTALL.md, Tell the plugin where Waypoint is); not a failure"
    $notes += "waypoint server not running"
}

# 4. smoke
if (-not $verdict) {
    if ($SkipLive) { }
    elseif ($SkipSmoke) { $notes += "smoke skipped" }
    elseif (-not $dshUp) { $notes += "smoke skipped (dsh not running)" }
    else {
        $smoke = Invoke-Step "smoke test in dsh" $node @("tools\smoke_dsh.mjs")
        if (-not $smoke.Ok) {
            $fails = @($smoke.Lines | Where-Object { $_ -like "FAIL*" })
            $first = if ($fails.Count) { $fails[0] } else { "" }
            switch -Wildcard ($first) {
                "FAIL  sidebar entry*"     { $verdict = "Waypoint sidebar entries missing in dsh"; $next = "restart dsh; if it persists, the sidebar slot may have changed: see smoke output" ; break }
                "FAIL  engine reachable*"  { $verdict = "the dsh page cannot reach Waypoint Core"; $next = "start Waypoint Core, then run this again" ; break }
                "FAIL  page *"             { $verdict = "a Waypoint page did not render inside dsh"; $next = "see smoke output; for screenshots run: node tools\smoke_dsh.mjs --screens <folder>" ; break }
                default                    { $verdict = "smoke test failed"; $next = "see smoke output above" ; break }
            }
            if ($fails.Count -gt 1) { $verdict += " (+$($fails.Count - 1) more)" }
        }
    }
}

Write-Output ""
if ($verdict) {
    Write-Output "VERDICT: FAIL - $verdict. Next: $next"
    exit 1
}
$tail = if ($notes.Count) { "; " + ($notes -join "; ") } else { "" }
Write-Output "VERDICT: OK - bundle built and fits this dsh$tail."
exit 0
