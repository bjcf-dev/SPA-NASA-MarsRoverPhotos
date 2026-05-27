/* eslint-disable import/extensions */
/* eslint-disable comma-dangle */
/* eslint-disable semi */
import { beforeEach, describe, expect, it, vi } from 'vitest'

// Helper para esperar a que terminen microtareas y se actualice el DOM
const tick = () => new Promise(r => setTimeout(r, 0))
const waitFor = async (predicate, { timeout = 800, step = 15 } = {}) => {
  const t0 = Date.now()
  while (Date.now() - t0 < timeout) {
    if (predicate()) return
    await new Promise(r => setTimeout(r, step))
  }
  throw new Error('waitFor timeout')
}

// Arranca la app (importa main.js que inicializa UiController)
async function boot() {
  vi.resetModules() // <- limpia la caché de imports entre tests
  delete window.__app // <- por si quedó del test anterior
  const mod = await import('../src/main.js') // cache-buster
  return window.__app
}

// Genera un payload con muchas fotos de una cámara concreta (para que pasen los filtros)
const fakeLatest = (total = 26, camera = 'PANCAM') => ({
  latest_photos: Array.from({ length: total }).map((_, i) => ({
    id: 2000 + i,
    img_src: `https://img.test/${i}.jpg`,
    earth_date: '2021-02-18',
    // 👇 Aseguramos que TODAS sean de la cámara del modo para tener > PAGE_SIZE
    camera: { name: camera },
    rover: { name: 'curiosity' }
  }))
})

