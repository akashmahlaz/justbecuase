import { execFileSync } from "node:child_process"
import { readFileSync } from "node:fs"
import { extname } from "node:path"

const ALLOWED_PLACEHOLDERS = new Set([
  "username:password",
  "user:password",
  "<username>:<password>",
  "YOUR_USERNAME:YOUR_PASSWORD",
])

const SKIPPED_EXTENSIONS = new Set([
  ".avif",
  ".gif",
  ".ico",
  ".jpeg",
  ".jpg",
  ".lock",
  ".png",
  ".webp",
])

const PATTERNS = [
  {
    name: "MongoDB URI with embedded credentials",
    regex: /mongodb(?:\+srv)?:\/\/([^\s"'@]+):([^\s"'@]+)@/gi,
    isAllowed: match => ALLOWED_PLACEHOLDERS.has(`${match[1]}:${match[2]}`),
  },
  {
    name: "Google API key",
    regex: /AIza[0-9A-Za-z_-]{35}/g,
  },
  {
    name: "OpenAI API key",
    regex: /sk-[A-Za-z0-9_-]{20,}/g,
  },
  {
    name: "AWS access key",
    regex: /AKIA[0-9A-Z]{16}/g,
  },
  {
    name: "Private key block",
    regex: /-----BEGIN (?:RSA |EC |OPENSSH |)PRIVATE KEY-----/g,
  },
]

const files = execFileSync("git", ["ls-files"], { encoding: "utf8" })
  .split(/\r?\n/)
  .filter(Boolean)
  .filter(file => !SKIPPED_EXTENSIONS.has(extname(file).toLowerCase()))

const findings = []

for (const file of files) {
  let content

  try {
    content = readFileSync(file, "utf8")
  } catch {
    continue
  }

  for (const pattern of PATTERNS) {
    for (const match of content.matchAll(pattern.regex)) {
      if (pattern.isAllowed?.(match)) continue

      const before = content.slice(0, match.index)
      const line = before.split(/\r?\n/).length
      findings.push(`${file}:${line} ${pattern.name}`)
    }
  }
}

if (findings.length > 0) {
  console.error("Secret scan failed. Remove real credentials from tracked files:")
  for (const finding of findings) console.error(`- ${finding}`)
  process.exit(1)
}

console.log(`Secret scan passed (${files.length} tracked files checked).`)
