/**
 * Faux évènements de souris et de clavier (SPEC §4.1) : le seul fichier qui en émet.
 *
 * PIXI 7.4 (la toile) écoute `pointerdown` sur sa vue, `pointermove` sur le document, `pointerup` sur la fenêtre
 * (node_modules/@pixi/events/lib/EventSystem.mjs:175), sans tester `isTrusted` : un PointerEvent émis ici vaut un vrai.
 * Le gestionnaire de clavier du cœur écoute `keydown`/`keyup` sur la fenêtre
 * (client/helpers/interaction/keyboard-manager.mjs:26). Limites connues : pas de glisser-déposer HTML natif
 * (`dragstart`), pas d'ouverture des `<select>` natifs, pas de `:hover` CSS.
 */
import { buttonsMask, clickCount } from "../core/cursor.mjs";
import { MENU_ITEMS } from "./engine.mjs";

const down = new Set();
let hovered = null;
let pressTarget = null;
let lastClick = null;

/** L'élément sous un point (le curseur dessiné a `pointer-events: none`). */
export function elementAt(x, y) {
  return document.elementFromPoint(x, y) ?? document.body;
}

function init(x, y, extra = {}) {
  return {
    bubbles: true, cancelable: true, composed: true, view: window,
    clientX: x, clientY: y, screenX: window.screenX + x, screenY: window.screenY + y,
    buttons: buttonsMask(down), ...extra
  };
}
const pointer = (type, x, y, extra = {}) => new PointerEvent(type,
  init(x, y, { pointerId: 1, pointerType: "mouse", isPrimary: true, width: 1, height: 1, ...extra }));
const mouse = (type, x, y, extra = {}) => new MouseEvent(type, init(x, y, extra));

/** Survol : out / leave sur l'ancien élément, over / enter sur le nouveau (les enter / leave ne remontent pas). */
function hover(target, x, y) {
  if ( target === hovered ) return;
  const previous = hovered;
  hovered = target;
  if ( previous?.isConnected ) {
    previous.dispatchEvent(pointer("pointerout", x, y, { relatedTarget: target }));
    previous.dispatchEvent(mouse("mouseout", x, y, { relatedTarget: target }));
    previous.dispatchEvent(pointer("pointerleave", x, y, { bubbles: false, relatedTarget: target }));
    previous.dispatchEvent(mouse("mouseleave", x, y, { bubbles: false, relatedTarget: target }));
  }
  target.dispatchEvent(pointer("pointerover", x, y, { relatedTarget: previous }));
  target.dispatchEvent(mouse("mouseover", x, y, { relatedTarget: previous }));
  target.dispatchEvent(pointer("pointerenter", x, y, { bubbles: false, relatedTarget: previous }));
  target.dispatchEvent(mouse("mouseenter", x, y, { bubbles: false, relatedTarget: previous }));
}

export function move(x, y) {
  const target = elementAt(x, y);
  hover(target, x, y);
  target.dispatchEvent(pointer("pointermove", x, y));
  target.dispatchEvent(mouse("mousemove", x, y));
}

/** Ce qu'un vrai clic focalise : le premier ancêtre focalisable, sinon on retire le focus courant. */
function focusFor(target) {
  const focusable = target.closest?.("input, textarea, select, button, a[href], [tabindex], [contenteditable='true']");
  if ( focusable && !focusable.disabled ) focusable.focus({ preventScroll: true });
  else if ( document.activeElement && document.activeElement !== document.body ) document.activeElement.blur();
}

export function press(x, y, button = 0) {
  if ( down.has(button) ) return;
  const target = elementAt(x, y);
  hover(target, x, y);
  down.add(button);
  pressTarget = target;
  const extra = { button };
  const allowed = target.dispatchEvent(pointer("pointerdown", x, y, extra));
  if ( allowed ) target.dispatchEvent(mouse("mousedown", x, y, extra));
  if ( button === 0 ) focusFor(target);
}

