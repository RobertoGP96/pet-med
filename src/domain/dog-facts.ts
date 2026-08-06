/**
 * Curiosidades caninas del bloque «¿Sabías que…?» del mural.
 *
 * Antes salían de `dogapi.dog/api/v2/facts`, que sólo publica en inglés y no
 * tiene parámetro de idioma. Como son cuatro líneas de adorno, sale más a
 * cuenta tenerlas escritas aquí: se leen en español, no dependen de que una API
 * responda y el mural deja de tener una petición de red por visita.
 *
 * MÓDULO PURO, como todo `src/domain`: la función recibe el `now` en vez de
 * leer el reloj por su cuenta, que es lo que la hace testeable.
 */

/**
 * Las curiosidades, todas comprobables.
 *
 * Al añadir una: que sea un dato de perros en general —no de una raza rara— y
 * que quepa en dos líneas, que es el alto que tiene el bloque en el mural.
 */
export const DOG_FACTS: readonly string[] = [
  "El dibujo de la nariz de un perro es único: funciona igual que una huella dactilar.",
  "Un perro tiene unos 300 millones de receptores olfativos. Una persona ronda los seis millones.",
  "Los perros no sudan por la piel: lo hacen por las almohadillas de las patas y se refrescan jadeando.",
  "El galgo es el perro más rápido: alcanza los 70 km/h, casi lo mismo que un caballo de carreras.",
  "Los cachorros nacen sordos y ciegos. No abren los ojos hasta las dos semanas de vida.",
  "Un perro adulto tiene 42 dientes; de cachorro sólo tuvo 28 de leche.",
  "Los perros mueven la cola más hacia la derecha cuando algo les gusta, y hacia la izquierda cuando les inquieta.",
  "La temperatura normal de un perro está entre 38 y 39 °C, más alta que la nuestra.",
  "Oyen frecuencias de hasta 45.000 Hz. El oído humano se queda en 20.000.",
  "Mueven cada oreja por separado gracias a unos dieciocho músculos.",
  "El basenji no ladra: emite un sonido gorgoteante parecido a un canto tirolés.",
  "Los perros distinguen bien el azul y el amarillo, pero confunden el rojo con el verde.",
  "El chow chow y el shar pei tienen la lengua de color azul oscuro.",
  "Los perros de razas grandes viven menos años que los de razas pequeñas.",
  "Una misma camada puede tener cachorros de más de un padre.",
  "Los perros tienen un tercer párpado que mantiene el ojo limpio y húmedo.",
  "El terranova tiene los dedos palmeados y el pelo impermeable: nada como pocos.",
  "Los dálmatas nacen completamente blancos. Las manchas les salen en las primeras semanas.",
  "Un border collie llamado Chaser aprendió a reconocer más de mil juguetes por su nombre.",
  "El perro fue el primer animal que domesticamos, hace más de 15.000 años.",
  "Enfocan mal lo que tienen a menos de un palmo: ahí se guían por el olfato y los bigotes.",
  "Las almohadillas llevan una capa de grasa que las aísla del suelo frío.",
  "Los perros bostezan por contagio, también cuando bosteza una persona a la que conocen.",
  "Mientras duermen tienen fases de sueño parecidas a las nuestras: sueñan.",
];

/**
 * La curiosidad del día.
 *
 * Rota cada día en vez de sortearse en cada visita: así el mural no baila entre
 * recargas, que es justo lo que se buscaba con la caché de un día que tenía la
 * API. Se cuenta por días desde la época en UTC, para que el resultado no
 * dependa de la zona horaria del servidor.
 */
export function pickDogFact(now: Date): string {
  const day = Math.floor(now.getTime() / 86_400_000);
  // El resto de un negativo es negativo en JavaScript: hay que reajustarlo para
  // que una fecha anterior a 1970 no salga del array.
  const index = ((day % DOG_FACTS.length) + DOG_FACTS.length) % DOG_FACTS.length;

  return DOG_FACTS[index];
}
