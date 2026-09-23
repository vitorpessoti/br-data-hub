// jest.config.mjs
export default {
  clearMocks: true,
  collectCoverage: true,
  coverageDirectory: "coverage",
  coverageProvider: "v8",
  transform: {
    // Garante que arquivos .js sejam processados pelo babel-jest
    '^.+\\.js$': 'babel-jest',
  },
  testMatch: [
    '**/__tests__/**/*.js',
    '**/?(*.)+(spec|test).js'
  ],
};
