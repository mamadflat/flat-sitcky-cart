const fs = require( 'node:fs' );
const gettext = require( 'gettext-parser' );
const path = 'languages/flat-sitcky-vart-fa_IR';
fs.writeFileSync( path + '.mo', gettext.mo.compile( gettext.po.parse( fs.readFileSync( path + '.po' ) ) ) );
