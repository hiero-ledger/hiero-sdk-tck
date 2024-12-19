import { defineConfig } from "eslint-define-config";
import typescriptEslintPlugin from "@typescript-eslint/eslint-plugin";
import typescriptEslintParser from "@typescript-eslint/parser";
import prettierPlugin from "eslint-plugin-prettier";

export default defineConfig([
  {
    files: ["**/*.js", "**/*.ts", "**/*.tsx"],
    languageOptions: {
      parser: typescriptEslintParser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
      },
    },
    plugins: {
      "@typescript-eslint": typescriptEslintPlugin,
      prettier: prettierPlugin,
    },
    ignores: ["mochawesome-report/assets/app.js"],
    rules: {
      "no-console": ["warn", { allow: ["warn"] }],
      "prefer-const": "error",
      semi: ["error", "always"],
      curly: ["error", "all"],
      eqeqeq: ["error", "always"],
      "no-multi-spaces": ["error"],
      "no-duplicate-imports": ["error"],
      "prettier/prettier": "error",
      "@typescript-eslint/no-unused-vars": ["warn"],
    },
  },
]);
