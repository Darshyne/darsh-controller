/**
 * Le seul fichier qui touche à la Gamepad API du navigateur (SPEC §3.2).
 *
 * On ne passe pas par `game.gamepad` du cœur (client/helpers/interaction/gamepad-manager.mjs) : il sonde toutes les
 * 100 ms et réduit les axes à tout-ou-rien. Il continue d'émettre ses faux keydown en parallèle, sans effet tant
 * qu'aucune touche n'est liée à un bouton dans les réglages des touches.
 */
import { choosePad } from "../core/pad.mjs";

/** Les manettes vues par le navigateur, en clair. Vide tant qu'aucun bouton n'a été pressé depuis le chargement. */
export function listPads() {
  return Array.from(navigator.getGamepads?.() ?? [])
    .filter(Boolean)
    .map(p => ({ index: p.index, id: p.id, mapping: p.mapping || "(none)", buttons: p.buttons.length,
      axes: p.axes.length, rumble: !!p.vibrationActuator }));
}

/**
 * L'instantané de la manette à lire, ou null : aucune manette, ou la page n'a pas le focus (le navigateur fige alors
 * les valeurs, on préfère tout relâcher).
 */
export function readPad(wantedId = "") {
  if ( !document.hasFocus() ) return null;
  const pad = choosePad(navigator.getGamepads?.(), wantedId);
  if ( !pad ) return null;
  return {
    id: pad.id,
    mapping: pad.mapping,
    timestamp: pad.timestamp,
    buttons: pad.buttons.map(b => ({ pressed: b.pressed, value: b.value })),
    axes: Array.from(pad.axes)
  };
}

/** Vibration courte (Chromium : `vibrationActuator.playEffect`). Silencieuse si non prise en charge. */
export async function rumble(wantedId = "", { duration = 120, strong = 0.6, weak = 0.4 } = {}) {
  const pad = choosePad(navigator.getGamepads?.(), wantedId);
  try {
    await pad?.vibrationActuator?.playEffect?.("dual-rumble",
      { startDelay: 0, duration, strongMagnitude: strong, weakMagnitude: weak });
  } catch { /* manette sans vibration */ }
}
