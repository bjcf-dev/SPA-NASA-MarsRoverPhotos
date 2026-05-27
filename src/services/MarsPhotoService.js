/* eslint-disable no-console */
/* eslint-disable no-underscore-dangle */
export default class MarsPhotoService {
  constructor(apiKey = import.meta?.env?.VITE_NASA_API_KEY || 'DEMO_KEY') {
    this.apiKey = apiKey;
  }

  async latestPhotos({ rover = 'curiosity', camera = 'ANY' } = {}) {
    const cameraParam = camera && camera !== 'ANY' ? `&camera=${camera}` : '';

    const normalize = (arr) =>
      (arr || []).map((p) => ({
        id: p.id,
        img_src: p.img_src ?? p.imgSrc ?? p.imgUrl ?? '',
        camera: {
          name:
            p && p.camera && typeof p.camera === 'object' && p.camera.name
              ? p.camera.name
              : typeof p.camera === 'string'
              ? p.camera
              : '',
        },
        rover: p.rover ?? null,
        earth_date: p.earth_date ?? p.date ?? null,
        ...p,
      }));

    // Safe JSON parse
    const safeParseJson = async (res) => {
      if (!res) return null;

      if (typeof res === 'object' && typeof res.json !== 'function') {
        return res;
      }

      try {
        const ctHeader =
          res.headers && typeof res.headers.get === 'function'
            ? (res.headers.get('content-type') || '').toLowerCase()
            : '';
        if (ctHeader && !ctHeader.includes('application/json')) {
          return null;
        }

        return await res.json();
      } catch (err) {
        console.warn('[MarsPhotoService] json parse failed', err);
        return null;
      }
    };

    // habilitar try local mock-latest.json first
    if (import.meta.env.VITE_USE_MOCK === '1' || import.meta.env.VITE_USE_MOCK === 'true') {
      try {
        const localRes = await fetch('/mock-latest.json');
        const localJson = await safeParseJson(localRes);
        const list = localJson?.latest_photos ?? localJson?.photos ?? null;
        if (Array.isArray(list)) return normalize(list);
        // if file exists but parse failed or isn't array, continue to remote attempts
      } catch (e) {
        console.warn('[MarsPhotoService] failed to load local mock-latest.json', e);
      }
    }

    // Build endpoints
    const latestUrl = `https://api.nasa.gov/mars-photos/api/v1/rovers/${rover}/latest_photos?api_key=${this.apiKey}${cameraParam}`;
    const sol = 1000;
    const photosUrl = `https://api.nasa.gov/mars-photos/api/v1/rovers/${rover}/photos?sol=${sol}&api_key=${this.apiKey}${cameraParam}`;

    // Fetch-with-retry: only retry for 429
    const fetchWithRetry = async (url, retries = 2, backoff = 200) => {
      for (let i = 0; i <= retries; i++) {
        try {
          const res = await fetch(url);
          if (res.ok) return res;
          if (res.status !== 429) return res;
          if (i < retries) await new Promise((r) => setTimeout(r, backoff * Math.pow(2, i)));
        } catch (err) {
          if (i === retries) return null;
          await new Promise((r) => setTimeout(r, backoff * Math.pow(2, i)));
        }
      }
      return null;
    };

    try {
      // Try latest_photos primero; if OK return result (incluido if vacio)
      let response = await fetchWithRetry(latestUrl, 2, 250);
      if (response && response.ok) {
        const data = await safeParseJson(response);
        const list = data?.latest_photos ?? data?.photos ?? [];
        return normalize(list);
      }

      if (response && response.status !== 404) {
        console.warn('[MarsPhotoService] latest_photos responded with', response.status);
      }

      // Try para /photos endpoint como fallback
      response = await fetchWithRetry(photosUrl, 2, 250);
      if (response && response.ok) {
        const data = await safeParseJson(response);
        const list = data?.photos ?? data?.latest_photos ?? [];
        return normalize(list);
      } else if (response) {
        console.warn('[MarsPhotoService] photos endpoint responded with', response.status);
      }

      // try local mock-latest.json
      try {
        const localRes = await fetch('/mock-latest.json');
        const localJson = await safeParseJson(localRes);
        const list = localJson?.latest_photos ?? localJson?.photos ?? [];
        if (Array.isArray(list) && list.length > 0) return normalize(list);
      } catch (e) {
        console.warn('[MarsPhotoService] failed to load local mock-latest.json after remote failures', e);
      }

      // Final fallback
      return [];
    } catch (error) {
      console.error('[MarsPhotoService] unexpected error:', error);
      return [];
    }
  }

  _normalize(arr) {
    return (arr || []).map((p) => ({
      id: p.id,
      img_src: p.img_src ?? p.imgSrc ?? p.imgUrl ?? '',
      camera: {
        name:
          p && p.camera && typeof p.camera === 'object' && p.camera.name
            ? p.camera.name
            : typeof p.camera === 'string'
            ? p.camera
            : '',
      },
      rover: p.rover ?? null,
      earth_date: p.earth_date ?? p.date ?? null,
      ...p,
    }));
  }
}
