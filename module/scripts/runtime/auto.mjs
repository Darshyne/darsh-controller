/**
 * Passages automatiques en curseur de sélection (runtime/mode.mjs) : quand le moteur attend un clic sur une cible (hook public
 * `targeting`, moteur §118) — le curseur part du personnage — et quand une fenêtre de dialogue s'ouvre (réaction, jet,
 * utilisation) — le curseur se pose sur son bouton par défaut. Retour au déplacement quand plus rien n'attend.
 */
import * as engine from "../adapter/engine.mjs";
import * as board from "../adapter/canvas.mjs";
import { defaultButtonOf } from "../adapter/pointer.mjs";
import * as mode from "./mode.mjs";

const dialogs = new Set();
let targeting = false;

const isDialog = app => /Dialog/.test(app?.constructor?.name ?? "")
  || app instanceof foundry.applications.api.DialogV2;

function settle() {
  if ( !targeting && !dialogs.size ) mode.endAuto();
}

export function start() {
  Hooks.on(engine.TARGETING_HOOK, state => {
    const was = targeting;
    targeting = !!state;
    if ( targeting && !was ) {
      const token = board.myToken();
      mode.set("cursor", { auto: true, at: token ? board.screenOf(token) : null });
    } else if ( !targeting ) settle();
  });
  Hooks.on("renderApplicationV2", (app, element, context, options) => {
    if ( !isDialog(app) || dialogs.has(app) ) return;
    dialogs.add(app);
    // Après la mise en place de la fenêtre (position calculée au rendu).
    requestAnimationFrame(() => mode.set("cursor", { auto: true, at: defaultButtonOf(app.element) }));
  });
  Hooks.on("closeApplicationV2", app => {
    if ( dialogs.delete(app) ) settle();
  });
}
