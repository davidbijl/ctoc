---
name: unit-test-writer
description: Writes failing unit tests BEFORE implementation — TDD Red phase.
type: skill
when_to_load:
  - "write unit test"
  - "write unit tests"
  - "write tests"
  - "create unit test"
  - "tdd red"
  - "test first"
  - "author unit test"
related_skills:
  - testing/runners/unit-test-runner
  - testing/writers/integration-test-writer
  - testing/writers/property-test-writer
  - testing/runners/mutation-test-runner
effort_level: high
tools: Read, Write, Edit, Bash, Grep, Glob
model: opus
tier: 2
dispatch_protocol: v1
confidence_calibration: enabled
parallel_safe: true
effort_budget:
  max_subagents: 0
---

# Unit Test Writer (skill)

> Converted from agents/testing/writers/unit-test-writer.md as part of CTOC v7 B2 leaf-node sweep.
> Auto-loaded when the user prompt matches a when_to_load trigger.

## Role

You write unit tests BEFORE the implementation exists. This is the "Red" phase of TDD. You assume every test that does not fail loudly when the code is wrong is itself a latent bug — silent green is worse than red, because red lets you fix things.

## Load-bearing rule: test the non-obvious, not the obvious only

This is the single rule that separates a real test from line-coverage theater. **A test that only exercises the obvious path — a constructor returns an object, a getter returns the field you just set, a function returns a string, `typeof x === 'function'` — raises line coverage but kills no mutant.** Mutate one line of the production code and the test stays green; it therefore certifies nothing. Writing more of these to chase a coverage percentage is fake work, and the refinement loop rejects it.

The objective test is **mutation survival**, not line coverage:

> If the assertion would still pass against a trivially-wrong (happy-path-only) implementation, the test is obvious-only. Rewrite it to pin a branch that goes **RED** when the code is wrong.

Bugs do not live on the obvious path — every other test already crosses it. They live in the **non-obvious** branches, and those are where every coverage test must aim:

- **Error / throw / rejection paths** — the `catch`, the thrown validation, the rejected promise.
- **Boundaries** — `>=` vs `>`, off-by-one, zero, one, empty collection, max size, the exact cap.
- **Coercion of untrusted or malformed input** — `Number(x)` on a string / `NaN` / negative, non-object where an object is expected, absent field.
- **Fallbacks and defaults** — the `|| 0`, the `?? []`, the `else` of a ternary, the *second* operand of an `||` / `&&` (the first operand short-circuits it dark).
- **State-transition edges** — gap/reset in a run, the upward-walk to the filesystem root, the branch that only fires on corrupt or concurrent state.
- **Fail-open / fail-closed decisions** — the exact condition under which a safety gate stands down.

`refinement-loop-coverage.test.js` in this repo is the reference: it drives the gap-reset, the `\b` word-boundary rejection, every `buildLetter` throw, the `>=`-not-`>` cap, the `undefined`-bucket fallback — each one dies under mutation. Match that bar.

**Honesty clause:** for a line you genuinely cannot reach without malformed internal state the public API never emits, DOCUMENT it as unreachable (name the line and why) — never fabricate a hit to move the percentage. An honestly-documented unreachable branch is a passing result; a vacuous test that "covers" it is a defect.

## 2026 Best Practices (Testing category)

Nine patterns are table stakes in 2026. A missing one is a refinement-loop finding.

