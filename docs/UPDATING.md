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
| Install path | `/projects/ctoc/ctoc` (`installed_plugins.json` → `installPath`) |
| Branch | `main` |
| `origin` remote | `github.com/davidbijl/ctoc` — your fork |
| `upstream` remote | `github.com/robotijn/ctoc` — the original |

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

You edited files under `/projects/ctoc/ctoc` and want the change live.

There is nothing to download — the install path is the checkout you edited.
Just reload (§4). Commit when you're happy:

```bash
git -C /projects/ctoc/ctoc checkout -b my-change    # don't work on main
git -C /projects/ctoc/ctoc add -A
git -C /projects/ctoc/ctoc commit -m "…"
git -C /projects/ctoc/ctoc push origin my-change
```

## 2. Pull the latest from your fork (routine update)

Changes were pushed to your fork (`davidbijl/ctoc`) from somewhere else and you
want them here.

```bash
git -C /projects/ctoc/ctoc fetch origin
git -C /projects/ctoc/ctoc status          # confirm: clean tree, on main
git -C /projects/ctoc/ctoc pull origin main
```

If `status` is **not** clean, stash or commit your local edits first — a pull
onto a dirty tree can conflict. Then reload (§4).

## 3. Sync new features from upstream (robotijn/ctoc)

You want new work from the **original** project merged into your fork. This is
**not** a routine update — the fork has diverged substantially from upstream,
so expect a real merge with conflicts. Do it deliberately, not as a reflex.

```bash
git -C /projects/ctoc/ctoc fetch upstream
git -C /projects/ctoc/ctoc checkout main
git -C /projects/ctoc/ctoc merge upstream/main     # resolve conflicts here
git -C /projects/ctoc/ctoc push origin main        # save the merge to your fork
```

Check how far behind you are before starting:

```bash
git -C /projects/ctoc/ctoc fetch upstream
# prints "<ahead>  <behind>" of origin/main vs upstream/main:
git -C /projects/ctoc/ctoc rev-list --left-right --count origin/main...upstream/main
```

> [!TIP]
> If the merge gets messy, do it on a branch (`git checkout -b sync-upstream`
> before the merge), get it building, then open a PR into your `main` instead
> of pushing the merge straight to `main`.

## 4. Make it take effect

A pull changes files on disk only. To actually run the new code:

1. **Start a fresh Claude Code session.** Plugins load at startup; a running
   session keeps the old code until you restart it.

2. **In the Docker sandbox, restart the container.** The container bind-mounts
   `~/.claude/plugins/cache` and `~/.claude/plugins/marketplaces` from the
   host, so it only sees host-side plugin changes after a container restart:

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
running `git pull` against **`origin`** (your fork) inside the install path
`/projects/ctoc/ctoc`. That means:

- It pulls **your fork's** `main` — it does **not** fetch `upstream`
  (robotijn). For upstream features you still need §3 by hand.
- It runs `git pull` in the **same checkout you edit by hand**. It's safe when
  the tree is clean, but if you have uncommitted local edits there, let the
  menu pull can conflict. Commit or stash first (§1).

For this fork, prefer the explicit git commands above over auto-update, so the
pull target (fork vs. upstream) and the state of your working tree are always
something you chose on purpose.

## Related

- [`CONFIG_SOURCES.md`](CONFIG_SOURCES.md) — which config file each layer reads.
- Top-level `README.md` → **Install** — the generic marketplace install (the
  upstream-facing instructions, not this fork's layout).
