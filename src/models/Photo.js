/* eslint-disable linebreak-style */
// la ruta debe ser src/models/Photo.js
export default class Photo {
  constructor(raw) {
    this.id = raw.id;
    this.imgSrc = raw.img_src || raw.imgSrc || '';
    this.rover = raw.rover?.name || raw.rover || '';
    this.camera = raw.camera?.name || raw.camera || '';
    this.date = raw.earth_date || raw.date || '';
  }

  toJSON() {
    return {
      id: this.id,
      img_src: this.imgSrc,
      rover: this.rover,
      camera: this.camera,
      earth_date: this.date,
    };
  }
}
