---
description: Update CTOC to the latest version
disable-model-invocation: true
---

Update CTOC by fast-forwarding its in-place fork checkout:

```bash
node "${CLAUDE_PLUGIN_ROOT}/src/commands/update.js" 2>&1 || echo "[CTOC] Update failed — see the output above. CTOC is installed in place from its git checkout (installPath in ~/.claude/plugins/installed_plugins.json); you can update it manually with: git -C <installPath> pull --ff-only origin main"
```

This fast-forwards your CTOC fork's checkout from its own `origin` (your fork) — it never touches the `upstream` (robotijn/ctoc) remote, since syncing upstream is a separate, human-gated review workflow. It is **fast-forward-only**, so it can never force-reset, merge, or clobber local commits or in-flight work in the checkout (the checkout is where the plugin is developed).

After updating, start a new Claude Code session (or restart a running one) to use the new version — the plugin loads in place, so no reinstall is needed.
