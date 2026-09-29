#!/usr/bin/env bash
# setup.sh: one-time setup that publishes this folder to GitHub.
#
# Run it once, from this folder, in Terminal on the Mac:
#     cd ~/Documents/Claude/Projects/greek
#     bash setup.sh
#
# What it does, step by step (each step is safe to re-run):
#   1. Checks that the GitHub CLI (gh) is installed and logged in.
#      If not: brew install gh && gh auth login
#   2. Makes this folder a git repo on branch "main" and commits everything.
#   3. Creates the PUBLIC repo ericaraujophd/greek and pushes the code.
#   4. Turns on GitHub Pages with "GitHub Actions" as the source, so every
#      push builds the app and publishes it to https://ericaraujo.com/greek/
#   5. Creates the PRIVATE repo ericaraujophd/greek-progress with an empty
#      progress.json. This is where the app saves your study progress.
#
# Afterwards: open https://ericaraujo.com/greek/#/settings and follow the
# token steps on that page (about two minutes).

set -euo pipefail

OWNER="ericaraujophd"
APP_REPO="greek"
DATA_REPO="greek-progress"

# ---------- 1. GitHub CLI ----------
if ! command -v gh >/dev/null 2>&1; then
  echo "The GitHub CLI (gh) is not installed. Install it with:"
  echo "    brew install gh && gh auth login"
  echo "then run this script again."
  exit 1
fi
if ! gh auth status >/dev/null 2>&1; then
  echo "gh is installed but not logged in. Run:  gh auth login   then run this script again."
  exit 1
fi

# ---------- 2. Local git repo ----------
if [ ! -d .git ]; then
  git init -b main
fi
git add -A
if ! git diff --cached --quiet; then
  git commit -m "Greek study tools: alphabet module"
fi

# ---------- 3. Public app repo ----------
if gh repo view "$OWNER/$APP_REPO" >/dev/null 2>&1; then
  echo "Repo $OWNER/$APP_REPO already exists."
  git remote get-url origin >/dev/null 2>&1 || git remote add origin "https://github.com/$OWNER/$APP_REPO.git"
  git push -u origin main
else
  gh repo create "$OWNER/$APP_REPO" --public \
    --description "Personal Koine Greek study tools alongside Mounce: https://ericaraujo.com/greek/" \
    --source . --remote origin --push
fi

# ---------- 4. GitHub Pages (built by Actions) ----------
# POST creates the Pages site; if it already exists, PUT updates it instead.
gh api -X POST "repos/$OWNER/$APP_REPO/pages" -f build_type=workflow >/dev/null 2>&1 \
  || gh api -X PUT "repos/$OWNER/$APP_REPO/pages" -f build_type=workflow >/dev/null
echo "GitHub Pages is on. The first build takes a minute or two:"
echo "    https://github.com/$OWNER/$APP_REPO/actions"

# ---------- 5. Private progress repo ----------
if gh repo view "$OWNER/$DATA_REPO" >/dev/null 2>&1; then
  echo "Repo $OWNER/$DATA_REPO already exists."
else
  gh repo create "$OWNER/$DATA_REPO" --private \
    --description "Study progress for ericaraujo.com/greek (written by the app)"
  # Seed an empty progress file so the first sync has something to read.
  EMPTY='{"schema":1,"cards":{},"stats":{},"sessions":[]}'
  gh api -X PUT "repos/$OWNER/$DATA_REPO/contents/progress.json" \
    -f message="Create empty progress file" \
    -f content="$(printf '%s\n' "$EMPTY" | base64)" >/dev/null
fi

echo
echo "Done. Next:"
echo "  1. Wait for the build: https://github.com/$OWNER/$APP_REPO/actions"
echo "  2. Open https://ericaraujo.com/greek/#/settings and create the access token as described there."
