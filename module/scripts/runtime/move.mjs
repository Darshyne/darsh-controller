/**
 * Déplacer le personnage au stick gauche (mode « move », BG3), en marche fluide (demande de l'utilisateur, 2026-10-12) :
 * tant que le stick reste poussé, on demande au moteur jusqu'à `WALK_AHEAD` cases en ligne droite d'un coup — une seule
 * animation, sans arrêt à chaque case — en s'arrêtant devant un mur ou le bord de la scène. Lâcher le stick ou changer de
 * direction arrête la marche à la case suivante (`api.stopWalks`), puis repart dans la nouvelle direction.
 *
 * Chaque marche passe par `api.approach` (portes, cases occupées, attaques d'opportunité, mouvement du tour) ; sans moteur,
 * par le déplacement du cœur (`TokenDocument#move`). Une direction refusée n'est pas réessayée tant que le stick la garde.
 */
import { direction8, sameDirection, lineAhead, farthestOpen } from "../core/move.mjs";
import * as board from "../adapter/canvas.mjs";
import * as engine from "../adapter/engine.mjs";
import { log } from "../shared.mjs";
import { onFrame } from "./loop.mjs";
import * as mode from "./mode.mjs";
import * as wheel from "./wheel.mjs";

/** Marche en cours : `{ dir, stopping }`, ou null. */
let walking = null;
let blocked = null;
let lastFollow = 0;
let off = null;

async function walk(dir) {
  const token = board.myToken();
  if ( !token ) return;
  const start = board.cellOf(token);
  const target = farthestOpen(start, lineAhead(start, dir), board.stepBlocked);
  if ( !target ) {
    blocked = dir;
    return;
  }
  walking = { dir, stopping: false };
  try {
    let result;
    if ( engine.active() ) result = await engine.approach(token.document, [target]);
    else {
      const p = canvas.grid.getTopLeftPoint(target);
      result = { arrived: (await token.document.move([{ x: p.x, y: p.y }])) !== false };
    }
    // Refusé ou épuisé (mouvement du tour, case occupée) sans qu'on l'ait arrêté : ne pas réessayer dans cette direction.
    if ( !result.arrived && !walking.stopping ) blocked = dir;
  } catch ( err ) {
    log.error(err);
    blocked = dir;
  } finally {
    walking = null;
    board.keepInView(token);
  }
}

function stopWalk() {
  if ( !walking || walking.stopping ) return;
  walking.stopping = true;
  engine.stopWalks();
}

function onPadFrame(frame) {
  if ( !frame.id || mode.isCursor() || wheel.isOpen() ) {
    if ( walking ) stopWalk();
    return;
  }
  const dir = direction8(frame.left);
  if ( walking ) {
    // Pendant la marche : la caméra suit (au plus toutes les 300 ms), et on s'arrête si le stick change d'avis.
    const now = performance.now();
    if ( now - lastFollow > 300 ) {
      lastFollow = now;
      board.keepInView(board.myToken());
    }
    if ( !sameDirection(dir, walking.dir) ) stopWalk();
    return;
  }
  if ( !dir ) {
    blocked = null;
    return;
  }
  if ( sameDirection(dir, blocked) ) return;
  blocked = null;
  walk(dir);
}

export function start() {
  off ??= onFrame(onPadFrame);
}

export function stop() {
  stopWalk();
  off?.();
  off = null;
}
