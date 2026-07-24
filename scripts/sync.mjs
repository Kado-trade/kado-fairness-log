// KADO 공개 API 에서 시드 커밋/공개 기록을 읽어 새 기록만 해시 체인으로 추가한다.
// 비밀키 불필요 — 공개 API 읽기 + Actions 기본 토큰 커밋. KADO 는 이 저장소 이력을 수정할 수 없다.
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, existsSync } from "node:fs";

const API = process.env.KADO_FAIRNESS_API || "https://kado-git-dev-pchrrr.vercel.app/api/fairness";
const FILE = new URL("../log/seeds.jsonl", import.meta.url);
const sha256 = (s) => createHash("sha256").update(s).digest("hex");

const res = await fetch(API, { headers: { Accept: "application/json" } });
if (!res.ok) throw new Error(`API ${res.status}`);
const data = await res.json();

const lines = existsSync(FILE) ? readFileSync(FILE, "utf8").trim().split("\n").filter(Boolean) : [];
const records = lines.map((l) => JSON.parse(l));
const seen = new Set(records.map((r) => `${r.stage}:${r.seedHash}`));
let prev = records.length ? records[records.length - 1].recordHash : "";

const candidates = [];
for (const seed of [data.nextSeed, data.activeSeed]) {
  if (seed?.seedHash) {
    candidates.push({
      stage: "committed", seedHash: seed.seedHash, committedAt: seed.committedAt || null,
      drandRound: seed.drandRound ?? null, drandRandomness: seed.drandRandomness ?? null,
    });
  }
}
for (const seed of data.revealedSeeds || []) {
  if (seed?.seedHash) {
    candidates.push({
      stage: "committed", seedHash: seed.seedHash, committedAt: seed.committedAt || null,
      drandRound: seed.drandRound ?? null, drandRandomness: seed.drandRandomness ?? null,
    });
    candidates.push({
      stage: "revealed", seedHash: seed.seedHash, committedAt: seed.committedAt || null,
      serverSeed: seed.seed, revealedAt: seed.revealedAt || null,
    });
  }
}

let added = 0;
for (const candidate of candidates) {
  const key = `${candidate.stage}:${candidate.seedHash}`;
  if (seen.has(key)) continue;
  seen.add(key);
  const record = { recordedAt: new Date().toISOString(), ...candidate, prevRecordHash: prev };
  const recordHash = sha256(prev + JSON.stringify(record));
  records.push({ ...record, recordHash });
  prev = recordHash;
  added += 1;
}

if (added > 0) {
  writeFileSync(FILE, records.map((r) => JSON.stringify(r)).join("\n") + "\n");
}
console.log(`added ${added} record(s), total ${records.length}`);
