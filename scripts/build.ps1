$ErrorActionPreference = "Stop"
$env:Path = "C:\Users\alejo\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin;" + $env:Path
$env:NEXT_TELEMETRY_DISABLED = "1"
& ".\node_modules\.bin\next.CMD" build
