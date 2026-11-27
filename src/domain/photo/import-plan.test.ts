import { expect, test } from 'vitest';
import { planPhotoStones, type Shot } from './import-plan';

const at = (s: number) => new Date(Date.UTC(2026, 4, 1, 10, 0, s)).toISOString();
let n = 0;
const shot = (over: Partial<Shot> = {}): Shot => ({
  name: `IMG_${++n}.jpg`,
  sha256: `h${n}`,
  ...over,
});
const names = (stones: Shot[][]) => stones.map((g) => g.map((s) => s.name));

test('ordered by EXIF time, shots with no time last by file name (numeric)', () => {
  const a = shot({ name: 'IMG_10.jpg', takenAt: at(50) });
  const b = shot({ name: 'IMG_2.jpg' });
  const c = shot({ name: 'IMG_9.jpg', takenAt: at(10) });
  const d = shot({ name: 'IMG_10b.jpg' });
  const plan = planPhotoStones([a, b, c, d], { groupSeconds: 0 });
  expect(names(plan.stones)).toEqual([
    ['IMG_9.jpg'],
    ['IMG_10.jpg'],
    ['IMG_2.jpg'],
    ['IMG_10b.jpg'],
  ]);
});

test('shots close in time and place are one stone; far in place or time are not', () => {
  const p = { lat: 44, lng: -72 };
  const front = shot({ takenAt: at(0), gps: p });
  const back = shot({ takenAt: at(6), gps: { lat: p.lat + 2 / 110_574, lng: p.lng } });
  const next = shot({ takenAt: at(40), gps: p });
  const jumped = shot({ takenAt: at(45), gps: { lat: p.lat + 50 / 110_574, lng: p.lng } });
  const noGps = shot({ takenAt: at(50) });
  const plan = planPhotoStones([next, back, front, jumped, noGps], { groupSeconds: 15 });
  expect(plan.stones.map((g) => g.length)).toEqual([2, 1, 2]);
  expect(plan.stones[0]).toEqual([front, back]);
  expect(plan.stones[2]).toEqual([jumped, noGps]);
  expect(planPhotoStones([front, back], { groupSeconds: 0 }).stones).toHaveLength(2);
});

test('photos already in the cemetery, or twice in the batch, are skipped', () => {
  const a = shot({ sha256: 'x' });
  const b = shot({ sha256: 'y' });
  const again = shot({ sha256: 'y' });
  const plan = planPhotoStones([a, b, again], { groupSeconds: 0, existing: new Set(['x']) });
  expect(plan.stones).toEqual([[b]]);
  expect(plan.duplicates).toEqual([a, again]);
});

test('200 shots plan instantly', () => {
  const many = Array.from({ length: 200 }, (_, i) => shot({ takenAt: at(i * 7) }));
  // One shot every 7 s: a 10 s window pairs them, never chains them all into one stone.
  const plan = planPhotoStones(many, { groupSeconds: 10 });
  expect(plan.stones).toHaveLength(100);
  expect(planPhotoStones(many, { groupSeconds: 5 }).stones).toHaveLength(200);
});
