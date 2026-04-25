#!/usr/bin/env node
import process from 'node:process'
import { checkFile, formatMarkdown, formatText } from './check.js'

function parseArgs(argv) {
  const args = { path: null, minScore: 70, json: false, markdown: false, redact: false, help: false }
  for (let i = 0; i < argv.length; i += 1) {
    const item = argv[i]
    if (item === '--path') args.path = argv[++i]
    else if (item === '--min-score') args.minScore = Number(argv[++i])
    else if (item === '--json') args.json = true
    else if (item === '--markdown') args.markdown = true
    else if (item === '--redact') args.redact = true
    else if (item === '-h' || item === '--help') args.help = true
    else if (!args.path) args.path = item
    else throw new Error(`Unknown option: ${item}`)
  }
  return args
}

function help() {
  console.log(`prompt-eval-seed

Usage:
  prompt-eval-seed --path FILE
  prompt-eval-seed FILE --markdown
  prompt-eval-seed FILE --redact

Options:
  --path FILE       file to check
  --min-score N    fail below score, default: 70
  --json           print JSON report
  --markdown       print Markdown report
  --redact         print redacted file content
`)
}

try {
  const args = parseArgs(process.argv.slice(2))
  if (args.help) {
    help()
    process.exit(0)
  }
  if (!args.path) throw new Error('Missing file path')
  const report = checkFile(args.path)
  if (args.redact) console.log(report.redacted)
  else if (args.json) console.log(JSON.stringify(report, null, 2))
  else if (args.markdown) console.log(formatMarkdown(report))
  else console.log(formatText(report))
  process.exit(report.score >= args.minScore ? 0 : 1)
} catch (error) {
  console.error(`prompt-eval-seed: ${error.message}`)
  process.exit(2)
}
