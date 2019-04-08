const fs = require( 'fs' );

const sharp = require( 'sharp' );

const ElvisClient = require( '../modules/ElvisClient.js' );
const hash = require( '../modules/hash.js' );

const elvisClient = new ElvisClient( process.env.ELVIS_PROVIDER_SERVER );

const updateLookupCache = function updateLookupCache(){
    return elvisClient.search( [
        `relatedTo:${ process.env.ELVIS_PROVIDER_AVATAR_CONTAINER }`,
        'relationTarget:child',
        'relationType:contains',
    ] );
};

const cache = {};
let lookupCache = false;

( async () => {
    await elvisClient.login( process.env.ELVIS_PROVIDER_USER, process.env.ELVIS_PROVIDER_PASSWORD );

    lookupCache = await updateLookupCache();

    setInterval( async () => {
        try {
            const updatedCache = await updateLookupCache();

            if ( !updatedCache ) {
                console.error( `Unable to update lookup cache.`);

                return true;
            }

            lookupCache = updatedCache;
        } catch ( updateError ) {
            console.error( updateError );
        }
    }, 60000 );
} )();

module.exports = async ( emailHash, targetSize ) => {
    const hashes = {};

    if ( !lookupCache.hits ) {
        console.warn( `Unable to load images from Elvis` );
        console.warn( data );

        return false;
    }

    files = lookupCache.hits
        .filter( ( searchResult ) => {
            return searchResult.metadata.subjectPerson;
        } )
        .map( ( searchResult ) => {
            const email = `${ searchResult.metadata.subjectPerson }@${ process.env.ELVIS_PROVIDER_AVATAR_DOMAIN }`.toLowerCase();

            if ( emailHash.length === 64 ) {
                hashes[ hash.sha256( email ) ] = {
                    url: searchResult.previewUrl,
                    assetModified: searchResult.metadata.assetModified.value,
                };

                return true;
            }

            hashes[ hash.md5( email ) ] = {
                url: searchResult.previewUrl,
                assetModified: searchResult.metadata.assetModified.value,
            };

            return true;
        } );

    if ( !hashes[ emailHash ] ) {
        return false;
    }

    let chunks = [];

    if ( cache[ emailHash ] && cache[ emailHash ].assetModified >= hashes[ emailHash ].assetModified ) {
        return sharp( cache[ emailHash ].data )
            .resize( targetSize, targetSize )
            .toBuffer();
    }

    const readStream = elvisClient.stream( hashes[ emailHash ].url );

    readStream.on( 'data', ( chunk ) => {
        chunks.push( chunk );
    } );

    return new Promise( ( resolve, reject ) => {
        readStream.on( 'end', () => {
            cache[ emailHash ] = {
                assetModified: hashes[ emailHash ].assetModified,
                data: Buffer.concat( chunks ),
            };

            const avatarImage = sharp( cache[ emailHash ].data )
                .resize( targetSize, targetSize )
                .toBuffer();

            resolve( avatarImage );
        } );

        readStream.on( 'error', ( someError ) => {
            reject( someError );
        } );
    } );
};
