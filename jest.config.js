module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  collectCoverageFrom: ['**/*.(t|j)s'],
  coverageDirectory: '../coverage',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@auth/(.*)$': '<rootDir>/src/auth/$1',
    '^@users/(.*)$': '<rootDir>/src/users/$1',
    '^@permissions/(.*)$': '<rootDir>/src/permissions/$1',
    '^@roles/(.*)$': '<rootDir>/src/roles/$1',
    '^@refresh-token/(.*)$': '<rootDir>/src/refresh-token/$1',
    '^@user-profile/(.*)$': '<rootDir>/src/user-profile/$1',
    '^@user-token/(.*)$': '<rootDir>/src/user-token/$1',
    '^@dto/(.*)$': '<rootDir>/src/dto/$1',
    '^@mail/(.*)$': '<rootDir>/src/mail/$1',
    '@common/(.*)$': '<rootDir>/src/common/$1',
  },
};
