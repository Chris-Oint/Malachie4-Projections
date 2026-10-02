#!/usr/bin/env bash
# ============================================================================
#  Envoie TOUT le travail sur votre compte GitHub — et n'efface jamais rien.
#
#  Utilisation :
#     GITHUB_TOKEN=votre_jeton GITHUB_USER=Chris-Oint ./pousser_sur_github.sh
#     (nom du dépôt en 3e argument ; par défaut : Malachie4-Projections)
#
#  Fonctionnement :
#     · la copie de travail du dépôt vit dans /tmp (jamais dans l'espace de travail) ;
#     · si le dépôt distant existe, il est d'abord récupéré, puis vos fichiers
#       viennent l'écraser : les fichiers lourds qui ne sont plus ici (data/…)
#       RESTENT sur GitHub — ils ne sont jamais supprimés ;
#     · les composants réinstallables (node_modules), archives .zip, exécutables
#       et caches ne sont pas envoyés (.gitignore).
#
#  Le jeton n'est jamais écrit dans un fichier : il ne sert qu'à l'échange réseau.
# ============================================================================
set -euo pipefail

DEPOT="${3:-Malachie4-Projections}"
VISIBILITE="${VISIBILITE:-public}"        # private | public
BRANCHE="${BRANCHE:-main}"
DOSSIER_TRAVAIL="${DOSSIER_TRAVAIL:-/home/user}"
GITDIR="${GITDIR:-${TMPDIR:-/tmp}/malachie4-depot}"
URL="https://${GITHUB_USER:-}:${GITHUB_TOKEN:-}@github.com/${GITHUB_USER:-}/${DEPOT}.git"

if [ -z "${GITHUB_TOKEN:-}" ] || [ -z "${GITHUB_USER:-}" ]; then
  echo "Il manque le jeton ou le nom d'utilisateur."
  echo "Exemple :  GITHUB_TOKEN=ghp_xxx GITHUB_USER=Chris-Oint $0"
  exit 1
fi

echo "1/5  Dépôt « ${DEPOT} » sur le compte ${GITHUB_USER} (${VISIBILITE})…"
code=$(curl -s -o /tmp/gh_reponse.json -w '%{http_code}' \
  -X POST -H "Authorization: token ${GITHUB_TOKEN}" -H "Accept: application/vnd.github+json" \
  https://api.github.com/user/repos \
  -d "{\"name\":\"${DEPOT}\",\"private\":$([ "$VISIBILITE" = "private" ] && echo true || echo false),\"description\":\"Malachie 4 Projections — application de projection, bibliothèque du Message, outils\"}")
case "$code" in
  201) echo "     dépôt créé (${VISIBILITE})." ;;
  422) echo "     le dépôt existe déjà : on y ajoute simplement les nouveautés." ;;
  401) echo "     ✗ Jeton refusé (401). Vérifiez la case « repo » du jeton."; exit 2 ;;
  *)   echo "     réponse GitHub : $code"; head -c 300 /tmp/gh_reponse.json 2>/dev/null; echo; exit 2 ;;
esac

echo "2/5  Récupération du dépôt dans ${GITDIR} (hors espace de travail)…"
if [ -d "$GITDIR/.git" ]; then
  git -C "$GITDIR" fetch -q origin "$BRANCHE" && git -C "$GITDIR" reset -q --hard "origin/$BRANCHE" && echo "     mis à jour."
elif git clone -q "$URL" "$GITDIR" 2>/dev/null; then
  echo "     récupéré (première fois)."
else
  mkdir -p "$GITDIR" && git -C "$GITDIR" init -q -b "$BRANCHE" && echo "     dépôt distant vide : création locale."
fi
git -C "$GITDIR" config user.name  "Malachie 4 Projections"
git -C "$GITDIR" config user.email "malachie4@utilisateur.local"
git -C "$GITDIR" remote set-url origin "$URL" 2>/dev/null || git -C "$GITDIR" remote add origin "$URL"

echo "3/5  Copie de vos fichiers (les fichiers absents ici restent sur GitHub)…"
for element in $(ls -A "$DOSSIER_TRAVAIL"); do
  case "$element" in
    node_modules|.cache|.npm|.local|.git|livraison|dist|out|coverage) continue ;;
  esac
  cp -a "$DOSSIER_TRAVAIL/$element" "$GITDIR/" 2>/dev/null || true
done
echo "     $(git -C "$GITDIR" status --porcelain | wc -l) changement(s) détecté(s)."

echo "4/5  Préparation de la révision…"
git -C "$GITDIR" add -A
# le dépôt ne perd JAMAIS un fichier : les suppressions locales ne sont pas envoyées
supprimes=$(git -C "$GITDIR" diff --cached --name-only --diff-filter=D | tr '\n' ' ')
if [ -n "$supprimes" ]; then
  # shellcheck disable=SC2086
  git -C "$GITDIR" reset -q -- $supprimes
  echo "     conservés sur GitHub (absents ici) : $(echo $supprimes | wc -w) fichier(s)"
fi
if git -C "$GITDIR" diff --cached --quiet; then
  echo "     rien de nouveau à envoyer."
else
  git -C "$GITDIR" commit -q -m "Malachie 4 Projections — $(date +'%d/%m/%Y %H:%M')"
  echo "     $((git -C "$GITDIR" show --stat --oneline HEAD | tail -1) 2>/dev/null || true)"
fi

echo "5/5  Envoi vers GitHub…"
git -C "$GITDIR" push origin "HEAD:${BRANCHE}" 2>&1 | sed "s/${GITHUB_TOKEN}/***/g"
echo
echo "     Dépôt : https://github.com/${GITHUB_USER}/${DEPOT}"
echo "     Pour tout récupérer ailleurs :  git clone https://github.com/${GITHUB_USER}/${DEPOT}.git"
