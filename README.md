# KADO Fairness Log — 외부 불변 커밋 로그

KADO 팩 오픈 공정성 시스템(커밋-리빌 + drand)의 **시드 커밋 기록을 KADO 외부(이 공개 저장소)에 고정**하는 로그입니다.

## 왜 존재하나
KADO 데이터베이스만 보고는 "결과가 나온 뒤 과거 시각으로 기록을 만든 것 아니냐"는 의혹을 완전히 반박할 수 없습니다.
이 저장소는 시드가 **사용되기 전에** 그 지문(해시)을 GitHub 커밋(제3자 타임스탬프)으로 고정합니다.
시드 원문은 사용이 끝난 뒤에만 이 로그에 나타나며, 원문의 sha256 이 먼저 고정된 지문과 일치해야 합니다.

- 기록 파일: [`log/seeds.jsonl`](log/seeds.jsonl) — 한 줄 = 한 기록(JSON)

## 한계 고지 (정직하게)
- 이 저장소는 **KADO(Kado-trade 조직)가 운영하는 공개 사본**입니다. main 브랜치에 강제 푸시·삭제 차단
  보호를 걸어뒀지만(관리자 포함 적용), 조직 관리자가 설정을 바꾸거나 저장소를 삭제하는 것까지 막지는 못합니다.
  완전한 제3자 불변 보관(외부 타임스탬프·감사기관 미러)은 외부 인증과 함께 준비 중입니다.
- 그 전까지의 실질 방어: 커밋·Actions 실행 시각은 GitHub 이 기록하고, 이 저장소를 포크/클론해 둔
  누구든 이력 재작성을 즉시 탐지할 수 있습니다. 의심된다면 지금 포크해 두세요.
- drand 값은 [공개 API](https://api.drand.sh) 로 누구나 대조할 수 있으나, 이 로그 자체가 BLS 서명을
  검증하지는 않습니다.
- 각 기록은 앞 기록의 해시를 포함하는 해시 체인으로 연결됩니다:
  `recordHash = sha256(prevRecordHash + JSON(record))`
- 동기화: GitHub Actions 가 30분마다 KADO 공개 API(`/api/fairness`)를 읽어 새 기록만 추가합니다.
  워크플로 실행 이력·커밋 시각은 GitHub 이 기록하며 KADO 가 수정할 수 없습니다.

## 기록 종류 (stage)
| stage | 내용 |
|---|---|
| `committed` | 시드 지문 선공개(사용 전 봉인) |
| `revealed` | 사용 종료 후 시드 원문 공개 — `sha256(serverSeed)` 가 먼저 고정된 지문과 일치해야 함 |
| `config` | 팩별 확률표·후보 풀 봉인: `boxId`/`boxName`/`packType`/`oddsDigest`/`poolDigest`/`poolCount`/`committedAt` |
| `nonceLedger` | 공개된 시드의 뽑기 순번 장부 요약: `totalPulls`/`nonceRange`/`gapCount`/`ledgerDigest` |

## 필드
| 필드 | 설명 |
|---|---|
| `recordedAt` | **이 저장소(GitHub)에 실제 외부 기록된 시각** — 외부 고정의 기준 시각 |
| `committedAt` | KADO 시스템에서 봉인(커밋)된 원래 시각 — KADO API 가 제공한 값 |
| `stage` | 위 표 참조 |
| `seedHash` | sha256(serverSeed) — 시드 지문 |
| `serverSeed` | 시드 원문 (`revealed` 단계에만) |
| `drandRound` / `drandRandomness` | 결합된 drand(League of Entropy) 공개 난수 |
| `prevRecordHash` / `recordHash` | 해시 체인 |

### 시간 의미 주의 (정확한 해석)
- 어떤 값이 "뽑기 전에 외부에 공개돼 있었다"의 근거가 되는 것은 `committedAt` 이 아니라
  **`recordedAt`(외부 기록 시각)** 입니다. `committedAt` 은 KADO 내부 기록이 주장하는 시각입니다.
- 예: `packType` 이 포함된 구성 기록 10건은 2026-07-24 구성에 대해 **2026-07-25 에 재기록**된
  것입니다(기록 형식 확장). 따라서 이 기록들의 `packType` 은 재기록 시각(recordedAt) 이후의
  뽑기에 대해서만 "사전 외부 공개" 근거가 되며, 그 이전 뽑기까지 소급 증명하지 않습니다.

## 검증 방법
1. 내 팩 오픈의 증빙 JSON(`/fairness` 에서 다운로드)의 `seedHash` 를 이 로그에서 찾습니다.
2. 그 기록의 **커밋 시각(GitHub 커밋 히스토리)** 이 내 팩 오픈 시각보다 앞서는지 확인합니다.
3. `revealed` 기록의 `serverSeed` 로 `sha256(serverSeed) == seedHash` 를 재계산합니다.
4. 증빙 전체 재계산은 [독립 검증기](https://kado.trade/fairness-verifier.html)를 사용하세요(단일 HTML, KADO 무접속).

체인 무결성 검사: `node scripts/verify-chain.mjs`
