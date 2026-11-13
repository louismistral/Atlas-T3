#!/usr/bin/env bash
# [Atlas] A0 : fait entrer une version publiée de T3 Code dans main (fusion, jamais de réécriture). Voir ATLAS.md.
#   atlas/maj-depuis-t3.sh            fusionne la dernière version stable de T3 (tag vX.Y.Z)
#   atlas/maj-depuis-t3.sh <ref>      fusionne une version précise (tag ou commit d'upstream)
#   atlas/maj-depuis-t3.sh --finir    après résolution des conflits : termine, vérifie, pousse
# Codes de sortie : 0 fait ou déjà à jour, 2 conflits à résoudre, 1 erreur.
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"
base_file=atlas/base-t3.txt
pending=$(git rev-parse --absolute-git-dir)/atlas-maj-cible
vp=${VP:-vp}; command -v "$vp" >/dev/null || vp="$LOCALAPPDATA/vite-plus/bin/vp.exe"

finir() {
  local cible; cible=$(cat "$pending")
  if git diff --name-only --diff-filter=U | grep -q .; then
    echo "Conflits non résolus :"; git diff --name-only --diff-filter=U; exit 2
  fi
  echo "$cible" > "$base_file"
  # Les dépendances de T3 ont pu changer ; le lockfile reste exactement le leur.
  "$vp" i >/dev/null 2>&1 || { echo "vp i a échoué"; exit 1; }
  git checkout -q -- pnpm-lock.yaml 2>/dev/null || true
  git add -A
  git -c core.editor=true commit --no-edit -q || true
  rm -f "$pending"
  bash atlas/verifier.sh || { echo "Vérifications en échec : main n'a PAS été poussé. Corrige, ou reviens en arrière (ATLAS.md, « Revenir en arrière »)."; exit 1; }
  git push -q origin main
  echo "Mise à jour vers $cible faite, vérifiée et poussée."
}

if [ "${1:-}" = "--finir" ]; then finir; exit 0; fi

[ "$(git branch --show-current)" = main ] || { echo "Se placer sur main (checkout principal)."; exit 1; }
[ -z "$(git status --porcelain)" ] || { echo "Le dossier a des changements non commités : les intégrer ou les ranger d'abord."; git status --short; exit 1; }
git remote get-url upstream >/dev/null 2>&1 || git remote add upstream https://github.com/pingdotgg/t3code.git
git pull -q --rebase origin main
git -c core.longpaths=true fetch -q upstream --tags

cible=${1:-$(git tag -l 'v[0-9]*' | grep -v -- '-' | sort -V | tail -1)}
git rev-parse -q --verify "$cible^{commit}" >/dev/null || { echo "Version introuvable : $cible"; exit 1; }
if git merge-base --is-ancestor "$cible" HEAD; then echo "Déjà à jour (main contient $cible)."; exit 0; fi

sauvegarde="atlas-avant-maj-$(date +%Y%m%d-%H%M)"
git tag "$sauvegarde" && git push -q origin "$sauvegarde"
echo "Sauvegarde : tag $sauvegarde. Fusion de $cible ($(git rev-list --count HEAD.."$cible") commits de T3)."
# Un tag garde son nom ; une branche (upstream/main) est figée en commit, sinon la base bougerait toute seule.
git show-ref -q --tags "$cible" || cible=$(git rev-parse "$cible^{commit}")
echo "$cible" > "$pending"

if git merge --no-ff --no-commit -m "Mise à jour depuis T3 $cible" "$cible"; then
  finir
else
  # Le lockfile suit toujours T3 : on prend le leur.
  if git diff --name-only --diff-filter=U | grep -qx pnpm-lock.yaml; then git checkout --theirs pnpm-lock.yaml && git add pnpm-lock.yaml; fi
  if git diff --name-only --diff-filter=U | grep -q .; then
    echo "Conflits à résoudre (rerere a déjà appliqué les résolutions connues) :"
    git diff --name-only --diff-filter=U
    echo "Résoudre avec ATLAS.md (le « pourquoi » de chaque [Atlas] Ax), puis : bash atlas/maj-depuis-t3.sh --finir"
    exit 2
  fi
  finir
fi
