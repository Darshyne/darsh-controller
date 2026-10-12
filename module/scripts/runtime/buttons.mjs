/**
 * Les boutons globaux, d'après le schéma de BG3 (capture fournie par l'utilisateur, 2026-10-12) :
 *
 *   B                annuler / quitter (Échap), seulement s'il y a quelque chose à annuler : sinon Échap relâcherait le token
 *   Y maintenu       fin du tour (maintenu : pas d'accident, la Barre n'a pas de touche pour ça)
 *   Menu             menu du jeu (menu principal du cœur)
 *   L3 (clic)        basculer curseur de sélection / contrôle du personnage (choix de l'utilisateur, 2026-10-12)
 *   R3               tapé : recentrer ; maintenu : infos du monde (surbrillance des objets)
 *   Croix ← / →      cible précédente / suivante : le curseur saute de token en token
 *   Croix ↑          personnage suivant (BG3 : LT, gérer le groupe — LT zoome ici, choix de l'utilisateur)
 *   Croix ↓          la roue sur la page Personnalisé (BG3 : RT, menu des raccourcis)
 *
 * LB / RB (roue) sont dans runtime/wheel.mjs, LT / RT (zoom) dans runtime/camera.mjs, A / X (clics) dans runtime/cursor.mjs. Un évènement marqué `consumed` (par
 * la roue ouverte) est ignoré.
 */
import { loc } from "../shared.mjs";
import * as pointer from "../adapter/pointer.mjs";
import * as board from "../adapter/canvas.mjs";
import { endMyTurn, toggleMainMenu, highlight, canCancel } from "../adapter/combat.mjs";
import { onFrame } from "./loop.mjs";
import * as mode from "./mode.mjs";
import * as wheel from "./wheel.mjs";

let off = null;
let targetIndex = -1;

function tap(code, key) {
  pointer.key(code, key);
  pointer.key(code, key, true);
}

/** Croix ← / → : le token visible suivant, par distance au personnage (le plus proche d'abord). */
function cycleTarget(delta) {
  const mine = board.myToken();
  const from = mine ? board.screenOf(mine) : { x: window.innerWidth / 2, y: window.innerHeight / 2 };
  const tokens = board.visibleTokens().filter(t => t.token !== mine)
    .map(t => ({ ...t, center: { x: (t.rect.left + t.rect.right) / 2, y: (t.rect.top + t.rect.bottom) / 2 } }))
    .filter(t => t.center.x >= 0 && t.center.y >= 0 && t.center.x < window.innerWidth && t.center.y < window.innerHeight)
    .sort((a, b) => Math.hypot(a.center.x - from.x, a.center.y - from.y) - Math.hypot(b.center.x - from.x, b.center.y - from.y));
  if ( !tokens.length ) return;
  targetIndex = ((targetIndex + delta) % tokens.length + tokens.length) % tokens.length;
  mode.set("cursor", { auto: true, at: tokens[targetIndex].center });
}

function onEvent(e) {
  if ( e.consumed ) return;
  const { type, button } = e;
  switch ( button ) {
    case "b": if ( type === "press" && canCancel() ) tap("Escape", "Escape"); break;
    case "y":
      if ( type === "hold" && !endMyTurn() ) globalThis.ui.notifications.info(loc("Bouton.PasTonTour"));
      break;
    case "menu": if ( type === "press" ) toggleMainMenu(); break;
    case "l3": if ( type === "press" ) mode.toggle(); break;
    case "r3":
      if ( type === "hold" ) highlight(true);
      else if ( type === "release" ) {
        if ( e.tap ) board.recenter();
        else highlight(false);
      }
      break;
    case "up": if ( type === "press" ) board.controlNextOwned(1); break;
    case "down": if ( type === "press" ) wheel.open("custom"); break;
    case "left": if ( type === "press" || type === "repeat" ) cycleTarget(-1); break;
    case "right": if ( type === "press" || type === "repeat" ) cycleTarget(1); break;
  }
}

export function start() {
  off ??= onFrame(frame => {
    if ( !frame.id ) return;
    for ( const e of frame.events ) onEvent(e);
  });
}

export function stop() {
  off?.();
  off = null;
}
