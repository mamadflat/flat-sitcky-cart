const { test, expect } = require( '@playwright/test' );
const fixtures = require( '../fixtures.json' );
const add = 'افزودن به سبد خرید';
const choose = 'انتخاب گزینه‌ها';

async function open( page, kind ) {
	await page.goto( fixtures[ kind ].url );
	await expect( page.locator( '#fsct-bar' ) ).toBeVisible();
	if ( ! [ 'outofstock' ].includes( kind ) ) { await expect( page.locator( '#fsct-bar' ) ).toHaveClass( /fsct-ready/ ); }
}

test( 'mobile price and purchase are visible at entry, without scrolling', async ( { page } ) => {
	await open( page, 'simple' );
	await expect( page.locator( '#fsct-submit' ) ).toHaveText( add );
	await expect( page.locator( '#fsct-submit' ) ).toBeEnabled();
	await expect( page.locator( '.storefront-handheld-footer-bar' ) ).toBeHidden();
	await expect( page.locator( '#fsct-price-value' ) ).toContainText( '100' );
	expect( await page.evaluate( () => scrollY ) ).toBe( 0 );
	const rect = await page.locator( '#fsct-bar' ).boundingBox();
	expect( Math.abs( rect.y + rect.height - 844 ) ).toBeLessThan( 2 );
	await page.screenshot( { path: 'test-results/mobile-entry.png' } );
} );

test( 'stays fixed while scrolling, reserves footer space, and supports RTL', async ( { page } ) => {
	await open( page, 'simple' );
	await expect( page.locator( 'html' ) ).toHaveAttribute( 'dir', 'rtl' );
	await page.locator( '#fsct-spacer' ).scrollIntoViewIfNeeded();
	const rect = await page.locator( '#fsct-bar' ).boundingBox();
	expect( Math.abs( rect.y + rect.height - 844 ) ).toBeLessThan( 2 );
	const space = await page.locator( '#fsct-spacer' ).boundingBox();
	expect( space.height ).toBeGreaterThanOrEqual( rect.height - 1 );
} );

test( 'hidden on desktop, including after resize and scrolling', async ( { page } ) => {
	await page.setViewportSize( { width: 1440, height: 900 } );
	await page.goto( fixtures.simple.url );
	await expect( page.locator( '#fsct-bar' ) ).toBeHidden();
	await expect( page.locator( '#fsct-spacer' ) ).toBeHidden();
	await page.locator( 'footer' ).first().scrollIntoViewIfNeeded();
	await expect( page.locator( '#fsct-bar' ) ).toBeHidden();
	await page.setViewportSize( { width: 767, height: 844 } );
	await expect( page.locator( '#fsct-bar' ) ).toBeVisible();
	await page.setViewportSize( { width: 768, height: 844 } );
	await expect( page.locator( '#fsct-bar' ) ).toBeHidden();
	await page.screenshot( { path: 'test-results/desktop-no-bar.png' } );
} );

test( 'fits narrow mobile widths without horizontal overflow', async ( { page } ) => {
	await page.setViewportSize( { width: 320, height: 700 } );
	await open( page, 'variable' );
	const rect = await page.locator( '#fsct-bar' ).boundingBox();
	expect( rect.x ).toBeGreaterThanOrEqual( 0 );
	expect( rect.width ).toBeLessThanOrEqual( 320 );
	const button = await page.locator( '#fsct-submit' ).boundingBox();
	expect( button.height ).toBeGreaterThanOrEqual( 44 );
	expect( button.x + button.width ).toBeLessThanOrEqual( 320 );
} );

test( 'simple purchase reaches real WooCommerce cart, preserving quantity', async ( { page } ) => {
	await open( page, 'simple' );
	await page.locator( 'form.cart input.qty' ).fill( '2' );
	await page.locator( '#fsct-submit' ).click();
	await expect( page.locator( '#fsct-status' ) ).toContainText( 'محصول شما به سبد خرید اضافه شد' );
	await page.goto( fixtures.cart );
	await expect( page.locator( 'main' ) ).toContainText( 'FSCT simple' );
	await expect( page.locator( 'input.qty' ).first() ).toHaveValue( '2' );
} );

