#!/usr/bin/env bash
# [Atlas] A0 : vérifications à passer avant d'intégrer une modification dans main et après chaque mise à jour.
#   bash atlas/verifier.sh            tout (marqueurs, types, tests Atlas, compilation)
#   bash atlas/verifier.sh --rapide   marqueurs et tests Atlas seulement
set -uo pipefail
cd "$(git rev-parse --show-toplevel)"
vp=${VP:-vp}; command -v "$vp" >/dev/null || vp="$LOCALAPPDATA/vite-plus/bin/vp.exe"
echec=0; ko() { echo "ÉCHEC : $*"; echec=1; }

# 1. Chaque marqueur [Atlas] Ax a sa ligne dans le registre, et chaque ligne « en place » a au moins un marqueur.
marq=$(git grep -hoE '\[Atlas\] A[0-9]+' -- . ':!ATLAS.md' ':!.repos' | grep -oE 'A[0-9]+' | sort -u)
for id in $marq; do grep -qE "^\| *$id *\|" ATLAS.md || ko "marqueur $id sans ligne dans ATLAS.md"; done
for id in $(grep -E '^\| *A[0-9]+ *\|.*\| *en place *\|' ATLAS.md | grep -oE '^\| *A[0-9]+' | grep -oE 'A[0-9]+'); do
  echo "$marq" | grep -qx "$id" || ko "$id est « en place » dans ATLAS.md mais aucun marqueur [Atlas] $id dans le code"
done

# 2. Tout fichier de T3 modifié par nous porte un marqueur ; le lockfile reste celui de T3.
base=$(cat atlas/base-t3.txt)
if git rev-parse -q --verify "$base^{commit}" >/dev/null; then
  for f in $(git diff --name-only "$base" -- . ':!ATLAS.md' ':!**/atlas/**' ':!atlas/**'); do
    [ -f "$f" ] || continue
    [ "$f" = pnpm-lock.yaml ] && { ko "pnpm-lock.yaml diffère de T3 (git checkout $base -- pnpm-lock.yaml, sauf dépendance ajoutée par nous et notée dans ATLAS.md)"; continue; }
    grep -q '\[Atlas\]' "$f" || ko "$f (fichier de T3) modifié sans marqueur [Atlas] Ax"
  done
else
  echo "Attention : base T3 $base introuvable (git fetch upstream --tags), contrôle 2 sauté."
fi

# 3. Tests Atlas (fichiers *.test.ts(x) dans nos dossiers atlas/).
tests=$(git ls-files | grep -E '(^|/)atlas/.*\.test\.tsx?$' || true)
if [ -n "$tests" ]; then "$vp" test run $tests || ko "tests Atlas"; fi

# 4. Types et compilation de l'app de bureau.
if [ "${1:-}" != "--rapide" ]; then
  "$vp" run typecheck >/dev/null 2>&1 || ko "typecheck (relancer : vp run typecheck)"
  "$vp" run build:desktop >/dev/null 2>&1 || ko "compilation (relancer : vp run build:desktop)"
fi

[ $echec = 0 ] && echo "Vérifications OK." || exit 1
