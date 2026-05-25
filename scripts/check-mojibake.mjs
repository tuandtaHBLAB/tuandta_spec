import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, extname } from "node:path";

const ROOT = "src";
const TEXT_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx", ".json", ".md", ".css"]);
const MOJIBAKE_PATTERNS = [
  /\u00E3[\u0080-\u00FF]/g,
  /\u00C3[\u0080-\u00FF]/g,
  /\u00C2[\u0080-\u00FF]/g,
];

function walk(dir) {
  const output = [];
  for (const name of readdirSync(dir)) {
    const fullPath = join(dir, name);
    const st = statSync(fullPath);
    if (st.isDirectory()) {
      output.push(...walk(fullPath));
      continue;
    }
    if (TEXT_EXTENSIONS.has(extname(fullPath))) {
      output.push(fullPath);
    }
  }
  return output;
}

const files = walk(ROOT);
const findings = [];

for (const file of files) {
  const content = readFileSync(file, "utf8");
  for (const pattern of MOJIBAKE_PATTERNS) {
    if (pattern.test(content)) {
      findings.push(file);
      break;
    }
  }
}

if (findings.length > 0) {
  const unique = [...new Set(findings)];
  console.error("Mojibake-like text detected in:");
  for (const file of unique) {
    console.error(`- ${file}`);
  }
  process.exit(1);
}

console.log("Encoding check passed: no mojibake-like text detected.");
