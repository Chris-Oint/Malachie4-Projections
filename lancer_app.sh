#!/bin/bash
# Lance l'application « La Bibliothèque du Message » en local.
cd "$(dirname "$0")"
PORT="${1:-8080}"
echo "Application disponible sur :  http://localhost:$PORT"
echo "(sur un téléphone du même réseau : http://ADRESSE-IP-DU-PC:$PORT)"
python3 -m http.server "$PORT" --bind 0.0.0.0
