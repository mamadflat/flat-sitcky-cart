// Plugin Check's default command can return zero even when findings exist.
const fs = require( 'node:fs' );
const raw = fs.readFileSync( 'plugin-check.json', 'utf8' ).trim();
// PCP emits a plain success sentence, even with --format=json, for a clean scan.
const report = raw === 'Success: Checks complete. No errors found.' ? [] : JSON.parse( raw );
fs.writeFileSync( 'plugin-check.json', JSON.stringify( report, null, 2 ) + '\n' );
const findings = [];
function visit( value ) {
	if ( ! value || typeof value !== 'object' ) {
		return;
	}
	if ( [ 'ERROR', 'WARNING' ].includes( String( value.type ).toUpperCase() ) ) {
		findings.push( value );
	}
	Object.values( value ).forEach( visit );
}
visit( report );
if ( findings.length ) {
	console.error( JSON.stringify( findings, null, 2 ) );
	process.exit( 1 );
}
console.log( 'Plugin Check: no errors or warnings.' );
