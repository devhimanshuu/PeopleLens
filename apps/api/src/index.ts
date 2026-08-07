import 'reflect-metadata';
import { register } from 'tsconfig-paths';

// Register the TypeScript path aliases (@app/*) BEFORE the application modules
// load. `main` is imported dynamically so its `require()` calls run after this
// registration — otherwise the first `@app/*` import would throw at runtime.
// `register()` resolves tsconfig.json relative to the current working
// directory, which pnpm/turbo scripts set to the app root.
register();

void import('./main');
