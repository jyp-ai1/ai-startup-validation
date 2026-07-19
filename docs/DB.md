# Database Schema

> **Status:** Scaffold — schema will be defined when Supabase is integrated (Sprint 2).

## Overview

This document tracks the database design for the AI SaaS starter kit.

## Planned Tables

### `users`

| Column | Type | Notes |
|--------|------|-------|
| `id` | `uuid` | Primary key, references auth.users |
| `email` | `text` | Unique |
| `full_name` | `text` | Nullable |
| `avatar_url` | `text` | Nullable |
| `created_at` | `timestamptz` | Default `now()` |
| `updated_at` | `timestamptz` | Default `now()` |

### `subscriptions` (Planned)

| Column | Type | Notes |
|--------|------|-------|
| `id` | `uuid` | Primary key |
| `user_id` | `uuid` | FK → users.id |
| `plan` | `text` | free, pro, enterprise |
| `status` | `text` | active, canceled, past_due |
| `stripe_customer_id` | `text` | Nullable |
| `created_at` | `timestamptz` | Default `now()` |

### `ai_conversations` (Planned)

| Column | Type | Notes |
|--------|------|-------|
| `id` | `uuid` | Primary key |
| `user_id` | `uuid` | FK → users.id |
| `title` | `text` | Nullable |
| `created_at` | `timestamptz` | Default `now()` |
| `updated_at` | `timestamptz` | Default `now()` |

### `ai_messages` (Planned)

| Column | Type | Notes |
|--------|------|-------|
| `id` | `uuid` | Primary key |
| `conversation_id` | `uuid` | FK → ai_conversations.id |
| `role` | `text` | user, assistant, system |
| `content` | `text` | Message body |
| `created_at` | `timestamptz` | Default `now()` |

## Row Level Security (RLS)

RLS policies will be defined when Supabase is integrated. All tables will enforce user-scoped access by default.

## Migrations

Migration files will live in `packages/db/migrations/` (planned).

## Changelog

| Date | Change |
|------|--------|
| 2026-07-19 | Initial database schema scaffold |
