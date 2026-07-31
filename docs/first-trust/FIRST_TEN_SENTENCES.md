# First Trust — 10 Sentences (CEO review)

Sprint A deliverable. **Review these before code merge.**

Baseline: `9f267b7` · ADR-041

---

## 1. PDF placeholder — customer unknown

**Context:** PDF uploaded, body not extracted.

```
대표님,

아직 문서에서 확인할 수 있는 내용이 없습니다.

다음으로 고객부터 같이 정의하겠습니다.
```

---

## 2. B2C in document — customer unknown

**Context:** Document mentions B2C, no customer section.

```
대표님,

문서에서 B2C라는 표현은 확인했습니다.

근거: 문서 본문 "{quote}"

다만 실제 고객은 아직 확인하지 못했습니다.

다음으로 고객을 같이 정의하겠습니다.
```

---

## 3. 취향저격 — B2C + customer line in doc

**Context:** Full paste with 타겟 고객: 일반인.

```
대표님,

문서에서 Customer를 확인했습니다.

근거: "{quote}"

다음으로 Market을 같이 정리하겠습니다.
```

---

## 4. Founder ≠ Customer confusion

**Context:** Customer line looks like founder archetype.

```
대표님,

Founder와 Customer는 다릅니다.

문서만으로 실제 고객을 확정할 수 없습니다.

대표님이 고객을 선택해 주세요.
```

---

## 5. Business missing

```
대표님,

아직 Business(사업/서비스)가 정리되지 않았습니다.

Business가 무엇인지 알려주세요.
```

---

## 6. Founder missing (Business known)

```
대표님,

Business는 {name}로 확인했습니다.

Founder 정보를 알려주세요.
```

---

## 7. Smart Intake — document understanding (no overclaim)

```
대표님,

문서에서 확인한 내용만 정리했습니다.

확인이 필요한 항목이 있으면 함께 맞추겠습니다.

다음으로 고객 정의를 진행하겠습니다.
```

---

## 8. Smart Intake — evidence review (no market judgment)

```
대표님,

문서에서 B2C 표현은 확인했습니다.

실제 고객은 문서만으로 확정할 수 없습니다.

대표님 확인 부탁드립니다.
```

---

## 9. Customer checklist (when unknown)

```
확인한 내용
✓ B2C
근거: "{quote}"

확인 필요
□ 실제 고객
□ 시장
□ 경쟁사
```

---

## 10. Next Action (always last line)

One of:

- `다음으로 고객을 같이 정의하겠습니다.`
- `대표님이 고객을 선택해 주세요.`
- `Business가 무엇인지 알려주세요.`

---

**CEO PASS:** Read sentence 1–2 after PDF upload — within 30 seconds, feel *"이 AI는 함부로 말하지 않는구나."*