export function release(x, y, button = 0) {
  if ( !down.has(button) ) return;
  down.delete(button);
  const target = elementAt(x, y);
  const extra = { button };
  target.dispatchEvent(pointer("pointerup", x, y, extra));
  target.dispatchEvent(mouse("mouseup", x, y, extra));
  const started = pressTarget;
  pressTarget = null;
  if ( button === 2 ) {
    target.dispatchEvent(mouse("contextmenu", x, y, extra));
    return;
  }
  // Le clic part sur l'ancêtre commun de l'appui et du relâchement, comme dans le navigateur.
  let clickTarget = target;
  while ( clickTarget && started && !clickTarget.contains(started) ) clickTarget = clickTarget.parentElement;
  if ( !clickTarget ) return;
  const now = performance.now();
  const count = clickCount(lastClick, { button, time: now, x, y });
  lastClick = { button, time: now, x, y, count };
  clickTarget.dispatchEvent(mouse("click", x, y, { ...extra, detail: count }));
  if ( count === 2 ) clickTarget.dispatchEvent(mouse("dblclick", x, y, { ...extra, detail: 2 }));
}

/** Relâche tout (perte de manette, curseur coupé). */
export function releaseAll(x, y) {
  for ( const button of [...down] ) release(x, y, button);
}

export const isDown = button => down.has(button);

/** Touche du clavier, envoyée à l'élément focalisé (elle remonte jusqu'à la fenêtre). */
export function key(code, keyName, up = false, repeat = false) {
  const target = document.activeElement ?? document.body;
  target.dispatchEvent(new KeyboardEvent(up ? "keyup" : "keydown",
    { code, key: keyName, repeat, bubbles: true, cancelable: true, composed: true, view: window }));
}

/**
 * Ce qui se clique dans l'interface HTML (aimant du curseur). Les grands blocs (une fenêtre entière portant un
 * `data-action`) sont écartés par leur taille.
 */
const CLICKABLE = [
  "button", "a[href]", "[data-action]", "input:not([type=hidden])", "select", "textarea", "label[for]",
  "[role=button]", "[role=menuitem]", "[role=tab]", "[role=option]", "li.context-item", MENU_ITEMS,
  ".ddu-cell[data-ref]", ".ddu-weapon", ".ddu-party__member", ".ddu-frieze__slot", ".directory-item", "[data-tooltip]"
].join(", ");
const MAX_W = 360;
const MAX_H = 160;

/**
 * Les rectangles cliquables autour d'un point : sous le point, puis sur deux cercles de sondage (rayon/2, rayon). Rien
 * au-dessus de la toile : les tokens ont leur propre aimant (adapter/canvas.mjs).
 */
export function clickablesNear(x, y, radius) {
  const found = new Set();
  const probe = (px, py) => {
    const el = document.elementFromPoint(px, py);
    if ( !el || el.id === "board" ) return;
    const hit = el.closest(CLICKABLE);
    if ( hit && !hit.disabled ) found.add(hit);
  };
  probe(x, y);
  for ( const r of [radius / 2, radius] ) {
    for ( let k = 0; k < 8; k++ ) probe(x + Math.cos(k * Math.PI / 4) * r, y + Math.sin(k * Math.PI / 4) * r);
  }
  return [...found].map(el => el.getBoundingClientRect())
    .filter(r => r.width > 0 && r.height > 0 && r.width <= MAX_W && r.height <= MAX_H);
}

/** Le centre du bouton par défaut d'une fenêtre (sinon son premier bouton), pour y poser le curseur. */
export function defaultButtonOf(element) {
  // Dans l'ordre de préférence (une liste de sélecteurs rendrait le premier du document : le bouton de l'en-tête).
  const PREFERRED = ["button[autofocus]", "button.default", ".window-content footer button", ".form-footer button",
    ".window-content button"];
  let button = null;
  for ( const selector of PREFERRED ) if ( (button = element?.querySelector(selector)) ) break;
  if ( !button ) return null;
  const r = button.getBoundingClientRect();
  return r.width ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : null;
}

/** Le premier ancêtre défilable sous le point, ou null. */
export function scrollableAt(x, y) {
  for ( let el = elementAt(x, y); el && el !== document.body; el = el.parentElement ) {
    const style = getComputedStyle(el);
    const can = axis => {
      const overflow = style[axis === "y" ? "overflowY" : "overflowX"];
      return /(auto|scroll)/.test(overflow)
        && (axis === "y" ? el.scrollHeight > el.clientHeight : el.scrollWidth > el.clientWidth);
    };
    if ( can("y") || can("x") ) return el;
  }
  return null;
}
