/**
 * Le curseur de sélection (SPEC §4.1) : en mode « cursor » seulement (runtime/mode.mjs, clic sur L3), tout ce qui marche à la
 * souris marche à la manette.
 *
 *   Stick gauche   déplace le curseur (courbe de précision) ; aimant : il ralentit sur ce qui se clique et s'y centre au repos
 *   A              clic gauche (BG3 : interagir), maintenu = glisser
 *   X              clic droit (BG3 : menu contextuel)
 *
 * B (annuler) est global (runtime/buttons.mjs), la caméra aussi (runtime/camera.mjs). La vraie souris garde la main : un vrai
 * mouvement replace le curseur virtuel sous elle et le cache.
 */
import { setting } from "../shared.mjs";
import { advance, FRICTION, MAGNET_RADIUS, nearestTarget, attract, distanceToRect } from "../core/cursor.mjs";
import * as pointer from "../adapter/pointer.mjs";
import * as board from "../adapter/canvas.mjs";
import { onFrame } from "./loop.mjs";
import * as mode from "./mode.mjs";

const state = { x: 0, y: 0, shown: false, pressed: false };
const listeners = new Set();
let lastTime = null;
let off = null;
let suspended = false;

/** Abonnement à l'état du curseur (pour le dessin, ui/cursor.mjs). */
export function onCursor(fn) {
  listeners.add(fn);
  fn({ ...state, active: mode.isCursor() });
  return () => listeners.delete(fn);
}
const publish = () => { for ( const fn of listeners ) fn({ ...state, active: mode.isCursor() }); };

export const position = () => ({ x: state.x, y: state.y });

/** Pose le curseur (et le survol) en un point écran. */
export function moveTo(x, y) {
  state.x = Math.min(Math.max(x, 0), window.innerWidth - 1);
  state.y = Math.min(Math.max(y, 0), window.innerHeight - 1);
  state.shown = true;
  pointer.move(state.x, state.y);
  publish();
}

/**
 * Suspendre le curseur pendant qu'un autre mode tient la manette (la roue d'actions) : rien n'est lu, le curseur s'efface.
 * La reprise attend l'image suivante, pour que le bouton qui ferme la roue ne clique pas aussi sous le curseur.
 */
export function suspend(on) {
  if ( on ) {
    pointer.releaseAll(state.x, state.y);
    suspended = true;
    state.shown = false;
    publish();
  } else requestAnimationFrame(() => {
    suspended = false;
    if ( mode.isCursor() ) moveTo(state.x, state.y);
  });
}

/** API : allumer (mode curseur) ou couper (mode déplacement). */
export const setActive = active => mode.set(active ? "cursor" : "move");

/** Les cibles de l'aimant autour du curseur : ce qui se clique dans l'interface, et les tokens visibles sur la toile. */
function magnetTargets() {
  const rects = pointer.clickablesNear(state.x, state.y, MAGNET_RADIUS);
  if ( board.isBoard(pointer.elementAt(state.x, state.y)) ) rects.push(...board.visibleTokens().map(t => t.rect));
  return rects;
}

function onButton(e) {
  if ( e.consumed ) return;
  const { x, y } = state;
  if ( e.button !== "a" && e.button !== "x" ) return;
  const button = e.button === "a" ? 0 : 2;
  if ( e.type === "press" ) pointer.press(x, y, button);
  else if ( e.type === "release" ) pointer.release(x, y, button);
  state.pressed = pointer.isDown(0) || pointer.isDown(2);
  state.shown = true;
  publish();
}

function onPadFrame(frame) {
  const now = performance.now();
  const dt = lastTime === null ? 0 : Math.min((now - lastTime) / 1000, 0.1);
  lastTime = now;
  if ( !frame.id ) {
    if ( pointer.isDown(0) || pointer.isDown(2) ) pointer.releaseAll(state.x, state.y);
    return;
  }
  if ( suspended || !mode.isCursor() ) return;
  for ( const e of frame.events ) onButton(e);
  if ( !dt ) return;

  const magnet = setting("magnet");
  const targets = magnet ? magnetTargets() : [];
  if ( frame.left.magnitude ) {
    // Au-dessus d'une cible, le curseur ralentit (il « colle ») ; ailleurs, vitesse pleine.
    const over = targets.some(r => distanceToRect(state, r) === 0);
    const speed = setting("cursorSpeed") * (over ? FRICTION : 1);
    const next = advance(state, frame.left, dt, speed, { width: window.innerWidth, height: window.innerHeight });
    if ( Math.abs(next.x - state.x) >= 0.25 || Math.abs(next.y - state.y) >= 0.25 || !state.shown ) moveTo(next.x, next.y);
  } else if ( magnet && !pointer.isDown(0) ) {
    // Au repos : se centrer sur la cible la plus proche (pas pendant un glisser).
    const target = nearestTarget(state, targets);
    if ( target && Math.hypot(target.center.x - state.x, target.center.y - state.y) > 0.5 ) {
      const next = attract(state, target.center, dt);
      moveTo(next.x, next.y);
    }
  }
}

/** Un vrai mouvement de souris : le curseur virtuel s'y recale et s'efface. */
function onRealMouse(event) {
  if ( !event.isTrusted ) return;
  state.x = event.clientX;
  state.y = event.clientY;
  if ( state.shown ) {
    state.shown = false;
    publish();
  }
}

export function start() {
  if ( off ) return;
  state.x = window.innerWidth / 2;
  state.y = window.innerHeight / 2;
  window.addEventListener("pointermove", onRealMouse, { capture: true, passive: true });
  off = onFrame(onPadFrame);
  mode.onMode((m, { at } = {}) => {
    if ( m !== "cursor" ) {
      pointer.releaseAll(state.x, state.y);
      state.shown = false;
      return publish();
    }
    if ( at ) moveTo(at.x, at.y);
    else moveTo(state.x, state.y);
  });
  publish();
}

export function stop() {
  pointer.releaseAll(state.x, state.y);
  window.removeEventListener("pointermove", onRealMouse, { capture: true });
  off?.();
  off = null;
}
