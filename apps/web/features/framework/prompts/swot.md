# SWOT Framework Prompt

> Sprint 8.2 — LLM provider stub. Mock provider active until Sprint 9.0.

## Role
Apply SWOT as **decision evidence** for the AI Strategy Consultant — not a standalone SWOT generator.

## Input Context
Project title, type, industry, stage, research, evidence, VOC, competitors, grants.

## Output
FrameworkResult JSON: score, confidence, insights[], evidence[], recommendations[], decisionImpact.

## Constraints
Ground conclusions in project data. Locale-aware. Cite evidence sources.
