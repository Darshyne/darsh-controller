/**
 * Déplacer le personnage au stick gauche (mode « move », BG3), en marche fluide (demande de l'utilisateur, 2026-10-12) :
 * tant que le stick reste poussé, on demande au moteur jusqu'à `WALK_AHEAD` cases en ligne droite d'un coup — une seule
 * animation, sans arrêt à chaque case — en s'arrêtant devant un mur ou le bord de la scène. Lâcher le stick ou changer de
 * direction arrête la marche à la case suivante (`api.stopWalks`), puis repart dans la nouvelle direction.
 *
 * Chaque marche passe par `api.approach` (portes, cases occupées, attaques d'opportunité, mouvement du tour) ; sans moteur,
 * par le déplacement du cœur (`TokenDocument#move`). Une direction refusée n'est pas réessayée tant que le stick la garde.
 * Un grimpeur (au mur, au plafond : moteur §196) marche à sa hauteur, le long du mur ou sous le plafond — jamais vers une case où il ne
 * tiendrait (`api.climb.holds`) : la marche s'arrête avant, et une direction sans prise est refusée comme un mur.
 */
import { direction8, sameDirection, lineAhead, farthestOpen, blockedOrLoose } from "../core/move.mjs";
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
  // En escalade (moteur §196), la ligne s'arrête à la dernière case où le grimpeur tient : le long du mur, sous le plafond.
  const holds = cell => engine.climbHolds(token.document, cell);
  const target = farthestOpen(start, lineAhead(start, dir), blockedOrLoose(board.stepBlocked, holds));
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
