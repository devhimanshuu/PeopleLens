import config from '@peoplelens/eslint-config/next';

const eslintConfig = [
  ...config,
  {
    ignores: ['.next/**', 'out/**', 'next-env.d.ts'],
  },
];

export default eslintConfig;
