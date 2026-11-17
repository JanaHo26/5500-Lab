/**
 * Auto-heal runner for CI (Lab 8).
 *
 * Reads the Jest failure log, gathers the source files involved, asks an AI
 * model for a patch (any OpenAI-compatible chat API; defaults to Google
 * Gemini's free tier, since GitHub Models was retired on July 30, 2026), applies it to src/ only, and re-runs the tests to verify it. Test
 * files are context only: the model is never allowed to edit them, so it can't
 * "fix" a bug by weakening an assertion.
 *
 * Exit code 0 = tests pass after the patch (the workflow then opens a PR).
 * Writes fix-summary.md, which becomes the PR description.
 */
import { execSync } from "child_process";
import { existsSync, readFileSync, writeFileSync } from "fs";

const ENDPOINT =
  process.env.AI_ENDPOINT ||
  "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";
const MODEL = process.env.AI_MODEL || "gemini-3.5-flash";
const API_KEY = process.env.AI_API_KEY ?? "";
const LOG_PATH = process.env.LOG_PATH ?? "test-results.log";
const BASE_REF = process.env.BASE_REF ?? "main";
const TEST_COMMAND = process.env.TEST_COMMAND ?? "npx jest --ci";
const MAX_ATTEMPTS = 2;
// keep each request small so it stays inside free-tier limits
const MAX_LOG_CHARS = 6000;
const MAX_PROMPT_CHARS = 24000;

const INSTRUCTION =
  "Parse the attached Jest failure log. Locate the source code causing the " +
  "failure in src/ and generate a patch that fixes the bug without breaking " +
  "existing tests.";

const SYSTEM_PROMPT = `You are an automated repair agent in a CI pipeline for a
TypeScript + Express + Mongoose backend. The tests are the specification: they
were passing before the change under review. Fix the application code so the
tests pass again.

Rules:
- Only change files listed under "Editable files". Never change test files;
  the failing test names and the log show what the tests expect.
- Make the smallest change that fixes the root cause. Do not refactor.
- Keep the existing code style, comments and types. Never use "any".
- Reply with JSON only, in this exact shape:
  {"explanation": "<what was wrong and how you fixed it, 2-4 sentences>",
   "files": [{"path": "src/...", "content": "<the complete new file>"}]}`;

interface PatchedFile {
  path: string;
  content: string;
}

interface ModelPatch {
  explanation: string;
  files: PatchedFile[];
}

interface ChatResponse {
  choices?: { message?: { content?: string } }[];
}

function sh(command: string): string {
  return execSync(command, { encoding: "utf8", stdio: "pipe" });
}

function isTestFile(path: string): boolean {
  return path.includes("__tests__") || path.startsWith("src/test/");
}

function tail(text: string, max: number): string {
  return text.length > max ? text.slice(text.length - max) : text;
}

// source files to fix: what this PR changed in src/ (where a regression was
// most likely introduced); if the PR touched none, the src/ files that
// appear in the failure log's stack traces
function findEditableFiles(log: string): string[] {
  const fromDiff = sh(`git diff --name-only origin/${BASE_REF}...HEAD -- src`)
    .split("\n")
    .filter((p) => p.endsWith(".ts") && !isTestFile(p) && existsSync(p));
  if (fromDiff.length > 0) return fromDiff;

  const fromLog = log.match(/src\/[\w./-]+\.ts/g) ?? [];
  return [...new Set(fromLog)].filter((p) => !isTestFile(p) && existsSync(p));
}

// just the "● suite › test name" lines, so the model knows what broke
// without spending the token budget on whole test files
function failingTestNames(log: string): string {
  const names = log.split("\n").filter((line) => line.trim().startsWith("●"));
  return [...new Set(names.map((l) => l.trim()))].join("\n") || "(none found)";
}

function fileBlock(path: string): string {
  return `--- ${path} ---\n${readFileSync(path, "utf8")}`;
}

function buildPrompt(log: string, editable: string[]): string {
  const diff = sh(`git diff origin/${BASE_REF}...HEAD -- src`);
  const fixedParts = [
    INSTRUCTION,
    `## Diff of this branch against ${BASE_REF} (where the bug was likely introduced)`,
    diff || "(no diff)",
    "## Failing tests",
    failingTestNames(log),
    "## Editable files",
    editable.map(fileBlock).join("\n\n"),
  ].join("\n\n");
  const logBudget = Math.max(
    1000,
    Math.min(MAX_LOG_CHARS, MAX_PROMPT_CHARS - fixedParts.length)
  );
  return `${fixedParts}\n\n## Jest failure log (tail)\n\n${tail(log, logBudget)}`;
}

