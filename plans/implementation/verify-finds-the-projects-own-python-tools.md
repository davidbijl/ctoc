---
title: "VERIFY finds a Python project's own tools in its virtual environment"
type: functional
created: 2026-10-22
priority: medium
effort: small
depends_on: none
files:
  - src/lib/step-13-verify.js
  - tests/step-13-verify.test.js
approved_by: human
approved_at: 2026-10-22T12:40:54.201Z
gate_crossed: functional → implementation
---

# VERIFY finds a Python project's own tools in its virtual environment

## Problem Statement
Step 14 VERIFY decides whether lint, types and tests apply by running `ruff --version`,
`mypy --version` and `pytest --version` on the shell `PATH` (`toolExists`,
`src/lib/step-13-verify.js`). A Python project that keeps those tools in its own `.venv`
(uv, venv) has none of them on `PATH` unless the venv is activated, so every check is
marked not-applicable and nothing runs. The fail-closed rule then records
`no-verifiable-toolchain` and the plan reaches review with a FAILED evidence file, even
though ruff, mypy and pytest are installed in the project and pass.

Seen 2026-10-22 in crypto-strategy-machine: the slice
`...tp-sl-wick-distribution-notebook-s1-wick-density` completed with
`passed: false, method: fallback-direct`, while `.venv/bin` held `ruff`, `mypy` and `pytest`
and the builder's own runs of all three passed. Gate 3 refuses such a plan, so the owner
has to fix the environment by hand on every session.

## Desired Outcome
VERIFY runs a Python project's lint, type and test checks with no manual step, whether or
not a venv is active and whoever started the session.

- The tool lookup also looks in `<project>/.venv/bin` and `<project>/venv/bin` before
  giving up.
- The commands that VERIFY then runs get that directory first on `PATH`, so `ruff check .`,
  `mypy .` and `pytest` resolve to the project's own versions.
- A project without a venv behaves exactly as today.

## Acceptance Criteria
- Given a pyproject project whose `ruff`, `mypy` and `pytest` exist only in `.venv/bin`
  and not on `PATH`, when VERIFY runs, then lint, types and tests are applicable and RAN.
- Given the same project with a failing test, VERIFY reports `passed: false` with the
  test failure, not `no-verifiable-toolchain`.
- Given a pyproject project with no venv and no tools on `PATH`, VERIFY still reports
  `no-verifiable-toolchain` (the fail-closed rule is unchanged).
- Given tools on `PATH` and no venv, behaviour is unchanged.
- The venv directory is only ever prepended to the `PATH` of the checks' child process;
  CTOC's own process environment is not modified.

## Out of Scope
- Declaring an entry point (`general.entry_point.command`) for the app-launch last mile.
- Other ecosystems (Node, Go, Cargo) and non-venv layouts (poetry, conda, pipx).

## Risks
- A venv holding a broken or wrong-version tool would now be used instead of a working
  global one; the project's own tool is the right one to prefer, but it is a change in
  which binary runs.

## Slices (dependency-ordered)

| # | Slice file | Scope (one line) | depends_on |
|---|------------|------------------|------------|
| 1 | `verify-finds-the-projects-own-python-tools-s1-venv-tools-first-on-path.md` | When a pyproject project has a `.venv` or `venv` tool folder (`bin`, or `Scripts` on Windows), VERIFY's tool probe and its lint, type and test commands all run with that folder first on a copied PATH. CTOC's own environment is untouched, the record names the folder, and a project without one runs exactly as before. | - |

One slice. The change is one module and its own test file, and the lookup and the PATH
handling cannot land separately: a tool found in `.venv/bin` and then run on a PATH that does
not hold it would fail to start.
