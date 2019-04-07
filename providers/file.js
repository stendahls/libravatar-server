const fs = require( 'fs' );
const path = require( 'path' );
const { promisify } = require( 'util' );
const crypto = require( 'crypto' );

const sharp = require( 'sharp' );

const promiseReaddir = promisify( fs.readdir );

const RAW_FILE_DATA_PATH = path.join( __dirname, '..', 'raw' );

const md5 = function md5 ( inputData ) {
    return crypto.createHash( 'md5' ).update( inputData ).digest( 'hex' );
};

const sha256 = function sha256 ( inputData ) {
    return crypto.createHash( 'sha256' ).update( inputData ).digest( 'hex' );
};

module.exports = async ( emailHash, targetSize ) => {
    const files = await promiseReaddir( RAW_FILE_DATA_PATH );
    const hashes = {};

    files.map( ( filename ) => {
        const fileData = path.parse( filename );

        if ( emailHash.length === 64 ) {
            hashes[ sha256( fileData.name ) ] = filename;

            return true;
        }

        hashes[ md5( fileData.name ) ] = filename;

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
