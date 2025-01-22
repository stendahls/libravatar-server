
import sharp from 'sharp';

import ElvisClient from '../modules/ElvisClient.js';
import hash from '../modules/hash.js';
// const sharp = require( 'sharp' );

// const ElvisClient = require( '../modules/ElvisClient.js' );
// const hash = require( '../modules/hash.js' );

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

            if ( !updatedCache || updatedCache.errorcode ) {
                console.log( updatedCache );
                console.error( `Unable to update lookup cache.`);

                return true;
            }

            lookupCache = updatedCache;
        } catch ( updateError ) {
            console.error( updateError );
        }
    }, 60000 );

    setInterval( () => {
        // Relogin every 15 minutes
        console.log( 'Re-login' );
        elvisClient.login( process.env.ELVIS_PROVIDER_USER, process.env.ELVIS_PROVIDER_PASSWORD );
    }, 900000 );
} )();

const elvis = async ( emailHash, targetSize ) => {
    const hashes = {};

    if ( !lookupCache.hits ) {
        console.warn( `Unable to load images from Elvis` );
        console.warn( lookupCache );

        return false;
    }

    lookupCache.hits
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

    if ( cache[ emailHash ] && cache[ emailHash ].assetModified >= hashes[ emailHash ].assetModified ) {
        const sizeKey = `${ targetSize }x${ targetSize }`;

        if ( cache[ emailHash ].resizedImages[ sizeKey ] ) {
            return cache[ emailHash ].resizedImages[ sizeKey ];
        }

        try {
            const avatarImage = await sharp( cache[ emailHash ].imageData )
                .resize( {
                    width: targetSize,
                    height: targetSize,
                    fit: 'cover',
                } )
                .toBuffer();

            cache[ emailHash ].resizedImages[ sizeKey ] = avatarImage;

            return avatarImage;
        } catch ( cacheReadError ) {
            console.error( `Failed to load the hash ${ emailHash } with size ${ sizeKey } from cache` );
            console.error( cache[ emailHash ] );
        }
    }

    const readStream = elvisClient.stream( hashes[ emailHash ].url );

    readStream.on( 'data', ( chunk ) => {
        chunks.push( chunk );
    } );

    return new Promise( ( resolve, reject ) => {
        readStream.on( 'end', async () => {
            cache[ emailHash ] = {
                assetModified: hashes[ emailHash ].assetModified,
                imageData: Buffer.concat( chunks ),
                resizedImages: {},
            };

            const avatarImage = await sharp( cache[ emailHash ].imageData )
                .resize( {
                    width: targetSize,
                    height: targetSize,
                    fit: 'cover',
                } )
                .toBuffer();

            cache[ emailHash ].resizedImages[ `${ targetSize }x${ targetSize }` ] = avatarImage;

            resolve( avatarImage );
        } );

        readStream.on( 'error', ( someError ) => {
            reject( someError );
        } );
    } );
};

export default elvis;