# Agent instructions

## General

- Be concise. Do not be verbose unless explicitly asked for more detail.
- Do not assume technologies, libraries, versions, or project conventions.
- Inspect the repository before making assumptions.
- Prefer existing project patterns over introducing new ones.
- If an important detail is unclear, ask rather than guessing.
- Do not invent APIs, configuration options, commands, or files.
- Keep explanations proportional to the complexity of the change.
- Show OpenSpec tasks as todos in OpenCode.

## Git

- Before starting a new change, run `git status --short`. If there are uncommitted changes, stop and ask the user how to proceed. Do not start a new change on a dirty working tree.
- When a change is archived, commit all changes in the working tree, including the archived change directory, before finishing. Use a commit message that describes the change.
