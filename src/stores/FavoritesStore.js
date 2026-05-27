/* eslint-disable no-underscore-dangle */
// src/stores/FavoritesStore.js
export class FavoritesStore {
  constructor(storage = localStorage, storageKey = 'mars-gallery-favs') {
    this.storage = storage;
    this.storageKey = storageKey;
    this.items = this._load();
  }

  _load() {
    try {
      const raw = this.storage.getItem(this.storageKey);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      // console.error('Failed to load favorites', e);
      return [];
    }
  }

  _save() {
    try {
      this.storage.setItem(this.storageKey, JSON.stringify(this.items));
    } catch (e) {
      // console.error('Failed to save favorites', e);
    }
  }

  add(photoObj) {
    const copy = JSON.parse(JSON.stringify(photoObj));
    const nid = Number(copy.id);
    if (!this.has(nid)) {
      this.items.push(copy);
      this._save();
    }
  }

  remove(id) {
    const nid = Number(id);
    this.items = this.items.filter((p) => Number(p.id) !== nid);
    this._save();
  }

  toggle(idOrPhoto) {
    const nid = Number((idOrPhoto && idOrPhoto.id) ?? idOrPhoto);
    if (Number.isNaN(nid)) return;
    if (this.has(nid)) {
      this.remove(nid);
    } else {
      const photoObj = idOrPhoto && idOrPhoto.id ? idOrPhoto : { id: nid };
      this.add(photoObj);
    }
  }

  has(id) {
    const nid = Number(id);
    return this.items.some((p) => Number(p.id) === nid);
  }

  isFav(id) {
    return this.has(id);
  }

  all() {
    return JSON.parse(JSON.stringify(this.items));
  }

  count() {
    return this.items.length;
  }

  clear() {
    this.items = [];
    this._save();
  }
}

export default FavoritesStore;

/* try {
  if (typeof module !== 'undefined' && module.exports) {
    // module.exports should be the constructor function/class
    module.exports = FavoritesStore;
    module.exports.default = FavoritesStore;
  }
} catch (e) {
  // noop in ESM environments
} */
