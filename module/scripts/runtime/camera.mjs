/**
 * La caméra, dans les deux modes (BG3 : stick droit = déplacer la caméra).
 *
 *   Stick droit          panoramique ; en mode curseur au-dessus d'une fenêtre, la fait défiler
 *   LT / RT              zoom arrière / avant, proportionnel à l'enfoncement (choix de l'utilisateur, 2026-10-12) ;
 *                        autour du curseur en mode curseur, du personnage sinon
 *   R3 tapé              recentrer sur son personnage ; R3 maintenu = infos du monde (runtime/buttons.mjs)
 */
import { setting } from "../shared.mjs";
import { delta, zoomFactor } from "../core/cursor.mjs";
import * as pointer from "../adapter/pointer.mjs";
import * as board from "../adapter/canvas.mjs";
import { onFrame } from "./loop.mjs";
import * as mode from "./mode.mjs";
import * as cursor from "./cursor.mjs";
import * as wheel from "./wheel.mjs";

let lastTime = null;
let off = null;

function onPadFrame(frame) {
  const now = performance.now();
  const dt = lastTime === null ? 0 : Math.min((now - lastTime) / 1000, 0.1);
  lastTime = now;
  if ( !frame.id || !dt || wheel.isOpen() ) return;
  const at = mode.isCursor() ? cursor.position() : { x: window.innerWidth / 2, y: window.innerHeight / 2 };

  // Zoom autour du curseur, ou du personnage en mode déplacement.
  const factor = zoomFactor(frame.triggers, dt);
  if ( factor !== 1 ) {
    const mine = mode.isCursor() ? null : board.myToken();
    const focus = mine ? board.screenOf(mine) : at;
    board.zoomAt(factor, focus.x, focus.y);
  }

  if ( !frame.right.magnitude ) return;
  const d = delta(frame.right, dt, setting("panSpeed"));
  const scroller = mode.isCursor() && !board.isBoard(pointer.elementAt(at.x, at.y)) ? pointer.scrollableAt(at.x, at.y) : null;
  if ( scroller ) scroller.scrollBy(d.x, d.y);
  else board.panBy(d.x, d.y);
}

export function start() {
  off ??= onFrame(onPadFrame);
}

export function stop() {
  off?.();
  off = null;
}
