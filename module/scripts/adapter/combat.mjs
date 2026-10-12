/**
 * Combat et interface du cœur : fin de tour, menu principal, surbrillance des objets (BG3 : Y, Menu, R3 maintenu).
 */
import { boundKey } from "./keys.mjs";
import { key } from "./pointer.mjs";
import * as engine from "./engine.mjs";

/**
 * Finir son tour (BG3 : Y) : seulement si le combattant actif est à soi, comme le bouton « Fin du tour » de la Barre.
 * @returns {boolean} true si le tour a été passé
 */
export function endMyTurn() {
  const combat = game.combat;
  const current = combat?.started ? combat.combatant : null;
  if ( !current?.isOwner ) return false;
  combat.nextTurn();
  return true;
}

/** Ouvre ou ferme le menu principal du cœur (BG3 : Menu = menu du jeu). */
export function toggleMainMenu() {
  globalThis.ui.menu?.toggle?.();
}

/** Surbrillance des objets de la scène, touche liée à `core.highlight` (Alt par défaut) tenue ou relâchée. */
export function highlight(on) {
  const bound = boundKey("core", "highlight") ?? { code: "AltLeft", key: "Alt" };
  key(bound.code, bound.key, !on);
}

/**
 * Y a-t-il quelque chose qu'Échap annulerait sans toucher au personnage ? Le cœur (client-keybindings.mjs, `#onDismiss`) ferme
 * dans l'ordre le menu principal, un menu contextuel, une visite guidée, les fenêtres — puis **relâche le token contrôlé** et
 * enfin ouvre le menu principal. BG3 : B annule, il ne lâche jamais le personnage. Le moteur, lui, écoute Échap pour sa visée,
 * son menu de clic droit et ses placements (zones, murs).
 */
export function canCancel() {
  if ( globalThis.ui.menu?.rendered || globalThis.ui.context?.element || foundry.nue?.Tour?.tourInProgress ) return true;
  if ( Object.values(globalThis.ui.windows ?? {}).length ) return true;
  for ( const app of foundry.applications.instances.values() ) if ( app.hasFrame && app.rendered ) return true;
  if ( engine.targeting() || document.querySelector(engine.MENU_ITEMS) ) return true;
  // Un placement en cours sur la toile (zone de sort, région, mur par points) : l'aperçu du calque actif n'est pas vide.
  return (canvas?.activeLayer?.preview?.children?.length ?? 0) > 0;
}
