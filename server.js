#!/usr/bin/env node

require( 'dotenv' ).config();

const express = require( 'express' );

const providers = require( './providers/' );
const silhouetteImage = require('./modules/silhouetteImage');
const isUrl = require('is-url');

const app = express();

const DEFAULT_AVATAR_PROVIDER = 'file';
const DEFAULT_LISTEN_PORT =  4000;
const DEFAULT_SIZE = 80 ;

const MIN_AVATAR_SIZE = 1;
const MAX_AVATAR_SIZE = 1024;

let defaultSize = process.env.DEFAULT_SIZE || DEFAULT_SIZE;
let avatarProvider = process.env.PROVIDER || DEFAULT_AVATAR_PROVIDER;
let listenPort = process.env.LISTEN_PORT || DEFAULT_LISTEN_PORT;

if ( defaultSize < MIN_AVATAR_SIZE || defaultSize > MAX_AVATAR_SIZE ) {
    console.warn( `Provided default size is either too larger or too small, falling back to ${ DEFAULT_SIZE }` );
    defaultSize = DEFAULT_SIZE;
}

const providersOrder = (process.env.PROVIDER_ORDER || avatarProvider)
    .split(',')
    .map((providerName) => {
        if (!providers[providerName]) {
            throw new Error( `Could not find provider ${ providerName }` );
        }

        return providerName;
    });

if ( providersOrder.includes('elvis') ) {
    if ( typeof process.env.ELVIS_PROVIDER_SERVER === 'undefined' ) {
        throw new Error( `Missing required value ELVIS_PROVIDER_SERVER for 'elvis' provider` );
    }

    if ( typeof process.env.ELVIS_PROVIDER_USER === 'undefined' ) {
        throw new Error( `Missing required value ELVIS_PROVIDER_USER for 'elvis' provider` );
    }

    if ( typeof process.env.ELVIS_PROVIDER_PASSWORD === 'undefined' ) {
        throw new Error( `Missing required value ELVIS_PROVIDER_PASSWORD for 'elvis' provider` );
    }

    if ( typeof process.env.ELVIS_PROVIDER_AVATAR_CONTAINER === 'undefined' ) {
        throw new Error( `Missing required value ELVIS_PROVIDER_AVATAR_CONTAINER for 'elvis' provider` );
    }

    if ( typeof process.env.ELVIS_PROVIDER_AVATAR_DOMAIN === 'undefined' ) {
        throw new Error( `Missing required value ELVIS_PROVIDER_AVATAR_DOMAIN for 'elvis' provider` );
    }
}

app.get( '/', ( request, response ) => {
    response.send( `<!DOCTYPE html>
<html lang="en">
 <head>
  <title>Libravatar server</title>
 </head>
 <body>
  <h1>Libravatar image server</h1>
  <p>
   This is a
   <a href="https://www.libravatar.org/">Libravatar</a>
   compatible avatar image server powered by
   <a href="https://github.com/stendahls/libravatar-server">libravatar server</a>.
  </p>
  <p>
   Libravatar is a federated and open source alternative to the Gravatar
   service and has one goal:
   <strong>
    Providing avatar images for email and OpenID addresses.
   </strong>
  </p>
  <p>
    Non-standard options available: <br>
    <b>disallowedproviders</b>
    A comma separated list of providers that shouldn't be used. Available providers are file, elivs & libaravatarOrg
  </p>
 </body>
</html>` );
} );

app.get( '/avatar', async ( request, response ) => {
    response.status( 400 ).send( 'URI is wrong, should be avatar/$hash' );
} );

app.get( '/avatar/', async ( request, response ) => {
    response.status( 400 ).send( 'Hash has to be 32 or 64 characters long' );
} );

app.get( '/avatar/:emailHash', async ( request, response ) => {
    let forceDefault = false;
    let avatarImage = false;
    let targetSize = defaultSize;
    let disallowedProviders = [];

    if ( !request.params.emailHash ) {
        response.sendStatus( 404 );

        return false;
    }

    const { emailHash } = request.params;

    if ( emailHash.length !== 32 && emailHash.length !== 64 ) {
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


    if ( request.query.disallowedproviders ){
        disallowedProviders = request.query.disallowedproviders.split(',');
    }

    if ( !forceDefault ) {
        for(const providerName of providersOrder){
            if ( disallowedProviders.includes( providerName ) ) {
                continue;
            }
            const provider = providers[providerName];
            const timeHash = `${providerName}-${targetSize}-${emailHash}`;

            console.time(timeHash);
            try {
                avatarImage = await provider(emailHash, targetSize);
            } catch (providerError){
                console.error(providerError);
            }
            console.timeEnd(timeHash);

            if(avatarImage){
                break;
            }
        }
    }

    if ( !avatarImage ) {
        let defaultFallback = false;

        if ( request.query.d ) {
            defaultFallback = request.query.d;
        }

        // Override d with default if available
        if ( request.query.default ) {
            defaultFallback = request.query.default;
        }

        // Special values for default fallback
        // https://wiki.libravatar.org/api/
        // Each case can either set `avatarImage` to
        // set the avatar image to return
        // or return true to stop checking
        if (defaultFallback === '404') {
            response.sendStatus( 404 );

            return true;
        }
        if (defaultFallback === 'mm') {
            try {
                avatarImage = await silhouetteImage.get(targetSize);
            } catch (silhouetteError){
                console.error(silhouetteError);
            }
        }

        // If `defaultFallback` is a url, redirect to it
        if ( isUrl(defaultFallback) ) {
            response.redirect( 302, defaultFallback );

            return true;
        }

        // After checking all default fallbacks, fallback
        // to getting a silhouetteImage instead
        if (!avatarImage) {
            try {
                avatarImage = await silhouetteImage.get(targetSize);
            } catch (silhouetteError){
                console.error(silhouetteError);
            }
        }
    }

    response.set( {
        'content-type': 'image/jpg',
    } );

    response.send( avatarImage );
} );

app.listen( listenPort, () => {
    console.log( `libravatar server now running on localhost:${ listenPort } with providers [${ providersOrder }]` );
} );