describe('Flujo latest_photos + modo exploración', () => {
  beforeEach(() => {
    // Mock por defecto: 26 fotos válidas para modo "panoramico" (PANCAM/MAST)
    global.fetch = vi.fn(async () => ({
      ok: true,
      json: async () => fakeLatest(26, 'PANCAM')
    }))
  })

  it('carga latest, filtra por modo y pagina en cliente; favoritos visibles coherentes', async () => {
    await boot()

    // Submit inicial (UiController.init ya llama a search, pero forzamos explícitamente)
    document.getElementById('mode-select').value = 'panoramico'
    document.getElementById('rover-select').value = 'curiosity'
    document.getElementById('search-form')
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    await tick()

    const grid = document.getElementById('results-grid')
    // Debe haber tarjetas en página 1
    expect(grid.querySelectorAll('.photo-card').length).toBeGreaterThan(0)

    // Paginación: ahora hay > PAGE_SIZE (26), así que debe cambiar de "Página 1" a otra
    const info1 = document.getElementById('pagination-info').textContent
    document.getElementById('pagination-next').click()
    await tick()
    const info2 = document.getElementById('pagination-info').textContent
    expect(info2).not.toBe(info1) // p.ej. "Página 2"

    // Favoritos: marcar el primero
    const firstFav = grid.querySelector('.fav-toggle')
    firstFav.click()
    expect(document.getElementById('favorites-count').textContent).toBe('1')

    // Asegurar que la lista de favoritas está visible (puede iniciar oculta o visible)
    const favList = document.getElementById('favorites-list')
    if (favList.classList.contains('hidden')) {
      document.getElementById('toggle-favorites-view').click()
    }
    expect(favList.classList.contains('hidden')).toBe(false)

    // Debe tener al menos un elemento renderizado
    expect(favList.childElementCount).toBeGreaterThan(0)
  })

  it('muestra empty-state si no hay fotos del modo elegido', async () => {
    // Mock: solo cámara "MINITES" (no existe en tus modos)
    global.fetch = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        latest_photos: Array.from({ length: 5 }).map((_, i) => ({
          id: 3000 + i,
          img_src: `https://img.test/min${i}.jpg`,
          earth_date: '2021-02-18',
          camera: { name: 'MINITES' },
          rover: { name: 'curiosity' }
        }))
      })
    }))

    // ⚠️ Configura el modo ANTES de bootear (ui.init() leerá este valor)
    const modeEl = document.getElementById('mode-select')
    modeEl.value = 'diagnostico'

    // Arranca la app (esto dispara la búsqueda inicial con modo=diagnostico)
    await boot()

    const empty = document.getElementById('empty-state')

    // Espera a que el UI procese la búsqueda inicial
    await waitFor(() => !empty.classList.contains('hidden'))

    expect(empty.classList.contains('hidden')).toBe(false)
    // Asegura que no hay tarjetas
    expect(document.getElementById('results-grid').childElementCount).toBe(0)
    // Total 0
    expect(document.getElementById('stats-total').textContent).toBe('0')
  })

  it('muestra error-banner si la API falla', async () => {
    // Arranca la app normalmente
    const app = await boot()

    // Fuerza que el service falle SIEMPRE en esta prueba
    vi.spyOn(app.service, 'latestPhotos').mockRejectedValue(new Error('HTTP 500'))

    // Dispara una búsqueda manual (para entrar en el catch del UI)
    document.getElementById('search-form')
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))

    // Espera a que aparezca el banner de error
    const error = document.getElementById('error-banner')
    await waitFor(() => !error.classList.contains('hidden'))

    expect(error.classList.contains('hidden')).toBe(false)
    expect(error.textContent).toContain('HTTP')
  })

  it('paginación: next/prev, info y deshabilitados en extremos', async () => {
    // Mock: > PAGE_SIZE (12) para forzar varias páginas en modo panorámico (PANCAM/MAST)
    global.fetch = vi.fn(async () => ({
      ok: true,
      json: async () => fakeLatest(27, 'PANCAM')
    }))

    await boot()

    // Dispara una búsqueda (por si init no lo hizo)
    document.getElementById('search-form')
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    await tick()

    const grid = document.getElementById('results-grid')
    const prev = document.getElementById('pagination-prev')
    const next = document.getElementById('pagination-next')
    const info = document.getElementById('pagination-info')

    // Página inicial
    expect(grid.querySelectorAll('.photo-card').length).toBeGreaterThan(0)
    expect(info.textContent).toContain('Página 1')
    expect(prev.disabled).toBe(true)           // al inicio no se puede ir atrás
    expect(next.disabled).toBe(false)

    // Ir a página 2
    next.click()
    await tick()
    expect(info.textContent).toContain('Página 2')
    expect(prev.disabled).toBe(false)

    // Avanza hasta el final (hasta que next quede disabled)
    let safety = 10
    while (!next.disabled && safety-- > 0) {
      next.click()
      await tick()
    }
    expect(next.disabled).toBe(true)           // llegó al final

    // Vuelve una página atrás y comprueba que next vuelve a habilitarse
    prev.click()
    await tick()
    expect(next.disabled).toBe(false)
  })

  it('marcar y desmarcar una LZ candidata actualiza contador y lista', async () => {
    // Mock: dataset pequeño pero > 0 (PANCAM para modo panorámico)
    global.fetch = vi.fn(async () => ({
      ok: true,
      json: async () => fakeLatest(5, 'PANCAM')
    }))

    await boot()

    // Enviar búsqueda
    document.getElementById('search-form')
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    await tick()

    const grid = document.getElementById('results-grid')
    const favCount = document.getElementById('favorites-count')
    const favList = document.getElementById('favorites-list')
    const toggleFavsBtn = document.getElementById('toggle-favorites-view')

    // Asegura que la lista está visible (según tu HTML puede venir visible u oculta)
    if (favList.classList.contains('hidden')) {
      toggleFavsBtn.click()
    }

    const firstBtn = grid.querySelector('.fav-toggle')
    expect(firstBtn).toBeTruthy()

    // Marca como candidata
    firstBtn.click()
    expect(favCount.textContent).toBe('1')

    // Debe renderizar al menos un item en favoritos
    await waitFor(() => favList.childElementCount > 0)
    const afterAdd = favList.childElementCount
    expect(afterAdd).toBeGreaterThan(0)

    // Desmarca la misma card
    firstBtn.click()
    expect(favCount.textContent).toBe('0')

    // Lista de favoritos debería vaciarse (o al menos disminuir)
    await tick()
    const emptyOk =
      favList.childElementCount === 0 ||
      favList.textContent.toLowerCase().includes('no hay candidatas')
    expect(emptyOk).toBe(true)
  })

})
