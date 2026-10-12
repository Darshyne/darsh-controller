/**
 * L'indicateur de mode (demande de l'utilisateur, 2026-10-12 : « je ne sais pas comment on bascule de l'un à l'autre ») : une
 * pastille en bas de l'écran, visible tant qu'une manette est lue — le mode du stick gauche et le bouton qui bascule. Elle
 * s'éclaire un instant à chaque changement de mode.
 */
import { loc, escape } from "../shared.mjs";
import { onMode, get } from "../runtime/mode.mjs";
import { onFrame } from "../runtime/loop.mjs";
import { isOpen } from "../runtime/wheel.mjs";

let el = null;
let connected = false;
let flashTimer = null;

function render() {
  const m = get();
  el.dataset.mode = m;
  el.innerHTML = `<i class="fa-solid ${m === "move" ? "fa-person-walking" : "fa-arrow-pointer"}"></i>
    <strong>${escape(loc(m === "move" ? "Mode.Deplacement" : "Mode.Curseur"))}</strong>
    <span><kbd>L3</kbd> ${escape(loc(m === "move" ? "Mode.VersCurseur" : "Mode.VersDeplacement"))}</span>`;
}

function flash() {
  el.classList.add("is-flash");
  clearTimeout(flashTimer);
  flashTimer = setTimeout(() => el.classList.remove("is-flash"), 1200);
}

export function mountHint() {
  if ( el ) return;
  el = document.createElement("div");
  el.id = "dctl-hint";
  el.className = "dctl-hint";
  el.hidden = true;
  document.body.append(el);
  render();
  onMode(() => { render(); flash(); });
  onFrame(frame => {
    const show = !!frame.id && !isOpen();
    if ( show !== connected ) {
      connected = show;
      el.hidden = !show;
    }
  });
}
