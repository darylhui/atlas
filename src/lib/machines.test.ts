import { describe, expect, it } from 'vitest';
import { MACHINE_CATALOG, MACHINE_CATEGORY, sized } from './seed/machines';
import { normalize } from './store';

describe('machine catalogue', () => {
  it('has unique, complete entries', () => {
    expect(MACHINE_CATALOG.length).toBeGreaterThan(100);
    expect(new Set(MACHINE_CATALOG.map((c) => c.id)).size).toBe(MACHINE_CATALOG.length);
    for (const c of MACHINE_CATALOG) {
      expect(c.brand, c.name).not.toBe('');
      expect(MACHINE_CATEGORY[c.category]).toBeTruthy();
      expect(c.imageUrl, c.name).toMatch(/\.(jpg|png|webp)$/);
    }
  });
  it('only resizes catalogue images', () => {
    expect(sized(MACHINE_CATALOG[0].imageUrl, 300)).toContain('?width=300');
    expect(sized('https://example.com/a.jpg', 300)).toBe('https://example.com/a.jpg');
  });
  it('opens saves made before machines existed', () => {
    expect(normalize({ studios: [{ id: 's', name: 'Gym' }] }).machines).toEqual([]);
  });
});
