# @peoplelens/eslint-config

Shared ESLint flat configs for the PeopleLens monorepo.

## Usage

Each workspace imports the variant matching its framework:

```js
// apps/web/eslint.config.mjs
import config from '@peoplelens/eslint-config/next';

export default [...config, { ignores: ['...'] }];
```

```js
// apps/api/eslint.config.mjs
import config from '@peoplelens/eslint-config/nest';

export default [...config];
```

## Variants

| Export | Purpose                             |
| ------ | ----------------------------------- |
| `base` | Framework-agnostic TypeScript       |
| `node` | Node.js / plain TS workspaces, root |
| `next` | Next.js (App Router) applications   |
| `nest` | NestJS applications                 |

Rules live in exactly one place — this package — so lint behavior never drifts
between workspaces. ESLint 9 flat config and TypeScript ESLint 8 underpin it.
