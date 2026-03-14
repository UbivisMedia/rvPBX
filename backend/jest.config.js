export default {
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  setupFiles: ['<rootDir>/tests/setup-env.js'],
  collectCoverageFrom: [
    'src/modules/**/*.js',
    'src/services/**/*.js',
    '!src/services/asterisk.service.js',
    '!src/services/ari.service.js',
    '!src/services/log-stream.service.js',
    '!src/services/socket.service.js'
  ],
  coverageThreshold: {
    global: {
      branches: 30,
      functions: 75,
      lines: 60,
      statements: 60
    }
  }
};
