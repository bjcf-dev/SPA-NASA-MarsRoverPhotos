### Mars Gallery — README

#### Descripción
Mars Gallery es una SPA que muestra fotos de los rovers de la NASA, permite filtrar por modo y rover, paginar resultados y marcar favoritos persistentes en localStorage. Diseñado para cumplir la rúbrica de evaluación del proyecto.

---

#### Requisitos
- Node.js (>=16)
- pnpm

---

#### Instalación y ejecución
1. Instalar dependencias:
```bash
pnpm install
```
2. Crear archivo de entorno:
```bash
cp .env.example .env
# editar .env y añadir VITE_NASA_API_KEY
```
3. Ejecutar en desarrollo:
```bash
pnpm dev
```

---

#### Tests
Ejecutar la suite:
```bash
pnpm test
```

---

#### Uso y elementos verificados por los evaluadores
- Filtro por modo: elemento con id `mode-select`.
- Selección de rover: elemento con id `rover-select`.
- Paginación: botones `#pagination-prev`, `#pagination-next`; indicador `#pagination-info`.
- Favoritos: botones con clase `.fav-toggle`, contador en `#favorites-count`, lista en `#favorites-list`.
- Estados UI gestionados con la clase `hidden`: `#loader`, `#error-banner`, `#empty-state`.
- Cada tarjeta debe mostrar imagen, rover, cámara y fecha; incluir atributos `data-*` y clases requeridas por los tests.

---

#### Persistencia y comprobaciones rápidas
- Favoritos se guardan en `localStorage`; tras marcar favoritos, recargar la página debe mantenerlos.
- Al marcar/desmarcar se actualiza en tiempo real: contador y lista deben reflejar el estado sin recargar.
- Verificar que la paginación y el contador son coherentes en cualquier página.

---

#### Estructura relevante
- src/controllers/UiController.js
- src/services/MarsPhotoService.js
- src/stores/FavoritesStore.js
- src/models/Photo.js
- src/main.js
- public/mock-latest.json
- tests/ (Vitest)

---

Demo
- https://drive.google.com/file/d/1qvQMonlFshfesal11oLjnq5yosyWCZ6K/view?usp=sharing
