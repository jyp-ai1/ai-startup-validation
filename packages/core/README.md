# @repo/core

Backend infrastructure layer — env validation, logging, errors, API responses, validation, repository/service patterns.

## Modules

| Import | Description |
|--------|-------------|
| `@repo/core/env` | Validated environment variables |
| `@repo/core/logger` | Structured logger |
| `@repo/core/errors` | BaseError hierarchy |
| `@repo/core/response` | ApiResponse helpers |
| `@repo/core/validation` | Zod parseRequest/parseResponse |
| `@repo/core/repository` | BaseRepository interface |
| `@repo/core/service` | BaseService abstract class |

See [BACKEND_ARCHITECTURE.md](../../docs/BACKEND_ARCHITECTURE.md) for usage patterns.
