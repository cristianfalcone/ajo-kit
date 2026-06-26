# Issue tracker: GitHub

Issues and PRDs for this repo live as GitHub issues. Use the `gh` CLI for issue operations from inside this checkout so the repository is inferred from `git remote -v`.

## Conventions

- Create an issue: `gh issue create --title "..." --body "..."`
- Read an issue: `gh issue view <number> --comments`
- List issues: `gh issue list --state open --json number,title,body,labels,comments`
- Comment on an issue: `gh issue comment <number> --body "..."`
- Apply or remove labels: `gh issue edit <number> --add-label "..."` / `--remove-label "..."`
- Close an issue: `gh issue close <number> --comment "..."`

Use heredocs or temporary files for multi-line bodies when needed. Include labels from `ai/agents/triage-labels.md` when a skill moves an issue through triage.

## Pull requests as a triage surface

PRs as a request surface: no.

Do not pull external PRs into the triage queue by default. If the repo later treats external PRs as feature requests, update this file and the `AGENTS.md` summary first.

## Skill phrases

When a skill says "publish to the issue tracker", create a GitHub issue.

When a skill says "fetch the relevant ticket", run `gh issue view <number> --comments`.