test( 'invalid native quantity is not submitted', async ( { page } ) => {
	await open( page, 'simple' );
	await page.locator( 'form.cart input.qty' ).fill( '0' );
	await page.locator( '#fsct-submit' ).click();
	await expect( page.locator( 'form.cart input.qty' ) ).toBeFocused();
	await expect( page.locator( '.woocommerce-message' ) ).toHaveCount( 0 );
	await expect( page.locator( '#fsct-submit' ) ).toBeEnabled();
} );

test( 'variable purchase prompts options, updates price and adds correct variation', async ( { page } ) => {
	await open( page, 'variable' );
	await expect( page.locator( '#fsct-submit' ) ).toHaveText( choose );
	await page.locator( '#fsct-submit' ).click();
	await expect( page.locator( 'select[name="attribute_length"]' ) ).toBeFocused();
	await page.locator( 'select[name="attribute_length"]' ).selectOption( 'long' );
	await expect( page.locator( '#fsct-submit' ) ).toHaveText( add );
	await expect( page.locator( '#fsct-price-value' ) ).toContainText( '125' );
	await page.locator( '#fsct-submit' ).click();
	await expect( page.locator( '#fsct-status' ) ).toContainText( 'محصول شما به سبد خرید اضافه شد' );
	await page.goto( fixtures.cart );
	await expect( page.locator( 'main' ) ).toContainText( 'FSCT variable' );
	await expect( page.locator( 'main' ) ).toContainText( 'long' );
} );

test( 'reset restores range and option-selection action', async ( { page } ) => {
	await open( page, 'variable' );
	const initial = await page.locator( '#fsct-price-value' ).textContent();
	await page.locator( 'select[name="attribute_length"]' ).selectOption( 'long' );
	await expect( page.locator( '#fsct-submit' ) ).toHaveText( add );
	await page.locator( '.reset_variations' ).click();
	await expect( page.locator( '#fsct-submit' ) ).toHaveText( choose );
	await expect( page.locator( '#fsct-price-value' ) ).toHaveText( initial );
} );

test( 'unavailable variation cannot be purchased', async ( { page } ) => {
	await open( page, 'variable' );
	await page.locator( 'select[name="attribute_length"]' ).selectOption( 'unavailable' );
	await expect( page.locator( '#fsct-submit' ) ).toBeDisabled();
	await expect( page.locator( '#fsct-submit' ) ).toHaveText( 'ناموجود' );
} );

test( 'default variation resolves after initialization', async ( { page } ) => {
	await open( page, 'defaults' );
	await expect( page.locator( '#fsct-submit' ) ).toHaveText( add );
	await expect( page.locator( '#fsct-price-value' ) ).toContainText( '125' );
} );

test( 'WooCommerce AJAX variation lookup updates the bar', async ( { page } ) => {
	await open( page, 'ajax' );
	await expect( page.locator( '.variations_form' ) ).toHaveAttribute( 'data-product_variations', 'false' );
	await page.locator( 'select[name="attribute_length"]' ).selectOption( '2' );
	await expect( page.locator( '#fsct-submit' ) ).toHaveText( add );
	await expect( page.locator( '#fsct-price-value' ) ).toContainText( '125' );
} );

test( 'sold individually works without a visible quantity field', async ( { page } ) => {
	await open( page, 'individual' );
	await page.locator( '#fsct-submit' ).click();
	await expect( page.locator( '#fsct-status' ) ).toContainText( 'محصول شما به سبد خرید اضافه شد' );
} );

test( 'backorders remain purchasable', async ( { page } ) => {
	await open( page, 'backorder' );
	await expect( page.locator( '#fsct-submit' ) ).toBeEnabled();
} );

test( 'sale prices retain original and discounted amounts', async ( { page } ) => {
	await open( page, 'sale' );
	await expect( page.locator( '#fsct-price-value del' ) ).toContainText( '100' );
	await expect( page.locator( '#fsct-price-value ins' ) ).toContainText( '75' );
} );

