/* eslint-disable no-underscore-dangle */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeEach, afterEach, vi } from 'vitest';

const defaultFixture = {
  latest_photos: Array.from({ length: 12 }).map((_, i) => ({
    id: i + 1,
    img_src: `https://example.com/${i + 1}.jpg`,
    camera: { name: 'MAST' },
    rover: { name: 'curiosity' },
    earth_date: '2021-01-01',
  })),
};

beforeEach(() => {
  const html = readFileSync(resolve('./index.html'), 'utf-8');
  document.documentElement.innerHTML = html;
  localStorage.clear();

  // provide a harmless default fetch mock if no test defines one
  // tests that mock fetch will overwrite this
  if (typeof globalThis.fetch === 'undefined') {
    globalThis.fetch = vi.fn(async () => ({
      ok: true,
      json: async () => defaultFixture,
    }));
    // marker so afterEach can clean it up
    globalThis.fetch._isViMock = true;
  }

  vi.resetModules();
});

afterEach(() => {
  vi.restoreAllMocks();
  if (globalThis.fetch && globalThis.fetch._isViMock) {
    delete globalThis.fetch;
  }
});
