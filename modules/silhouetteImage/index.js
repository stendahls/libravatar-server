const path = require( 'path' );
const sharp = require( 'sharp' );

const cache = new Map();

module.exports = {
  get: async (size) => {
    if (cache.has(size)) {
      return cache.get(size);
    }

    const image = await sharp( path.join( __dirname, 'silhouette.jpg' ) )
      .resize( size, size )
      .toBuffer();

    cache.set(size, image);

    return image;
  }
}
