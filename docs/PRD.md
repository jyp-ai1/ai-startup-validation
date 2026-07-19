# Product Requirements Document (PRD)

## Overview

**Project:** AI SaaS Starter Kit  
**Version:** 0.1.0  
**Status:** Sprint 0 — Foundation

## Vision

A production-ready boilerplate that serves as the foundation for all future AI-powered SaaS products. Optimized for AI-assisted development with clear structure, documentation, and conventions.

## Goals

1. **Developer Experience** — Fast setup, consistent tooling, monorepo structure
2. **AI-Friendly** — Well-documented architecture that AI agents can understand and extend
3. **Production-Ready** — TypeScript, linting, formatting, and CI foundations from day one
4. **Extensible** — Modular packages for shared UI, config, and database layers

## Target Users

- Solo developers building AI SaaS products
- Teams starting new projects with a proven foundation
- AI coding agents (Cursor, etc.) as first-class consumers of project context

## Core Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 15 (App Router) |
| UI | React 19, Tailwind CSS |
| Language | TypeScript |
| Package Manager | pnpm (workspace) |
| Linting | ESLint |
| Formatting | Prettier |

## Out of Scope (Sprint 0)

- shadcn/ui components
- Supabase / database integration
- MCP server setup
- Authentication
- Billing / payments

## Success Criteria

- [x] Monorepo structure (`apps/`, `packages/`, `docs/`, etc.)
- [x] Next.js 15 app running with App Router
- [x] TypeScript, Tailwind, ESLint, Prettier configured
- [x] Documentation scaffold (PRD, ROADMAP, API, DB)
- [x] Git repository initialized

## Future Epics

See [ROADMAP.md](./ROADMAP.md) for the full development plan.
