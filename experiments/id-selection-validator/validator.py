#!/usr/bin/env python3
"""Offline checker for saved ID-selection outputs.

This file is an experiment fixture runner. It is not imported by the product,
does not call a model, and does not turn a format failure into a business pass.
"""

from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent
FIXTURES = ROOT / "fixtures"
REQUIRED = ["사실", "가설", "미검증", "답변1", "답변2", "다음질문", "판단"]
JUDGMENT_TOKENS = {"Hold", "Go", "Stop", "판단불가"}
POLICY_PERMITTED = {"Hold", "판단불가"}
CJK = re.compile(r"[\u4e00-\u9fff]")
QUESTION_ID = re.compile(r"\b(?:QL[1-4]|QR[1-4])\b")
LINE = re.compile(r"^([^\s:]+):\s*(.*)$")

CLOSED_QUESTIONS = {"QR1", "QR2"}


def load_catalog() -> dict:
    grade = json.loads((FIXTURES / "grade-key.json").read_text())
    sources = grade["sources"]
    questions = grade["questions"]
    answers = grade["answers"]
    key = grade["key"]
    lmulm_ids = set(sources["lmulm"]) | set(questions["lmulm"]) | set(answers["lmulm"])
    ridm_ids = set(sources["ridm"]) | set(questions["ridm"]) | set(answers["ridm"])
    return {
        "lmulm": {
            "source_ids": set(sources["lmulm"]),
            "question_ids": set(questions["lmulm"]),
            "answer_text": set(answers["lmulm"].values()),
            "catalog_ids": lmulm_ids,
            "rubric": {
                "사실": set(key["lmulm"]["fact_pass"]),
                "가설": set(key["lmulm"]["hypothesis_pass"]),
                "미검증": set(key["lmulm"]["uncertainty_pass"]),
                "답변1": set(key["lmulm"]["A1_pass"]),
                "답변2": set(key["lmulm"]["A2_pass"]),
                "다음질문": set(key["lmulm"]["question_pass"]),
                "판단": set(key["lmulm"]["judgment_pass"]),
            },
        },
        "ridm": {
            "source_ids": set(sources["ridm"]),
            "question_ids": set(questions["ridm"]),
            "answer_text": set(answers["ridm"].values()),
            "catalog_ids": ridm_ids,
            "rubric": {
                "사실": set(key["ridm"]["fact_pass"]),
                "가설": set(key["ridm"]["hypothesis_pass"]),
                "미검증": set(key["ridm"]["uncertainty_pass"]),
                "답변1": set(key["ridm"]["B1_pass"]),
                "답변2": set(key["ridm"]["B2_pass"]),
                "다음질문": set(key["ridm"]["question_pass"]),
                "판단": set(key["ridm"]["judgment_pass"]),
            },
        },
    }


def allowed_values(spec: dict) -> dict[str, set[str]]:
    source_or_empty = spec["source_ids"] | {"없음"}
    source_or_unknown = spec["source_ids"] | {"없음", "판단불가"}
    return {
        "사실": source_or_empty,
        "가설": source_or_empty,
        "미검증": source_or_unknown,
        "답변1": source_or_unknown,
        "답변2": source_or_unknown,
        "다음질문": spec["question_ids"] | {"보류"},
        "판단": set(JUDGMENT_TOKENS),
    }


def business_of(name: str) -> str:
    if name.startswith("lmulm"):
        return "lmulm"
    if name.startswith("ridm"):
        return "ridm"
    raise ValueError(name)


