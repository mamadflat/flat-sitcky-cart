const { test, expect } = require( '@playwright/test' );
const fixtures = require( '../fixtures.json' );
const add = 'افزودن به سبد خرید';
const choose = 'انتخاب گزینه‌ها';

// Legacy cart scenarios keep testing underlying quantities after dismissing
// the new confirmation. Dedicated v0.3 tests exercise the dialog itself.
test.beforeEach( async ( { page }, info ) => {
  if ( ! info.title.startsWith( 'v0.3' ) ) {
    await page.addLocatorHandler( page.locator( '#fsct-success[open]' ), async () => {
      await page.locator( '#fsct-success-close' ).click();
    } );
  }
} );

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
	await expect( page.locator( '#fsct-submit' ) ).toHaveText( choose );
	await page.locator( '#fsct-submit' ).click();
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
    await expect( page.locator( '.summary > .price' ) ).toBeHidden();
    await expect( page.locator( 'form.cart select' ).first() ).toBeVisible();
    await expect( page.locator( '#fsct-submit' ) ).toHaveCSS( 'background-color', 'rgb(18, 52, 86)' );
    await page.locator( 'select[name="attribute_length"]' ).selectOption( 'long' );
    await expect( page.locator( '.woocommerce-variation-price' ) ).toBeHidden();
    await expect( page.locator( '#fsct-price-value' ) ).toContainText( '125' );
    await page.setViewportSize( { width: 1440, height: 900 } );
    await page.locator( 'select[name="attribute_length"]' ).selectOption( 'long' );
    await expect( page.locator( 'form.cart .single_add_to_cart_button' ) ).toBeVisible();
    await expect( page.locator( 'form.cart .quantity' ) ).toBeVisible();
    await expect( page.locator( '.summary > .price' ) ).toBeVisible();
    await expect( page.locator( '.woocommerce-variation-price' ) ).toBeVisible();
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
    await expect( page.locator( '.summary > .price' ) ).toBeVisible();
    await expect( page.locator( '#fsct-submit' ) ).toBeEnabled();
  } finally { await page.unrouteAll(); await adminSettings( page, false ); }
} );

test( 'Flatsome prices are replaced without hiding related prices; API failure restores them', async ( { page } ) => {
  try {
    await adminSettings( page, true );
    // Add the UX Builder structure before the real plugin script initializes.
    await page.route( '**/flat-sitcky-cart/assets/mobile-cart.js*', async route => {
      const response = await route.fetch();
      const fixture = `
        const fixtureRoot = document.querySelector( '[id^="product-"].product' );
        const fixturePrice = document.createElement( 'div' );
        fixturePrice.className = 'product-price-container fsct-test-ux-price';
        fixturePrice.innerHTML = '<div class="price-wrapper"><p class="product-page-price price">100</p></div>';
        fixtureRoot.prepend( fixturePrice );
        const fixtureRelated = document.createElement( 'section' );
        fixtureRelated.className = 'related fsct-test-related';
        fixtureRelated.innerHTML = '<div class="product"><div class="product-price-container"><p class="product-page-price price">75</p></div></div>';
        fixtureRoot.append( fixtureRelated );
      `;
      await route.fulfill( { response, body: fixture + '\n' + await response.text() } );
    } );
    await open( page, 'simple' );
    await expect( page.locator( '.fsct-test-ux-price' ) ).toBeHidden();
    await expect( page.locator( '.fsct-test-related .price' ) ).toBeVisible();
    await expect( page.locator( '.summary > .price' ) ).toBeHidden();
    await page.setViewportSize( { width: 1440, height: 900 } );
    await expect( page.locator( '.fsct-test-ux-price' ) ).toBeVisible();
    await expect( page.locator( '.summary > .price' ) ).toBeVisible();
    await page.setViewportSize( { width: 390, height: 844 } );
    await page.route( /.*(?:wc\/store\/v1\/cart|rest_route=.*wc.*store.*cart).*/, route => route.abort() );
    await page.evaluate( () => window.dispatchEvent( new Event( 'pageshow' ) ) );
    await expect( page.locator( '#fsct-bar' ) ).not.toHaveClass( /fsct-ready/ );
    await expect( page.locator( '.fsct-test-ux-price' ) ).toBeVisible();
    await expect( page.locator( '.summary > .price' ) ).toBeVisible();
    await expect( page.locator( 'form.cart .single_add_to_cart_button' ) ).toBeVisible();
  } finally { await page.unrouteAll(); await adminSettings( page, false ); }
} );

