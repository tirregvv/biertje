# Git / workflow

- Work directly on `main`. If a change ever ends up on a separate branch for any reason (e.g. an
  isolated worktree), merge it into `main` as soon as it's verified working (typecheck/build pass,
  and a live smoke test where practical) — don't leave verified work stranded on an unmerged
  branch. No PRs unless explicitly asked for one.
