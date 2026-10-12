/**
 * Le mode du stick gauche (SPEC §5, schéma BG3 du 2026-10-12) : « move » (déplacer le personnage, par défaut) ou « cursor »
 * (curseur de sélection). Un clic sur L3 bascule ; le module passe tout seul en curseur quand le moteur attend une cible ou
 * qu'une fenêtre de dialogue s'ouvre, et revient au déplacement quand c'est fini — sauf si le joueur a basculé lui-même.
 */
const listeners = new Set();
let mode = "move";
/** Passage en curseur fait par le module (et non par le joueur) : à défaire tout seul. */
let auto = false;

export const get = () => mode;
export const isCursor = () => mode === "cursor";

export function onMode(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/**
 * @param {"move"|"cursor"} next
 * @param {{auto?: boolean, at?: {x:number, y:number}}} [options]   `at` : où poser le curseur en y passant
 */
export function set(next, { auto: byModule = false, at = null } = {}) {
  if ( next === mode ) {
    if ( !byModule ) auto = false;
    if ( at ) for ( const fn of listeners ) fn(mode, { at });
    return;
  }
  mode = next;
  auto = byModule && next === "cursor";
  for ( const fn of listeners ) fn(mode, { at });
}

/** Le joueur bascule (clic sur L3). */
export const toggle = () => set(mode === "move" ? "cursor" : "move");

/** Fin d'un passage automatique en curseur : revenir au déplacement seulement si c'est le module qui l'avait ouvert. */
export function endAuto() {
  if ( auto && mode === "cursor" ) set("move");
}
