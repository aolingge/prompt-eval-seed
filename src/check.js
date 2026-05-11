import fs from 'node:fs'
import path from 'node:path'

const secretLikePattern = /(github_pat_|ghp_|gitee_[A-Za-z0-9_]*|sk-[A-Za-z0-9_-]{16,}|AKIA[0-9A-Z]{16})[A-Za-z0-9_-]*/g
const secretLikeMatcher = /(github_pat_|ghp_|gitee_[A-Za-z0-9_]*|sk-[A-Za-z0-9_-]{16,}|AKIA[0-9A-Z]{16})/
const assignmentSecretPattern = /(token|password|secret|cookie)\s*[:=]\s*[^\s]+/gi

const coreChecks = [
  {
    "id": "input",
    "pattern": "input|case|fixture|输入|样例",
    "message": "Defines input cases."
  },
  {
    "id": "expected",
    "pattern": "expected|assert|should|预期|断言",
    "message": "Defines expected behavior."
  },
  {
    "id": "negative",
    "pattern": "negative|fail|edge|bad|失败|边界",
    "message": "Includes negative or edge cases."
  },
  {
    "id": "safety",
    "pattern": "safety|secret|policy|安全|密钥|策略",
    "message": "Includes safety notes."
  }
]

const injectionChecks = [
  {
    id: 'role-boundary',
    pattern: 'system|developer|instruction|role|角色|指令',
    message: 'Defines role or instruction boundary.',
  },
  {
    id: 'untrusted-input',
    pattern: 'untrusted|user input|external|不可信|用户输入',
    message: 'Mentions untrusted input.',
  },
  {
    id: 'ignore-risk',
    pattern: 'ignore previous|disregard|override|忽略|覆盖',
    message: 'Surfaces injection-like phrases.',
  },
  {
    id: 'safety',
    pattern: 'secret|credential|policy|安全|密钥|策略',
    message: 'Mentions safety policy or secret handling.',
  },
]

const fixturePackChecks = [
  ['happy', 'happy path|normal|成功|正常', 'Includes happy path.'],
  ['edge', 'edge|boundary|边界', 'Includes edge cases.'],
  ['failure', 'failure|invalid|错误|失败', 'Includes failure cases.'],
  ['expected', 'expected|assert|期望|断言', 'Includes expected output.'],
]

const regressionReportChecks = [
  ['input', 'input|case|fixture|输入|用例', 'Includes inputs or cases.'],
  ['expected', 'expected|should|期望|应该', 'Includes expected behavior.'],
  ['actual', 'actual|got|实际|输出', 'Includes actual output.'],
  ['decision', 'pass|fail|decision|结论|通过|失败', 'Includes pass/fail decision.'],
]

function hasTopLevelKey(text, key) {
  return new RegExp(`^${key}\\s*:`, 'm').test(text)
}

function countNonEmptyLines(text) {
  return text.split(/\r?\n/).filter((line) => line.trim()).length
}

const yamlChecks = [
  {
    id: 'extension',
    weight: 1,
    run: ({ file }) => /\.(prompt\.ya?ml|ya?ml)$/i.test(file),
    pass: 'File extension is compatible with prompt-as-code workflows.',
    fail: 'Use .prompt.yml, .prompt.yaml, .yml, or .yaml.',
  },
  {
    id: 'name',
    weight: 1,
    run: ({ text }) => hasTopLevelKey(text, 'name'),
    pass: 'Prompt has a name.',
    fail: 'Add a top-level name field.',
  },
  {
    id: 'description',
    weight: 1,
    run: ({ text }) => hasTopLevelKey(text, 'description'),
    pass: 'Prompt explains when to use it.',
    fail: 'Add a description so humans and agents know when to use this prompt.',
  },
  {
    id: 'model',
    weight: 1,
    run: ({ text }) => hasTopLevelKey(text, 'model'),
    pass: 'Model is declared.',
    fail: 'Add a model field or document the intended model in metadata.',
  },
  {
    id: 'prompt-body',
    weight: 1.5,
    run: ({ text }) => hasTopLevelKey(text, 'prompt') || hasTopLevelKey(text, 'messages'),
    pass: 'Prompt body is present.',
    fail: 'Add prompt: or messages: content.',
  },
  {
    id: 'inputs',
    weight: 1,
    run: ({ text }) => hasTopLevelKey(text, 'inputs') || hasTopLevelKey(text, 'variables'),
    pass: 'Inputs or variables are declared.',
    fail: 'Declare inputs or variables instead of relying on hidden assumptions.',
  },
  {
    id: 'tests',
    weight: 1,
    run: ({ text }) => hasTopLevelKey(text, 'tests') || hasTopLevelKey(text, 'evals') || /expected/i.test(text),
    pass: 'Prompt has a test or expected behavior section.',
    fail: 'Add tests, evals, or expected output examples.',
  },
  {
    id: 'length',
    weight: 0.8,
    run: ({ text }) => countNonEmptyLines(text) >= 8,
    pass: 'Prompt file has enough structure to review.',
    fail: 'The file is very short. Add metadata, inputs, and expected behavior.',
  },
]

const profiles = {
  core: { title: 'Prompt Eval Seed', checks: coreChecks },
  yaml: { title: 'Prompt YAML Lint', checks: yamlChecks, yaml: true, secretFailure: true },
  injection: { title: 'Prompt Injection Smoke', checks: injectionChecks },
  'fixture-pack': { title: 'Prompt Fixture Pack', checks: fixturePackChecks, compactTuples: true, readTarget: true },
  'regression-report': { title: 'Prompt Regression Report', checks: regressionReportChecks, compactTuples: true, readTarget: true },
}