test( 'out-of-stock simple product is disabled even without cart form', async ( { page } ) => {
	await open( page, 'outofstock' );
	await expect( page.locator( '#fsct-submit' ) ).toBeDisabled();
	await expect( page.locator( '#fsct-submit' ) ).toHaveText( 'ناموجود' );
} );

for ( const kind of [ 'protected', 'external', 'home', 'shop', 'cart' ] ) {
	test( 'no bar or assets on ' + kind, async ( { page } ) => {
		await page.goto( typeof fixtures[ kind ] === 'string' ? fixtures[ kind ] : fixtures[ kind ].url );
		await expect( page.locator( '#fsct-bar' ) ).toHaveCount( 0 );
		await expect( page.locator( 'script[src*="flat-sitcky-cart/assets"]' ) ).toHaveCount( 0 );
	} );
}

test( 'native form remains usable when JavaScript is disabled', async ( { browser } ) => {
	const context = await browser.newContext( { javaScriptEnabled: false, viewport: { width: 390, height: 844 } } );
	const page = await context.newPage();
	await page.goto( fixtures.simple.url );
	await expect( page.locator( '#fsct-submit' ) ).toBeDisabled();
	// Like a user scrolling, bring the original form above the fixed footer.
	await page.locator( 'form.cart' ).evaluate( ( form ) => form.scrollIntoView( { block: 'center' } ) );
	await page.locator( 'form.cart .single_add_to_cart_button' ).click();
	await expect( page.locator( '.woocommerce-message' ).first() ).toBeVisible();
	await context.close();
} );

// 0.2.0: exercise real Store API sessions, not mocked successful purchases.
test( 'confirmed add becomes quantity controls; increment, decrement and remove persist', async ( { page } ) => {
  await open( page, 'simple' );
  await page.locator( '#fsct-submit' ).click();
  await expect( page.locator( '#fsct-quantity' ) ).toHaveAttribute( 'data-quantity', '1' );
  await expect( page.locator( '#fsct-submit' ) ).toBeHidden();
  await page.locator( '#fsct-plus' ).click();
  await expect( page.locator( '#fsct-quantity' ) ).toHaveAttribute( 'data-quantity', '2' );
  await page.reload();
  await expect( page.locator( '#fsct-quantity' ) ).toHaveAttribute( 'data-quantity', '2' );
  await page.locator( '#fsct-minus' ).click();
  await expect( page.locator( '#fsct-quantity' ) ).toHaveAttribute( 'data-quantity', '1' );
  await expect( page.locator( '#fsct-minus' ) ).toHaveAttribute( 'aria-label', 'حذف از سبد خرید' );
  await page.screenshot( { path: 'test-results/mobile-cart-controls.png' } );
  await page.locator( '#fsct-minus' ).click();
  await expect( page.locator( '#fsct-submit' ) ).toBeVisible();
  await page.goto( fixtures.cart );
  await expect( page.locator( 'input.qty' ) ).toHaveCount( 0 );
} );

test( 'cart state follows selected variation without changing another variation', async ( { page } ) => {
  await open( page, 'variable' );
  const select = page.locator( 'select[name="attribute_length"]' );
  await select.selectOption( 'long' );
  await expect( page.locator( '#fsct-submit' ) ).toHaveText( add );
  await page.locator( '#fsct-submit' ).click();
  await expect( page.locator( '#fsct-quantity' ) ).toHaveAttribute( 'data-quantity', '1' );
  await select.selectOption( 'short' );
  await expect( page.locator( '#fsct-submit' ) ).toHaveText( add );
  await expect( page.locator( '#fsct-submit' ) ).toBeVisible();
  await page.locator( '#fsct-submit' ).click();
  await expect( page.locator( '#fsct-quantity' ) ).toHaveAttribute( 'data-quantity', '1' );
  await page.locator( '#fsct-plus' ).click();
  await expect( page.locator( '#fsct-quantity' ) ).toHaveAttribute( 'data-quantity', '2' );
  await select.selectOption( 'long' );
  await expect( page.locator( '#fsct-submit' ) ).toHaveText( add );
  await expect( page.locator( '#fsct-quantity' ) ).toHaveAttribute( 'data-quantity', '1' );
} );

