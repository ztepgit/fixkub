import js from "@eslint/js";

export default [
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "dist/**",
      "coverage/**",
      "public/**",
    ],
  },
  js.configs.recommended,
];