export const PROFILE_NAMES = Object.keys(profiles)

function getProfile(profile = 'core') {
  const config = profiles[profile]
  if (!config) throw new Error(`Unknown profile "${profile}". Use one of: ${PROFILE_NAMES.join(', ')}`)
  return config
}

export function redactText(text) {
  return text
    .replace(secretLikePattern, '[REDACTED_SECRET]')
    .replace(assignmentSecretPattern, '$1=[REDACTED]')
}

function listReadableFiles(root) {
  const files = []
  function visit(directory) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const fullPath = path.join(directory, entry.name)
      if (entry.isDirectory()) visit(fullPath)
      else if (entry.isFile() && /\.(md|txt|json|ya?ml|log|env|js|ts)$/i.test(fullPath)) files.push(fullPath)
      if (files.length >= 120) return
    }
  }
  visit(root)
  return files
}

function readTarget(target) {
  const stat = fs.statSync(target)
  if (!stat.isDirectory()) return fs.readFileSync(target, 'utf8')

  return listReadableFiles(target)
    .map((file) => `\n--- ${path.relative(target, file)} ---\n${fs.readFileSync(file, 'utf8')}`)
    .join('\n')
}

function regexResult(check, text) {
  const ok = new RegExp(check.pattern, 'i').test(text)
  return {
    status: ok ? 'PASS' : 'FAIL',
    check: check.id,
    message: ok ? check.message : `Missing signal: ${check.message}`,
    weight: check.weight ?? 1,
  }
}

function tupleResult(tuple, text) {
  const [id, pattern, message] = tuple
  const ok = new RegExp(pattern, 'i').test(text)
  return {
    status: ok ? 'PASS' : 'FAIL',
    check: id,
    message: ok ? message : `Missing signal: ${message}`,
    weight: 1,
  }
}

function yamlResult(check, text, file) {
  const ok = check.run({ file, text })
  return {
    status: ok ? 'PASS' : 'FAIL',
    check: check.id,
    message: ok ? check.pass : check.fail,
    weight: check.weight,
  }
}

export function checkText(text, file = '<inline>', options = {}) {
  const profile = options.profile ?? 'core'
  const config = getProfile(profile)
  const source = redactText(text)
  const weightedResults = config.checks.map((check) => {
    if (config.yaml) return yamlResult(check, source, file)
    if (config.compactTuples) return tupleResult(check, source)
    return regexResult(check, source)
  })

  if (config.secretFailure && secretLikeMatcher.test(text)) {
    weightedResults.push({
      status: 'FAIL',
      check: 'leaked-secret',
      message: 'Secret-like value found. Remove it before committing prompt files.',
      weight: 2,
    })
  }

  const total = weightedResults.reduce((sum, item) => sum + item.weight, 0)
  const earned = weightedResults.reduce((sum, item) => sum + (item.status === 'PASS' ? item.weight : 0), 0)
  const results = weightedResults.map(({ weight, ...item }) => item)
  return {
    file,
    profile,
    title: config.title,
    score: Math.round((earned / total) * 100),
    results,
    redacted: source,
  }
}

export function checkFile(file, options = {}) {
  const profile = options.profile ?? 'core'
  const config = getProfile(profile)
  const text = config.readTarget ? readTarget(file) : fs.readFileSync(file, 'utf8')
  return checkText(text, file, { profile })
}

export function formatText(report, title = report.title ?? "Prompt Eval Seed") {
  const lines = [`${title} score: ${report.score}/100`, `File: ${report.file}`, '']
  for (const result of report.results) {
    lines.push(`${result.status.padEnd(5)} ${result.check.padEnd(18)} ${result.message}`)
  }
  return lines.join('\n')
}

export function formatMarkdown(report, title = report.title ?? "Prompt Eval Seed") {
  const rows = report.results.map((result) => `| ${result.status} | ${result.check} | ${result.message} |`).join('\n')
  return `# ${title} Report

Score: **${report.score}/100**

File: \`${report.file}\`

| Status | Check | Message |
| --- | --- | --- |
${rows}
`
}

export function formatAnnotations(report) {
  return report.results
    .filter((result) => result.status !== 'PASS')
    .map((result) => `::warning file=${report.file},title=${result.check}::${result.message.replaceAll('\n', ' ')}`)
    .join('\n')
}

export function formatSarif(report, toolName = "prompt-eval-seed") {
  return {
    version: '2.1.0',
    $schema: 'https://json.schemastore.org/sarif-2.1.0.json',
    runs: [
      {
        tool: {
          driver: {
            name: toolName,
            informationUri: `https://github.com/aolingge/${toolName}`,
            rules: report.results.map((result) => ({
              id: result.check,
              name: result.check,
              shortDescription: { text: result.message },
              defaultConfiguration: { level: result.status === 'FAIL' ? 'warning' : 'note' },
            })),
          },
        },
        results: report.results
          .filter((result) => result.status !== 'PASS')
          .map((result) => ({
            ruleId: result.check,
            level: 'warning',
            message: { text: result.message },
            locations: [
              {
                physicalLocation: {
                  artifactLocation: { uri: report.file.replaceAll('\\', '/') },
                  region: { startLine: 1 },
                },
              },
            ],
          })),
      },
    ],
  }
}
