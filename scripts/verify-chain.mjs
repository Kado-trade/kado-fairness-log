// 해시 체인 무결성 검사 — node scripts/verify-chain.mjs
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
const sha256 = (s) => createHash("sha256").update(s).digest("hex");
const lines = readFileSync(new URL("../log/seeds.jsonl", import.meta.url), "utf8").trim().split("\n").filter(Boolean);
let prev = "";
let ok = true;
for (const [i, line] of lines.entries()) {
  const rec = JSON.parse(line);
  const { recordHash, ...rest } = rec;
  const expected = sha256(prev + JSON.stringify(rest));
  if (rec.prevRecordHash !== prev || recordHash !== expected) {
    console.error(`FAIL line ${i + 1}: chain mismatch`);
    ok = false;
    break;
  }
  prev = recordHash;
}
if (ok) console.log(`PASS — ${lines.length} records, chain intact, head=${prev.slice(0, 16)}…`);
process.exit(ok ? 0 : 1);
