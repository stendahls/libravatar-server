const got = require( 'got' );

class ElvisClient {
    constructor( hostUrl ) {
        this.hostUrl = hostUrl;
    }

    login( username, password ) {
        return this.load( `${ this.hostUrl }/services/apilogin`, {
            method: 'POST',
            query: {
                username,
                password,
            },
            json: true,
        } )
            .then( ( response ) => {
                if ( !response.loginSuccess ) {
                    throw new Error( `Failed to login to server. Got ${ response.loginFaultMessage }` );
                }

                console.log( `Successuflly logged in to Elvis server version ${ response.serverVersion } at ${ this.hostUrl }` );
                this.token = response.authToken;
            } )
            .catch( ( loginError ) => {
                console.error( loginError );
            } );
    }

    browse( path ) {
        const url = `${ this.hostUrl }/services/browse?path=${ encodeURIComponent( path ) }&includeExtensions=all`;
        console.log( `Browsing ${ url }` );

        return this.load( url, {
            json: true,
        } );
    }

    search( options ) {
        const query = options.join( ' ' );
        const url = `${ this.hostUrl }/services/search?num=200&q=${ query }`;
        console.log( `Searching ${ url }` );

        return this.load( url, {
            json: true,
        } );
    }

    download( url, destination ) {
        console.log( `Downloading ${ url }` );
        return new Promise( ( resolve, reject ) => {
            const writeStream = fs.createWriteStream( destination );
            this.stream( url )
                .pipe( writeStream );

            writeStream.on( 'close', () => {
                resolve( destination );
            } );
        } );
    }

    getPreview( assetID ) {
        const url = `${ this.hostUrl }/preview/${ encodeURIComponent( assetID ) }`;
        console.log( `Downloading ${ url }` );

        this.load( url );
    }

    load( url, options = {} ) {
        if ( !options.headers ) {
            options.headers = {};
        }

        if ( this.token ) {
            options.headers.Authorization = `Bearer ${ this.token }`;
        }

        return got( url, options )
            .then( ( response ) => {
                return response.body;
            } )
            .catch( ( loadError ) => {
                console.error( `Failed to load ${ url }` );
                throw loadError;
            } );
    }

    stream( url, options = {} ) {
        if ( !options.headers ) {
            options.headers = {};
        }

        if ( this.token ) {
            options.headers.Authorization = `Bearer ${ this.token }`;
        }

        return got.stream( url, options );
    }
}

module.exports = ElvisClient;
