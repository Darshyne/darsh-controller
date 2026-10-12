/**
 * La boucle de lecture : une lecture de la manette par image (`requestAnimationFrame`), transformée par core/pad.mjs.
 * Deux sorties :
 * - `onFrame(fn)` : chaque image, pour ce qui suit les sticks en continu (diagnostic, curseur, caméra) ;
 * - le hook `darsh-controller.input` (`Hooks.callAll`, un appel par évènement), pour les appuis, maintiens, relâchements.
 */
import { MODULE_ID, setting, log } from "../shared.mjs";
import { createState, step } from "../core/pad.mjs";
import { readPad } from "../adapter/gamepad.mjs";
import { padOptions } from "../adapter/settings.mjs";

const listeners = new Set();
let state = createState();
let handle = null;
let lastId = null;
/** La dernière image, lisible par l'API. */
export let current = null;

export function onFrame(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function tick(now) {
  handle = requestAnimationFrame(tick);
  let snapshot = null;
  try {
    snapshot = setting("enabled") ? readPad(setting("padId")) : null;
  } catch ( err ) { log.error(err); }
  if ( (snapshot?.id ?? null) !== lastId ) {
    lastId = snapshot?.id ?? null;
    if ( lastId ) log.info(`manette lue : ${lastId} (${snapshot.mapping || "mapping non standard"})`);
  }
  const frame = step(state, snapshot, now, padOptions());
  frame.id = snapshot?.id ?? null;
  frame.mapping = snapshot?.mapping ?? null;
  frame.raw = snapshot;
  current = frame;
  for ( const event of frame.events ) Hooks.callAll(`${MODULE_ID}.input`, event, frame);
  for ( const fn of listeners ) {
    try { fn(frame); } catch ( err ) { log.error(err); }
  }
}

export function start() {
  if ( handle !== null ) return;
  state = createState();
  handle = requestAnimationFrame(tick);
}

export function stop() {
  if ( handle !== null ) cancelAnimationFrame(handle);
  handle = null;
}
