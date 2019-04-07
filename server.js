#!/usr/bin/env node

require( 'dotenv' ).config();
const path = require( 'path' );

const express = require( 'express' );
const sharp = require( 'sharp' );

const providers = require( './providers/' );

const app = express();

const LISTEN_PORT = process.env.LISTEN_PORT || 4000;
const ALLOWED_SIZES = [
    16,
    32,
    48,
    64,
    80,
    96,
    128,
    256,
    512,
];
const DEFAULT_SIZE = process.env.DEFAULT_SIZE || 80 ;
const DEFAULT_VALUES_ALLOWED = [
    '404',
];

app.get( '/avatar/:emailHash', async ( request, response ) => {
    let forceDefault = false;
    let avatarImage = false;
    let targetSize = DEFAULT_SIZE;

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

        if ( ALLOWED_SIZES.includes( querySize ) ) {
            targetSize = querySize;
        }
    }

    // Make "size" take precedence if both s and size is passed
    if ( request.query.size ) {
        const querySize = Number( request.query.size );

        if ( ALLOWED_SIZES.includes( querySize ) ) {
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
        avatarImage = await providers[ process.env.PROVIDER || 'file' ]( request.params.emailHash, targetSize );
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
