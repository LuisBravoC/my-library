export interface List {
  id: string;
  title: string;
  /** Identificador público para URLs (/lista/mi-top-rpg). Inmutable. */
  slug: string;
  description: string;
  /** Estilo de notas de la lista: 'sutil' | 'destacado'. */
  notesStyle: 'sutil' | 'destacado';
}

export interface ListItem {
  id: string;
  listId: string;
  store: 'steam' | 'gog';
  gameId: number;
  /** Título capturado al añadir (por si el juego sale de la biblioteca). */
  title: string;
  note: string;
  position: number;
}
