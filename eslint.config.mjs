import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,

  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "supabase/**",
  ]),

  {
    /**
     * `src/components/ui/` es código *vendorizado*: se copia tal cual desde el
     * registro de Aceternity UI con `npx shadcn add @aceternity/<nombre>` y se
     * vuelve a sobrescribir en cada actualización. Aplicarle nuestras reglas
     * sólo produciría ruido que se pierde al siguiente `add`, así que aquí se
     * relajan las que dispara su estilo (props extendidas sin usar, `any` en
     * los tipos de motion, refs leídas en render).
     *
     * Esto NO afecta al código propio: `src/components/{layout,pets,health,…}`
     * y todo `src/app`, `src/domain`, `src/server` y `src/lib` siguen con las
     * reglas completas.
     */
    files: ["src/components/ui/**/*.{ts,tsx}", "src/hooks/**/*.{ts,tsx}"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "@typescript-eslint/no-unused-expressions": "off",
      "@typescript-eslint/no-empty-object-type": "off",
      "prefer-const": "off",
      "react-hooks/exhaustive-deps": "off",
      "react-hooks/refs": "off",
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/purity": "off",
      "react-hooks/immutability": "off",
      "react-hooks/preserve-manual-memoization": "off",
      "react-hooks/static-components": "off",
      "@next/next/no-img-element": "off",
      "jsx-a11y/alt-text": "off",
    },
  },
]);

export default eslintConfig;