def validate(name: str, content: str, spec: dict) -> dict:
    allowed = allowed_values(spec)
    recognized: dict[str, list[str]] = {field: [] for field in REQUIRED}
    unknown_fields: list[str] = []
    illegal_values: list[dict] = []
    nonexistent_ids: list[str] = []
    unparsed_lines: list[str] = []
    copied_answers: list[str] = []

    for raw in content.splitlines():
        line = raw.strip()
        if not line:
            continue
        match = LINE.match(line)
        if not match:
            unparsed_lines.append(line)
            continue
        field, value = match.group(1), match.group(2).strip()
        if field not in REQUIRED:
            unknown_fields.append(field)
            if re.fullmatch(r"[A-Z]+\d+", field) and field not in spec["catalog_ids"]:
                nonexistent_ids.append(field)
            continue
        recognized[field].append(value)
        if any(answer in value for answer in spec["answer_text"]):
            copied_answers.append(field)
        single = re.fullmatch(r"\S+", value) is not None
        if not single or value not in allowed[field]:
            illegal_values.append({"field": field, "value": value})
            if single and re.fullmatch(r"[A-Z]+\d+", value) and value not in spec["catalog_ids"]:
                nonexistent_ids.append(value)

    missing = [field for field in REQUIRED if not recognized[field]]
    duplicate = [field for field in REQUIRED if len(recognized[field]) > 1]
    parsed_once = {
        field: values[0]
        for field, values in recognized.items()
        if len(values) == 1 and re.fullmatch(r"\S+", values[0]) and values[0] in allowed[field]
    }
    format_pass = (
        not missing
        and not duplicate
        and not unknown_fields
        and not illegal_values
        and not unparsed_lines
        and set(parsed_once) == set(REQUIRED)
    )

    mentioned_questions = sorted(set(QUESTION_ID.findall(content)))
    closed_mentions = [qid for qid in mentioned_questions if qid in CLOSED_QUESTIONS]
    parsed_question = parsed_once.get("다음질문")
    closed_selected = parsed_question in CLOSED_QUESTIONS if parsed_question else False

    rubric_fail = []
    rubric_ok = []
    for field, value in parsed_once.items():
        if value in spec["rubric"][field]:
            rubric_ok.append(f"{field}={value}")
        else:
            rubric_fail.append(f"{field}={value}")

    judgment_value = parsed_once.get("판단")
    policy_accepted = bool(format_pass and judgment_value in POLICY_PERMITTED and not rubric_fail)
    # A failed check never becomes a normal business result.
    recorded_state = "판단불가" if not policy_accepted else judgment_value

    return {
        "name": name,
        "format_pass": format_pass,
        "business_quality_pass": False,
        "missing_fields": missing,
        "duplicate_fields": duplicate,
        "unknown_fields": unknown_fields,
        "illegal_values": illegal_values,
        "nonexistent_ids": sorted(set(nonexistent_ids)),
        "unparsed_lines": unparsed_lines,
        "copied_answers": copied_answers,
        "mentioned_questions": mentioned_questions,
        "closed_question_mentions": closed_mentions,
        "closed_question_selected": closed_selected,
        "parsed_once": parsed_once,
        "rubric_ok": rubric_ok,
        "rubric_fail": rubric_fail,
        "judgment_token": judgment_value,
        "policy_accepted": policy_accepted,
        "recorded_state": recorded_state,
        "cjk": bool(CJK.search(content)),
        "mentions_seventy": "70" in content,
        "go_token_in_judgment_field": judgment_value == "Go",
    }


def detection_checks(rows: list[dict]) -> dict:
    by_name = {row["name"]: row for row in rows}
    l7, r7 = by_name["lmulm-7b-ids"], by_name["ridm-7b-ids"]
    l3, r3 = by_name["lmulm-3b-ids"], by_name["ridm-3b-ids"]
    checks = {
        "format_all_fail": all(not row["format_pass"] for row in rows),
        "nonexistent_b3_to_b6": r7["nonexistent_ids"] == ["B3", "B4", "B5", "B6"],
        "illegal_answer2_hold": any(
            item["field"] == "답변2" and item["value"] == "Hold" for item in l3["illegal_values"]
        ),
        "ridm_3b_values_illegal": len(r3["illegal_values"]) >= 4 and bool(r3["copied_answers"]),
        "missing_on_all_four": all(row["missing_fields"] for row in rows),
        "duplicate_on_ridm_3b": r3["duplicate_fields"] == ["답변1", "답변2"],
        "closed_qr2_on_ridm_3b": r3["closed_question_mentions"] == ["QR2"],
        "ql2_not_closed": "QL2" not in l3["closed_question_mentions"] and not l3["closed_question_selected"],
        "go_not_accepted": l3["go_token_in_judgment_field"] and l3["recorded_state"] == "판단불가" and not l3["policy_accepted"],
        "no_output_recorded_as_hold": all(row["recorded_state"] == "판단불가" for row in rows),
        "l7_unparsed": len(l7["unparsed_lines"]) == 7 and l7["missing_fields"] == REQUIRED,
    }
    return checks


def main() -> None:
    catalog = load_catalog()
    names = ["lmulm-7b-ids", "ridm-7b-ids", "lmulm-3b-ids", "ridm-3b-ids"]
    rows = []
    for name in names:
        payload = json.loads((FIXTURES / f"{name}.json").read_text())
        spec = catalog[business_of(name)]
        rows.append(validate(name, payload["content"], spec))
    checks = detection_checks(rows)
    report = {
        "model_called": False,
        "product_code_changed": False,
        "rows": rows,
        "checks": checks,
        "checks_pass": all(checks.values()),
        "semantic_limit": [
            "Go is rejected because this fixture's policy permits only Hold or 판단불가, not because the checker read the business plan.",
            "A legal source ID in the wrong role did not appear in the four saved outputs, so that rubric branch was not exercised.",
            "Correct tokens on the wrong field names are not repaired into a pass.",
            "Format failure is not a business-quality pass.",
        ],
    }
    (ROOT / "validator-report.json").write_text(json.dumps(report, ensure_ascii=False, indent=2))
    print(json.dumps({"checks": checks, "checks_pass": report["checks_pass"]}, ensure_ascii=False, indent=2))
    for row in rows:
        print(
            row["name"],
            "format", row["format_pass"],
            "missing", ",".join(row["missing_fields"]) or "-",
            "dup", ",".join(row["duplicate_fields"]) or "-",
            "unknown", ",".join(row["unknown_fields"]) or "-",
            "bad_ids", ",".join(row["nonexistent_ids"]) or "-",
            "closed", ",".join(row["closed_question_mentions"]) or "-",
            "judgment", row["judgment_token"],
            "recorded", row["recorded_state"],
        )
    if not report["checks_pass"]:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
