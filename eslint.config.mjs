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

  /*
   * Aquí había una excepción que relajaba una quincena de reglas sobre
   * `src/components/ui/` y `src/hooks/`, porque eran código vendorizado del
   * registro de Aceternity y aplicarles nuestras reglas sólo producía ruido que
   * se perdía en la siguiente actualización.
   *
   * Ya no hay código vendorizado: de los 28 componentes copiados sólo se usaban
   * tres, y al retirar los otros 25 la carpeta quedó con código propio. Mantener
   * la excepción habría sido peor que inútil — habría apagado esas reglas
   * justo sobre los componentes que más se usan en toda la interfaz.
   *
   * Si en el futuro se vuelve a traer algo del registro, esta excepción se
   * restaura acotada a los archivos concretos que se hayan copiado, no a la
   * carpeta entera.
   */
]);

export default eslintConfig;
