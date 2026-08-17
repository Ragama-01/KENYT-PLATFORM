$body = @{
    email    = "admin@kenyt.com"
    password = "admin123"
    fullName = "Super Admin"
    role     = "super_admin"
} | ConvertTo-Json

try {
    $result = Invoke-RestMethod -Method Post -Uri "http://localhost:4000/users" -ContentType "application/json" -Body $body
    Write-Host "SUCCESS - User created:"
    Write-Host ($result | ConvertTo-Json)
} catch {
    $resp = $_.Exception.Response
    if ($resp) {
        $reader = New-Object System.IO.StreamReader($resp.GetResponseStream())
        $errBody = $reader.ReadToEnd()
        Write-Host "ERROR ($($_.Exception.Response.StatusCode)):"
        Write-Host $errBody
    } else {
        Write-Host "ERROR: $($_.Exception.Message)"
    }
}
