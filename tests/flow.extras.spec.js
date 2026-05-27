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
async function boot () {
  vi.resetModules()               // <- limpia la caché de imports entre tests
  delete window.__app             // <- por si quedó del test anterior
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

  it('muestra loader durante la petición y lo oculta al terminar', async () => {
    // 1) Mock: json() se resuelve cuando nosotros queramos
    let resolveJson
    global.fetch = vi.fn(async () => ({
      ok: true,
      json: () =>
        new Promise((r) => { resolveJson = r }) // queda pendiente hasta que llamemos a resolveJson(...)
    }))

    // 2) Boot: UiController.init() dispara search() automáticamente
    await boot()

    const loader = document.getElementById('loader')

    // 3) El loader debe hacerse visible al arrancar la petición
    await waitFor(() => !loader.classList.contains('hidden'))

    // 4) Ahora "resolvemos" la respuesta y la app debería ocultar el loader
    resolveJson({ latest_photos: [] })

    await waitFor(() => loader.classList.contains('hidden'))
  })

  it('reset limpia estados, grid y deshabilita paginación', async () => {
    // Mock con resultados para llenar la página
    global.fetch = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        latest_photos: Array.from({ length: 15 }).map((_, i) => ({
          id: 7000 + i,
          img_src: `https://img.test/${i}.jpg`,
          earth_date: '2021-02-18',
          camera: { name: 'PANCAM' },
          rover: { name: 'curiosity' }
        }))
      })
    }))

    await boot()

    // Lanza búsqueda y pasa a página 2
    document.getElementById('search-form')
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    await tick()
    document.getElementById('pagination-next').click()
    await tick()

    // Reset
    document.getElementById('reset-btn').click()

    expect(document.getElementById('results-grid').childElementCount).toBe(0)
    expect(document.getElementById('stats-total').textContent).toBe('0')
    expect(document.getElementById('last-query-badge').textContent).toBe('—')
    expect(document.getElementById('pagination-prev').disabled).toBe(true)
    expect(document.getElementById('pagination-next').disabled).toBe(true)
    expect(document.getElementById('error-banner').classList.contains('hidden')).toBe(true)
    expect(document.getElementById('empty-state').classList.contains('hidden')).toBe(true)
  })

  it('cambiar modo re-filtra resultados (panorámico -> navegación)', async () => {
    // Todas PANCAM para que aparezcan en modo panorámico
    global.fetch = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        latest_photos: Array.from({ length: 8 }).map((_, i) => ({
          id: 8000 + i,
          img_src: `https://img.test/${i}.jpg`,
          earth_date: '2021-02-18',
          camera: { name: i < 8 ? 'PANCAM' : 'NAVCAM' }, // primeras 8 PANCAM
          rover: { name: 'curiosity' }
        }))
      })
    }))

    await boot()

    // Búsqueda por defecto (modo panorámico)
    document.getElementById('search-form')
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    await tick()
    const firstGridHTML = document.getElementById('results-grid').textContent

    // Cambia a modo navegación (NAVCAM) y dispara
    const mode = document.getElementById('mode-select')
    mode.value = 'navegacion'
    document.getElementById('search-form')
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    await tick()

    const afterHTML = document.getElementById('results-grid').textContent
    expect(afterHTML).not.toBe(firstGridHTML)
  })

  it('fav-toggle actualiza texto del botón', async () => {
    global.fetch = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        latest_photos: Array.from({ length: 3 }).map((_, i) => ({
          id: 6000 + i,
          img_src: `https://img.test/${i}.jpg`,
          earth_date: '2021-02-18',
          camera: { name: 'PANCAM' },
          rover: { name: 'curiosity' }
        }))
      })
    }))

    await boot()

    document.getElementById('search-form')
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    await tick()

    const btn = document.querySelector('.fav-toggle')
    expect(btn).toBeTruthy()

    const textBefore = btn.textContent
    btn.click()
    expect(btn.textContent).not.toBe(textBefore)
  })

  it('persistencia de candidatas tras reiniciar (localStorage)', async () => {
    global.fetch = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        latest_photos: Array.from({ length: 2 }).map((_, i) => ({
          id: 5000 + i,
          img_src: `https://img.test/${i}.jpg`,
          earth_date: '2021-02-18',
          camera: { name: 'PANCAM' },
          rover: { name: 'curiosity' }
        }))
      })
    }))

    // 1) Primera sesión: marcar una candidata
    await boot()
    document.getElementById('search-form')
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    await tick()

    document.querySelector('.fav-toggle').click()
    expect(document.getElementById('favorites-count').textContent).toBe('1')

    // 2) "Recargar": reset modules y boot otra vez (debe leer de localStorage)
    await boot();

    // contador debería seguir en 1
    expect(document.getElementById('favorites-count').textContent).toBe('1')
  })

  it('paginación: con ≤ PAGE_SIZE fotos, next deshabilitado; con 0 fotos, ambos deshabilitados', async () => {
    // Caso 1: ≤ PAGE_SIZE (ej. 5 fotos)
    global.fetch = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        latest_photos: Array.from({ length: 5 }).map((_, i) => ({
          id: 4000 + i,
          img_src: `https://img.test/${i}.jpg`,
          earth_date: '2021-02-18',
          camera: { name: 'PANCAM' },
          rover: { name: 'curiosity' }
        }))
      })
    }))

    await boot()
    document.getElementById('search-form')
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    await tick()

    const prev = document.getElementById('pagination-prev')
    const next = document.getElementById('pagination-next')
    expect(prev.disabled).toBe(true)   // al inicio siempre
    expect(next.disabled).toBe(true)   // no hay segunda página

    // Caso 2: 0 fotos
    global.fetch = vi.fn(async () => ({
      ok: true,
      json: async () => ({ latest_photos: [] })
    }))

    await boot()
    document.getElementById('search-form')
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    await tick()

    const prev2 = document.getElementById('pagination-prev')
    const next2 = document.getElementById('pagination-next')
    expect(prev2.disabled).toBe(true)
    expect(next2.disabled).toBe(true)
    expect(document.getElementById('results-grid').childElementCount).toBe(0)
  })

})
