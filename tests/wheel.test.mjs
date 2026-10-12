import { describe, it, expect } from "vitest";
import { paginate, sectorOf, slotPosition, cycle, defaultSlot, PAGE_SIZE } from "../module/scripts/core/wheel.mjs";
import { stick } from "../module/scripts/core/pad.mjs";

const cells = n => Array.from({ length: n }, (_, i) => ({ ref: `Item.${i}` }));

describe("paginate", () => {
  it("coupe une page de la Barre en parties de huit", () => {
    const out = paginate([{ tab: "default", label: "Défaut", cells: cells(20) }, { tab: "custom", label: "Perso", cells: cells(3) }]);
    expect(out.map(p => `${p.tab} ${p.part}/${p.parts} ${p.cells.length}`))
      .toEqual(["default 1/3 8", "default 2/3 8", "default 3/3 4", "custom 1/1 3"]);
  });
  it("omet les pages vides et les trous", () => {
    expect(paginate([{ tab: "items", cells: [] }, { tab: "class", cells: [null, { ref: "x" }] }]))
      .toEqual([{ tab: "class", label: undefined, part: 1, parts: 1, cells: [{ ref: "x" }] }]);
    expect(paginate(undefined)).toEqual([]);
  });
});

describe("sectorOf", () => {
  const at = (x, y) => stick(x, y, 0.2);
  it("0 en haut, puis sens horaire", () => {
    expect(sectorOf(at(0, -1), PAGE_SIZE)).toBe(0);
    expect(sectorOf(at(1, 0), PAGE_SIZE)).toBe(2);
    expect(sectorOf(at(0, 1), PAGE_SIZE)).toBe(4);
    expect(sectorOf(at(-1, 0), PAGE_SIZE)).toBe(6);
    expect(sectorOf(at(0.7, -0.7), PAGE_SIZE)).toBe(1);
    expect(sectorOf(at(-0.7, -0.7), PAGE_SIZE)).toBe(7);
  });
  it("arrondit au secteur le plus proche, y compris juste à gauche du haut", () => {
    expect(sectorOf(at(-0.1, -1), PAGE_SIZE)).toBe(0);
  });
  it("null si le stick est peu incliné ou la page vide", () => {
    expect(sectorOf(at(0.3, 0), PAGE_SIZE)).toBeNull();
    expect(sectorOf(at(1, 0), 0)).toBeNull();
  });
  it("s'adapte au nombre de cases (3 niveaux)", () => {
    expect(sectorOf(at(0, -1), 3)).toBe(0);
    expect(sectorOf(at(0.87, 0.5), 3)).toBe(1);
    expect(sectorOf(at(-0.87, 0.5), 3)).toBe(2);
  });
});

describe("géométrie et pages", () => {
  it("slotPosition : haut, puis droite", () => {
    const top = slotPosition(0, 8, 100);
    expect(top.x).toBeCloseTo(0);
    expect(top.y).toBeCloseTo(-100);
    expect(slotPosition(2, 8, 100).x).toBeCloseTo(100);
  });
  it("cycle boucle dans les deux sens", () => {
    expect(cycle(0, -1, 4)).toBe(3);
    expect(cycle(3, 1, 4)).toBe(0);
    expect(cycle(0, 1, 0)).toBe(0);
  });
  it("defaultSlot : le premier niveau proposé", () => {
    expect(defaultSlot({ upcast: [{ key: "spell2" }, { key: "spell3" }] })).toBe("spell2");
    expect(defaultSlot({ upcast: [] })).toBeNull();
  });
});
