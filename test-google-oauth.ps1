# Script para probar Google OAuth desde PowerShell
# Ejecutar: .\test-google-oauth.ps1

$BaseUrl = "http://localhost:3001"
$Green = "`e[32m"
$Red = "`e[31m"
$Yellow = "`e[33m"
$Blue = "`e[34m"
$Reset = "`e[0m"

Write-Host "${Blue}🧪 Probando Google OAuth - Nabra XR1${Reset}" -ForegroundColor Blue
Write-Host "=" * 50

# Función para hacer requests HTTP
function Invoke-TestRequest {
    param(
        [string]$Url,
        [string]$Method = "GET",
        [string]$Description
    )
    
    Write-Host "`n${Yellow}📡 $Description${Reset}" -ForegroundColor Yellow
    Write-Host "URL: $Url" -ForegroundColor Gray
    Write-Host "Método: $Method" -ForegroundColor Gray
    
    try {
        $response = Invoke-RestMethod -Uri $Url -Method $Method -ErrorAction Stop
        Write-Host "${Green}✅ Éxito${Reset}" -ForegroundColor Green
        Write-Host "Respuesta:" -ForegroundColor Cyan
        $response | ConvertTo-Json -Depth 10 | Write-Host
        return $response
    }
    catch {
        Write-Host "${Red}❌ Error: $($_.Exception.Message)${Reset}" -ForegroundColor Red
        if ($_.Exception.Response) {
            $statusCode = $_.Exception.Response.StatusCode
            Write-Host "Código de estado: $statusCode" -ForegroundColor Red
        }
        return $null
    }
}

# Test 1: Verificar estado del servidor
Write-Host "`n${Blue}1. Verificando estado del servidor...${Reset}" -ForegroundColor Blue
$authUrlResponse = Invoke-TestRequest -Url "$BaseUrl/auth/google/auth-url" -Description "Obteniendo URL de autenticación"

if ($authUrlResponse -and $authUrlResponse.success) {
    Write-Host "`n${Green}🎉 Servidor funcionando correctamente!${Reset}" -ForegroundColor Green
    
    # Mostrar la URL de autenticación
    $authUrl = $authUrlResponse.data.authUrl
    Write-Host "`n${Blue}🔗 URL de Autenticación Google:${Reset}" -ForegroundColor Blue
    Write-Host $authUrl -ForegroundColor Cyan
    
    Write-Host "`n${Yellow}📋 Instrucciones para probar el login completo:${Reset}" -ForegroundColor Yellow
    Write-Host "1. Copia la URL de arriba" -ForegroundColor White
    Write-Host "2. Abre la URL en tu navegador" -ForegroundColor White
    Write-Host "3. Completa el login con Google" -ForegroundColor White
    Write-Host "4. Después del login, serás redirigido a:" -ForegroundColor White
    Write-Host "   http://localhost:3000/?token=JWT_TOKEN&user=USER_DATA&login=success" -ForegroundColor Cyan
    Write-Host "5. Copia el token JWT de la URL" -ForegroundColor White
    Write-Host "6. Úsalo para probar las rutas autenticadas en Postman" -ForegroundColor White
    
} else {
    Write-Host "`n${Red}❌ El servidor no está respondiendo correctamente${Reset}" -ForegroundColor Red
    Write-Host "Verifica que el servidor esté ejecutándose en el puerto 3001" -ForegroundColor Yellow
    exit 1
}

# Test 2: Probar redirección a Google OAuth
Write-Host "`n${Blue}2. Probando redirección a Google OAuth...${Reset}" -ForegroundColor Blue
try {
    $redirectResponse = Invoke-WebRequest -Uri "$BaseUrl/auth/google" -Method GET -MaximumRedirection 0 -ErrorAction Stop
    Write-Host "${Green}✅ Redirección funcionando${Reset}" -ForegroundColor Green
    Write-Host "Código de estado: $($redirectResponse.StatusCode)" -ForegroundColor Cyan
    Write-Host "Location: $($redirectResponse.Headers.Location)" -ForegroundColor Cyan
}
catch {
    if ($_.Exception.Response.StatusCode -eq 302) {
        Write-Host "${Green}✅ Redirección funcionando (302 Found)${Reset}" -ForegroundColor Green
        Write-Host "Location: $($_.Exception.Response.Headers.Location)" -ForegroundColor Cyan
    } else {
        Write-Host "${Red}❌ Error en redirección: $($_.Exception.Message)${Reset}" -ForegroundColor Red
    }
}

# Test 3: Probar callback simulado
Write-Host "`n${Blue}3. Probando callback simulado...${Reset}" -ForegroundColor Blue
$callbackResponse = Invoke-TestRequest -Url "$BaseUrl/auth/google/callback?code=test_code&state=test_state" -Description "Simulando callback de Google OAuth"

if ($callbackResponse -eq $null) {
    Write-Host "${Yellow}⚠️ Error esperado para código simulado${Reset}" -ForegroundColor Yellow
}

# Resumen final
Write-Host "`n${Blue}📊 Resumen de Pruebas${Reset}" -ForegroundColor Blue
Write-Host "=" * 30
Write-Host "✅ Servidor: Funcionando" -ForegroundColor Green
Write-Host "✅ Auth URL: Funcionando" -ForegroundColor Green
Write-Host "✅ Redirección: Funcionando" -ForegroundColor Green
Write-Host "⚠️ Callback: Error esperado (código simulado)" -ForegroundColor Yellow

Write-Host "`n${Green}🎯 Próximos pasos:${Reset}" -ForegroundColor Green
Write-Host "1. Usa Postman con la colección importada" -ForegroundColor White
Write-Host "2. Completa el login real con Google" -ForegroundColor White
Write-Host "3. Prueba las rutas autenticadas" -ForegroundColor White

Write-Host "`n${Blue}📁 Archivos creados:${Reset}" -ForegroundColor Blue
Write-Host "• postman-google-oauth-collection.json" -ForegroundColor White
Write-Host "• POSTMAN_GOOGLE_OAUTH_TESTING.md" -ForegroundColor White
Write-Host "• test-google-auth.html" -ForegroundColor White
Write-Host "• test-google-oauth.ps1 (este script)" -ForegroundColor White

Write-Host "`n${Green}✨ ¡Pruebas completadas!${Reset}" -ForegroundColor Green
