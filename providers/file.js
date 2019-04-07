const fs = require( 'fs' );
const path = require( 'path' );
const { promisify } = require( 'util' );

const sharp = require( 'sharp' );

const hash = require( '../modules/hash.js' );

const promiseReaddir = promisify( fs.readdir );

const RAW_FILE_DATA_PATH = process.env.FILE_PROVIDER_RAW_FOLDER || path.join( __dirname, '..', 'raw' );

module.exports = async ( emailHash, targetSize ) => {
    const files = await promiseReaddir( RAW_FILE_DATA_PATH );
    const hashes = {};

    files.map( ( filename ) => {
        const fileData = path.parse( filename );

        if ( emailHash.length === 64 ) {
            hashes[ hash.sha256( fileData.name ) ] = filename;

            return true;
        }

        hashes[ hash.md5( fileData.name ) ] = filename;

        return true;
    } );

    if ( !hashes[ emailHash ] ) {
        return false;
    }

    const targetImagePath = path.join( RAW_FILE_DATA_PATH, `${ hashes[ emailHash ] }` );
    return await sharp( targetImagePath )
        .resize( targetSize, targetSize )
        .toBuffer();
};
