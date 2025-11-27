# Local testing script for Windows - run before deploying
# This tests all endpoints locally without Docker

Write-Host "🧪 Starting Local Tests..." -ForegroundColor Cyan
Write-Host ""

# Start the server in background
Write-Host "Starting server..." -ForegroundColor Yellow
$process = Start-Process -FilePath "npm" -ArgumentList "start" -PassThru -NoNewWindow

# Wait for server to start
Start-Sleep -Seconds 3

Write-Host "✅ Server started (PID: $($process.Id))" -ForegroundColor Green
Write-Host ""

Write-Host "🔍 Testing Endpoints..." -ForegroundColor Cyan
Write-Host ""

# Test 1: User Profile
Write-Host "1️⃣  Testing GET /api/user/profile" -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000/api/user/profile" -Headers @{"Authorization"="Bearer test-token"} -ErrorAction Stop
    Write-Host "✅ Success: $($response.StatusCode)" -ForegroundColor Green
} catch {
    Write-Host "❌ Failed: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Test 2: Menu Today
Write-Host "2️⃣  Testing GET /api/menu/today" -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000/api/menu/today" -ErrorAction Stop
    Write-Host "✅ Success: $($response.StatusCode)" -ForegroundColor Green
} catch {
    Write-Host "❌ Failed: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Test 3: Mess Halls
Write-Host "3️⃣  Testing GET /api/mess-halls" -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000/api/mess-halls" -ErrorAction Stop
    Write-Host "✅ Success: $($response.StatusCode)" -ForegroundColor Green
} catch {
    Write-Host "❌ Failed: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Test 4: Current Meal Time
Write-Host "4️⃣  Testing GET /api/current-meal-time" -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000/api/current-meal-time" -ErrorAction Stop
    Write-Host "✅ Success: $($response.StatusCode)" -ForegroundColor Green
} catch {
    Write-Host "❌ Failed: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Test 5: Meal Types
Write-Host "5️⃣  Testing GET /api/meal-types" -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000/api/meal-types" -ErrorAction Stop
    Write-Host "✅ Success: $($response.StatusCode)" -ForegroundColor Green
} catch {
    Write-Host "❌ Failed: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Test 6: Notifications
Write-Host "6️⃣  Testing GET /api/notifications/student001" -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000/api/notifications/student001" -ErrorAction Stop
    Write-Host "✅ Success: $($response.StatusCode)" -ForegroundColor Green
} catch {
    Write-Host "❌ Failed: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Test 7: Dashboard Stats
Write-Host "7️⃣  Testing GET /api/dashboard/stats" -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000/api/dashboard/stats" -Headers @{"Authorization"="Bearer test-token"} -ErrorAction Stop
    Write-Host "✅ Success: $($response.StatusCode)" -ForegroundColor Green
} catch {
    Write-Host "❌ Failed: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Kill the server
Write-Host "Stopping server..." -ForegroundColor Yellow
Stop-Process -Id $process.Id -Force

Write-Host ""
Write-Host "✅ Local tests completed!" -ForegroundColor Green
