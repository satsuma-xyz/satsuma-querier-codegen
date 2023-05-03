module.exports = {
  root: true,
  env: {
    browser: true,
    es6: true,
    node: true,
  },
  extends: [
    "eslint:recommended",
    "plugin:react/recommended", // Uses the recommended rules from @eslint-plugin-react
    "plugin:react/jsx-runtime",
    "plugin:@typescript-eslint/recommended", // Uses the recommended rules from the @typescript-eslint/eslint-plugin
    "plugin:prettier/recommended", // Enables eslint-plugin-prettier and eslint-config-prettier. This will display prettier errors as ESLint errors.
    "plugin:import/errors",
    "plugin:import/warnings",
    "plugin:import/typescript",
  ],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    sourceType: "module",
    ecmaVersion: 2020,
    ecmaFeatures: {
      jsx: true, // Allows for the parsing of JSX
    },
    project: ["tsconfig.json", "tsconfig.server.json"],
  },
  plugins: ["react", "@typescript-eslint", "import", "simple-import-sort"],
  settings: {
    react: {
      version: "detect", // Tells eslint-plugin-react to automatically detect the version of React to use
    },
    "import/resolver": {
      typescript: {
        alwaysTryTypes: true,
        project: ["tsconfig.json", "tsconfig.server.json"],
      },
    },
  },
  // Fine tune rules
  rules: {
    "import/no-named-as-default-member": "off",
    "import/no-named-as-default": "off",
    "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
    "@typescript-eslint/no-var-requires": 0,
    "@typescript-eslint/no-explicit-any": "off",
    "@typescript-eslint/no-empty-function": "off",
    "@typescript-eslint/no-floating-promises": ["warn", { ignoreVoid: true }],
    "@typescript-eslint/consistent-type-definitions": "warn",
    "import/first": "warn",
    "import/newline-after-import": "warn",
    "no-console": "warn",
    "import/no-restricted-paths": [
      "warn",
      {
        zones: [
          {
            target: "./src/frontend",
            from: "./src/backend",
          },
          {
            target: "./src/backend",
            from: "./src/frontend",
          },
        ],
      },
    ],
    "simple-import-sort/imports": "warn",
    "simple-import-sort/exports": "warn",
    "func-style": ["warn", "expression"],
    "prefer-arrow-callback": "warn",
  },
};
