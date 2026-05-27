import { describe, it, expect } from 'vitest';

const ids = [
  'search-form',
  'rover-select',
  'mode-select',
  'search-btn',
  'reset-btn',
  'loader',
  'error-banner',
  'empty-state',
  'results-grid',
  'pagination-prev',
  'pagination-next',
  'pagination-info',
  'favorites-count',
  'favorites-list',
  'toggle-favorites-view',
  'stats-total',
  'last-query-badge',
];

describe('HTML IDs obligatorios (modo exploración)', () => {
  for (const id of ids) {
    it(`existe #${id}`, () => {
      const el = document.getElementById(id);
      expect(el, `Falta #${id}`).toBeTruthy();
    });
  }
});
