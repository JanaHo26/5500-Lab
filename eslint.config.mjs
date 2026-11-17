// @ts-check
import eslint from "@eslint/js";
import tseslint from "typescript-eslint";

// backend only: client/ has its own linter setup
export default tseslint.config(
  { ignores: ["dist/", "coverage/", "client/", "node_modules/"] },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      // AGENTS.md: never use `any`
      "@typescript-eslint/no-explicit-any": "error",
      // a leading underscore marks a parameter Express needs but we don't use
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  }
);
