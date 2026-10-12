import { describe, it, expect } from "vitest";
import { velocity, advance, delta, zoomFactor, buttonsMask, clickCount } from "../module/scripts/core/cursor.mjs";
import { stick } from "../module/scripts/core/pad.mjs";

const screen = { width: 1920, height: 1080 };

describe("velocity", () => {
  it("nulle au repos", () => expect(velocity(stick(0, 0), 1000)).toEqual({ x: 0, y: 0 }));
  it("vitesse pleine à fond, dans la direction du stick", () => {
    const v = velocity(stick(1, 0, 0.2), 1000);
    expect(v.x).toBeCloseTo(1000);
    expect(v.y).toBeCloseTo(0);
  });
  it("courbe : à mi-course, bien moins que la moitié", () => {
    const half = stick(0.6, 0, 0.2); // magnitude 0,5
    expect(velocity(half, 1000).x).toBeLessThan(350);
  });
});

describe("advance", () => {
  it("avance de v·dt", () => {
    const p = advance({ x: 100, y: 100 }, stick(0, 1, 0.2), 0.5, 1000, screen);
    expect(p.x).toBeCloseTo(100);
    expect(p.y).toBeCloseTo(600);
  });
  it("reste dans l'écran", () => {
    expect(advance({ x: 5, y: 5 }, stick(-1, -1, 0.2), 1, 3000, screen)).toEqual({ x: 0, y: 0 });
    expect(advance({ x: 1900, y: 1070 }, stick(1, 1, 0.2), 1, 3000, screen)).toEqual({ x: 1919, y: 1079 });
  });
});

describe("delta et zoom", () => {
  it("delta suit la même courbe", () => expect(delta(stick(-1, 0, 0.2), 0.1, 1000).x).toBeCloseTo(-100));
  it("RT rapproche, LT éloigne, rien sous le seuil", () => {
    expect(zoomFactor({ rt: 1 }, 1)).toBeCloseTo(2);
    expect(zoomFactor({ lt: 1 }, 1)).toBeCloseTo(0.5);
    expect(zoomFactor({ lt: 0.05, rt: 0.05 }, 1)).toBe(1);
    expect(zoomFactor({ lt: 1, rt: 1 }, 1)).toBe(1);
  });
});

describe("souris", () => {
  it("masque des boutons", () => {
    expect(buttonsMask(new Set())).toBe(0);
    expect(buttonsMask(new Set([0]))).toBe(1);
    expect(buttonsMask(new Set([0, 2]))).toBe(3);
  });
  it("double clic : même bouton, tôt et près", () => {
    const first = { button: 0, time: 0, x: 10, y: 10, count: 1 };
    expect(clickCount(null, { button: 0, time: 0, x: 0, y: 0 })).toBe(1);
    expect(clickCount(first, { button: 0, time: 200, x: 12, y: 11 })).toBe(2);
    expect(clickCount(first, { button: 0, time: 900, x: 10, y: 10 })).toBe(1);
    expect(clickCount(first, { button: 0, time: 200, x: 40, y: 10 })).toBe(1);
    expect(clickCount(first, { button: 2, time: 200, x: 10, y: 10 })).toBe(1);
  });
});