test( 'hide setting still preserves prices and purchase without JavaScript', async ( { browser, page } ) => {
  let context;
  try {
    await adminSettings( page, true );
    context = await browser.newContext( { javaScriptEnabled: false, viewport: { width: 390, height: 844 } } );
    const fallback = await context.newPage();
    await fallback.goto( fixtures.simple.url );
    await expect( fallback.locator( '.summary > .price' ) ).toBeVisible();
    await expect( fallback.locator( 'form.cart .single_add_to_cart_button' ) ).toBeVisible();
  } finally { if ( context ) { await context.close(); } await adminSettings( page, false ); }
} );

test( 'real stock cap prevents increasing beyond available stock', async ( { page } ) => {
  await open( page, 'limited' );
  await page.locator( '#fsct-submit' ).click();
  await expect( page.locator( '#fsct-cart-controls' ) ).toBeVisible();
  await page.locator( '#fsct-plus' ).click();
  await expect( page.locator( '#fsct-quantity' ) ).toHaveAttribute( 'data-quantity', '2' );
  await expect( page.locator( '#fsct-plus' ) ).toBeDisabled();
} );

test( 'failed product POST never claims success or switches to quantity', async ( { page } ) => {
  await open( page, 'simple' );
  await page.route( fixtures.simple.url, route => route.request().method() === 'POST' ? route.fulfill( { status: 200, contentType: 'text/html', body: '<ul class="woocommerce-error"><li>Purchase blocked by validation</li></ul>' } ) : route.continue() );
  await page.locator( '#fsct-submit' ).click();
  await expect( page.locator( '#fsct-status' ) ).toContainText( 'Purchase blocked by validation' );
  await expect( page.locator( '#fsct-cart-controls' ) ).toBeHidden();
  await expect( page.locator( '#fsct-submit' ) ).toBeEnabled();
} );

test( 'v0.3 confirmed add opens accessible bottom sheet; Escape and cart link work', async ( { page } ) => {
  await open( page, 'simple' );
  const sheet = page.locator( '#fsct-success' );
  await expect( sheet ).toBeHidden();
  await page.locator( '#fsct-submit' ).click();
  await expect( sheet ).toBeVisible();
  await expect( page.getByRole( 'dialog' ) ).toHaveAccessibleName( 'محصول شما به سبد خرید اضافه شد.' );
  await expect( sheet.locator( '#fsct-success-product' ) ).toContainText( 'FSCT simple' );
  await expect( sheet.locator( 'a' ) ).toHaveAttribute( 'href', fixtures.cart );
  await expect( page.locator( '#fsct-success-close' ) ).toBeFocused();
  await expect.poll( async () => {
    const rect = await sheet.boundingBox();
    return Math.abs( rect.y + rect.height - 844 );
  } ).toBeLessThan( 2 );
  await page.screenshot( { path: 'test-results/mobile-success-sheet.png' } );
  await page.keyboard.press( 'Escape' );
  await expect( sheet ).toBeHidden();
  await expect( page.locator( '#fsct-plus' ) ).toBeFocused();
  await page.locator( '#fsct-minus' ).click();
  await expect( page.locator( '#fsct-submit' ) ).toBeVisible();
  await page.locator( '#fsct-submit' ).click();
  await expect( sheet ).toBeVisible();
  await sheet.locator( 'a' ).click();
  await expect( page ).toHaveURL( fixtures.cart );
  await expect( page.locator( 'main' ) ).toContainText( 'FSCT simple' );
} );

test( 'v0.3 failure never opens success sheet', async ( { page } ) => {
  await open( page, 'simple' );
  await page.route( fixtures.simple.url, route => route.request().method() === 'POST' ? route.fulfill( { status: 500, body: 'Error' } ) : route.continue() );
  await page.locator( '#fsct-submit' ).click();
  await expect( page.locator( '#fsct-status' ) ).toHaveClass( /fsct-error/ );
  await expect( page.locator( '#fsct-success' ) ).toBeHidden();
} );

