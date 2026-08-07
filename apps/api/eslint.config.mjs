import config from '@peoplelens/eslint-config/nest';

export default [
  ...config,
  {
    ignores: ['dist/**', 'node_modules/**'],
  },
];
