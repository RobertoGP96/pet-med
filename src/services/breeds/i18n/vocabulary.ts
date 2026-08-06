/**
 * Vocabulario cerrado de las APIs de razas, traducido al español.
 *
 * Las dos fuentes publican en inglés, pero tres de sus campos no son prosa
 * libre sino listas finitas: los nueve grupos del AKC que usa dogapi.dog, los
 * veinte países de origen de The Cat API y los cincuenta y pico adjetivos de
 * temperamento. Con un diccionario a mano se traducen sin red, sin clave y sin
 * riesgo de que una API caída deje media ficha en inglés.
 *
 * MÓDULO PURO: sin `fetch`, sin `process.env` y sin dependencias de Next. Se
 * prueba con Vitest (ver vocabulary.test.ts) y lo consume `../parse.ts`.
 *
 * Lo que no está aquí —nombres de raza y reseñas— vive en ./breeds.ts, que es
 * demasiado grande para escribirlo a mano.
 */

/** Minúsculas y sin acentos, para que la clave no dependa de cómo escriba la API. */
export function foldKey(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Grupos de raza del AKC, que es la clasificación que sigue dogapi.dog.
 *
 * Se traduce el sentido, no la letra: «Non-Sporting» no significa que la raza
 * no valga para el deporte, es el cajón de sastre del AKC para lo que no encaja
 * en los demás grupos.
 */
const BREED_GROUPS: Record<string, string> = {
  "foundation stock service": "Razas en desarrollo",
  "herding group": "Grupo de pastoreo",
  "hound group": "Grupo de sabuesos",
  "miscellaneous class": "Clase miscelánea",
  "non-sporting group": "Grupo de compañía",
  "sporting group": "Grupo deportivo",
  "terrier group": "Grupo de terriers",
  "toy group": "Grupo toy",
  "working group": "Grupo de trabajo",
};

/** Países de origen que publica The Cat API en el campo `origin`. */
const ORIGINS: Record<string, string> = {
  australia: "Australia",
  burma: "Birmania",
  canada: "Canadá",
  china: "China",
  cyprus: "Chipre",
  egypt: "Egipto",
  france: "Francia",
  greece: "Grecia",
  "iran (persia)": "Irán (Persia)",
  "isle of man": "Isla de Man",
  japan: "Japón",
  norway: "Noruega",
  russia: "Rusia",
  singapore: "Singapur",
  somalia: "Somalia",
  thailand: "Tailandia",
  turkey: "Turquía",
  "united arab emirates": "Emiratos Árabes Unidos",
  "united kingdom": "Reino Unido",
  "united states": "Estados Unidos",
};

/**
 * Adjetivos de temperamento de The Cat API.
 *
 * Van en masculino singular porque describen al gato, no a la raza: la ficha
 * los pinta como «Activo, Enérgico, Independiente».
 *
 * La fuente no es consistente —manda «Social» y «social», «Easy Going» y
 * «Easygoing»—, de ahí que la clave vaya plegada y que varias entradas
 * desemboquen en la misma palabra. `translateTemperament` quita los repetidos
 * que eso genera.
 */
const TEMPERAMENTS: Record<string, string> = {
  active: "Activo",
  adaptable: "Adaptable",
  adventurous: "Aventurero",
  affectionate: "Cariñoso",
  agile: "Ágil",
  alert: "Despierto",
  calm: "Tranquilo",
  clever: "Astuto",
  curious: "Curioso",
  demanding: "Exigente",
  dependent: "Apegado",
  devoted: "Fiel",
  "easy going": "Despreocupado",
  easygoing: "Despreocupado",
  energetic: "Enérgico",
  expressive: "Expresivo",
  friendly: "Amistoso",
  "fun-loving": "Divertido",
  gentle: "Apacible",
  "highly interactive": "Muy participativo",
  "highly intelligent": "Muy inteligente",
  independent: "Independiente",
  inquisitive: "Fisgón",
  intelligent: "Inteligente",
  interactive: "Participativo",
  lively: "Vivaz",
  loving: "Amoroso",
  loyal: "Leal",
  mischievous: "Travieso",
  outgoing: "Extrovertido",
  patient: "Paciente",
  peaceful: "Pacífico",
  playful: "Juguetón",
  quiet: "Silencioso",
  relaxed: "Relajado",
  sedate: "Sosegado",
  sensible: "Sensato",
  sensitive: "Sensible",
  shy: "Tímido",
  sociable: "Sociable",
  social: "Sociable",
  sweet: "Dulce",
  "sweet-tempered": "De buen carácter",
  talkative: "Hablador",
  tenacious: "Tenaz",
  trainable: "Adiestrable",
  warm: "Afectuoso",
};

/** Busca en un diccionario; devuelve el original si la clave no está. */
function lookup(dictionary: Record<string, string>, value: string): string {
  return dictionary[foldKey(value)] ?? value;
}

/**
 * Grupo de raza en español. Si la API estrenara un grupo que no está en el
 * diccionario, se devuelve tal cual: mejor una palabra en inglés que un hueco.
 */
export function translateBreedGroup(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? lookup(BREED_GROUPS, trimmed) : null;
}

/** País de origen en español. */
export function translateOrigin(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? lookup(ORIGINS, trimmed) : null;
}

/**
 * Lista de temperamentos en español, separada por comas igual que la original.
 *
 * Se quitan los repetidos porque la fuente manda pares que en español son la
 * misma palabra («Sociable, Social» -> «Sociable»), y una ficha que dijera dos
 * veces lo mismo parecería un fallo.
 */
export function translateTemperament(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;

  const translated: string[] = [];
  const seen = new Set<string>();

  for (const part of trimmed.split(",")) {
    const term = part.trim();
    if (!term) continue;

    const word = lookup(TEMPERAMENTS, term);
    const key = foldKey(word);
    if (seen.has(key)) continue;

    seen.add(key);
    translated.push(word);
  }

  return translated.length > 0 ? translated.join(", ") : null;
}
