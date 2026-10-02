#!/usr/bin/env bash
# ============================================================================
#  Envoie TOUT le travail sur votre compte GitHub (un seul dépôt).
#
#  Utilisation :
#     GITHUB_TOKEN=votre_jeton GITHUB_USER=Chris-Oint ./pousser_sur_github.sh
#     (nom du dépôt en 3e argument ; par défaut : Malachie4-Projections)
#
#  Le jeton n'est JAMAIS écrit dans un fichier : il ne sert qu'au moment de l'envoi.
#  Le dépôt local vit HORS de l'espace de travail (/tmp) : rien de lourd n'est stocké ici.
#  Les composants réinstallables (node_modules), archives .zip et exécutables sont
#  écartés par .gitignore.
# ============================================================================
set -euo pipefail

DEPOT="${3:-Malachie4-Projections}"
VISIBILITE="${VISIBILITE:-private}"      # private | public
BRANCHE="${BRANCHE:-main}"
DOSSIER_TRAVAIL="${DOSSIER_TRAVAIL:-/home/user}"
GITDIR="${GITDIR:-${TMPDIR:-/tmp}/malachie4-depot.git}"
GIT=(git --git-dir="$GITDIR" --work-tree="$DOSSIER_TRAVAIL")

if [ -z "${GITHUB_TOKEN:-}" ] || [ -z "${GITHUB_USER:-}" ]; then
  echo "Il manque le jeton ou le nom d'utilisateur."
  echo "Exemple :  GITHUB_TOKEN=ghp_xxx GITHUB_USER=Chris-Oint $0"
  exit 1
fi

echo "1/4  Dépôt « ${DEPOT} » sur le compte ${GITHUB_USER} (${VISIBILITE})…"
reponse=$(curl -s -o /tmp/gh_reponse.json -w '%{http_code}' \
  -X POST -H "Authorization: token ${GITHUB_TOKEN}" \
  -H "Accept: application/vnd.github+json" \
  https://api.github.com/user/repos \
  -d "{\"name\":\"${DEPOT}\",\"private\":$([ "$VISIBILITE" = "private" ] && echo true || echo false),\"description\":\"Malachie 4 Projections — application de projection, bibliothèque du Message, outils\"}")
case "$reponse" in
  201) echo "     dépôt créé." ;;
  422) echo "     le dépôt existe déjà : on y enverra simplement les fichiers." ;;
  401) echo "     ✗ Jeton refusé (401). Vérifiez la case « repo » du jeton."; exit 2 ;;
  *)   echo "     réponse GitHub : $reponse"; head -c 300 /tmp/gh_reponse.json 2>/dev/null; echo; exit 2 ;;
esac

echo "2/4  Préparation de la révision…"
[ -d "$GITDIR" ] || git init -q --bare "$GITDIR"
"${GIT[@]}" config core.worktree "$DOSSIER_TRAVAIL"
"${GIT[@]}" config user.name  "Malachie 4 Projections"
"${GIT[@]}" config user.email "malachie4@utilisateur.local"
"${GIT[@]}" add -A
if "${GIT[@]}" diff --cached --quiet; then
  echo "     rien de nouveau."
else
  "${GIT[@]}" commit -q -m "Malachie 4 Projections — $(date +'%d/%m/%Y %H:%M')"
  echo "     $( "${GIT[@]}" show --stat --oneline HEAD | tail -1 )"
fi
echo "     fichiers préparés : $("${GIT[@]}" ls-files | wc -l)"

echo "3/4  Envoi vers GitHub… (peut prendre quelques minutes la première fois)"
git --git-dir="$GITDIR" push "https://${GITHUB_USER}:${GITHUB_TOKEN}@github.com/${GITHUB_USER}/${DEPOT}.git" "HEAD:${BRANCHE}" --force 2>&1 \
  | sed "s/${GITHUB_TOKEN}/***/g"

echo "4/4  Terminé."
echo "     Dépôt : https://github.com/${GITHUB_USER}/${DEPOT}"
echo
echo "Pour récupérer le travail ailleurs :"
echo "     git clone https://github.com/${GITHUB_USER}/${DEPOT}.git"
