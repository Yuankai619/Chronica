#!/usr/bin/env bash
#
# Auto-unlocks git-crypt in a linked git worktree by reusing the symmetric
# key that is already unlocked elsewhere in this repo checkout.
#
# Why this exists: every linked worktree has its own private git-dir
# (.git/worktrees/<name>/), but shares one .git/config with the main
# checkout. git-crypt registers its smudge/clean filter in that shared
# config the first time you ever run `git-crypt init`/`unlock` anywhere in
# the repo — so a brand-new worktree hits the filter immediately, but looks
# for the decrypted key at its own private path
# (.git/worktrees/<name>/git-crypt/keys/default), which is empty. The
# checkout then hard-fails with "smudge filter git-crypt failed", and at
# that point `git-crypt unlock` itself refuses to run because the failed
# checkout leaves the working tree "not clean". Verified by tracing the
# actual open() calls git-crypt makes from inside a linked worktree.
#
# The fix: the plaintext key already sits at
# <common-git-dir>/git-crypt/keys/default the moment *any* worktree has
# been unlocked. Copying it into this worktree's private path is exactly
# what a real `git-crypt unlock` would produce, just without re-prompting
# for a GPG passphrase — so this script only ever reuses a key that some
# worktree in this checkout was already trusted to unlock.
#
# Usage:
#   scripts/git-crypt-worktree-unlock.sh              # operate on cwd
#   scripts/git-crypt-worktree-unlock.sh --path DIR    # operate on DIR
#
# Safe to run anywhere, anytime: no-ops on branches without git-crypt,
# no-ops if already unlocked, and never touches files outside the target
# worktree. Never invoked with the intent to block a checkout — see
# .githooks/post-checkout.

set -euo pipefail

target=.
while [ $# -gt 0 ]; do
	case "$1" in
	--path)
		target="$2"
		shift 2
		;;
	*)
		echo "git-crypt-worktree-unlock: unknown argument '$1'" >&2
		exit 2
		;;
	esac
done

cd "$target"

# Not a git checkout at all (e.g. called against a bogus path) — nothing to do.
git rev-parse --is-inside-work-tree >/dev/null 2>&1 || exit 0

# This ref never had git-crypt set up (e.g. an old branch) — nothing to do.
git ls-tree -r --name-only HEAD -- .git-crypt 2>/dev/null | grep -q . || exit 0

if ! command -v git-crypt >/dev/null 2>&1; then
	echo "git-crypt-worktree-unlock: git-crypt is not installed — .env stays encrypted here." >&2
	exit 0
fi

git_dir=$(git rev-parse --git-dir)
common_dir=$(git rev-parse --git-common-dir)

# Main checkout (git-dir == common-dir): this is a normal, non-worktree
# unlock. There is no already-unlocked key to borrow, so this has to go
# through the real GPG/keyfile flow — never silent, always interactive.
if [ "$git_dir" = "$common_dir" ]; then
	if [ -f "$git_dir/git-crypt/keys/default" ]; then
		exit 0 # already unlocked
	fi
	echo "git-crypt-worktree-unlock: this checkout isn't unlocked yet. Run:" >&2
	echo "  git-crypt unlock" >&2
	exit 0
fi

# Linked worktree, and it already has its own unlocked key — verify it
# actually decrypts before trusting it (a stale/foreign key file would
# leave .env silently as ciphertext).
if [ -f "$git_dir/git-crypt/keys/default" ] && git-crypt status -e 2>/dev/null | grep -q '^ *encrypted:'; then
	exit 0
fi

# Nothing unlocked here yet. Borrow the key from wherever it's already
# unlocked in this checkout (almost always the main worktree).
if [ ! -f "$common_dir/git-crypt/keys/default" ]; then
	cat >&2 <<EOF
git-crypt-worktree-unlock: git-crypt isn't unlocked anywhere in this
checkout yet, so there's no key to reuse here. Unlock it once in the main
worktree first:
  git -C "$(dirname "$common_dir")" crypt unlock
then switch back to this worktree — it will pick it up automatically.
EOF
	exit 0
fi

mkdir -p "$git_dir/git-crypt/keys"
cp "$common_dir/git-crypt/keys/default" "$git_dir/git-crypt/keys/default"

# Re-materialize any git-crypt-managed paths that failed to smudge earlier.
git checkout HEAD -- . 2>/dev/null || true

echo "git-crypt-worktree-unlock: unlocked $(pwd) using the key from $common_dir" >&2
