Get-ChildItem -Path "c:\wamp64\www\jajr_facial_recognition\frontend\src" -Recurse -File | ForEach-Object {
    $content = Get-Content $_.FullName -Raw
    if ($content -match "http://localhost:5000") {
        $content = $content -replace "http://localhost:5000/api", "/api"
        $content = $content -replace "'http://localhost:5000'", "''"
        $content = $content -replace '"http://localhost:5000"', '""'
        Set-Content -Path $_.FullName -Value $content -NoNewline
    }
}
