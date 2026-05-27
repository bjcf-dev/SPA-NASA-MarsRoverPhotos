import { describe, it, expect } from 'vitest'
import { FavoritesStore } from '../src/stores/FavoritesStore.js'

describe('FavoritesStore', () => {
  it('añade/quita y persiste objetos con meta', () => {
    // Arrancamos limpio
    localStorage.clear()
    const store = new FavoritesStore(localStorage)
    expect(store.count()).toBe(0)

    // Añadimos objetos con id y metadatos
    const photo1 = { id: '1', photoRover: 'curiosity', photoCamera: 'MAST', photoEarthdate: '2015-05-30' }
    const photo2 = { id: '2', photoRover: 'spirit', photoCamera: 'NAVCAM', photoEarthdate: '2004-01-10' }

    store.add(photo1)
    store.add(photo2)

    expect(store.has('1')).toBe(true)
    expect(store.count()).toBe(2)

    // Toggle elimina el primero
    store.toggle(photo1)
    expect(store.has('1')).toBe(false)

    // Persistencia: nueva instancia debe cargar lo mismo de localStorage
    const store2 = new FavoritesStore(localStorage)
    expect(store2.count()).toBe(1)

    const all = store2.all()
    expect(all[0].id).toBe('2')
    expect(all[0].photoRover).toBe('spirit')
  })

  it('guarda y recupera objetos con data-*', () => {
    const store = new FavoritesStore(localStorage)
    store.toggle({ id: '42', photoRover: 'curiosity', photoCamera: 'MAST', photoEarthdate: '2015-05-30' })

    const all = store.all()
    expect(Array.isArray(all)).toBe(true)
    expect(all.length).toBe(1)
    expect(all[0].id).toBe('42')
    expect(all[0].photoRover).toBe('curiosity')
  })
})
