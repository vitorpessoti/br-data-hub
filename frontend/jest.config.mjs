import nextJest from "next/jest.js";

const createJestConfig = nextJest({ dir: "./" });

const COVERED_FILES = [
  "src/modules/auth/components/signup-form.component.jsx",
  "src/modules/auth/components/reset-password-form.component.jsx",
  "src/modules/auth/components/reset-password-confirm-form.component.jsx",
  "src/modules/auth/components/signin-form.component.jsx",
  "src/stores/session.store.js",
  "src/hooks/use-session-user.hook.js",
  "src/components/ui/avatar/default-avatar.component.jsx",
  "src/components/header/user-dropdown.component.jsx",
  "src/modules/profile/components/user-meta-card.component.jsx",
  "src/modules/profile/profile.page.jsx",
  "src/config/api-client.factory.js",
  "src/utils/validate-email.util.js",
  "src/utils/validate-password.util.js",
  "src/utils/format-field.util.js",
  "src/utils/input-mask.util.js",
  "src/utils/navigation.util.js",
  "src/modules/dashboard/dashboard.page.jsx",
  "src/modules/dashboard/config/record-resources.config.js",
  "src/modules/dashboard/utils/record-form.util.js",
  "src/modules/dashboard/components/record-table-widget.component.jsx",
  "src/modules/dashboard/components/record-details-modal.component.jsx",
  "src/modules/dashboard/components/delete-record-modal.component.jsx",
  "src/modules/dashboard/components/create-record-modal.component.jsx",
  "src/modules/dashboard/components/job-lookup-modal.component.jsx",
  "src/modules/dashboard/components/record-fields.component.jsx",
  "src/modules/dashboard/components/enrichment-status-badge.component.jsx",
];

const FULL_COVERAGE = {
  statements: 100,
  branches: 100,
  functions: 100,
  lines: 100,
};

/** @type {import('jest').Config} */
const customJestConfig = {
  testEnvironment: "jest-environment-jsdom",
  setupFilesAfterEnv: ["<rootDir>/jest.setup.js"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
    // Same key next/jest uses for `.svg` by default, so this overrides it
    // instead of running alongside it (next/jest's own mock is a plain
    // `{ src, height, width }` object, not a component).
    "^.+\\.(svg)$": "<rootDir>/test/mocks/svg.mock.jsx",
  },
  testPathIgnorePatterns: ["<rootDir>/.next/", "<rootDir>/node_modules/"],
  collectCoverage: true,
  coverageProvider: "v8",
  collectCoverageFrom: COVERED_FILES,
  coverageThreshold: Object.fromEntries(
    COVERED_FILES.map((file) => [file, FULL_COVERAGE]),
  ),
};

export default createJestConfig(customJestConfig);