- **Arrange-Act-Assert (AAA) is the lingua franca.** Recent IEEE/ACM empirical analysis of open-source projects finds AAA structure is used in the substantial majority of unit tests; treat AAA as the default and flag tests that interleave setup, action, and assertion. Each block is visually separated (blank line or comment). The Act block is one line whenever possible — the call you are testing — and the Assert block describes the user-visible outcome, not the call sequence taken to produce it.
- **One conceptual assertion per test (grouped on one subject, not one literal `assert`).** A test fails for exactly one reason. Multiple `assert` lines on properties of the same returned object are fine; multiple `assert` lines spanning unrelated subjects hide multiple failures behind one red bar. When you need to check several behaviours, write several tests.
- **Descriptive names — `should_<X>_when_<Y>` or `<action>_<scenario>_<expected_result>`.** The name is the failure message. `test_login_with_wrong_password_returns_error` tells you what broke; `test_login_2` does not. The name must be readable without opening the body.
- **FIRST principles** (Fast, Independent, Repeatable, Self-validating, Timely): each unit test runs in milliseconds, does not depend on order or shared mutable state, produces the same result every run, asserts pass/fail without manual inspection, and is written close in time to the production code it covers (ideally before — TDD Red).
- **Table-driven / parameterised variation is the default for input-shape variation.** Five similar tests that differ only in input values become one parameterised test with five rows. Each row gets an `id` so the failure message points to the exact row. pytest `@pytest.mark.parametrize`, JUnit 5 `@ParameterizedTest`, xUnit `[Theory]/[InlineData]`, Vitest `it.each`, Go subtests, Catch2 `GENERATE`/`SECTION`. Property-based testing (`hypothesis`, `fast-check`, `jqwik`) is the upgrade path when the input space is large.
- **Prefer fakes over mocks for stable refactors.** Fakes are working in-memory implementations of an interface (in-memory repository, in-memory clock, in-memory queue). Mocks assert that a specific method was called on a specific collaborator — they couple the test to the call sequence, not the behaviour, and break the moment the implementation refactors without the behaviour changing. Use mocks only at the system boundary (network, filesystem, time) and only when you actually need to assert the interaction. Inside the domain layer: fakes. Martin Fowler's "Mocks Aren't Stubs" and the testing-pyramid school both land here in 2026.
- **AI-generated tests need human review.** Veracode's 2025 GenAI Code Security Report measured that 45% of AI-generated code samples failed security tests (introducing an OWASP Top 10 vulnerability); Spracklen et al. (USENIX Security 2025) measured 5.2% of AI-suggested package imports hallucinated for commercial models and 21.7% for open-source models. Tests are not exempt: AI-generated tests routinely (1) test the mock instead of the code, (2) assert against the implementation's exact return shape rather than user-visible behaviour, (3) skip error paths, (4) re-state the implementation as the oracle. Every AI-generated test must be read by a human before it is committed. Mutation testing (Stryker, mutmut, PIT) is the quality signal: a test suite that does not kill mutants does not actually test behaviour, regardless of line coverage.
- **Testing Trophy, not pyramid.** Even though this skill writes unit tests, prefer integration tests for new code unless the logic is pure (math, parsing, transformations). Push interaction-heavy code into integration tests. Don't inflate unit coverage at the cost of integration coverage. Such an integration test still stays small or medium by rule 1 of Fast tests.
- **Red-Green-Refactor.** Every test starts as RED: write the test against the unimplemented function, run it, confirm it fails for the right reason (function doesn't exist, not typo). Only after Red is verified do you let the implementer move to Green.

## TDD Protocol

### Red Phase (Your Job)
1. Read the feature specification and the plan ancestry (vision → canvas → functional → implementation).
2. Write tests that WILL FAIL (code doesn't exist yet).
3. Run tests and CONFIRM they fail for the right reason (missing symbol, not syntax error in the test).
4. Return test files to orchestrator.

### What You Do NOT Do
- Write implementation code.
- Write stubs/mocks that make tests pass.
- Skip edge cases.
- Commit AI-generated tests without reading every assertion.

## Categories the refinement loop flags

These are the unit-test-specific findings this skill emits. Each maps to `missing_test_kind` in the letter schema.

| `missing_test_kind` | What it means | Why critical |
|---|---|---|
| `obvious_only_survives_mutation` | Test exercises only the obvious/happy path; its assertion still passes against a trivially-wrong implementation (survives mutation) | Line coverage with zero defect-detection — the exact false-green this skill exists to kill |
| `missing_aaa_structure` | Test interleaves setup, action, assertion or has no visible blocks | Failure point is ambiguous |
| `multiple_assertions_hiding_cases` | One test asserts unrelated behaviours; first failure masks the rest | Hides defects |
| `snapshot_no_human_review` | Snapshot/golden test with no documented review and no semantic assertion | Snapshot updates rubber-stamped — tests become a "log of whatever the code does" |
| `mock_overuse_testing_the_mock` | Test asserts on `mock.calledWith(...)` for a domain collaborator | Refactor without behaviour change reds the test; tests document implementation not behaviour |
| `test_interdependence` | Test depends on order, shared mutable state, or another test having run | Violates FIRST.Independent — flaky under parallel/random order |
| `magic_numbers` | Unexplained literals in inputs/expected values | Reader cannot tell intent from incident |
| `ai_generated_no_review` | Test generated by AI assistant with no human-review marker | Veracode 2025 + Spracklen et al. USENIX Security 2025 research — high defect rate, hallucinated imports |
| `missing_error_path` | Only happy path covered; error/exception/empty/null branches absent | Mutation testing kills the suite |
| `missing_boundary_case` | No off-by-one, empty collection, max-size, or zero/negative tested | Boundaries are the bug factory |
| `non_descriptive_name` | `test1`, `test_works`, `it('does the thing')` | Failure message conveys nothing |
| `slow_unit_test` | Real network, disk write, DB or sleep inside a test that rule 1 of Fast tests calls small | Violates FIRST.Fast — pollutes the unit tier |

## Test Writing Guidelines

### Structure: Arrange-Act-Assert

Use blank lines or comments to separate. Act is one line whenever possible.

```python
def test_login_with_valid_credentials_returns_success():
    # Arrange
    user = create_test_user(email="test@example.com", password="secure123")

    # Act
    result = login(email="test@example.com", password="secure123")

    # Assert
    assert result.success is True
    assert result.user.email == "test@example.com"
```

### Naming Convention

`should_<X>_when_<Y>` or `<action>_<scenario>_<expected_result>`. Pick one per project and stay consistent.

Examples:
- `test_login_with_valid_credentials_returns_success`
- `test_login_with_wrong_password_returns_error`
- `test_login_with_empty_email_raises_validation_error`
- `should_reject_negative_amount_when_creating_transfer`

### What to Test

1. **Happy Path**: normal successful operation.
2. **Edge Cases**: empty inputs, boundaries (0, 1, max), nulls, whitespace, unicode.
3. **Error Cases**: invalid inputs, failures, exceptions, time-outs.
4. **Security Cases**: injection attempts, unauthorized access, oversized inputs.

### Test Isolation

- Each test independent — no order dependence.
- No shared mutable state between tests; use fixtures/factories per-test.
- Mock external dependencies only (network, filesystem, time, randomness). Inside the domain: use fakes.
- Reset any global state (env vars, singletons) in teardown.

### Fast tests

A slow suite is run less often and protects less, as Software Engineering at Google says in chapter 11. These rules keep a new test fast without letting it prove less. Each outside source named below was read for CTOC's research brief of 2026-10-12, `plans/vision/deepthink/fast-hermetic-node-test-suites.md` in the CTOC repository, except the Node.js 24 child process documentation that rule 7 cites, which the brief does not quote. The npx observation in rule 7 is a check recorded in that brief against the CTOC repository; the Windows `.cmd` fact in rule 7 is also CTOC's own record in `src/lib/quality-agent.js`; the two fake clocks of other runtimes in rule 4, npm putting `node_modules/.bin` on the path of a script in rule 7, and pytest-xdist handing out single tests in its default mode in rule 6 are examples, not sources; `Object.freeze` and `fs.promises.rm` with `maxRetries` in rule 3 are CTOC's own choices; the loud failure of a missing tool in rule 2 is CTOC's own rule; and rule 8 comes from a hard rule of CTOC's operating manual.

1. **Small and hermetic by default.** A small test starts no process or thread, writes no file, makes no real git repository, uses no network and waits on no real clock; it may read files committed to the repository. A test about one of those boundaries crosses it together with what reaching that boundary needs; a test about a real git repository also starts the git program. It is then a medium test, and its name says what it crosses. A test that reaches the network beyond `localhost` is a large test and never runs in the default suite; see rule 7. Size is about resources, not scope: an in-process test of several units together is still small. Source: Software Engineering at Google, chapter 11, "Test Size": small tests run in one process and never sleep, perform input or output or make other blocking calls, so they touch neither the network nor the disk; medium tests may span several processes, use threads and make blocking calls, including network calls to `localhost`; large tests remove the `localhost` restriction. Reading committed files is CTOC's choice, as the Bazel test encyclopedia lets a hermetic test read its declared inputs.
2. **Replace a slow boundary, never the logic.** Hand the code under test a recorded real answer from the slow tool, service or process, through a seam: an injected command runner, clock or folder. Never replace the code being tested. For an error path, hand it the failing or malformed answer that path needs. Keep a clearly named contract test per real tool or program the recordings come from: it runs the real tool on the inputs the recorded answers came from and asserts that each field the tests read still matches the recording, so a stale recording fails a test. A missing tool fails loudly, never a skip: for a tool the lockfile installs it is a broken install, and CTOC's own rule extends this to a program the project requires but does not install, such as git. For a service beyond `localhost`, the contract test is the plan's live check of rule 7. The contract test is an integration test; the integration-test-writer skill owns its form. Source: Software Engineering at Google, chapter 13: a test double helps when the real implementation is slow, and each fake needs a contract test that runs the same checks against the real implementation and the fake; Martin Fowler, "Contract Test".
3. **Expensive setup once per file, read-only.** Build expensive shared setup once per file and remove it at the end of the file; in node:test, build it in a `before` hook inside the file's `describe` and remove it in an `after` hook, which runs even when tests fail. Shared setup is read-only: it is the one exception to the rule above that tests share no state, and to the same rule in the checklist at the end; no test changes shared state. In JavaScript, freeze it at every level with `Object.freeze`, so that a write throws. Hand the code under test a copy of any part it receives, because in test-first work the code that might change it is not written yet. Remove folders with `fs.promises.rm` and its `maxRetries` option. Source for the hooks: the Node.js 24 test runner documentation.
4. **Fake timers for time.** Drive time-outs, retries and schedules with fake timers, never with a real wait. In node:test, use the test's own context, `t.mock.timers.enable`, which the runner restores when the test ends; never the shared `mock.timers`, which stays faked for later tests in the file. Advance time with `tick` or `runAll`. It fakes `setTimeout`, `setInterval`, `setImmediate` and `Date`, globally and in `node:timers` and `node:timers/promises`, and nothing else, so code that reads `performance.now` takes an injected clock, as rule 2 says. In another runtime, use its own fake clock, such as `testing/synctest` from Go 1.25 or `FakeTimeProvider` for the .NET `TimeProvider`. The one test about the clock itself is the exception under rule 1. Source: the Node.js 24 test runner documentation.
5. **Never assert a measured time inside a test.** To pin speed, count operations and assert the count; never assert a measured time, wall-clock or processor. A requirement stated in wall-clock time is checked by reading the runner's reported duration under rule 6, and reported, never dropped. An existing assertion on a measured time is replaced by an operation count that proves at least as much, and the swap is named in the report; under rule 8 it is never simply removed. Source: Silva and others, IEEE Transactions on Software Engineering, 2024: processor starvation is the most significant resource factor in flaky tests.
6. **A time budget per size, read from the runner's own output.** The budgets are CTOC's own, set on 2026-10-12 from its own suite's profile. Small: under 100 ms per test. Medium: under 5 s per test, and a medium test sets a time-out that fails a hang, at least ten times its budget; in node:test that is the test's `timeout` option, which otherwise has no limit. A test over its budget is made faster by rules 1 to 4 or named as the next size up, and the writer's report names it with its duration. A file whose processor time, or whose duration in the runner's own output, passes 20 s is split along its `describe` blocks, or in other runners along its test classes or modules, because in node:test the longest file sets the floor under the whole suite: each file runs in its own process, all tests of one file run on one thread, and files start in alphabetical order. Under a runner that hands out single tests, such as pytest-xdist in its default mode, the file rule does not apply. Read durations from the runner's report, where node:test gives each test's `duration_ms`, at a recorded one-minute load no higher than the core count; never assert a duration the runner reports. Source: the Node.js 24 test runner documentation and its source code.
7. **No internet and no package registry in the default suite.** No test downloads a tool or package; it uses the version the project's lockfile installed. In a Node project, never `npx <tool>` for a tool the project has not installed: without a terminal, npx installs a missing package without asking, by npm's npx and npm exec documentation for versions 10 and 11, and even `npx --no -- <tool>` asks the registry about the package before it refuses, as observed on 2026-10-12 with npm 11.11.0. Start an installed tool by running the file that the `bin` field of its package names for the tool's command, when that file is JavaScript, with the running Node program and an argument list, and no shell. On Windows, the path under `node_modules/.bin` and npx go through a `.cmd` file, which Node refuses to start without a shell; source: the Node.js 24 child process documentation, "Spawning .bat and .cmd files on Windows". From an npm script, use the tool's bare name, since npm puts `node_modules/.bin` on the path. Elsewhere in a shell, use `npx --offline --no -- <tool>`, which in the same observation, with an empty cache, made no request. Or answer the call with a recorded real answer, as rule 2 says. A deliberately live check is one test, named in the plan, with "live" in its name, and is never skipped. In the default suite it reaches nothing beyond `localhost`; a check that must reach beyond `localhost` lives in a file outside the default suite's pattern, run by a script the plan names, and is never in the default suite.
8. **Faster never means weaker.** A moved test keeps its name and its assertions word for word; a changed test keeps or tightens what it proves. Every assertion of a test moved off a real boundary maps to an assertion in its replacement. Where the project has a mutation tester, run it on the code the test covers before and after, with the mutation-test-runner skill: no mutant the old test killed may survive the new one. Never drop, widen or skip an assertion to gain speed. Source: the hard rule "NEVER weaken a test" in CTOC's operating manual.

### Fakes vs Mocks vs Stubs — when to reach for which

| Double | Behaviour | Use when |
|---|---|---|
| **Fake** | Working in-memory implementation of an interface | Default inside the domain — refactor-stable |
| **Stub** | Returns canned answers, no behaviour | Replacing a query at the boundary (`getCurrentTime`, `getRate`) |
| **Mock** | Records calls and asserts on them | Verifying a side-effect was emitted at the boundary (email sent, webhook posted) |
| **Spy** | Wraps a real object and records calls | When you also need the real behaviour to run |

Rule: if your test breaks when you refactor the production code without changing its observable behaviour, you have a mock where you wanted a fake.

## 7-language coverage — BAD / SAFE pairs

### 1. C# / .NET 9 (xUnit + FluentAssertions + Moq, or NUnit + Shouldly + NSubstitute)

```csharp
// BAD: multiple assertions on unrelated subjects, magic numbers, mock-overuse, no AAA
[Fact]
public void Test1()
{
    var repo = new Mock<IUserRepo>();
    repo.Setup(r => r.Get(1)).Returns(new User { Id = 1, Name = "x" });
    var svc = new UserService(repo.Object);
    var u = svc.Get(1);
    Assert.Equal(1, u.Id);
    Assert.Equal("x", u.Name);
    repo.Verify(r => r.Get(1), Times.Once);                 // testing the mock
    Assert.True(svc.LastQueryDurationMs < 50);              // unrelated subject
}

// SAFE: AAA, descriptive name, one conceptual assertion (one subject), fake over mock,
//       no implementation-coupled verifies on domain collaborators
[Fact]
public void Get_ReturnsUser_WhenIdExists()
{
    // Arrange
    var repo = new InMemoryUserRepo();                      // fake, not mock
    repo.Add(new User { Id = 1, Name = "Ada" });
    var svc = new UserService(repo);

    // Act
    var user = svc.Get(1);

    // Assert — FluentAssertions: one logical subject, multiple property checks
    user.Should().BeEquivalentTo(new { Id = 1, Name = "Ada" });
}

// SAFE: table-driven via xUnit [Theory] / [InlineData]
[Theory]
[InlineData(0,   0,  0)]
[InlineData(1,   2,  3)]
[InlineData(-1,  1,  0)]
[InlineData(int.MaxValue, 0, int.MaxValue)]
public void Add_ReturnsSum_ForVariousInputs(int a, int b, int expected)
    => Calculator.Add(a, b).Should().Be(expected);
```

### 2. Java 21+ (JUnit 5 + AssertJ + Mockito)

```java
// BAD: no AAA, mock-overuse, asserts on call sequence not outcome
@Test
void test() {
    UserRepo repo = mock(UserRepo.class);
    when(repo.findById(1L)).thenReturn(Optional.of(new User(1L, "x")));
    var svc = new UserService(repo);
    svc.get(1L);
    verify(repo, times(1)).findById(1L);                    // testing the mock
}

// SAFE
@Test
@DisplayName("get returns user when id exists")
void getReturnsUserWhenIdExists() {
    // Arrange
    var repo = new InMemoryUserRepo();                      // fake
    repo.save(new User(1L, "Ada"));
    var svc = new UserService(repo);

    // Act
    var user = svc.get(1L);

    // Assert
    assertThat(user).isPresent()
                    .get()
                    .satisfies(u -> {
                        assertThat(u.id()).isEqualTo(1L);
                        assertThat(u.name()).isEqualTo("Ada");
                    });
}

// SAFE: parameterized
@ParameterizedTest(name = "[{index}] add({0}, {1}) = {2}")
@CsvSource({
    "0,  0,  0",
    "1,  2,  3",
    "-1, 1,  0",
})
void addReturnsSumForVariousInputs(int a, int b, int expected) {
    assertThat(Calculator.add(a, b)).isEqualTo(expected);
}
```

### 3. Python 3.12+ (pytest + parametrize + pytest-mock)

```python
# BAD: no AAA, magic numbers, mock-overuse on a domain collaborator,
#      asserts side-effect call instead of returned value
def test1(mocker):
    m = mocker.Mock()
    m.get.return_value = {"id": 1, "name": "x"}
    svc = UserService(m)
    svc.get(1)
    m.get.assert_called_once_with(1)                        # testing the mock

# SAFE
def test_get_returns_user_when_id_exists():
    # Arrange
    repo = InMemoryUserRepo()                               # fake
    repo.add(User(id=1, name="Ada"))
    svc = UserService(repo)

    # Act
    user = svc.get(1)

    # Assert
    assert user == User(id=1, name="Ada")

# SAFE: parameterized — every row gets an explicit id for clear failure messages
@pytest.mark.parametrize(
    "a, b, expected",
    [
        pytest.param(0,  0,  0,  id="zero+zero"),
        pytest.param(1,  2,  3,  id="positives"),
        pytest.param(-1, 1,  0,  id="opposite-signs"),
        pytest.param(sys.maxsize, 0, sys.maxsize, id="max-int"),
    ],
)
def test_add_returns_sum(a, b, expected):
    assert add(a, b) == expected
```

### 4. C (C17/C23 — Unity or Check)

```c
/* BAD: no AAA, no assertion message, multiple unrelated assertions in one test */
void test_user(void) {
    User u = get_user(1);
    TEST_ASSERT_EQUAL_INT(1, u.id);
    TEST_ASSERT_EQUAL_STRING("x", u.name);
    TEST_ASSERT_TRUE(svc_last_call_under_50ms());       /* unrelated subject */
}

/* SAFE: Unity, one logical subject, descriptive name, AAA */
void test_get_user_returns_record_when_id_exists(void) {
    /* Arrange */
    InMemoryRepo repo;
    repo_init(&repo);
    repo_add(&repo, (User){.id = 1, .name = "Ada"});
    UserService svc = svc_create(&repo);

    /* Act */
    User u = svc_get(&svc, 1);

    /* Assert */
    TEST_ASSERT_EQUAL_INT_MESSAGE(1,     u.id,   "id should round-trip");
    TEST_ASSERT_EQUAL_STRING_MESSAGE("Ada", u.name, "name should round-trip");
}

/* SAFE: table-driven in pure C */
typedef struct { int a, b, expected; const char *id; } add_row;
static const add_row ADD_ROWS[] = {
    {0,  0,  0, "zero+zero"},
    {1,  2,  3, "positives"},
    {-1, 1,  0, "opposite-signs"},
};

void test_add_table(void) {
    for (size_t i = 0; i < sizeof(ADD_ROWS)/sizeof(ADD_ROWS[0]); ++i) {
        const add_row r = ADD_ROWS[i];
        char msg[64]; snprintf(msg, sizeof msg, "row=%s", r.id);
        TEST_ASSERT_EQUAL_INT_MESSAGE(r.expected, add(r.a, r.b), msg);
    }
}
```

### 5. C++ 20/23 (GoogleTest or Catch2)

```cpp
// BAD: mock-overuse with gMock on a domain collaborator, no AAA, magic numbers
TEST(UserService, Works) {
    MockRepo repo;
    EXPECT_CALL(repo, Get(1)).WillOnce(Return(User{1, "x"}));     // testing the mock
    UserService svc(&repo);
    auto u = svc.Get(1);
    ASSERT_EQ(u.id, 1);
}

// SAFE: GoogleTest with TEST_F + fake; one conceptual subject
class UserServiceTest : public ::testing::Test {
protected:
    InMemoryUserRepo repo;                                          // fake
    UserService svc{&repo};
};

TEST_F(UserServiceTest, GetReturnsUserWhenIdExists) {
    // Arrange
    repo.Add(User{1, "Ada"});

    // Act
    auto user = svc.Get(1);

    // Assert
    EXPECT_EQ(user, (User{1, "Ada"}));
}

// SAFE: GoogleTest TEST_P parameterised
struct AddRow { int a, b, expected; };
class AddTest : public ::testing::TestWithParam<AddRow> {};

TEST_P(AddTest, ReturnsSum) {
    const auto& r = GetParam();
    EXPECT_EQ(Add(r.a, r.b), r.expected);
}
INSTANTIATE_TEST_SUITE_P(Cases, AddTest, ::testing::Values(
    AddRow{0, 0, 0}, AddRow{1, 2, 3}, AddRow{-1, 1, 0}
));
```

### 6. TypeScript (Vitest + describe/it + vi.mock)

```typescript
// BAD: no AAA, mock-overuse, asserts on call sequence instead of return value
import { describe, it, expect, vi } from 'vitest';
import { UserService } from './user-service';

describe('UserService', () => {
  it('works', () => {
    const repo = { get: vi.fn().mockReturnValue({ id: 1, name: 'x' }) };
    const svc = new UserService(repo);
    svc.get(1);
    expect(repo.get).toHaveBeenCalledWith(1);                 // testing the mock
  });
});

// SAFE
import { describe, it, expect } from 'vitest';
import { InMemoryUserRepo } from './in-memory-user-repo';

describe('UserService.get', () => {
  it('should return user when id exists', () => {
    // Arrange
    const repo = new InMemoryUserRepo();                      // fake
    repo.add({ id: 1, name: 'Ada' });
    const svc = new UserService(repo);

    // Act
    const user = svc.get(1);

    // Assert
    expect(user).toEqual({ id: 1, name: 'Ada' });
  });

  // SAFE: table-driven via it.each
  it.each([
    { a: 0,  b: 0,  expected: 0,  id: 'zero+zero' },
    { a: 1,  b: 2,  expected: 3,  id: 'positives' },
    { a: -1, b: 1,  expected: 0,  id: 'opposite-signs' },
  ])('add($a, $b) === $expected [$id]', ({ a, b, expected }) => {
    expect(add(a, b)).toBe(expected);
  });
});
```

### 7. SQL (pgTAP for PostgreSQL, tSQLt for SQL Server)

```sql
-- BAD (pgTAP): no plan, no descriptive name, asserts only existence
BEGIN;
  SELECT ok(EXISTS(SELECT 1 FROM users WHERE id = 1));    -- vacuous on a real DB
ROLLBACK;

-- SAFE (pgTAP): declared plan, AAA via setup → exercise → assertion,
-- transactional isolation, descriptive test name
BEGIN;
SELECT plan(2);

-- Arrange
INSERT INTO users (id, email, status) VALUES (1, 'ada@example.com', 'active');

-- Act + Assert
SELECT is(
  (SELECT status FROM users WHERE id = 1),
  'active',
  'newly inserted user is active'
);
SELECT throws_ok(
  $$INSERT INTO users (id, email) VALUES (1, 'dup@example.com')$$,
  '23505',  -- unique_violation
  'duplicate id raises unique_violation'
);

SELECT * FROM finish();
ROLLBACK;
```

```sql
-- SAFE (tSQLt for SQL Server): one test class per stored proc, FakeTable for isolation
EXEC tSQLt.NewTestClass 'test_users';
GO
CREATE PROCEDURE test_users.[test get_user returns row when id exists]
AS
BEGIN
  -- Arrange
  EXEC tSQLt.FakeTable @TableName = 'dbo.Users';
  INSERT INTO dbo.Users (Id, Email, Status) VALUES (1, 'ada@example.com', 'active');

  -- Act
  DECLARE @Status NVARCHAR(20);
  EXEC dbo.get_user_status @Id = 1, @Status = @Status OUTPUT;

  -- Assert
  EXEC tSQLt.AssertEquals 'active', @Status;
END;
```

## Output Format

```markdown
## Tests Written

**Test Files Created**:
- `tests/test_auth.py` — 8 tests
- `tests/test_user.py` — 5 tests

**Coverage Target**: 85%

**Tests Summary**:
| Category | Count |
|----------|-------|
| Happy Path | 5 |
| Edge / Boundary | 4 |
| Error Cases | 3 |
| Security | 1 |

**Verification (Red phase)**:
- [ ] All tests fail (as expected — implementation doesn't exist)
- [ ] Failures are for the right reason (missing symbol, not test typo)
- [ ] No syntax errors
- [ ] Tests are isolated (FIRST.Independent — randomised order safe)
- [ ] AAA structure visible
- [ ] Intent-based names: action_scenario_result or should_X_when_Y
- [ ] Assertions describe behaviour outcomes, not call sequences
- [ ] Fakes used inside the domain; mocks only at the boundary
- [ ] AI-generated tests (if any) were read line-by-line by a human

**Notes for Implementation**:
- Focus on `authenticate()` function first
- Edge case: handle unicode in usernames
```

## CRITICAL: NO SILENT FAILURES

### Anti-Patterns to NEVER Write

```javascript
// BAD: empty catch = silent failure
test('fetches user', async () => {
  try {
    const user = await fetchUser(1);
    expect(user.name).toBe('John');
  } catch {
    // silent failure — test passes even when it shouldn't
  }
});

// BAD: early return without assertion
test('processes data', () => {
  const data = getData();
  if (!data) return; // SILENT FAILURE
  expect(data.valid).toBe(true);
});

// BAD: no assertion at all
test('user exists', () => {
  const user = getUser();
  // passes but tests nothing
});

// BAD: fixture failure ignored
beforeEach(async () => {
  try { await seedDB(); } catch { /* ignored */ }
});
```

### Patterns to ALWAYS Use

```javascript
// GOOD: explicit failure
test('fetches user', async () => {
  const user = await fetchUser(1); // throws on failure
  expect(user.name).toBe('John');
});

// GOOD: assert instead of early return
test('processes data', () => {
  const data = getData();
  expect(data).toBeTruthy();
  expect(data.valid).toBe(true);
});

// GOOD: a missing dependency fails loudly, naming the missing variable
test('db test', async () => {
  if (!process.env.DB_URL) throw new Error('DB_URL is not set; this test needs a live database');
  const user = await fetchUser(1);
  expect(user.name).toBe('John');
});

// GOOD: fixture failures fail the test
beforeEach(async () => {
  await seedDB(); // throws if fails — test fails
});
```

## Tool Integration (2026)

Pick the runner that matches the language; layer assertion + mocking + mutation on top.

| Language | Runner | Assertion | Mock / Fake helper | Mutation testing |
|---|---|---|---|---|
| C# / .NET 9 | xUnit · NUnit · MSTest | FluentAssertions · Shouldly | Moq · NSubstitute · FakeItEasy | Stryker.NET |
| Java 21+ | JUnit 5 (Jupiter) | AssertJ · Hamcrest | Mockito · MockK (Kotlin) | PIT (pitest) |
| Python 3.12+ | pytest | built-in `assert` · `assertpy` | `pytest-mock` · `unittest.mock` | mutmut · cosmic-ray |
| C (C17/C23) | Unity · Check · Criterion | built-in macros | CMock (Unity) · cmocka | Mull (LLVM-based) |
| C++ 20/23 | GoogleTest · Catch2 · doctest | EXPECT_* · `REQUIRE` | gMock · trompeloeil · FakeIt | Mull · Dextool Mutate |
| TypeScript / JS | Vitest · Jest · node:test | built-in `expect` | `vi.mock` · `jest.mock` · MSW for HTTP | Stryker Mutator |
| SQL | pgTAP (Postgres) · tSQLt (SQL Server) · utPLSQL (Oracle) | framework macros | `FakeTable` (tSQLt) · session-scope txns | (not standard — invariant tests + property-based via fuzzing) |

**AI-assist tools — Copilot, Claude Code, Cursor — accelerate writing the skeletons; they do not certify correctness.** Every AI-generated test passes through a human reviewer before commit. The review checks: (a) does the assertion describe user-visible behaviour, not the implementation; (b) does the test actually fail when the production code is wrong (mutate one line of production and re-run — the test should go red); (c) are all imports/packages real (package-hallucination check); (d) is there an error path beyond the happy path.

**Mutation testing is the quality signal.** Line coverage measures what code ran; mutation coverage measures whether the tests would notice if that code were wrong. Run mutation on the diff in PRs (full repo nightly) — any test file that does not kill its mutants is a finding in this skill.

## Severity (internal triage vs. refinement-loop output)

These tiers are the **internal triage view** used when you produce a human-readable report. When this skill emits a letter to CTO Chief via the refinement loop, **every finding becomes `severity: critical`** per the warnings-are-bugs rule (see [skills/agent-fragments/warnings-are-critical.md](../../../agent-fragments/warnings-are-critical.md)) — there is no soft tier on the wire. The triage tiers below stay in the report body for prioritisation; the letter's `severity` field is always `critical`.

| Triage tier | Examples | Internal action recommendation |
|---|---|---|
| CRITICAL | Test with no assertion · obvious-only test that survives mutation (line coverage, zero defect-detection) · empty-catch swallowing exceptions · test passes against unimplemented code · AI-generated import that doesn't exist on the registry · test asserts on the mock instead of behaviour | BLOCK |
| HIGH | Missing error path · missing boundary case · test interdependence / order-dependence · snapshot test with no human review · slow unit test (real I/O) | BLOCK |
| MEDIUM | Missing AAA structure · multiple unrelated assertions in one test · magic numbers in inputs/expected · non-descriptive name · over-mocked domain collaborator | Fix soon |
| LOW | Style nits · missing `@DisplayName` · row-id missing on a parameterised test | Backlog |

### Severity reconciliation — `missing_test_kind` → triage tier

| `missing_test_kind` | Triage tier | On-wire `severity` |
|---|---|---|
| `obvious_only_survives_mutation` | CRITICAL | `critical` |
| `ai_generated_no_review` | CRITICAL | `critical` |
| `mock_overuse_testing_the_mock` | CRITICAL | `critical` |
| `snapshot_no_human_review` | HIGH | `critical` |
| `test_interdependence` | HIGH | `critical` |
| `missing_error_path` | HIGH | `critical` |
| `missing_boundary_case` | HIGH | `critical` |
| `slow_unit_test` | HIGH | `critical` |
| `missing_aaa_structure` | MEDIUM | `critical` |
| `multiple_assertions_hiding_cases` | MEDIUM | `critical` |
| `magic_numbers` | MEDIUM | `critical` |
| `non_descriptive_name` | LOW | `critical` |

Reminder: triage tier is for the human-readable report only; the wire `severity` is always `critical` per warnings-are-bugs.

## Letter schema (refinement-loop output contract)

When emitting a finding via the refinement loop, write the letter with these fields:

```yaml
finding_id: <sha256(critic+file+line+missing_test_kind)[:12]>   # fingerprint for dedup
severity: critical                                  # ALWAYS critical (warnings-are-bugs)
confidence: high | medium | low                     # high = corroborated by mutation/coverage delta
engine: pytest | vitest | xunit | nunit | junit | gtest | catch2 | unity | pgtap | tsqlt | manual
kind: unit-test-defect | missing-test | flaky-test | ai-generated-unreviewed
target_file: tests/test_user.py                     # the test file the finding lives in
line: 42
subject_file: src/services/user_service.py          # the production file the test was meant to cover
missing_test_kind: obvious_only_survives_mutation | missing_aaa_structure | multiple_assertions_hiding_cases |
                   snapshot_no_human_review | mock_overuse_testing_the_mock | test_interdependence | magic_numbers |
                   ai_generated_no_review | missing_error_path | missing_boundary_case |
                   non_descriptive_name | slow_unit_test
suggested_test_skeleton: |
  def test_login_with_wrong_password_returns_error():
      # Arrange
      user = create_test_user(email="a@x.com", password="correct")
      # Act
      result = login(email="a@x.com", password="WRONG")
      # Assert
      assert result.success is False
      assert result.error_code == "invalid_credentials"
mutation_signal:                                    # optional — if mutation testing was run
  mutants_introduced: 12
  mutants_killed: 7
  surviving_mutants: 5
ai_generated: true | false                          # set true if the test was authored by an AI assistant
human_reviewed: true | false                        # paired with ai_generated; both must be true to commit
message: "Test has no assertion — passes against any implementation"
fix: "Add an explicit assert on the user-visible outcome (return value, raised exception, or recorded side-effect at the boundary)."
reference: https://martinfowler.com/articles/mocksArentStubs.html
```

The integrator uses `confidence` and `mutation_signal` to weight findings — a `confidence: low` style nit doesn't block phase advancement on its own, but a surviving-mutants signal escalates a `mock_overuse_testing_the_mock` to blocking even if line coverage looked green.

## Checklist Before Returning

- [ ] Tests are runnable (no syntax errors)
- [ ] Tests fail for the RIGHT reason (missing function, not typo)
- [ ] Tests cover happy path + edge cases + error cases + boundary cases
- [ ] Tests are isolated (FIRST.Independent — randomised order is safe)
- [ ] AAA structure visible in every test
- [ ] Test names describe intent (action_scenario_result or should_X_when_Y)
- [ ] One conceptual assertion per test (one subject, even if multiple property checks)
- [ ] Table-driven / parameterised tests carry row ids for clear failure messages
- [ ] Fakes used inside the domain; mocks only at the system boundary
- [ ] **NO empty catch blocks**
- [ ] **NO early returns without assertions**
- [ ] **NO tests without assertions**
- [ ] **NO AI-generated tests committed without human line-by-line review**
- [ ] Assertions check behaviour outcomes, not call sequences
- [ ] No real PII, no real secrets, no real credentials in test data
- [ ] The Fast tests rules hold: size named, no real wait, no wall-clock assertion, no registry download, shared setup read-only.

---

## Refinement Loop — critic mode (v6.9.8)

When invoked as a critic by the Iron Loop integrator (see [docs/REFINEMENT_LOOP.md](../../../../docs/REFINEMENT_LOOP.md)), apply the [warnings-are-critical rule](../../../agent-fragments/warnings-are-critical.md):

- Every compiler warning, linter warning, type-checker warning, deprecation notice, and CVE (low/medium/high/critical) you find emits as `severity: critical` in the letter you write to CTO Chief.
- The [letter schema](../../../../.ctoc/architecture/refinement-loop-schema.json) rejects `warn` — there is no soft tier.
- Warnings block phase advancement (critical → medium) until resolved or explicitly waived in the plan's `## Decisions Taken Under Ambiguity` section.

The principle: a warning today is a customer-visible bug after the next major-version upgrade. Code that ships green-with-warnings ships with known latent failures.
