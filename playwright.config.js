const { defineConfig } = require( '@playwright/test' );
module.exports = defineConfig( {
	testDir: './tests/e2e',
	fullyParallel: false,
	workers: 1,
	retries: 1,
	reporter: [ [ 'list' ], [ 'html', { open: 'never' } ] ],
	use: {
		viewport: { width: 390, height: 844 },
		trace: 'retain-on-failure',
		screenshot: 'only-on-failure',
	},
} );
