/* eslint-disable no-underscore-dangle */
export default class UiController {
  constructor(service, favoritesStore, pageSize = 9) {
    this.service = service;
    this.favStore = favoritesStore;
    this.pageSize = pageSize;
    this.photos = [];
    this.filtered = [];
    this.page = 1;

    // DOM elements
    this.form = document.getElementById('search-form');
    this.modeSelect = document.getElementById('mode-select');
    this.roverSelect = document.getElementById('rover-select');
    this.grid = document.getElementById('results-grid');
    this.loader = document.getElementById('loader');
    this.error = document.getElementById('error-banner');
    this.empty = document.getElementById('empty-state');
    this.resetBtn = document.getElementById('reset-btn');
    this.prevBtn = document.getElementById('pagination-prev');
    this.nextBtn = document.getElementById('pagination-next');
    this.pageInfo = document.getElementById('pagination-info');
    this.statsTotal = document.getElementById('stats-total');
    this.favCount = document.getElementById('favorites-count');
    this.favList = document.getElementById('favorites-list');
    this.toggleFavsBtn = document.getElementById('toggle-favorites-view');
    this.lastQueryBadge = document.getElementById('last-query-badge');

    this.grid.addEventListener('click', (e) => {
      const btn =
        e.target.closest?.('.fav-toggle') ||
        (e.target.classList && e.target.classList.contains('fav-toggle') ? e.target : null);
      if (!btn) return;

      const id = Number(btn.dataset.id);
      if (Number.isNaN(id)) return;

      const photoObj =
        (this.photos || []).find((x) => Number(x.id) === id) ||
        (this.filtered || []).find((x) => Number(x.id) === id) ||
        null;

      this.favStore.toggle(photoObj ?? id);

      this._updateFavCount();
      btn.textContent = this.favStore.isFav(id) ? 'Quitar favorito' : 'Marcar favorito';

      this._renderFavs();
    });

    // delegación para botones dentro de la lista de favoritos
    this.favList?.addEventListener('click', (e) => {
      const btn =
        e.target.closest?.('.fav-toggle') ||
        (e.target.classList && e.target.classList.contains('fav-toggle') ? e.target : null);
      if (!btn) return;

      const id = Number(btn.dataset.id);
      if (Number.isNaN(id)) return;

      this.favStore.toggle(id);

      this._updateFavCount();

      // actualizar texto del botón y re-render de la lista/grid
      btn.textContent = this.favStore.isFav(id) ? 'Quitar favorito' : 'Marcar favorito';

      // Si el favorito se ha quitado, re-renderizar la lista para quitar la tarjeta
      this._renderFavs();

      // si ya no hay favoritos, ocultar la lista para evitar UI vacía
      if (this.favStore.count() === 0) {
        this.favList.classList.add('hidden');
      }
    });
  }

  async init() {
    this.form?.addEventListener('submit', (e) => {
      e.preventDefault();
      this._onSearch();
    });
    this.resetBtn?.addEventListener('click', () => this._onReset());
    this.nextBtn?.addEventListener('click', () => this._onNext());
    this.prevBtn?.addEventListener('click', () => this._onPrev());
    this.toggleFavsBtn?.addEventListener('click', () => this._toggleFavView());

    this._updateFavCount();
    this._updatePagination();

    // Renderizar persistencia al iniciar
    const favs = this.favStore.all();
    if (favs.length > 0) {
      this.filtered = favs;
      this.page = 1;
      this._renderPage();
      this.favList.classList.remove('hidden');
    } else {
      await this._onSearch(); // búsqueda inicial
    }
  }

  async _onSearch() {
    try {
      this._showLoader(true);
      this._clearError();
      this.page = 1;

      this.photos = await this.service.latestPhotos({
        rover: this.roverSelect?.value || 'curiosity',
        camera: 'ANY',
      });

      // Actualiza badge de última búsqueda con información mínima (rover + timestamp)
      const roverLabel = this.roverSelect?.value || 'curiosity';
      const now = new Date();
      const stamp = now.toLocaleString(); // formato legible por usuario
      this.lastQueryBadge.textContent = `${roverLabel} — ${stamp}`;

      const mode = this.modeSelect?.value || 'panoramico';
      const roverVal = (this.roverSelect?.value || 'curiosity').toString().toLowerCase();

      // Filtrar por rover seleccionado primero (soporta p.rover como objeto o string)
      const byRover = (this.photos || []).filter(
        (p) => String(p.rover?.name || p.rover || '').toLowerCase() === roverVal,
      );

      // Fallback de coincidencia parcial si no hay matches exactos
      const byRoverPartial = byRover.length
        ? byRover
        : (this.photos || []).filter((p) =>
            String(p.rover?.full_name || p.rover?.name || p.rover || '')
              .toLowerCase()
              .includes(roverVal),
          );

      // Aplicar filtrado por modo sobre el conjunto ya filtrado por rover
      this.filtered = this._filterByMode(byRoverPartial.length ? byRoverPartial : this.photos, mode);

      this._updateStats();
      this._renderPage();
      this._showLoader(false);
    } catch (err) {
      this._showLoader(false);
      this._showError(err.message);
    }
  }

  _onReset() {
    this.photos = [];
    this.filtered = [];
    this.page = 1;
    this.grid.innerHTML = '';
    this.statsTotal.textContent = '0';
    this.lastQueryBadge.textContent = '—';
    this.error.classList.add('hidden');
    this.empty.classList.add('hidden');
    this._updatePagination();
  }

  _onNext() {
    const total = this.filtered.length;
    const pages = Math.max(1, Math.ceil(total / this.pageSize));
    if (this.page < pages) {
      this.page++;
      this._renderPage();
    }
  }

