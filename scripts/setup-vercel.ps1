Param(
  [Parameter(Mandatory=$true)] [string]$VercelToken,
  [Parameter(Mandatory=$false)] [string]$Scope,
  [Parameter(Mandatory=$false)] [string]$ProjectName = "astral-field-v1"
)

$ErrorActionPreference = 'Stop'

Write-Host "=== Vercel setup starting ==="

# Ensure required CLIs exist
if (-not (Get-Command vercel -ErrorAction SilentlyContinue)) {
  throw "Vercel CLI not found. Install with: npm i -g vercel"
}
if (-not (Get-Command gh -ErrorAction SilentlyContinue)) {
  throw "GitHub CLI not found. Install from https://cli.github.com/"
}
if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
  throw "Git is required."
}

# Verify GitHub auth
try { gh auth status | Out-Null } catch { throw "GitHub CLI not authenticated. Run: gh auth login" }

# Link project (creates if missing) non-interactively
$linkArgs = @('link','--yes','--project', $ProjectName,'--token', $VercelToken)
if ($Scope -and $Scope.Trim() -ne '') { $linkArgs += @('--scope', $Scope) }

Write-Host "Linking current directory to Vercel project '$ProjectName'..."
vercel @linkArgs | Write-Host

# Read project metadata
$projectFile = Join-Path (Join-Path $PWD ".vercel") "project.json"
if (-not (Test-Path $projectFile)) { throw ".vercel/project.json not found after linking. Aborting." }

$projJson = Get-Content $projectFile -Raw | ConvertFrom-Json
$projectId = $projJson.projectId
$orgId = $projJson.orgId

if (-not $projectId -or -not $orgId) { throw "Failed to parse projectId/orgId from .vercel/project.json" }

Write-Host "Vercel Project ID: $projectId"
Write-Host "Vercel Org ID:     $orgId"

# Set GitHub secrets on current repo
Write-Host "Setting GitHub repo secrets (VERCEL_TOKEN, VERCEL_PROJECT_ID, VERCEL_ORG_ID)..."
"VERCEL_TOKEN`n$VercelToken" | gh secret set VERCEL_TOKEN --repo $(git config --get remote.origin.url) --app actions --body - 2>$null
"VERCEL_PROJECT_ID`n$projectId" | gh secret set VERCEL_PROJECT_ID --repo $(git config --get remote.origin.url) --app actions --body - 2>$null
"VERCEL_ORG_ID`n$orgId" | gh secret set VERCEL_ORG_ID --repo $(git config --get remote.origin.url) --app actions --body - 2>$null

Write-Host "GitHub secrets set."

Write-Host "=== Vercel setup complete ==="
Write-Host "Next: push to 'main' to trigger CI and Vercel deploy."

