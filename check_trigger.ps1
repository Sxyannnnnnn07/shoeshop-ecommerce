$url = "https://kghhhprhpaxqfhvwepca.supabase.co"
$serviceKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtnaGhocHJocGF4cWZodndlcGNhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NDIxMDE4NiwiZXhwIjoyMDk5Nzg2MTg2fQ.nh1HnAcslGGtcebrLdulYAgNgVcR8FxSRPE-ffStlWE"

$headers = @{
    "apikey" = $serviceKey
    "Authorization" = "Bearer $serviceKey"
    "Content-Type" = "application/json"
    "Prefer" = "return=representation"
}

# --- 1. ลองดู RLS policies ผ่าน pg_catalog endpoint ---
$r = Invoke-WebRequest -Uri "$url/rest/v1/profiles?select=id,email,role" -Headers $headers -UseBasicParsing
Write-Host "Current profiles: $($r.Content)"
Write-Host ""

# --- 2. ลอง PATCH อีกครั้งตรง id ---
$userId = "6aee2eff-7ef3-4ba2-98a8-1df652b66065"
$patchBody = '{"role":"admin"}'

$patchHeaders = @{
    "apikey" = $serviceKey
    "Authorization" = "Bearer $serviceKey"
    "Content-Type" = "application/json"
    "Prefer" = "return=representation,resolution=merge-duplicates"
}

$patchResp = Invoke-WebRequest -Uri "$url/rest/v1/profiles?id=eq.$userId" -Method PATCH -Headers $patchHeaders -Body $patchBody -UseBasicParsing
Write-Host "PATCH status: $($patchResp.StatusCode)"
Write-Host "PATCH result: $($patchResp.Content)"
Write-Host ""

# --- 3. ยืนยัน GET อีกครั้ง ---
$r2 = Invoke-WebRequest -Uri "$url/rest/v1/profiles?id=eq.$userId&select=id,email,role" -Headers $headers -UseBasicParsing
Write-Host "After PATCH: $($r2.Content)"
