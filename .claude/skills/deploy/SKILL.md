---
name: deploy
description: Build, commit, push, and deploy to Netlify
disable-model-invocation: true
user-invocable: true
allowed-tools: Bash(npm run build), Bash(git *), Bash(netlify deploy *), Read, Grep, Glob
---

# Deploy Skill

When the user invokes `/deploy`, perform these steps in order:

1. **Build** — Run `npm run build`. If it fails, stop and report the error.

2. **Stage changes** — Run `git add -A` to stage all changes.

3. **Commit** — Create a commit with a short, one-line message summarizing the changes. Use `git diff --cached --stat` to understand what changed. Format: lowercase, imperative mood, no period. Example: `update home page layout and simplify history view`

4. **Push** — Run `git push` to push to the remote.

5. **Deploy** — Run `netlify deploy --prod` to deploy to production.

6. **Report** — Show the deploy URL and confirm success.

If any step fails, stop immediately and report what went wrong. Do not continue to the next step.
