/**
 * Panneau de diagnostic (SPEC §10 étape 1) : boutons, sticks et gâchettes en direct, id et mapping de la manette, les
 * derniers évènements. Mis à jour à chaque image en touchant le DOM directement, sans re-rendu.
 */
import { MODULE_ID, loc, escape } from "../shared.mjs";
import { BUTTONS } from "../core/pad.mjs";
import { onFrame } from "../runtime/loop.mjs";
import { listPads, rumble } from "../adapter/gamepad.mjs";

const { ApplicationV2 } = foundry.applications.api;

const LABELS = { a: "A", b: "B", x: "X", y: "Y", lb: "LB", rb: "RB", lt: "LT", rt: "RT", view: "View", menu: "Menu",
  l3: "L3", r3: "R3", up: "↑", down: "↓", left: "←", right: "→", guide: "Guide" };

export class Diagnostic extends ApplicationV2 {
  static DEFAULT_OPTIONS = {
    id: `${MODULE_ID}-diagnostic`,
    classes: ["dctl-diagnostic"],
    window: { title: "DCTL.Diagnostic.Titre", icon: "fa-solid fa-gamepad", resizable: true },
    position: { width: 520, height: "auto" },
    actions: {
      rumble: () => rumble(game.settings.get(MODULE_ID, "padId"), { duration: 300 }),
      usePad: Diagnostic.#usePad
    }
  };

  #off = null;
  #log = [];

  async _renderHTML() {
    const pads = listPads();
    const padList = pads.length
      ? pads.map(p => `<li><code>${escape(p.id)}</code> — ${escape(p.mapping)}, ${p.buttons} ${loc("Diagnostic.Boutons")},
          ${p.axes} ${loc("Diagnostic.Axes")}${p.rumble ? "" : `, ${loc("Diagnostic.SansVibration")}`}
          <button type="button" data-action="usePad" data-id="${escape(p.id)}">${loc("Diagnostic.Utiliser")}</button></li>`).join("")
      : `<li>${loc("Diagnostic.Aucune")}</li>`;
    return `
      <section class="dctl-diag">
        <p class="dctl-diag__current">${loc("Diagnostic.Lue")} <code data-ref="id">—</code></p>
        <ul class="dctl-diag__pads">${padList}</ul>
        <div class="dctl-diag__buttons">
          ${BUTTONS.map(b => `<span class="dctl-btn" data-button="${b}">${LABELS[b]}</span>`).join("")}
        </div>
        <div class="dctl-diag__analog">
          ${["left", "right"].map(s => `<div class="dctl-stick" data-stick="${s}"><i></i><span data-ref="${s}">0.00</span></div>`).join("")}
          ${["lt", "rt"].map(t => `<div class="dctl-trigger" data-trigger="${t}"><b></b><span>${LABELS[t]}</span></div>`).join("")}
        </div>
        <ol class="dctl-diag__log" data-ref="log"></ol>
        <button type="button" data-action="rumble">${loc("Diagnostic.Vibrer")}</button>
      </section>`;
  }

  _replaceHTML(result, content) {
    content.innerHTML = result;
  }

  _onRender(context, options) {
    this.#off ??= onFrame(frame => this.#update(frame));
  }

  _onClose(options) {
    this.#off?.();
    this.#off = null;
  }

  static async #usePad(event, target) {
    await game.settings.set(MODULE_ID, "padId", target.dataset.id ?? "");
    this.render();
  }

  #update(frame) {
    const root = this.element;
    if ( !root ) return;
    root.querySelector('[data-ref="id"]').textContent = frame.id ? `${frame.id} (${frame.mapping || "?"})` : "—";
    for ( const el of root.querySelectorAll(".dctl-btn") ) el.classList.toggle("is-down", frame.pressed.has(el.dataset.button));
    for ( const side of ["left", "right"] ) {
      const s = frame[side];
      const dot = root.querySelector(`[data-stick="${side}"] i`);
      dot.style.transform = `translate(${s.x * 30}px, ${s.y * 30}px)`;
      root.querySelector(`[data-ref="${side}"]`).textContent = s.magnitude.toFixed(2);
    }
    for ( const t of ["lt", "rt"] ) {
      root.querySelector(`[data-trigger="${t}"] b`).style.width = `${Math.round(frame.triggers[t] * 100)}%`;
    }
    if ( frame.events.length ) {
      for ( const e of frame.events ) {
        const extra = e.type === "release" ? ` ${e.duration} ms${e.tap ? "" : " (hold)"}` : "";
        this.#log.unshift(`${e.type} ${LABELS[e.button]}${extra}`);
      }
      this.#log.length = Math.min(this.#log.length, 8);
      root.querySelector('[data-ref="log"]').innerHTML = this.#log.map(l => `<li>${escape(l)}</li>`).join("");
    }
  }
}
