$body = @{
    email    = "admin@kenyt.com"
    password = "admin123"
} | ConvertTo-Json

Write-Host "Testing login for admin@kenyt.com / admin123..."
try {
    $result = Invoke-RestMethod -Method Post -Uri "http://localhost:4000/auth/login" -ContentType "application/json" -Body $body
    Write-Host "LOGIN SUCCESS:"
    Write-Host ($result | ConvertTo-Json -Depth 5)
} catch {
    $resp = $_.Exception.Response
    if ($resp) {
        $reader = New-Object System.IO.StreamReader($resp.GetResponseStream())
        $errBody = $reader.ReadToEnd()
        Write-Host "LOGIN ERROR ($([int]$_.Exception.Response.StatusCode)):"
        Write-Host $errBody
    } else {
        Write-Host "LOGIN ERROR: $($_.Exception.Message)"
    }
}

Write-Host ""
Write-Host "Listing all users..."
try {
    $users = Invoke-RestMethod -Method Get -Uri "http://localhost:4000/users"
    $users | ForEach-Object { Write-Host "  - $($_.email) | role: $($_.role) | active: $($_.isActive)" }
} catch {
    Write-Host "Could not list users: $($_.Exception.Message)"
}
