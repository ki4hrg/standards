#!/usr/bin/env bash
# Apply the standard GitHub settings to a repo (docs/core/workflow.md):
# squash merge only, PR title as the commit subject, branches deleted on merge,
# and the `automerge` label that merge-on-green looks for.
#
#   scripts/repo-settings.sh owner/repo
#
# Needs `gh` signed in with admin on the repo. Safe to run again.
set -euo pipefail

repo="${1:?usage: repo-settings.sh owner/repo}"

gh api -X PATCH "repos/$repo" --silent \
  -F allow_squash_merge=true \
  -F allow_merge_commit=false \
  -F allow_rebase_merge=false \
  -F delete_branch_on_merge=true \
  -F allow_auto_merge=false \
  -f squash_merge_commit_title=PR_TITLE \
  -f squash_merge_commit_message=PR_BODY

gh label create automerge --repo "$repo" --force \
  --color 0E8A16 --description "Squash-merge when CI is green (merge-on-green)"

# GitHub's own secret scanning: free on public repos; on private repos it needs
# GitHub Advanced Security. Not required by the standard: the GitGuardian app is
# the secret scanner (docs/core/security.md). This only turns it on where it's free.
gh api -X PATCH "repos/$repo" --silent --input - <<'JSON' 2>/dev/null \
  || echo "GitHub secret scanning isn't available on this plan (fine: GitGuardian is the scanner)."
{"security_and_analysis":{"secret_scanning":{"status":"enabled"},"secret_scanning_push_protection":{"status":"enabled"}}}
JSON

echo "Applied standard settings to $repo."
echo "Still to do by hand:"
# dockhand-deploy.yml reads the URL from Secrets or Variables; only remind if neither has it.
if gh secret list --repo "$repo" --json name -q '.[].name' | grep -qx DOCKHAND_WEBHOOK_URL \
  || gh variable list --repo "$repo" --json name -q '.[].name' | grep -qx DOCKHAND_WEBHOOK_URL; then
  :
else
  echo "  - Settings → Secrets and variables → Actions: DOCKHAND_WEBHOOK_URL (and DOCKHAND_WEBHOOK_TOKEN), if it deploys by webhook (mode A)"
fi
echo "  - GitGuardian app: make sure its repository access includes $repo"