test( 'v0.3 price animation is user-triggered, tiny and respects reduced motion', async ( { page } ) => {
  // Record the real Web Animations calls without replacing their behavior.
  await page.addInitScript( () => {
    window.fsctMotion = [];
    const animate = Element.prototype.animate;
    Element.prototype.animate = function ( frames, options ) {
      if ( this.id === 'fsct-price-value' ) { window.fsctMotion.push( options ); }
      return animate.call( this, frames, options );
    };
  } );
  await open( page, 'variable' );
  expect( await page.evaluate( () => window.fsctMotion.length ) ).toBe( 0 );
  await page.locator( 'select[name="attribute_length"]' ).selectOption( 'long' );
  await expect( page.locator( '#fsct-price-value' ) ).toContainText( '125' );
  await expect.poll( () => page.evaluate( () => window.fsctMotion.length ) ).toBeGreaterThan( 0 );
  expect( await page.evaluate( () => window.fsctMotion.every( item => item.duration <= 200 ) ) ).toBe( true );
  const count = await page.evaluate( () => window.fsctMotion.length );
  await page.emulateMedia( { reducedMotion: 'reduce' } );
  await page.locator( 'select[name="attribute_length"]' ).selectOption( 'short' );
  await expect( page.locator( '#fsct-price-value' ) ).toContainText( '100' );
  expect( await page.evaluate( () => window.fsctMotion.length ) ).toBe( count );
  await page.locator( '#fsct-submit' ).click();
  await expect( page.locator( '#fsct-success' ) ).toBeVisible();
  await expect( page.locator( '#fsct-success' ) ).toHaveCSS( 'animation-name', 'none' );
  await page.locator( '#fsct-success-close' ).click();
  await expect( page.locator( '#fsct-success' ) ).toBeHidden();
  await page.emulateMedia( { reducedMotion: 'no-preference' } );
  await open( page, 'ajax' );
  await page.locator( 'select[name="attribute_length"]' ).selectOption( '2' );
  await expect( page.locator( '#fsct-price-value' ) ).toContainText( '125' );
  await expect.poll( () => page.evaluate( () => window.fsctMotion.length ) ).toBeGreaterThan( 0 );
} );

test( 'v0.3 hidden native selects focus visible swatches; defaults need inspection first', async ( { page } ) => {
  await open( page, 'defaults' );
  await expect( page.locator( '#fsct-submit' ) ).toHaveText( choose );
  // Realistic Flatsome accessibility structure, without bundling a paid theme.
  await page.evaluate( () => {
    const select = document.querySelector( '.variations select' );
    select.style.display = 'none';
    const swatch = document.createElement( 'button' );
    swatch.type = 'button'; swatch.setAttribute( 'role', 'radio' ); swatch.textContent = 'Long'; swatch.id = 'test-swatch';
    select.parentElement.append( swatch );
  } );
  await page.locator( '#fsct-spacer' ).scrollIntoViewIfNeeded();
  await page.locator( '#fsct-submit' ).click();
  await expect( page.locator( '#test-swatch' ) ).toBeFocused();
  await expect( page.locator( '#test-swatch' ) ).toBeInViewport();
  await expect( page.locator( '#fsct-submit' ) ).toHaveText( add );
  await expect( page.locator( '#fsct-success' ) ).toBeHidden();
} );

test( 'v0.3 sheet closes on desktop resize and does not leak to archives', async ( { page } ) => {
  await open( page, 'simple' );
  await page.locator( '#fsct-submit' ).click();
  await expect( page.locator( '#fsct-success' ) ).toBeVisible();
  await page.setViewportSize( { width: 1440, height: 900 } );
  await expect( page.locator( '#fsct-success' ) ).not.toHaveAttribute( 'open', '' );
  await expect( page.locator( '#fsct-bar' ) ).toBeHidden();
  await expect( page.locator( 'html' ) ).not.toHaveClass( /fsct-sheet-open/ );
  await page.goto( fixtures.home );
  await expect( page.locator( '#fsct-success' ) ).toHaveCount( 0 );
} );