// models sometimes wrap JSON in ```json fences or add a sentence around it
function extractJson(content: string): string {
  const start = content.indexOf("{");
  const end = content.lastIndexOf("}");
  if (start === -1 || end <= start) {
    throw new Error(`Model reply had no JSON object: ${content.slice(0, 300)}`);
  }
  return content.slice(start, end + 1);
}

async function postChat(prompt: string): Promise<Response> {
  return fetch(ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: prompt },
      ],
    }),
  });
}

async function askModel(prompt: string): Promise<ModelPatch> {
  let res = await postChat(prompt);
  // free tiers rate-limit per minute; wait once and retry
  if (res.status === 429) {
    console.warn("Rate limited, retrying in 60s...");
    await new Promise((resolve) => setTimeout(resolve, 60000));
    res = await postChat(prompt);
  }
  if (!res.ok) {
    throw new Error(`Model request failed: ${res.status} ${await res.text()}`);
  }

  const data = (await res.json()) as ChatResponse;
  const content = data.choices?.[0]?.message?.content ?? "";
  const parsed = JSON.parse(extractJson(content)) as Partial<ModelPatch>;
  if (typeof parsed.explanation !== "string" || !Array.isArray(parsed.files)) {
    throw new Error("Model reply was not in the expected JSON shape.");
  }
  return { explanation: parsed.explanation, files: parsed.files };
}

// refuses anything outside the editable list, so tests can never be touched
function applyPatch(patch: ModelPatch, editable: string[]): string[] {
  const applied: string[] = [];
  for (const file of patch.files) {
    if (!editable.includes(file.path) || isTestFile(file.path)) {
      console.warn(`Skipping ${file.path}: not an editable source file.`);
      continue;
    }
    writeFileSync(file.path, file.content);
    applied.push(file.path);
  }
  return applied;
}

function runTests(): { passed: boolean; output: string } {
  try {
    return { passed: true, output: sh(`${TEST_COMMAND} 2>&1`) };
  } catch (error: unknown) {
    const output = (error as { stdout?: string }).stdout ?? String(error);
    return { passed: false, output };
  }
}

function writeSummary(
  explanation: string,
  changed: string[],
  passed: boolean,
  attempts: number
): void {
  const diff = sh(`git diff -- ${changed.join(" ")}`);
  const body = `## Auto-heal patch

This PR was opened automatically by the \`auto-fix\` job after Jest failed on
\`${process.env.HEAD_REF ?? "the PR branch"}\` (run ${process.env.GITHUB_RUN_ID ?? "local"}).

**Agent's diagnosis:** ${explanation}

**Files changed:** ${changed.map((f) => `\`${f}\``).join(", ")}
**Model:** \`${MODEL}\` · **Attempts:** ${attempts}
**Re-run of the full Jest suite after patching:** ${passed ? "✅ all tests pass" : "❌ still failing"}
**Test files changed by the agent:** none (the runner rejects edits to tests)

<details><summary>Patch</summary>

\`\`\`diff
${diff}
\`\`\`
</details>

## Audit Log (human-in-the-loop review)

_To be completed by the reviewer before merging._
`;
  writeFileSync("fix-summary.md", body);
}

async function main(): Promise<void> {
  if (!API_KEY) {
    throw new Error(
      "AI_API_KEY is not set. Add it under Settings > Secrets and variables > Actions."
    );
  }

  let log = readFileSync(LOG_PATH, "utf8");
  const editable = findEditableFiles(log);
  if (editable.length === 0) {
    throw new Error("No editable source files found in the diff or the log.");
  }
  console.log("Editable files:", editable.join(", "));

  const changed = new Set<string>();
  let explanation = "";
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    console.log(`Attempt ${attempt}: asking ${MODEL} for a patch...`);
    const patch = await askModel(buildPrompt(log, editable));
    explanation = patch.explanation;
    applyPatch(patch, editable).forEach((f) => changed.add(f));
    console.log("Agent says:", explanation);

    const result = runTests();
    if (result.passed) {
      writeSummary(explanation, [...changed], true, attempt);
      console.log("Tests pass after the patch.");
      return;
    }
    // feed the new failures back for one more try
    log = result.output;
  }

  if (changed.size > 0) writeSummary(explanation, [...changed], false, MAX_ATTEMPTS);
  throw new Error("Tests still fail after the agent's patch.");
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