test( 'sold-individually product cannot be incremented', async ( { page } ) => {
  await open( page, 'individual' );
  await page.locator( '#fsct-submit' ).click();
  await expect( page.locator( '#fsct-cart-controls' ) ).toBeVisible();
  await expect( page.locator( '#fsct-plus' ) ).toBeDisabled();
  await expect( page.locator( '#fsct-minus' ) ).toBeEnabled();
} );

test( 'failed quantity mutation does not show a false quantity or success', async ( { page } ) => {
  await open( page, 'simple' );
  await page.locator( '#fsct-submit' ).click();
  await expect( page.locator( '#fsct-cart-controls' ) ).toBeVisible();
  await page.route( /.*(?:update-item|update-item%2F).*/, route => route.fulfill( { status: 400, contentType: 'application/json', body: JSON.stringify( { message: 'Stock limit reached' } ) } ) );
  await page.locator( '#fsct-plus' ).click();
  await expect( page.locator( '#fsct-status' ) ).toContainText( 'Stock limit reached' );
  await expect( page.locator( '#fsct-quantity' ) ).toHaveAttribute( 'data-quantity', '1' );
} );

async function adminSettings( page, hide, color = '#fec447' ) {
  const base = new URL( fixtures.home );
  await page.goto( new URL( '/wp-login.php', base ).href );
  if ( await page.locator( '#user_login' ).isVisible() ) {
    await page.locator( '#user_login' ).fill( 'ci' );
    await page.locator( '#user_pass' ).fill( 'ci-only-password' );
    await page.locator( '#wp-submit' ).click();
  }
  await page.goto( new URL( '/wp-admin/options-general.php?page=flat-sitcky-cart', base ).href );
  await page.locator( '#fsct-color' ).fill( color );
  await page.locator( '[name="flat_sitcky_cart_settings[hide_native]"]' ).setChecked( hide );
  await page.locator( '#submit' ).click();
  await expect( page.locator( '#fsct-color' ) ).toHaveValue( color );
}

test( 'admin settings persist; hide only mobile controls and restore desktop', async ( { page } ) => {
  try {
    await adminSettings( page, true, '#123456' );
    await open( page, 'variable' );
    await expect( page.locator( 'form.cart .single_add_to_cart_button' ) ).toBeHidden();
    await expect( page.locator( 'form.cart .quantity' ) ).toBeHidden();
    await expect( page.locator( 'form.cart select' ).first() ).toBeVisible();
    await expect( page.locator( '#fsct-submit' ) ).toHaveCSS( 'background-color', 'rgb(18, 52, 86)' );
    await page.setViewportSize( { width: 1440, height: 900 } );
    await page.locator( 'select[name="attribute_length"]' ).selectOption( 'long' );
    await expect( page.locator( 'form.cart .single_add_to_cart_button' ) ).toBeVisible();
    await expect( page.locator( 'form.cart .quantity' ) ).toBeVisible();
    await page.setViewportSize( { width: 390, height: 844 } );
    await expect( page.locator( '#fsct-submit' ) ).toHaveText( add );
    await page.locator( '#fsct-submit' ).click();
    await expect( page.locator( '#fsct-cart-controls' ) ).toBeVisible();
  } finally { await adminSettings( page, false ); }
} );

test( 'API failure leaves native controls usable even with hide setting enabled', async ( { page } ) => {
  try {
    await adminSettings( page, true );
    await page.route( /.*(?:wc\/store\/v1\/cart|rest_route=.*wc.*store.*cart).*/, route => route.abort() );
    await page.goto( fixtures.simple.url );
    await expect( page.locator( 'form.cart .single_add_to_cart_button' ) ).toBeVisible();
    await expect( page.locator( 'form.cart .quantity' ) ).toBeVisible();
    await expect( page.locator( '#fsct-submit' ) ).toBeEnabled();
  } finally { await page.unrouteAll(); await adminSettings( page, false ); }
} );
