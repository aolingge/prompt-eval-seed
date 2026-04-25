<p align="center">
  <img src="assets/readme-banner.svg" alt="Prompt Eval Seed banner" width="100%">
</p>

<h1 align="center">Prompt Eval Seed</h1>

<p align="center">Check prompt regression seed files for inputs, expected output, failure cases, and safety notes.</p>

<p align="center"><a href="README.zh-CN.md">中文</a> · <a href="#quick-start">Quick Start</a> · <a href="#checks">Checks</a></p>

<p align="center">
  <img alt="Node.js" src="https://img.shields.io/badge/node-%3E%3D18-84CC16">
  <img alt="dependencies" src="https://img.shields.io/badge/dependencies-0-111827">
  <img alt="license" src="https://img.shields.io/badge/license-MIT-2563EB">
</p>

## Why This Exists

AI agent tooling is growing quickly, but many repos still miss tiny checks that can run locally or in CI. This project stays zero-dependency, short-command, and easy to fork.

## Quick Start

```bash
npx github:aolingge/prompt-eval-seed --path eval.yml
```

Generate Markdown:

```bash
npx github:aolingge/prompt-eval-seed --path eval.yml --markdown > report.md
```

Use a score gate:

```bash
npx github:aolingge/prompt-eval-seed --path eval.yml --min-score 80
```

## Checks

| Check | What it looks for |
| --- | --- |
| input | Defines input cases. |
| expected | Defines expected behavior. |
| negative | Includes negative or edge cases. |
| safety | Includes safety notes. |

## Output

```text
Prompt Eval Seed score: 100/100
PASS  example-check  Useful signal found
FAIL  missing-check  Add the missing guidance
```

## Contributing

Good first PRs: add checks, add fixtures, improve docs, or add GitHub Actions examples.

## License

MIT
