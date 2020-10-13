const path = require( 'path' );
const sharp = require( 'sharp' );

const cache = new Map();

module.exports = {
    get: async (size) => {
        if (cache.has(size)) {
            return cache.get(size);
        }
        
        let image;
        try {
            image = await sharp( path.join( __dirname, 'silhouette.jpg' ) )
                .resize( size, size )
                .toBuffer();
        } catch (loadSilhouetteError){
            console.log(loadSilhouetteError);
        }
        
        cache.set(size, image);
        
        return image;
    }
}
