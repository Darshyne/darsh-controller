/**
 * DAS · Controller (darsh-controller) — point d'entrée. Voir SPEC.md (prive/SPEC.md une fois le dépôt créé).
 *
 * Alpha (SPEC §10), schéma de commandes de BG3 (SPEC §5) : lecture de la manette et diagnostic, déplacement au stick,
 * curseur de sélection avec aimant, roue d'actions, boutons globaux.
 */
import { MODULE_ID } from "./shared.mjs";
import { registerSettings } from "./adapter/settings.mjs";
import { listPads, rumble } from "./adapter/gamepad.mjs";
import * as loop from "./runtime/loop.mjs";
import * as mode from "./runtime/mode.mjs";
import * as wheel from "./runtime/wheel.mjs";
import * as cursor from "./runtime/cursor.mjs";
import * as move from "./runtime/move.mjs";
import * as camera from "./runtime/camera.mjs";
import * as buttons from "./runtime/buttons.mjs";
import * as auto from "./runtime/auto.mjs";
import { Diagnostic } from "./ui/diagnostic.mjs";
import { mountCursor } from "./ui/cursor.mjs";
import { mountWheel } from "./ui/wheel.mjs";
import { mountHint } from "./ui/hint.mjs";

let diagnostic = null;

Hooks.once("init", () => {
  registerSettings({ diagnosticMenu: Diagnostic });
});

Hooks.once("ready", () => {
  mountCursor();
  mountWheel();
  mountHint();
  // Ordre de lecture de chaque image : la roue d'abord (elle marque `consumed` ce qu'elle prend), puis le reste.
  wheel.start();
  cursor.start();
  move.start();
  camera.start();
  buttons.start();
  auto.start();
  loop.start();
  game.modules.get(MODULE_ID).api = Object.freeze({
    version: game.modules.get(MODULE_ID).version,
    /** Les manettes vues par le navigateur. */
    pads: () => listPads(),
    /** La dernière image lue : `{ id, pressed, left, right, triggers, events }`. */
    frame: () => loop.current,
    /** Ouvre le panneau de diagnostic. */
    diagnostic: () => (diagnostic ??= new Diagnostic()).render({ force: true }),
    rumble: options => rumble(game.settings.get(MODULE_ID, "padId"), options),
    onFrame: loop.onFrame,
    /** Le mode du stick gauche : "move" (déplacer le personnage) ou "cursor" (curseur de sélection). */
    mode: Object.freeze({ get: mode.get, set: m => mode.set(m), toggle: mode.toggle, onChange: mode.onMode }),
    /** Le curseur de sélection : position écran, allumer / couper. */
    cursor: Object.freeze({ position: cursor.position, moveTo: cursor.moveTo, setActive: cursor.setActive, onChange: cursor.onCursor }),
    /** La roue d'actions : ouvrir, fermer, état. */
    wheel: Object.freeze({ open: wheel.open, close: wheel.close, isOpen: wheel.isOpen, onChange: wheel.onWheel })
  });
});
