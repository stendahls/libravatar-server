const crypto = require( 'crypto' );

module.exports = {
    md5: ( inputData ) => {
        return crypto.createHash( 'md5' ).update( inputData ).digest( 'hex' );
    },
    sha256: ( inputData ) => {
        return crypto.createHash( 'sha256' ).update( inputData ).digest( 'hex' );
    },
};
