const fs = require( 'fs' );

const sharp = require( 'sharp' );

const ElvisClient = require( '../modules/ElvisClient.js' );
const hash = require( '../modules/hash.js' );

const elvisClient = new ElvisClient( process.env.ELVIS_PROVIDER_SERVER );

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
                hashes[ hash.sha256( email ) ] = searchResult.previewUrl;

                return true;
            }

            hashes[ hash.md5( email ) ] = searchResult.previewUrl;

            return true;
        } );

    if ( !hashes[ emailHash ] ) {
        return false;
    }

    let chunks = [];
    const readStream = elvisClient.stream( hashes[ emailHash ] );

    readStream.on( 'data', ( chunk ) => {
        chunks.push( chunk );
    } );

    return new Promise( ( resolve, reject ) => {
        readStream.on( 'end', () => {
            const avatarImage = sharp( Buffer.concat( chunks ) )
                .resize( targetSize, targetSize )
                .toBuffer();

            resolve( avatarImage );
        } );

        readStream.on( 'error', ( someError ) => {
            reject( someError );
        } );
    } );
};
