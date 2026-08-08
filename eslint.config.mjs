import nodeConfig from '@peoplelens/eslint-config/node';
import nestConfig from '@peoplelens/eslint-config/nest';
import nextConfig from '@peoplelens/eslint-config/next';

/** Root-level config: handles root files and scopes workspace-specific rules when linting from repo root. */
export default [
  ...nodeConfig,
  ...nestConfig.map((c) =>
    c.rules || c.plugins || c.languageOptions || c.settings
      ? { ...c, files: ['apps/api/**/*'] }
      : c,
  ),
  ...nextConfig.map((c) =>
    c.rules || c.plugins || c.languageOptions || c.settings
      ? { ...c, files: ['apps/web/**/*', 'packages/ui/**/*'] }
      : c,
  ),
];
