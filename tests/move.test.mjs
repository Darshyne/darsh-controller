import { describe, it, expect } from "vitest";
import { direction8, nextCell, sameDirection } from "../module/scripts/core/move.mjs";
import { distanceToRect, nearestTarget, attract } from "../module/scripts/core/cursor.mjs";
import { stick } from "../module/scripts/core/pad.mjs";

const at = (x, y) => stick(x, y, 0.2);

describe("direction8", () => {
  it("huit directions, i vers le bas, j vers la droite", () => {
    expect(direction8(at(0, -1))).toEqual({ di: -1, dj: 0 });
    expect(direction8(at(1, 0))).toEqual({ di: 0, dj: 1 });
    expect(direction8(at(0.7, 0.7))).toEqual({ di: 1, dj: 1 });
    expect(direction8(at(-0.7, -0.7))).toEqual({ di: -1, dj: -1 });
    expect(direction8(at(-1, 0.1))).toEqual({ di: 0, dj: -1 });
  });
  it("rien sous le seuil", () => expect(direction8(at(0.4, 0))).toBeNull());
  it("case voisine et comparaison", () => {
    expect(nextCell({ i: 5, j: 7 }, { di: 1, dj: -1 })).toEqual({ i: 6, j: 6 });
    expect(sameDirection({ di: 1, dj: 0 }, { di: 1, dj: 0 })).toBe(true);
    expect(sameDirection({ di: 1, dj: 0 }, null)).toBe(false);
  });
});

describe("aimant", () => {
  const r = (left, top, w, h) => ({ left, top, right: left + w, bottom: top + h });
  it("distance à un rectangle, 0 dedans", () => {
    expect(distanceToRect({ x: 5, y: 5 }, r(0, 0, 10, 10))).toBe(0);
    expect(distanceToRect({ x: 13, y: 14 }, r(0, 0, 10, 10))).toBe(5);
  });
  it("la cible la plus proche dans le rayon", () => {
    const t = nearestTarget({ x: 0, y: 0 }, [r(30, 0, 10, 10), r(10, 0, 10, 10), r(100, 0, 10, 10)], 40);
    expect(t.center).toEqual({ x: 15, y: 5 });
    expect(nearestTarget({ x: 0, y: 0 }, [r(100, 0, 10, 10)], 40)).toBeNull();
  });
  it("deux cibles qui contiennent le point : la plus proche par son centre", () => {
    const t = nearestTarget({ x: 12, y: 5 }, [r(0, 0, 40, 10), r(8, 0, 10, 10)]);
    expect(t.center).toEqual({ x: 13, y: 5 });
  });
  it("attract s'approche sans dépasser", () => {
    const p = attract({ x: 0, y: 0 }, { x: 100, y: 0 }, 0.05);
    expect(p.x).toBeGreaterThan(0);
    expect(p.x).toBeLessThan(100);
    expect(attract({ x: 0, y: 0 }, { x: 100, y: 0 }, 10).x).toBeCloseTo(100);
  });
});

import { lineAhead, farthestOpen } from "../module/scripts/core/move.mjs";

describe("marche fluide", () => {
  it("lineAhead : les cases devant, dans la direction", () => {
    expect(lineAhead({ i: 2, j: 2 }, { di: 1, dj: 1 }, 3)).toEqual([{ i: 3, j: 3 }, { i: 4, j: 4 }, { i: 5, j: 5 }]);
  });
  it("farthestOpen s'arrête devant le premier pas bloqué", () => {
    const cells = lineAhead({ i: 0, j: 0 }, { di: 0, dj: 1 }, 6);
    const wallAfter3 = (from, to) => to.j === 4;
    expect(farthestOpen({ i: 0, j: 0 }, cells, wallAfter3)).toEqual({ i: 0, j: 3 });
    expect(farthestOpen({ i: 0, j: 0 }, cells, () => false)).toEqual({ i: 0, j: 6 });
    expect(farthestOpen({ i: 0, j: 0 }, cells, () => true)).toBeNull();
  });
});
