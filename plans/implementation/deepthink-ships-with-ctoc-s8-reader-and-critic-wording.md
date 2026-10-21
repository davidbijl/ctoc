---
title: "Deepthink's skill and reading agent say what Claude Code really gives the agent and what the skill's tools line does, and the critic agents cite the 2026 edition of the prompt-injection ranking and Meta's rule as Meta states it"
type: implementation
parent_plan: deepthink-ships-with-ctoc
depends_on: deepthink-ships-with-ctoc-s6-paper-program
priority: medium
effort: medium
files:
  # Part A — deepthink's skill and its reading agent.
  - skills/deepthink/SKILL.md
  - agents/ai-quality/deepthink-researcher.md
  - tests/deepthink-ships-with-ctoc.test.js
  - .ctoc/audit/deepthink-improvement/skills/deepthink/SKILL.md.json
  # Part B — the critic agents' citations. One identifier per place in most of these;
  # gate-critic (B1) and agent-critic (B3) also get Meta's rule as Meta states it.
  - agents/iron-loop/gate-critic.md
  - agents/ai-quality/citation-validator.md
  - agents/pipeline/agent-critic.md
  - agents/iron-loop/premortem-critic.md
  - agents/iron-loop/advocate-critic.md
  - agents/iron-loop/devils-advocate-critic.md
  - agents/iron-loop/red-team-critic.md
  # The advocate agent's reference copy, which must state the same rules as the agent, and
  # the template new watcher agents are written from: the same claim, the same drift.
  - skills/iron-loop/advocate-lens/SKILL.md
  - .ctoc/templates/watcher.md
---

# Deepthink's skill and reading agent say what Claude Code really gives the agent and what the skill's tools line does, and the critic agents cite the 2026 edition of the prompt-injection ranking and Meta's rule as Meta states it

