import MarsPhotoService from './services/MarsPhotoService.js'
import FavoritesStore from './stores/FavoritesStore.js'
import UiController from './controllers/UiController.js'

class App {
  constructor() {
    this.service = new MarsPhotoService()
    this.favoritesStore = new FavoritesStore()
    this.ui = new UiController(this.service, this.favoritesStore, 9)
  }

  init() {
    this.ui.init()
  }
}

window.__app = new App()
window.__app.init()
