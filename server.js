#!/usr/bin/env node

require( 'dotenv' ).config();
const path = require( 'path' );

const express = require( 'express' );
const sharp = require( 'sharp' );

const providers = require( './providers/' );

const app = express();

const DEFAULT_AVATAR_PROVIDER = 'file';
const DEFAULT_LISTEN_PORT =  4000;
const DEFAULT_SIZE = 80 ;

const MIN_AVATAR_SIZE = 1;
const MAX_AVATAR_SIZE = 512;

const DEFAULT_VALUES_ALLOWED = [
    '404',
];

let defaultSize = process.env.DEFAULT_SIZE || DEFAULT_SIZE;
let avatarProvider = process.env.PROVIDER || DEFAULT_AVATAR_PROVIDER;
let listenPort = process.env.LISTEN_PORT || DEFAULT_LISTEN_PORT;

if ( defaultSize < MIN_AVATAR_SIZE || defaultSize > MAX_AVATAR_SIZE ) {
    console.warn( `Provided default size is either too larger or too small, falling back to ${ DEFAULT_SIZE }` );
    defaultSize = DEFAULT_SIZE;
}

if ( !Object.keys( providers ).includes( avatarProvider ) ) {
    console.warn( `Unknown provider ${ avatarProvider }. Falling back to ${ DEFAULT_AVATAR_PROVIDER }` );
    avatarProvider = DEFAULT_AVATAR_PROVIDER;
}

app.get( '/avatar/:emailHash', async ( request, response ) => {
    let forceDefault = false;
    let avatarImage = false;
    let targetSize = defaultSize;

    if ( !request.params.emailHash ) {
        response.sendStatus( 404 );

        return false;
    }

    if ( request.params.emailHash.length !== 32 && request.params.emailHash.length !== 64 ) {
        response.sendStatus( 400 );

        return false;
    }

    if ( request.query.s ) {
        const querySize = Number( request.query.s );

        if ( querySize >= MIN_AVATAR_SIZE && querySize <= MAX_AVATAR_SIZE ) {
            targetSize = querySize;
        }
    }

    // Make "size" take precedence if both s and size is passed
    if ( request.query.size ) {
        const querySize = Number( request.query.size );

        if ( querySize >= MIN_AVATAR_SIZE && querySize <= MAX_AVATAR_SIZE ) {
            targetSize = querySize;
        }
    }

    if ( request.query.f ) {
        forceDefault = true;
    }

    // Make "forcedefault" take precedence if both f and forcedefault is passed
    if ( request.query.forcedefault ) {
        forceDefault = true;
    }

    if ( !forceDefault ) {
        avatarImage = await providers[ avatarProvider ]( request.params.emailHash, targetSize );
    }

    if ( !avatarImage ) {
        let defaultFallback = false;

        if ( request.query.d && DEFAULT_VALUES_ALLOWED.includes( request.query.d ) ) {
            defaultFallback = request.query.d;
        }

        // Override d with default if available
        if ( request.query.default && DEFAULT_VALUES_ALLOWED.includes( request.query.default ) ) {
            defaultFallback = request.query.default;
        }

        switch ( defaultFallback ) {
            case '404':
                response.sendStatus( 404 );

                return true;
            default:
                avatarImage = await sharp( path.join( __dirname, 'assets', 'default.jpg' ) )
                    .resize( targetSize, targetSize )
                    .toBuffer();
        }
    }

    response.set( {
        'content-type': 'image/jpg',
    } );

    response.send( avatarImage );
} );

app.listen( LISTEN_PORT, () => {
    console.log( `Libreavatar server now running on localhost:${ LISTEN_PORT }` );
} );