  _onPrev() {
    if (this.page > 1) {
      this.page--;
      this._renderPage();
    }
  }

  _filterByMode(photos, mode) {
    if (!Array.isArray(photos) || photos.length === 0) {
      // si no hay fotos en absoluto, mostrar empty
      document.getElementById('empty-state').classList.remove('hidden');
      return [];
    }

    const groups = {
      panoramico: ['PANCAM', 'MAST'],
      navegacion: ['NAVCAM', 'HAZCAM'],
      diagnostico: ['FHAZ', 'RHAZ'],
    };

    let filtered;

    if (!mode || mode === 'ANY') {
      filtered = photos;
    } else if (groups[mode]) {
      const cams = groups[mode];
      filtered = photos.filter((p) => cams.includes(String(p.camera?.name || '').toUpperCase()));
    } else {
      // modo concreto (MAST, PANCAM, NAVCAM...)
      filtered = photos.filter((p) => String(p.camera?.name || '').toUpperCase() === String(mode).toUpperCase());
    }

    const empty = document.getElementById('empty-state');
    if (filtered.length === 0) empty.classList.remove('hidden');
    else empty.classList.add('hidden');

    return filtered;
  }

  _renderCard(photo) {
    const isFav = this.favStore.isFav(photo.id);
    const img = photo.img_src || photo.imgSrc || photo.imgUrl || '/mock_img.png';
    const roverName = (photo.rover && (photo.rover.name || photo.rover)) || '—';
    const cameraName = (photo.camera && (photo.camera.name || photo.camera)) || '—';
    const date = photo.earth_date ?? photo.date ?? '—';

    return `
    <div class="photo-card">
      <div class="photo-media" style="position:relative;">
        <img src="${img}" alt="${cameraName}" />
        <div class="photo-overlay" style="position:absolute;left:8px;top:8px;background:rgba(0,0,0,0.6);padding:4px 6px;border-radius:6px;font-size:12px;color:#fff;">
          <div style="font-weight:600;">${roverName}</div>
          <div style="font-size:11px;opacity:0.9;">${cameraName} • ${date}</div>
        </div>
      </div>
      <button class="fav-toggle" data-id="${photo.id}" data-testid="fav-toggle-${photo.id}">
        ${isFav ? 'Quitar favorito' : 'Marcar favorito'}
      </button>
    </div>`;
  }

  _renderPage() {
    const total = this.filtered.length;
    const pages = Math.max(1, Math.ceil(total / this.pageSize));
    this.page = Math.min(Math.max(1, this.page), pages);

    const start = (this.page - 1) * this.pageSize;
    const end = start + this.pageSize;
    const subset = this.filtered.slice(start, end);
    this.grid.innerHTML = subset.map((p) => this._renderCard(p)).join('');
    // no necesita else porque si no hay fotos, el array es vacío y no se renderiza nada
    this._updatePagination();
    this._updateFavCount();
  }

  _updatePagination() {
    const total = this.filtered.length;
    const pages = Math.max(1, Math.ceil(total / this.pageSize));
    this.page = Math.min(Math.max(1, this.page), pages);
    this.prevBtn.disabled = this.page <= 1;
    this.nextBtn.disabled = this.page >= pages;
    this.pageInfo.textContent = `Página ${this.page} / ${pages}`;
  }

  _updateStats() {
    this.statsTotal.textContent = this.filtered.length.toString();
  }

  _showLoader(show) {
    this.loader.classList.toggle('hidden', !show);
  }

  _showError(msg) {
    this.error.textContent = msg;
    this.error.classList.remove('hidden');
  }

  _clearError() {
    this.error.classList.add('hidden');
  }

  _updateFavCount() {
    this.favCount.textContent = this.favStore.count().toString();
  }

  _renderFavs() {
    const favs = this.favStore.all();

    if (!favs || favs.length === 0) {
      this.favList.innerHTML = '<li>No hay candidatas</li>';
      this.favList.classList.add('hidden');
      return;
    }

    this.favList.innerHTML = favs
      .map((p) => {
        const resolved =
          p && typeof p === 'object' && p.id
            ? p
            : (this.photos || []).find((x) => Number(x.id) === Number(p)) ||
              (this.filtered || []).find((x) => Number(x.id) === Number(p)) || {
                id: p,
                img_src: '/mock_img.png',
                camera: { name: '—' },
                rover: { name: '—' },
                earth_date: '—',
              };

        const img = resolved.img_src || resolved.imgSrc || resolved.imgUrl || '/mock_img.png';
        const roverName = (resolved.rover && (resolved.rover.name || resolved.rover)) || '—';
        const cameraName = (resolved.camera && (resolved.camera.name || resolved.camera)) || '—';
        const date = resolved.earth_date ?? resolved.date ?? '—';

        return `
        <div class="photo-card">
          <div style="position:relative;">
            <img src="${img}" alt="${cameraName}" />
            <div style="position:absolute;left:8px;top:8px;background:rgba(0,0,0,0.6);padding:4px 6px;border-radius:6px;font-size:12px;color:#fff;">
              <div style="font-weight:600;">${roverName}</div>
              <div style="font-size:11px;opacity:0.9;">${cameraName} • ${date}</div>
            </div>
          </div>
          <button class="fav-toggle" data-id="${resolved.id}" data-testid="fav-toggle-${resolved.id}">
            ${this.favStore.isFav(resolved.id) ? 'Quitar favorito' : 'Marcar favorito'}
          </button>
        </div>`;
      })
      .join('');
  }

  _toggleFavView() {
    const nowHidden = this.favList.classList.toggle('hidden');
    if (!nowHidden) this._renderFavs();
  }
}
