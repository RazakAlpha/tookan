/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: "node",
  testMatch: ["**/tests/**/*.test.js"],
  collectCoverageFrom: ["src/**/*.js"],
  coveragePathIgnorePatterns: ["/node_modules/"],
  testPathIgnorePatterns: ["/node_modules/", "/mnt/", "/coverage/"],
  watchPathIgnorePatterns: ["/mnt/", "/coverage/"],
};
