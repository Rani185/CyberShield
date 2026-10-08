$env:PATH = [System.Environment]::GetEnvironmentVariable('PATH','Machine') + ';' + [System.Environment]::GetEnvironmentVariable('PATH','User')
Set-Location "$PSScriptRoot"
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
