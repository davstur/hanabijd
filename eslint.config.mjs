import { defineConfig, globalIgnores } from "eslint/config";
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import eslintPluginPrettierRecommended from "eslint-plugin-prettier/recommended";

export default defineConfig([
  globalIgnores([".next/**", "out/**", "node_modules/**", "functions/**"]),

  js.configs.recommended,

  ...tseslint.configs.recommended,

  eslintPluginPrettierRecommended,

  {
    files: ["**/*.{ts,tsx}"],
    rules: {
      "@typescript-eslint/explicit-module-boundary-types": "off",
      "@typescript-eslint/no-use-before-define": "off",
      "@typescript-eslint/triple-slash-reference": "off",
    },
  },
]);
