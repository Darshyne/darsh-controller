/**
 * Le dessin de la roue d'actions : huit cases sur un cercle au centre de l'écran, la case visée en avant, son nom, son coût et
 * ses raisons de grisé au centre, les pages en dessous. L'anneau des niveaux remplace les cases d'un sort surchargeable.
 * Aucune image ni forme reprise de BG3 : un cercle, des cases, des variables `--dctl-wheel-*`.
 */
import { loc, escape } from "../shared.mjs";
import { slotPosition } from "../core/wheel.mjs";
import { onWheel } from "../runtime/wheel.mjs";

const RADIUS = 150;
const ROMAN = ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX"];

let el = null;

function costLabel(cost) {
  return cost ? loc(`Roue.Cout.${cost}`) : "";
}

function cellHtml(cell, index, count, selected) {
  const { x, y } = slotPosition(index, count, RADIUS);
  const cls = ["dctl-wheel__slot"];
  if ( index === selected ) cls.push("is-selected");
  if ( cell.disabled ) cls.push("is-disabled");
  if ( cell.cost ) cls.push(`is-${cell.cost}`);
  const badge = cell.uses ? `${cell.uses.value}/${cell.uses.max}`
    : (cell.quantity !== null && cell.quantity !== 1) ? String(cell.quantity)
    : cell.spellLevel > 0 ? ROMAN[cell.spellLevel] ?? cell.spellLevel : "";
  return `<div class="${cls.join(" ")}" style="transform: translate(${x}px, ${y}px)">
    <img src="${escape(cell.img)}" alt="">${badge ? `<span class="dctl-wheel__badge">${escape(badge)}</span>` : ""}</div>`;
}

function ringHtml(ring) {
  const count = ring.options.length;
  return ring.options.map((o, i) => {
    const { x, y } = slotPosition(i, count, RADIUS);
    const pips = Array.from({ length: o.max }, (_, k) => `<i class="${k < o.value ? "on" : ""}"></i>`).join("");
    return `<div class="dctl-wheel__slot dctl-wheel__level${i === ring.selected ? " is-selected" : ""}"
      style="transform: translate(${x}px, ${y}px)"><b>${o.pact ? "P" : ""}${ROMAN[o.level] ?? o.level}</b><span>${pips}</span></div>`;
  }).join("");
}

function centerHtml(v) {
  const cell = v.ring ? v.ring.cell : v.cells[v.selected];
  if ( !cell ) return `<div class="dctl-wheel__center"><strong>${escape(v.actor)}</strong>
    <small>${escape(loc("Roue.Aide"))}</small></div>`;
  const reasons = (cell.reasons ?? []).map(r => `<em>${escape(r)}</em>`).join("");
  const hint = v.ring ? loc("Roue.AideNiveau") : (cell.upcast?.length > 1 ? loc("Roue.AideSurcharge") : "");
  return `<div class="dctl-wheel__center"><strong>${escape(cell.name)}</strong>
    <span>${escape(costLabel(cell.cost))}${cell.concentration ? ` · ${escape(loc("Roue.Concentration"))}` : ""}</span>
    ${reasons}${hint ? `<small>${escape(hint)}</small>` : ""}</div>`;
}

function pagesHtml(v) {
  return v.pages.map((p, i) => `<span class="${i === v.page ? "is-current" : ""}">${escape(p.label)}${p.parts > 1
    ? ` ${p.part}/${p.parts}` : ""}</span>`).join("");
}

function render(v) {
  el.hidden = !v;
  if ( !v ) return el.replaceChildren();
  el.innerHTML = `<div class="dctl-wheel__disc">
      ${v.ring ? ringHtml(v.ring) : v.cells.map((c, i) => cellHtml(c, i, v.cells.length, v.selected)).join("")}
      ${centerHtml(v)}
    </div>
    <nav class="dctl-wheel__pages"><kbd>LB</kbd>${pagesHtml(v)}<kbd>RB</kbd></nav>
    <p class="dctl-wheel__prompts"><kbd>A</kbd> ${escape(loc("Roue.Utiliser"))} <kbd>B</kbd> ${escape(loc(v.ring ? "Roue.Retour" : "Roue.Fermer"))}</p>`;
}

export function mountWheel() {
  if ( el ) return;
  el = document.createElement("section");
  el.id = "dctl-wheel";
  el.className = "dctl-wheel";
  el.hidden = true;
  document.body.append(el);
  onWheel(render);
}
