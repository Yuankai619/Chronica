#!/usr/bin/env bash
#
# `git worktree add`, but git-crypt-safe.
#
# Plain `git worktree add <path> <branch>` implicitly checks out the branch,
# and if this repo has ever been unlocked anywhere, that implicit checkout
# hard-fails trying to smudge .env before there's any chance to unlock the
# new worktree (see scripts/git-crypt-worktree-unlock.sh for the full
# mechanics — there's no git hook that runs early enough to fix this, since
# a failed checkout aborts `worktree add` before any hook fires).
#
# Usage: same as `git worktree add`, but the path must be the first argument.
#   scripts/git-worktree-add.sh ../my-feature some-branch
#   pnpm worktree:add ../my-feature some-branch

set -euo pipefail

if [ $# -lt 1 ]; then
	echo "usage: $0 <path> [<commit-ish>] [git-worktree-add-args...]" >&2
	exit 2
fi

path="$1"
shift

git worktree add --no-checkout "$path" "$@"

"$(git rev-parse --show-toplevel)/scripts/git-crypt-worktree-unlock.sh" --path "$path"

echo "worktree ready at $path"
