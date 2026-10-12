/**
 * Déplacement au stick (SPEC §5, étape 5 avancée à la demande de l'utilisateur, 2026-10-12) : la case voisine visée par le
 * stick gauche, en huit directions. Offsets de grille du cœur V14 : `i` = rangée (vers le bas), `j` = colonne (vers la droite).
 */

/** Inclinaison minimale pour marcher (en dessous, le personnage s'arrête). */
export const WALK_THRESHOLD = 0.45;

const DIRECTIONS = [
  { di: -1, dj: 0 }, { di: -1, dj: 1 }, { di: 0, dj: 1 }, { di: 1, dj: 1 },
  { di: 1, dj: 0 }, { di: 1, dj: -1 }, { di: 0, dj: -1 }, { di: -1, dj: -1 }
];

/** La direction (huit secteurs, haut d'abord, sens horaire) d'un stick lu par core/pad.mjs#stick, ou null. */
export function direction8(stick, threshold = WALK_THRESHOLD) {
  if ( !stick || (stick.magnitude ?? 0) < threshold ) return null;
  let angle = Math.atan2(stick.x, -stick.y);
  if ( angle < 0 ) angle += 2 * Math.PI;
  return DIRECTIONS[Math.round(angle / (Math.PI / 4)) % 8];
}

export const nextCell = (cell, dir) => ({ i: cell.i + dir.di, j: cell.j + dir.dj });

export const sameDirection = (a, b) => !!a && !!b && a.di === b.di && a.dj === b.dj;

/** Cases demandées d'un coup au moteur quand le stick reste poussé (une seule animation, arrêtée au relâchement). */
export const WALK_AHEAD = 6;

/** Les `n` cases en ligne droite devant `cell` dans la direction `dir`. */
export function lineAhead(cell, dir, n = WALK_AHEAD) {
  return Array.from({ length: n }, (_, k) => ({ i: cell.i + dir.di * (k + 1), j: cell.j + dir.dj * (k + 1) }));
}

/**
 * La dernière case atteignable en ligne droite : on avance tant que `blocked(from, to)` est faux (mur, bord de la scène).
 * @returns {{i:number, j:number}|null}  null si la première case est déjà bloquée
 */
export function farthestOpen(start, cells, blocked) {
  let last = null;
  let from = start;
  for ( const cell of cells ) {
    if ( blocked(from, cell) ) break;
    last = cell;
    from = cell;
  }
  return last;
}
