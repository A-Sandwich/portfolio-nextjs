module.exports = {
    testEnvironment: 'node',
    transform: { '^.+\\.js$': ['babel-jest', { presets: [['@babel/preset-env', { targets: { node: 'current' } }]] }] },
    testMatch: ['**/__tests__/**/*.test.js'],
    transformIgnorePatterns: ['/node_modules/'],
};
