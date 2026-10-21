# Updating CTOC

How to pull new CTOC code and make a running session use it.

This describes **this fork's** setup (`davidbijl`), not the generic
marketplace install in the top-level README. On this machine the plugin is
installed from a git marketplace whose install path is a **live, writable git
checkout** — not a read-only cache:

| Fact | Value |
|------|-------|
| Marketplace | `davidbijl` (`known_marketplaces.json`) |
| Plugin id | `ctoc@davidbijl` (enabled in `~/.claude/settings.json`) |
| Install path | your `ctoc/ctoc` checkout (`installed_plugins.json` → `installPath`) |
| Branch | `main` |
| `origin` remote | `github.com/davidbijl/ctoc` — your fork |
| `upstream` remote | `github.com/robotijn/ctoc` — the original |

> [!NOTE]
> The host (`~/projects/ctoc/ctoc`) and the sandbox (`/projects/ctoc/ctoc`) are
> the **same files** (bind mount + symmetric ACLs) — one checkout, shared. A
> `git pull`/`merge` run on either side is immediately on disk for both; only
> *running* sessions need a reload (§4).

Because the install path **is** a normal checkout you edit, updating is just
git in that directory followed by a reload. There are three distinct things
people mean by "update CTOC" — pick the one you need.

> [!IMPORTANT]
> A `git pull` alone changes nothing in a session already running. Plugin code
> is loaded once at Claude Code startup. You must start a **fresh session**
> (and, in the Docker sandbox, **restart the container**) for changes to take
> effect — see [§4 Make it take effect](#4-make-it-take-effect).

---

## 1. Pick up your own edits to the plugin

You edited files in the checkout and want the change live. There is nothing to
download — the install path is the checkout you edited. Just reload (§4). Commit
when you're happy (branch, never straight onto `main`):

```bash
cd ~/projects/ctoc/ctoc        # or /projects/ctoc/ctoc in the sandbox — same files
git checkout -b my-change
git add -A && git commit -m "…"
git push origin my-change
```

## 2. Pull the latest from your fork (routine update)

Changes were pushed to your fork (`davidbijl/ctoc`) from elsewhere and you want
them here.

```bash
cd ~/projects/ctoc/ctoc
git fetch origin
git status                     # confirm: clean tree, on main
git pull --ff-only origin main
```

If `status` is **not** clean, stash or commit first. Then reload (§4).

## 3. Sync new features from upstream (robotijn/ctoc)

Pull new work from the **original** project into your fork.

> [!NOTE]
> As of the **2026-10-21 re-fork**, your `main` was re-based onto robotijn's
> history, so the fork now **shares a common ancestor** with `upstream/main`.
> That means this is a **normal 3-way merge** — no more "unrelated histories"
> problem. (Before that date the fork had no shared ancestor and a clean merge
> was impossible; that is fixed now.) Still do it deliberately, not as a reflex,
> and expect ordinary conflicts where your reintroduced customizations overlap
> robotijn's changes.

```bash
cd ~/projects/ctoc/ctoc
git fetch upstream
# how far ahead/behind you are ("<your-commits>  <their-commits>"):
git rev-list --left-right --count origin/main...upstream/main

git checkout -b sync-upstream     # do the merge on a branch, not main
git merge upstream/main           # resolve conflicts here
# get it building/green, then open a PR into main (don't push the merge straight to main)
git push origin sync-upstream
```

## 4. Make it take effect

A pull changes files on disk only. To actually run the new code:

1. **Start a fresh Claude Code session.** Plugins load at startup; a running
   session keeps the old code until you restart it.

2. **In the Docker sandbox, restart the container.** The sandbox loads the
   plugin from the shared `ctoc/ctoc` checkout; a *running* container keeps the
   code it started with, so pick up on-disk changes with:

   ```bash
   docker restart ctoc-sandbox
   ```

   > [!WARNING]
   > `docker restart ctoc-sandbox` tears down the tmux sessions for **every**
   > project in the sandbox, not just this one. Make sure no other project has
   > unsaved in-terminal work before you restart.

---

## The `/plugin` menu updater — know what it does

The `/plugin` menu (and "Enable auto-update") updates a git marketplace by
running `git pull` against **`origin`** (your fork) inside the install path.
That means:

- It pulls **your fork's** `main` — it does **not** fetch `upstream`
  (robotijn). For upstream features you still need §3 by hand.
- It runs `git pull` in the **same checkout you edit by hand**. Safe when the
  tree is clean; if you have uncommitted local edits there, the pull can
  conflict — commit or stash first (§1).

For this fork, prefer the explicit git commands above over auto-update, so the
pull target (fork vs. upstream) and the state of your working tree are always
something you chose on purpose.

## Related

- Top-level `README.md` → **Install** — the generic marketplace install (the
  upstream-facing instructions, not this fork's layout).
