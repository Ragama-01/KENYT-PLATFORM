# Step 1: Look up the admin user to get their id
$loginBody = @{
    email    = "admin@kenyt.com"
    password = "admin123"
} | ConvertTo-Json

Write-Host "1) Logging in to get admin user id..."
try {
    $login = Invoke-RestMethod -Method Post -Uri "http://localhost:4000/auth/login" -ContentType "application/json" -Body $loginBody
    $userId = $login.user.id
    Write-Host "   Admin user id = $userId (current role: $($login.user.role))"

    Write-Host "2) Updating admin role to super_admin..."
    $updateBody = @{
        role     = "super_admin"
        isActive = $true
    } | ConvertTo-Json

    try {
        $updated = Invoke-RestMethod -Method Put -Uri "http://localhost:4000/users/$userId" -ContentType "application/json" -Body $updateBody
        Write-Host "   SUCCESS! New role: $($updated.role), active: $($updated.isActive)"
    } catch {
        $resp = $_.Exception.Response
        if ($resp) {
            $reader = New-Object System.IO.StreamReader($resp.GetResponseStream())
            Write-Host "   UPDATE ERROR: $($reader.ReadToEnd())"
        } else {
            Write-Host "   UPDATE ERROR: $($_.Exception.Message)"
        }
    }
} catch {
    Write-Host "   LOGIN ERROR. Is the backend running on port 4000?"
}
