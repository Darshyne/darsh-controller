/**
 * Lecture pure d'une manette au « mapping standard » du navigateur (SPEC §3.2) : zone morte des sticks, seuil des
 * gâchettes, et passage d'un instantané à des évènements — appui, relâchement (tap ou après maintien), maintien,
 * répétition. Aucun global de Foundry ni du navigateur : l'instantané et l'heure arrivent en paramètres.
 */

/** Les boutons du mapping standard, dans l'ordre de `Gamepad.buttons`. Noms Xbox, la DualSense suit le même ordre. */
export const BUTTONS = Object.freeze([
  "a", "b", "x", "y", "lb", "rb", "lt", "rt", "view", "menu", "l3", "r3", "up", "down", "left", "right", "guide"
]);

/** Boutons qui se répètent quand on les garde enfoncés (navigation). Les autres donnent un seul « hold ». */
export const REPEATING = Object.freeze(new Set(["up", "down", "left", "right"]));

export const DEFAULTS = Object.freeze({
  deadzone: 0.2,          // part du rayon ignorée au centre d'un stick
  triggerThreshold: 0.5,  // une gâchette compte comme enfoncée au-delà
  holdMs: 450,            // au-delà, un appui devient un maintien
  repeatDelayMs: 400,     // premier « repeat » d'un bouton de navigation
  repeatMs: 120           // puis un toutes les…
});

/**
 * Zone morte radiale, puis remise à l'échelle : juste après la zone morte la valeur repart de 0, au bord elle vaut 1.
 * Évite la dérive au repos sans « saut » à la sortie de la zone.
 * @returns {{x:number, y:number, magnitude:number, angle:number|null}} angle en radians (0 = droite, sens horaire,
 *   l'axe y du navigateur pointant vers le bas), null au repos.
 */
export function stick(x = 0, y = 0, deadzone = DEFAULTS.deadzone) {
  const raw = Math.hypot(x, y);
  if ( !Number.isFinite(raw) || raw <= deadzone ) return { x: 0, y: 0, magnitude: 0, angle: null };
  const magnitude = Math.min(1, (raw - deadzone) / (1 - deadzone));
  return { x: x / raw * magnitude, y: y / raw * magnitude, magnitude, angle: Math.atan2(y, x) };
}

/** Valeur 0..1 d'un bouton de l'instantané (les gâchettes sont analogiques, les autres 0 ou 1). */
function valueOf(button) {
  if ( button == null ) return 0;
  if ( typeof button === "number" ) return button;
  return Number.isFinite(button.value) && button.value > 0 ? button.value : (button.pressed ? 1 : 0);
}

/** État mémorisé entre deux images. */
export function createState() {
  return { buttons: Object.fromEntries(BUTTONS.map(b => [b, { down: false, since: 0, held: false, nextRepeat: 0 }])) };
}

/**
 * Une image : compare l'instantané à l'état, le met à jour, renvoie les évènements de l'image.
 * @param {object} state           de `createState()`, modifié en place
 * @param {{buttons: Array, axes: number[]}|null} snapshot   null = manette absente ou page sans focus : tout est relâché
 * @param {number} now             horloge en ms
 * @param {object} [options]       voir DEFAULTS
 * @returns {{events: Array<{type:"press"|"release"|"hold"|"repeat", button:string, duration?:number, tap?:boolean}>,
 *   pressed: Set<string>, left: object, right: object, triggers: {lt:number, rt:number}}}
 */
export function step(state, snapshot, now, options = {}) {
  const o = { ...DEFAULTS, ...options };
  const events = [];
  const pressed = new Set();
  BUTTONS.forEach((name, i) => {
    const value = snapshot ? valueOf(snapshot.buttons?.[i]) : 0;
    const isTrigger = name === "lt" || name === "rt";
    const down = isTrigger ? value >= o.triggerThreshold : value >= 0.5;
    const b = state.buttons[name];
    if ( down ) pressed.add(name);
    if ( down && !b.down ) {
      Object.assign(b, { down: true, since: now, held: false, nextRepeat: now + o.repeatDelayMs });
      events.push({ type: "press", button: name });
    } else if ( down ) {
      if ( !b.held && now - b.since >= o.holdMs ) {
        b.held = true;
        events.push({ type: "hold", button: name, duration: now - b.since });
      }
      if ( REPEATING.has(name) && now >= b.nextRepeat ) {
        b.nextRepeat = now + o.repeatMs;
        events.push({ type: "repeat", button: name });
      }
    } else if ( b.down ) {
      events.push({ type: "release", button: name, duration: now - b.since, tap: !b.held });
      Object.assign(b, { down: false, held: false });
    }
  });
  const axes = snapshot?.axes ?? [];
  return {
    events,
    pressed,
    left: stick(axes[0], axes[1], o.deadzone),
    right: stick(axes[2], axes[3], o.deadzone),
    triggers: { lt: snapshot ? valueOf(snapshot.buttons?.[6]) : 0, rt: snapshot ? valueOf(snapshot.buttons?.[7]) : 0 }
  };
}

/**
 * La manette à lire parmi celles du navigateur : celle demandée par son id si elle est là, sinon la première au mapping
 * standard, sinon la première tout court. `pads` = sortie de `navigator.getGamepads()` (avec ses trous `null`).
 */
export function choosePad(pads, wantedId = "") {
  const list = Array.from(pads ?? []).filter(p => p && p.connected !== false);
  return (wantedId ? list.find(p => p.id === wantedId) : null)
    ?? list.find(p => p.mapping === "standard")
    ?? list[0]
    ?? null;
}
