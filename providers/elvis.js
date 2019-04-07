const fs = require( 'fs' );

const sharp = require( 'sharp' );

const ElvisClient = require( '../modules/ElvisClient.js' );
const hash = require( '../modules/hash.js' );

const elvisClient = new ElvisClient( process.env.ELVIS_PROVIDER_SERVER );

const cache = {};

module.exports = async ( emailHash, targetSize ) => {
    await elvisClient.login( process.env.ELVIS_PROVIDER_USER, process.env.ELVIS_PROVIDER_PASSWORD );
    const data = await elvisClient.search( [
        `relatedTo:${ process.env.ELVIS_PROVIDER_AVATAR_CONTAINER }`,
        'relationTarget:child',
        'relationType:contains',
    ] );
    const hashes = {};

    files = data.hits
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
