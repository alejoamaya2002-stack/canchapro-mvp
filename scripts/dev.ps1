$ErrorActionPreference = "Stop"
$env:Path = "C:\Users\alejo\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin;" + $env:Path
& ".\node_modules\.bin\next.CMD" dev --hostname 127.0.0.1 --port 3000