**Scope (one line):** Part A — five wording answers for deepthink (the tools line, the report-handback tool, the reading agent's two passages, the long-run line only under a quality decision, the waiting budget of three seconds to the first visible result); Part B — the critic agents' two citation answers (the 2026 edition; Meta's three properties, in gate-critic and in agent-critic). The build runs Part A to a recorded green run before Part B starts.

Read first: the parent index; the owner list `.ctoc/audit/deepthink-improvement/for-the-human.json`, the entries named below; slice 5's "The agent file" and its checks 3, 17 and 18; slice 6's "The record".

## Implementation Details

### Why this slice exists — the owner's answers it carries

| Subject | Owner-list entry | Answer | Part |
|---|---|---|---|
| The skill's `tools:` line looks like a limit and limits nothing | `h-deepthink-r1-tools-key-unread` | `keep-and-say` | A |
| In auto mode Claude Code also gives the reading agent the report-handback tool, so "WebSearch and WebFetch and no other tool" is not literally true | `h-deepthink-r3-report-handback-tool` | `amend-pins` | A |
| The reading agent's fetch-failure rule and its paper address disagree with the brief | `h-deepthink-r3-researcher-file-wording` | `align-agent` | A |
| The quotation of the owner's obvious-choice ruling | `h-deepthink-r2-obvious-choice-quotation` | `keep` — no change, as the owner kept the fragment when he chose to cut the private note down | — |
| Meta's Rule of Two is paraphrased without "change state" or "within a session" | `h-deepthink-r1-rule-of-two-paraphrase` | `quote-meta` — in gate-critic, and in agent-critic by the CTO Chief session's decision of 2026-10-05 | B |
| `LLM01:2025` reads as the current ranking after the 2026 edition was published | `h-deepthink-r1-owasp-edition` | `move-to-2026` | B |
| The "Best quality in the long run" line appears under owner decisions too | `h-deepthink-r1-long-run-line-on-owner-decisions` | `quality-only` — option (a), answered 2026-10-05: the line appears only under a decision that has an objectively best answer; under a decision that belongs to the owner (schedule, scope, risk, proceed or hold), no option is named | A |
| The brief's date is the universal-time day | `h-deepthink-r1-which-calendar-day` | `unlabelled` — option (c), answered 2026-10-05: leave as is; the date command stays unchanged; no work item | — |
| An option between three seconds and a minute is in or out of the waiting budget at the reading agent's choice | `h-deepthink-r2-waiting-budget-threshold` | `three-seconds` — option (a), the recommended option, answered 2026-10-05: "Three seconds to the first visible result." A longer job is allowed only if it shows its first visible result within three seconds and keeps showing progress | A |

Every owner-list entry this slice carries is now answered; none is still being asked.

### Why one slice in two parts

Both parts are wording in agent and skill files, and Part B's edits are mostly one identifier per place. A crash must not lose both, so Part A ends in a recorded green run, and the record names where the build stopped.

## Part A — deepthink's skill and its reading agent

Record the fingerprints of `skills/deepthink/SKILL.md` and `agents/ai-quality/deepthink-researcher.md` first. Every target is found by its text, exactly once.

**A1. The skill's tools line, said (`keep-and-say`).** In `skills/deepthink/SKILL.md`, after the paragraph that ends `(never a numbered pipeline moment in text a person reads).`, add a blank line and this paragraph:

```
The `tools:` line at the top of this file records the tools a run of this skill uses, naming the launch tool by its older name, Task, which Claude Code still accepts; it limits nothing, because Claude Code reads no `tools:` field in a skill and ignores a field it does not recognize.
```

The frontmatter line itself does not change here (slice 9 adds the resume tool to it, and the sentence stays true).

**A2. The report-handback tool, in the skill (`amend-pins`).** In "Who does what", replace these two lines:

```
  The reading agent holds WebSearch and WebFetch and no other tool: it cannot read a local file, write a file, run a command or launch an agent.
  In auto mode, from Claude Code 2.1.271 on, Claude Code also gives it, whatever its tools line says, one more tool, which hands its final report to the session.
```

with this one line:

```
  The reading agent holds WebSearch and WebFetch and no other tool except `SubagentHandback`, which Claude Code adds in auto mode from version 2.1.271 on, whatever the agent's tools line says, and which only hands the agent's final report to the session: it cannot read a local file, write a file, run a command or launch an agent.
```

**A3. The report-handback tool, in the agent.** In `agents/ai-quality/deepthink-researcher.md`, replace the description's sentence

```
It holds WebSearch and WebFetch and nothing else, so it cannot read a local file, write a file, run a command or launch an agent.
```

with

```
It holds WebSearch and WebFetch, and in auto mode the SubagentHandback tool that Claude Code adds to hand back its final report, and nothing else, so it cannot read a local file, write a file, run a command or launch an agent.
```

(no colon followed by a space and no `---`, so the frontmatter still parses as check 17 and the watcher fence read it); and replace the body line

```
I hold WebSearch and WebFetch and nothing else: I cannot read a local file, write a file, run a command or launch an agent.
```

with

```
I hold WebSearch and WebFetch and nothing else except `SubagentHandback`, which Claude Code adds in auto mode from version 2.1.271 on and which only hands my final report to the session: I cannot read a local file, write a file, run a command or launch an agent.
```

The `tools: WebSearch, WebFetch` line does not change: the tool is added by Claude Code, not declared, so check 3 and the watcher fence's exact-tools rule hold as they are.

**A4. The fetch-failure rule matches the brief (`align-agent`).** In "When I Cannot Read", replace the paragraph from `I degrade loudly, never silently.` through `everything I tried worked; it never means that I did not try.` with:

```
I degrade loudly, never silently.
WebFetch usually gives me a model's answer about a page rather than the page itself; its answer about the source I asked for counts as reading that source, and I say when a quotation came through that answer rather than from the page's own text.
Before I report that a page does not say something, I ask again with a narrower question.
A search that returns nothing useful, a fetch that fails, times out or is blocked, a fetch whose answer is an error, a sign-in or consent page, or a page that is not the source I asked for, and a paper whose text I could not reach are each named under Failures with the address and the error as I saw it.
I never describe a source I did not read. An empty Failures section means that
everything I tried worked; it never means that I did not try.
```

**A5. The paper's address is its file's address (`align-agent`).** In "What I Report", replace

```
I cite (title, authors, year, its `https` address, why it was read, a topic folder name
```

with

```
I cite (title, authors, year, the `https` address of the paper's file itself, the one its own page offers for download, or the page's address when no page I opened offers the file, why it was read, a topic folder name
```

The next line, which begins `and a file name without its`, stays on a line of its own and unchanged, because check 18 pins it.

**A7. The long-run line only under a quality decision (`quality-only`).** In `skills/deepthink/SKILL.md`, three edits, each target found by its text, exactly once.

1. "The recommendation rule". Replace `it is an owner decision. Where the evidence separates the options` with `it is an owner decision. Under a quality decision, where the evidence separates the options`.
2. "The recommendation rule". Replace ``<why>`. A measured fact`` with the text below, so the new sentence sits between the no-clear-answer line and the sentence on testing effort:

```
<why>`. Under an owner decision (what to build and when, what is in or out of scope, how much risk to accept, proceed or hold) there is no long-run line, and nothing in the question names one option as the better one: not a Recommended cell, not the explanation paragraph and not a line under the matrix (the owner, 5 October 2026). A measured fact
```

3. "The shape of the result, by kind", the decision-question bullet. Replace `the recommendation rule's long-run line and a Sources line` with `the recommendation rule's long-run line when the decision is a quality decision, and a Sources line`.

The section's first sentence (the split between quality and owner decisions, pinned by check 7) is not touched; the new sentence names the owner's four kinds of decision in its own parenthesis.

**The brief text pasted to the reading agent.** The brief already pastes the section "The recommendation rule" word for word, so the reading agent receives edits 1 and 2 with no further change. The brief's own numbered instruction on the result's shape gains one line, so the rule is in the reading agent's instructions as well as in the pasted section. Directly after the brief line `>    "Failures" section last when anything failed.`, add:

```
>    Under an owner decision, write no "Best quality in the long run" line and name no option as the better one anywhere in the question, as the recommendation rule (below) says.
```

**A8. The waiting budget is three seconds to the first visible result (`three-seconds`).** The owner answered on 2026-10-05, option (a): "Three seconds to the first visible result." The limit is three seconds from a person's action to the first visible result; a longer job is allowed only if it shows its first visible result within three seconds and keeps showing progress. In `skills/deepthink/SKILL.md`, section `## The person's waiting budget, for algorithmic questions (Tijn, 12 September 2026)`, two edits, each target found by its text, exactly once. The heading does not change, because the brief pastes the section by that name.

1. The first bullet. Replace `or marked "not yet measured; to measure on the project" when there is none.` with:

```
or marked "not yet measured; to measure on the project" when there is none. An option whose job runs longer than three seconds also states whether it keeps showing progress until it ends, from the same kinds of source, or is marked the same way.
```

2. The second bullet. Replace the three lines from `- The owner's budget: a person can wait a second or two or three for a search or an answer to start,` through `  only multi-agent systems may take that long, and a search-only build is not one.` with these two bullets, each on one line of its own:

```
- The owner's budget (the owner, 5 October 2026): three seconds from the person's action to the first visible result. An option whose first visible result comes more than three seconds after the person's action is out for the build in hand, whatever its quality.
- A job that runs longer than three seconds is inside the budget only when it shows its first visible result within three seconds of the person's action and keeps showing progress until it ends. A job that runs a minute or more is, in addition, for multi-agent systems only (the owner, 12 September 2026), and a search-only build is not one.
```

The third bullet, `"Best quality in the long run" is chosen among the options that stay inside the budget.`, does not change; it now reads against the three-second budget.

**The brief text for A8.** The brief already pastes the section "The person's waiting budget, for algorithmic questions (Tijn, 12 September 2026)" word for word, so the reading agent receives both edits with no further change. As for A7, the brief's own numbered instruction on the result's shape gains one line, so the rule is in the reading agent's instructions as well as in the pasted section. Directly after the line A7 adds (`>    Under an owner decision, write no "Best quality in the long run" line …`), add:

```
>    In an algorithmic question, an option is inside the person's waiting budget only when its first visible result comes within three seconds of the person's action, and a job that runs longer stays inside only when it also keeps showing progress until it ends, as the person's waiting budget (below) says.
```

**A6. The record.** Append to `after_the_rounds` in `.ctoc/audit/deepthink-improvement/skills/deepthink/SKILL.md.json` one entry, in the shape slice 6 fixes: `plan` `deepthink-ships-with-ctoc-s8-reader-and-critic-wording`; `answers` `h-deepthink-r1-tools-key-unread` / `keep-and-say`, `h-deepthink-r3-report-handback-tool` / `amend-pins`, `h-deepthink-r1-long-run-line-on-owner-decisions` / `quality-only` and `h-deepthink-r2-waiting-budget-threshold` / `three-seconds`; `fingerprint_before` the last entry's `fingerprint_after`; `fingerprint_after` the skill after A1, A2, A7 and A8. The calendar-day answer changes nothing in the skill, so it is not among `answers`.

### Part A checks (`tests/deepthink-ships-with-ctoc.test.js`)

Pins changed, each with its justification:

- **`READER_TOOLS_SENTENCE`** (check 3) becomes the new line of A2, without its two leading spaces; and **the first line of `AGENT_RULE_LINES`** (check 18) becomes the new body line of A3. Contract from outside the test: Claude Code's tools reference (read raw 2026-10-02), "Where the conditions in the SubagentHandback tools-table entry hold, Claude Code also gives the subagent that tool, even if you leave it out of tools or list it in disallowedTools", and the owner's answer `amend-pins`. Why the test and not the code: the pinned words were false in auto mode, and no code can make them true; the agent's grant is Claude Code's. What newly fails: a sentence that says WebSearch and WebFetch are the only tools in every mode.
- **Check 3** also asserts that the skill no longer contains `one more tool, which hands its final report to the session`, so the fact is stated once.

Pins added:

- **Check 2:** the paragraph of A1, as `TOOLS_LINE_SENTENCE`.
- **Check 18:** the two full lines of A4 that begin `WebFetch usually gives me` and `A search that returns nothing useful`, each on a line of its own; and the phrase from A5 that begins `` the `https` address of the paper's file itself `` and ends `offers for download`.
- **Check 7 (the recommendation rule is CTOC's):** three new constants, each required word for word — `OWNER_DECISION_NO_LONG_RUN_SENTENCE`, the sentence A7's edit 2 adds, from `Under an owner decision (what to build and when` through `(the owner, 5 October 2026).`; `QUALITY_ONLY_LONG_RUN_PHRASE`, `Under a quality decision, where the evidence separates the options`; and `BRIEF_OWNER_LONG_RUN_LINE`, the brief line A7 adds, without its leading `>` and spaces. Check 7 also asserts the skill no longer contains `it is an owner decision. Where the evidence separates the options` (the unconditioned wording) and contains `long-run line when the decision is a quality decision`. Contract from outside the test: the owner's answer `quality-only` of 2026-10-05, and the decision-question format's rule that an owner decision carries no recommendation and no preference smuggled in. Why the test: nothing pinned that the line was limited to quality decisions. What newly fails: a skill or a brief that puts the long-run line, or any named better option, under an owner decision. The existing assertions of check 7 are unchanged.
- **Check 7, the waiting budget (A8).** The long-run line is chosen among the options inside the budget, so the budget's rule belongs to the same check. Five new constants, one further presence and one absence, each matched word for word:
  - `WAITING_BUDGET_SENTENCE`: `The owner's budget (the owner, 5 October 2026): three seconds from the person's action to the first visible result.`
  - `WAITING_BUDGET_OUT_SENTENCE`: `An option whose first visible result comes more than three seconds after the person's action is out for the build in hand, whatever its quality.`
  - `LONGER_JOB_SENTENCE`: `A job that runs longer than three seconds is inside the budget only when it shows its first visible result within three seconds of the person's action and keeps showing progress until it ends.`
  - `PROGRESS_LATENCY_SENTENCE`: `An option whose job runs longer than three seconds also states whether it keeps showing progress until it ends, from the same kinds of source, or is marked the same way.`
  - `BRIEF_WAITING_BUDGET_LINE`: the brief line A8 adds, without its leading `>` and spaces.
  - The first four must lie inside the section the test reads with the file's own `sectionByHeading` from the line `## The person's waiting budget, for algorithmic questions (Tijn, 12 September 2026)`, so a sentence moved out of the pasted section fails; the fifth anywhere in the skill. The skill must still contain `"The shape of the result, by kind", "The recommendation rule" and "The person's waiting budget, for algorithmic questions (Tijn, 12 September 2026)"`, the paste instruction that carries the rule to the reading agent. And the skill must no longer contain `a person can wait a second or two or three for a search or an answer to start`, the wording that left an option between three seconds and a minute to the reading agent's choice.

  Contract from outside the test: the owner's answer of 2026-10-05, option (a), "Three seconds to the first visible result", with the condition that a longer job shows its first visible result within three seconds and keeps showing progress. Why the test: nothing pinned the budget at all, and its old words gave no number every reading agent applies the same way. What newly fails: a skill or brief with no three-second limit, a longer limit, a longer job allowed without both its first visible result in three seconds and its progress shown, the rule moved out of the section the brief pastes, or the paste instruction dropping the section. The existing assertions of check 7 are unchanged.

## Part B — the critic agents' citations

### B1. Meta's rule as Meta states it (`quote-meta`) — `agents/iron-loop/gate-critic.md`

**The source, read during the build.** The build executor holds no web tool, so the session dispatches `citation-validator` to read https://ai.meta.com/blog/practical-ai-agent-security/ and return the page's own words for: the three properties, the phrase "within a session", the sentence on what an agent that needs all three requires, and the date. The read is recorded in the execution record. Verified already, in the owner list (read 2026-10-02): "no more than two of the following three properties within a session … [C] … change state or communicate externally", and the date 31 October 2025. Every other quoted phrase below is a draft, **believed, not verified**, and is replaced by the page's own words wherever they differ.

**The grounding paragraph.** Replace the paragraph that begins `Grounding: the OWASP GenAI Security Project ranks Prompt Injection as **LLM01:2025**` with:

```
Grounding: the OWASP GenAI Security Project ranks Prompt Injection as **LLM01:2026**, the number-one risk for applications built on large language models. The rules above apply the **spotlighting** and **instruction hierarchy** defense families, and Meta's **Agents Rule of Two** (https://ai.meta.com/blog/practical-ai-agent-security/, 31 October 2025): an agent should satisfy no more than two of three properties within a session — [A] it can process untrustworthy inputs, [B] it can have access to sensitive systems or private data, [C] it can change state or communicate externally — and an agent that needs all three should not operate autonomously and needs supervision, by a person's approval or another reliable means of validation. By that wording you hold all three: plan text and lens payloads you cannot trust, Read and Grep over the project's files, and a Write tool that changes state. So you run supervised, as rule 6 describes: your one write lands in a quarantine that a separate process validates before anything reaches a person, and every question you write is answered by a person before the plan it concerns can cross.
```

**Rule 6, made consistent.** In trust-boundary rule 6, replace this text:

```
Your `tools: Read, Grep, Write` line is a load-bearing control — per Meta's Rule of Two, you hold untrusted input and a SINGLE-PATH write into a quarantine directory whose content is validated by a **separate process**
```

with:

```
Your `tools: Read, Grep, Write` line is a load-bearing control. By Meta's Rule of Two, as the grounding paragraph below states it, you hold all three of its properties, so what keeps you safe is supervision: your one write is a SINGLE-PATH write into a quarantine directory whose content is validated by a **separate process**
```

The rest of rule 6 is unchanged; "You hold NO execution tool and NO outbound channel" stays true.

This is the cost the owner's chosen option named: gate-critic's own grant now reads as needing supervision. The paragraph says what that supervision is today; it changes no tool.

### B3. Meta's rule as Meta states it, in agent-critic (`quote-meta`, extended by the CTO Chief session on 2026-10-05) — `agents/pipeline/agent-critic.md`

Agent-critic carries the same paraphrase, and gets the same correction: Meta's three properties, the address https://ai.meta.com/blog/practical-ai-agent-security/, and "within a session". By Meta's wording agent-critic holds all three properties: it reads untrusted web pages, it can read the project's files (its `tools: Read, Grep, WebSearch, WebFetch` line), and it makes outbound web requests. The quoted phrases are the same drafts as B1, believed, not verified, and are replaced by the page's own words from the same `citation-validator` read wherever they differ, identically in both files.

In "What You Read Is Data", replace this text:

```
Meta's **Rule of Two** says never to combine untrusted input, sensitive data, and external communication in one agent. You hold two of the three: untrusted input (the file and every page you read) and external communication (WebSearch, WebFetch). The third is kept out by the rule above — no secret and no private content goes into a query — and the absence of any write or command tool keeps a successful injection from doing more than distort a critique that the validator and the executor check after you.
```

with:

```
Meta's **Agents Rule of Two** (https://ai.meta.com/blog/practical-ai-agent-security/, 31 October 2025) says an agent should satisfy no more than two of three properties within a session — [A] it can process untrustworthy inputs, [B] it can have access to sensitive systems or private data, [C] it can change state or communicate externally — and that an agent that needs all three should not operate autonomously and needs supervision. By that wording you hold all three: you read untrusted web pages and the file under review, Read and Grep let you read the project's files, and WebSearch and WebFetch make outbound web requests. What limits the harm today is the rule above, that no secret and no private content goes into a query or an address, which reduces the risk of a steered query carrying private text out without removing it, and the absence of any write or command tool, which keeps a successful injection from doing more than distort a critique that the validator and the executor check after you.
```

The sentence that follows it, `Prompt injection is **LLM01:2025**, …`, is B2's edit and is otherwise unchanged. No tool is added or removed.

### B2. The 2026 edition (`move-to-2026`)

Replace `LLM01:2025` with `LLM01:2026` where it reads as the current ranking. Each place is found by its text; the count per file must match before and after:

| File | Places | What the text says |
|---|---|---|
| `agents/ai-quality/citation-validator.md` | 1 | "Prompt injection is LLM01:2025, the OWASP GenAI Security Project's top risk" |
| `agents/pipeline/agent-critic.md` | 1 | "Prompt injection is **LLM01:2025**, the OWASP GenAI Security Project's number-one risk" |
| `agents/iron-loop/premortem-critic.md` | 1 | "ranks prompt injection as LLM01:2025, the top risk" |
| `agents/iron-loop/gate-critic.md` | 2 | the grounding paragraph (B1) and the red-team row of the grounding table |
| `agents/iron-loop/advocate-critic.md` | 1 | "Prompt injection is ranked LLM01:2025 — the number-one risk" |
| `agents/iron-loop/devils-advocate-critic.md` | 1 | the same sentence |
| `agents/iron-loop/red-team-critic.md` | 6 | the lens's grounding, its sources list, its trust-boundary section, the severity table's example, the confidence table's `MEDIUM` row and the worked example's `claim` |
| `skills/iron-loop/advocate-lens/SKILL.md` | 1 | the sentence the advocate agent carries, in its reference copy |
| `.ctoc/templates/watcher.md` | 1 | "Prompt injection is LLM01:2025, the OWASP GenAI Security Project's top risk" |

**Not changed: the five places in `agents/ai-quality/llm-security-tester.md`.** None reads as the current ranking. That file tags each finding "with the 2025 identifier the skill's category headings use", says "This file keeps 2025 as the primary tag because the skill's method is written against it", gives the 2026 identifiers beside them by name, and quotes sentences from the 2025 entry under its 2025 identifier, noting that the 2026 entry "contains neither of the two 2025 sentences check 1 quotes". Moving those five to 2026 would attribute 2025 quotations to the 2026 entry and point at a skill heading that does not exist. `skills/ai-quality/llm-security-tester/SKILL.md` follows the same rule and is not changed either.

**One sentence checked against the 2026 entry.** `premortem-critic.md` says the ranking's "root cause it names is exactly the commingling of trusted instructions and untrusted data in one input channel". The session's `citation-validator` dispatch also reads the 2026 entry (`https://raw.githubusercontent.com/GenAI-Security-Project/GenAI-LLM-Top10/main/2026/final/LLM01_PromptInjection.md`) for that root cause. If the entry names it, the sentence stays; if not, "it names" becomes "the prompt-injection literature names", as the advocate and devil's-advocate agents already put it.

### Part B check — check 35 (`tests/deepthink-ships-with-ctoc.test.js`)

**35. The critic agents cite the current edition and Meta's rule as Meta states it.** Exact presence checks on the files' text:

1. Each of the nine files in B2's table contains `LLM01:2026` and does not contain `LLM01:2025`.
2. `agents/iron-loop/gate-critic.md` contains `https://ai.meta.com/blog/practical-ai-agent-security/`, `within a session` and `change state or communicate externally`, and contains neither `never combine untrusted input, sensitive data, and external communication in one agent` nor `you hold untrusted input and a SINGLE-PATH write`.
3. `agents/pipeline/agent-critic.md` contains `https://ai.meta.com/blog/practical-ai-agent-security/`, `within a session`, `change state or communicate externally` and `By that wording you hold all three`, and contains neither `never to combine untrusted input, sensitive data, and external communication in one agent` nor `You hold two of the three`.

The check's comment says why `llm-security-tester.md` and its skill are not in the list.

### The runs to record, in order

1. **With the Part A checks written, before any edit:** `node --test tests/deepthink-ships-with-ctoc.test.js`. Expected to fail: checks 2, 3, 7 and 18 on the new pins, check 7 among them on each of the five waiting-budget constants and on the old "a second or two or three" wording still present. Recorded.
2. **Part A complete, record entry written:** every check but 35 passes; run the Part A list under "Tests that must stay green" and record it. A crash after this point resumes at Part B.
3. **With check 35 written, before any Part B edit:** check 35 fails on every file. Recorded.
4. **The `citation-validator` read recorded, Part B complete:** everything passes.

### Tests that must stay green

Part A: `tests/deepthink-ships-with-ctoc.test.js`, `tests/watcher-shape.test.js`, `tests/agent-contract-load.test.js`, `tests/agent-model-floor.test.js`, `tests/agent-honest-status-fence.test.js`, `tests/unexecutable-instruction-fence.test.js`, `tests/plugin-skill-discovery.test.js`, `tests/gate-numbers-fence.test.js`, `tests/instruction-surfaces-say-the-moment.test.js`. Part B adds: `tests/citation-validator.test.js`, `tests/attestation-round-trip.test.js`, `tests/answers-bind-to-plan-revision.test.js`, `tests/architecture-invariants.test.js`, `tests/agent-and-skill-improvement-record.test.js`, `tests/corpus-audit-ledger.test.js`, `tests/cu5-wrapper-coverage-completeness.test.js`. Then `npm test`.

### Wiring — the live call sites

No code is added. The skill reaches the session through `/ctoc:deepthink`; the reading agent is launched by the skill's step 4; the critic agents are dispatched by the session-start directive and the streaming gate flow, unchanged; the template is read by `tests/watcher-shape.test.js` and by whoever writes the next watcher agent.

### Security review

- **The reading agent's grant is unchanged and still checked exactly**; the skill and the agent now state the one tool Claude Code adds in auto mode, which only delivers the report.
- **Gate-critic's text now says it holds all three of Meta's properties** and names the supervision that applies today; no tool is added or removed. A reader is no longer told the agent is inside the rule when, by the rule's own wording, it is not.
- **Agent-critic's text now says the same of itself**: it reads untrusted web pages, can read the project's files and makes outbound web requests, so by Meta's wording it holds all three. Its text names what limits the harm today and says that the query rule reduces the risk without removing it; no tool is added or removed.
- **An owner decision no longer carries a named better option** in a researched question, in the skill or in the brief the reading agent receives.
- **The waiting budget is one number every reading agent applies the same way**: three seconds from the person's action to the first visible result, and a longer job only with that first result and progress shown until it ends. A job that grinds with nothing on screen is out, whatever its quality.
- **No quotation is moved to an entry it was not read in**: the five `llm-security-tester` places stay on their 2025 identifiers for that reason.
- **The Meta wording is verified at the source during the build**, through `citation-validator`, before the pins are final.
- No secret, account path or e-mail address enters any file.

### Acceptance criteria

- The skill says its `tools:` line records the tools used and limits nothing (check 2; `keep-and-say`).
- The skill's and the agent's pinned sentences, and the agent's description, name `SubagentHandback` and are true in every mode (checks 3 and 18; `amend-pins`).
- The agent's fetch-failure rule and paper address match the brief (check 18; `align-agent`).
- The long-run line appears only under a quality decision, and an owner decision names no option as the better one, in the skill and in the brief's own instructions (check 7; `quality-only`).
- The waiting budget is three seconds from the person's action to the first visible result, and a longer job is inside it only when it shows its first visible result within three seconds and keeps showing progress until it ends, in the pasted section and in the brief's own instructions (check 7; `three-seconds`).
- Gate-critic states Meta's three properties, "within a session", the address and how it is supervised (check 35; `quote-meta`).
- Agent-critic states Meta's three properties, "within a session" and the address, and says plainly that by Meta's wording it holds all three (check 35; the CTO Chief session's decision of 2026-10-05).
- Every place that reads `LLM01:2025` as the current ranking reads `LLM01:2026` (check 35; `move-to-2026`).
- The record accounts for the skill's new fingerprint (check 24).
- **Re-closes** parent scenario 18 in the wording the owner's answer gives it.

### The owner's answers that close the last open entries

**Answered, no work item — `h-deepthink-r1-which-calendar-day`: the brief's date is the universal-time day.** The owner answered on 2026-10-05: option (c), `unlabelled`, leave as is. Step 5's date command (`node -e "console.log(new Date().toISOString().slice(0, 10))"`) and the brief's header line stay unchanged; nothing in this slice edits them, no check changes, and the record gains no answer for it.

**Answered, built as A8 — `h-deepthink-r2-waiting-budget-threshold`: an option between three seconds and a minute was in or out of the waiting budget at the reading agent's choice.** The owner answered on 2026-10-05, option (a), the recommended option `three-seconds`: "Three seconds to the first visible result." The limit is three seconds from a person's action to the first visible result; a longer job is allowed only if it shows its first visible result within three seconds and keeps showing progress. The options the owner was shown were `three-seconds` (recommended, because it is the only one that turns the owner's own words, "a second or two or three", into a number every reading agent applies the same way), `under-a-minute` (anything under a minute is inside, with its time stated) and `keep` (the words as they are). The skill wording, the brief line and the check are A8, A6 and check 7 above.

### Found while planning, outside these answers — for the owner

`agents/pipeline/agent-critic.md` carried the same paraphrase of Meta's rule and said it holds two of the three properties. The CTO Chief session decided on 2026-10-05 that it gets the same correction, which B3 carries. By Meta's wording it holds all three properties: it reads untrusted web pages, it can read the project's files, and it makes outbound web requests.

**Still open for the owner — what supervision agent-critic should run under.** B3 states the exposure and changes no tool. Options: `query-approval` (a person approves each search and fetch agent-critic makes, through Claude Code's permission prompt, kept on for this agent), `drop-file-read` (agent-critic loses Read and Grep and receives the file under review pasted into its brief, as deepthink's reading agent does, so it holds two of the three properties) and `as-stated` (no change beyond B3's wording). **Recommended: `drop-file-read`**, the best-quality option, because it is the only one that puts agent-critic inside Meta's rule by construction rather than by a person's attention, following the design the owner already chose for deepthink's reading agent; its cost is a change to how agent-critic is dispatched and to its tests, through its own approved plan.

### Neighbouring plans (technical facts; the order is the owner's)

- **The improvement run's slices** for the critic fleet and the advocate skill (`00370-…-s110-gate-critic-and-lenses`), for `citation-validator` (`00375-…-s115-citation-validator`) and for `agent-critic` (`00379-…`) edit the same files. They are never built at the same time as this slice; whichever runs later starts from the file as it then is, and its rounds research the same two citations.
- **Slices 6, 7 and 9** also write the plan's test file; slices 6 and 9 also write the skill and the record. This slice names slice 6 in `depends_on` because it appends to the `after_the_rounds` list slice 6 introduces.

## Decisions Taken Under Ambiguity

1. **One slice in two parts, with a recorded green run between them**, following slice 5's pattern, because Part B is mostly one identifier per place.
2. **The handback tool is named by its name, `SubagentHandback`**, in the skill and the agent, and in the agent's description without backticks, as the owner's answer asks; its version, 2.1.271, is the one the tools reference states.
3. **The old second sentence about the handback tool is folded into the pinned one**, so the fact is stated once.
4. **"Meant as the current ranking" decides each place**, as the owner list's evidence says ("it is drift only where it reads as the current ranking"). The five `llm-security-tester` places are edition-tagged identifiers and 2025 quotations by that file's own written rule, so they stay.
5. **Two files beyond the eight agent files are changed**: `skills/iron-loop/advocate-lens/SKILL.md` and `.ctoc/templates/watcher.md` carry the identical current-ranking sentence. The owner's chosen option reads "Change every reference"; the advocate skill must state the same rules as its agent, and the template seeds every new watcher. Settled on the wider reading by the CTO Chief session on 2026-10-05 (decision 10).
6. **Meta's wording is drafted here and verified at the source during the build**, because the build's executor holds no web tool; only the phrases the owner list already verified are pinned before that read.
7. **Gate-critic's supervision is described as it is today**, a quarantine a separate process validates and a person who answers every question, not a new mechanism.
8. **Agent-critic's own Rule of Two exposure is corrected in its wording** (B3), replacing the planner's earlier choice to report it only; see decision 11.
9. **Check number 35 belongs to this slice.**
10. **The CTO Chief session, 2026-10-05: the move to the 2026 edition also covers `skills/iron-loop/advocate-lens/SKILL.md` and `.ctoc/templates/watcher.md`.** It leaves the five 2025 identifiers in `agents/ai-quality/llm-security-tester.md` unchanged, because they tag word-for-word 2025 quotations.
11. **The CTO Chief session, 2026-10-05: `agents/pipeline/agent-critic.md` is in the files and the work.** Its Meta Rule of Two paraphrase gets the same correction as gate-critic's: Meta's three properties, the address https://ai.meta.com/blog/practical-ai-agent-security/, and "within a session" (B3). The plan states plainly that by Meta's wording agent-critic holds all three properties: it reads untrusted web pages, it can read the project's files, and it makes outbound web requests.
12. **The CTO Chief session, 2026-10-05: parent scenario 20 now reads "the last entry of `after_the_rounds`, or else round 3's fingerprint, equals the skill on disk".** This slice's record entry (A6) is such a last entry.
13. **The long-run answer `quality-only` (2026-10-05) is written as a sentence of its own in "The recommendation rule"**, naming the owner's four kinds of decision in plain words, rather than by rewording the pinned sentence that splits quality decisions from owner decisions, so check 7's existing pin stands. The brief's own instruction gains one line as well as the pasted section, because the reading agent follows its numbered instructions most directly.
14. **The calendar-day answer (option (c), 2026-10-05) is recorded with no work item and no record entry**, because it changes no byte of the skill and check 24's `answers` lists only answers whose edit changed the skill.
15. **The open owner question on agent-critic's supervision lists three options written for this plan, not taken from the owner list**, and names one recommended option, as the owner's rule of 2026-10-05 asks of every owner question left in these plans.
16. **The owner's answer (2), 2026-10-05, option (a):** "Three seconds to the first visible result." The limit is three seconds from a person's action to the first visible result; a longer job is allowed only if it shows its first visible result within three seconds and keeps showing progress. Built as A8, recorded in A6, checked in check 7.
17. **The 12 September 2026 rule that only multi-agent systems may run for a minute or more is kept**, as a further condition on a long job: the owner's new answer sets the limit to the first visible result and adds the progress condition, and says nothing to lift the earlier rule, so both apply.
18. **"Keeps showing progress" carries no interval number.** The owner gave none, and inventing one would put words in the owner's mouth; the wording keeps the owner's own phrase, "keeps showing progress until it ends".
19. **The waiting-budget pins sit in check 7, not a new check**, because the long-run line is chosen among the options inside the budget, and a new check number could collide with the numbers slices 6, 7 and 9 add to the same file.
20. **The heading of the waiting-budget section does not change**: the brief pastes the section by its heading, and the check pins the paste instruction, so a renamed heading would silently stop the rule from reaching the reading agent.

## Execution Plan (Steps 8-16)

### Step 8: TEST (TDD Red)
- [ ] Write tests for the implementation — Part A's changed and added pins first; check 35 before Part B
- [ ] Test error conditions — the old handback sentence must be gone; the old Meta paraphrase must be gone
- [ ] Run tests - expect RED (failing) — runs 1 and 3 above, recorded with the reason for each failure

### Step 9: PREPARE
- [ ] Install dependencies if needed — none
- [ ] Check prerequisites — record the fingerprints of every file in `files:`; count `LLM01:2025` in each, to compare after
- [ ] Verify dev environment ready — record the Node version
- [ ] Create directories/config if needed — none

### Step 10: IMPLEMENT
- [ ] Implement the feature according to requirements — Part A (A1 to A5, A7, A8, then A6) to run 2; then the `citation-validator` read of Meta's page and the 2026 entry, recorded; then Part B (B1, B2, B3) to run 4
- [ ] Add error handling — not applicable: wording
- [ ] Wire up integration points — none new

### Step 11: REVIEW
- [ ] Self-review all new code — through CTOC's review agent
- [ ] Verify integration points work together — the skill's and the agent's sentences agree with the brief and with each other
- [ ] Check error handling completeness — not applicable

### Step 12: OPTIMIZE
- [ ] Remove redundant operations — the handback fact stated once
- [ ] Optimize critical paths — not applicable
- [ ] Simplify complex code — not applicable

### Step 13: SECURE
- [ ] Validate inputs (no path traversal) — through CTOC's security scan agent: the reading agent's grant, gate-critic's stated exposure and supervision
- [ ] Sanitize outputs — not applicable
- [ ] No secrets in code — none
- [ ] Safe file operations — not applicable

### Step 14: VERIFY
- [ ] Run lint + type check — `npm run lint` and `npm run typecheck`, both exit status 0
- [ ] Run ALL tests (TDD Green) — `npm test`
- [ ] Check coverage >= 80% — at or above the floor read from `.ctoc/coverage-baseline.json`
- [ ] 0 skipped, 0 flaky tests — none

### Step 15: DOCUMENT
- [ ] Update relevant documentation — the agent and skill files are the documentation
- [ ] Add JSDoc comments to new functions — none added
- [ ] Update CHANGELOG if needed — no changelog file exists in the repository

### Step 16: FINAL-REVIEW
- [ ] Verify steps 8-15 completed correctly — through CTOC's final review agent
- [ ] All quality checks passed — `npm test` on the final bytes
- [ ] Manual verification if needed — the source reads recorded
- [ ] Ready for human review — through the menu's task completion
