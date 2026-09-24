/* global jQuery, flatSitckyCart */
( function ( $ ) {
	'use strict';
	$( function () {
		const bar = document.getElementById( 'fsct-bar' );
		if ( ! bar ) { return; }
		const config = window.flatSitckyCart || {};
		const button = document.getElementById( 'fsct-submit' );
		const price = document.getElementById( 'fsct-price-value' );
		const controls = document.getElementById( 'fsct-cart-controls' );
		const plus = document.getElementById( 'fsct-plus' );
		const minus = document.getElementById( 'fsct-minus' );
		const quantity = document.getElementById( 'fsct-quantity' );
		const status = document.getElementById( 'fsct-status' );
		const basePrice = price.innerHTML;
		const product = document.getElementById( 'product-' + bar.dataset.productId );
		const form = product && product.querySelector( 'form.cart' );
		const nativeButton = form && form.querySelector( '.single_add_to_cart_button' );
		const variable = bar.dataset.variable === '1';
		let purchasableVariation = false;
		let busy = false;
		let ready = false;
		let pending = false;
		let beforeQuantity = 0;
		let pendingId = 0;
		let nonce = '';
		let items = [];
		let requestVersion = 0;
		let statusTimer;

		function measure() {
			document.documentElement.style.setProperty( '--fsct-bar-height', bar.offsetHeight + 'px' );
		}
		if ( window.ResizeObserver ) { new ResizeObserver( measure ).observe( bar ); }
		window.addEventListener( 'resize', measure );
		measure();
		if ( ! form || ! nativeButton || bar.dataset.available !== '1' ) {
			button.textContent = bar.dataset.unavailableLabel;
			return;
		}
		function selectedId() {
			return Number( variable ? form.querySelector( '[name="variation_id"]' )?.value : bar.dataset.productId );
		}
		function needsOptions() { return variable && ! selectedId(); }
		// Never combine distinct addon/configuration lines into one editable item.
		function currentItem() {
			const matches = items.filter( ( item ) => item.id === selectedId() );
			return matches.length === 1 ? matches[ 0 ] : null;
		}
		function announce( message, error = false ) {
			clearTimeout( statusTimer );
			status.textContent = message;
			status.classList.toggle( 'fsct-error', error );
			statusTimer = setTimeout( () => { status.textContent = ''; }, error ? 12000 : 5000 );
		}
		function hideNative( enabled ) {
			form.classList.toggle( 'fsct-native-hidden', Boolean( enabled && config.hideNative ) );
			bar.classList.toggle( 'fsct-ready', enabled );
		}
		function sync() {
			const choose = needsOptions();
			const unavailable = ! choose && ( nativeButton.disabled || nativeButton.classList.contains( 'disabled' ) || ( variable && ! purchasableVariation ) );
			const item = currentItem();
			button.textContent = choose ? bar.dataset.chooseLabel : ( unavailable ? bar.dataset.unavailableLabel : bar.dataset.addLabel );
			button.disabled = busy || unavailable;
			button.hidden = Boolean( item && ready );
			controls.hidden = ! ( item && ready );
			bar.setAttribute( 'aria-busy', String( busy ) );
			button.setAttribute( 'aria-busy', String( busy ) );
			if ( item ) {
				const limits = item.quantity_limits || {};
				const step = limits.multiple_of || 1;
				quantity.textContent = new Intl.NumberFormat( document.documentElement.lang || 'en' ).format( item.quantity );
				quantity.dataset.quantity = String( item.quantity );
				plus.disabled = busy || unavailable || limits.editable === false || item.quantity + step > limits.maximum;
				const remove = item.quantity - step < ( limits.minimum || 1 );
				minus.disabled = busy;
				// Static SVG only; no server/user HTML enters this control.
				minus.innerHTML = remove ? '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M4 7h16M9 7V4h6v3M6 7l1 14h10l1-14M10 10v7M14 10v7"/></svg>' : '−';
				minus.setAttribute( 'aria-label', remove ? config.removeLabel : config.decrease );
			}
			measure();
		}
		function revealOptions() {
			const selects = Array.from( form.querySelectorAll( '.variations select' ) );
			const target = selects.find( ( select ) => ! select.value ) || selects[ 0 ];
			if ( target ) { target.scrollIntoView( { block: 'center' } ); target.focus( { preventScroll: true } ); }
		}
		// Cart state and mutation are handled by WooCommerce Store API, including
		// session ownership, nonce checks, stock and quantity limits. Never cache.
		async function cartRequest( route = '', data ) {
			const url = new URL( config.cartApi, location.href );
			// rest_url may use ?rest_route= on sites without pretty permalinks.
			if ( route ) {
				if ( url.searchParams.has( 'rest_route' ) ) { url.searchParams.set( 'rest_route', url.searchParams.get( 'rest_route' ).replace( /\/$/, '' ) + '/' + route ); }
				else { url.pathname = url.pathname.replace( /\/$/, '' ) + '/' + route; }
			}
			const response = await fetch( url, {
				method: data ? 'POST' : 'GET', credentials: 'same-origin', cache: 'no-store',
				headers: data ? { 'Content-Type': 'application/json', Nonce: nonce } : {},
				body: data ? JSON.stringify( data ) : undefined,
				signal: AbortSignal.timeout( 20000 )
			} );
			nonce = response.headers.get( 'Nonce' ) || nonce;
			const result = await response.json();
			if ( ! response.ok ) {
				const text = new DOMParser().parseFromString( result.message || config.error, 'text/html' ).body.textContent;
				throw new Error( text );
			}
			return result;
		}
		async function refresh() {
			const version = ++requestVersion;
			try {
				const cart = await cartRequest();
				if ( version !== requestVersion ) { return; }
				items = cart.items || [];
				ready = Boolean( nonce );
				hideNative( ready );
				sync();
			} catch ( error ) {
				if ( version !== requestVersion ) { return; }
				ready = false;
				hideNative( false );
				sync();
			}
		}
		function refreshFragments() { $( document.body ).trigger( 'wc_fragment_refresh' ); }
		async function confirmAdded() {
			if ( ! pending ) { return; }
			await refresh();
			const total = items.filter( ( item ) => item.id === pendingId ).reduce( ( sum, item ) => sum + item.quantity, 0 );
			announce( ready && total > beforeQuantity ? config.success : config.error, ! ready || total <= beforeQuantity );
			pending = false;
			busy = false;
			sync();
			refreshFragments();
			if ( ! controls.hidden ) { plus.focus( { preventScroll: true } ); }
		}
		// Only the sticky button opts into AJAX. The actual native form is posted,
		// retaining variation attributes, quantity, addons and PHP validations.
		form.addEventListener( 'submit', async function ( event ) {
			if ( ! pending || event.defaultPrevented ) { return; }
			event.preventDefault();
			try {
				const data = new FormData( form );
				if ( nativeButton.name ) { data.set( nativeButton.name, nativeButton.value ); }
				const response = await fetch( form.action || location.href, { method: 'POST', body: data, credentials: 'same-origin', signal: AbortSignal.timeout( 30000 ) } );
				if ( ! response.ok ) { throw new Error( config.error ); }
				const html = new DOMParser().parseFromString( await response.text(), 'text/html' );
				const error = html.querySelector( '.woocommerce-error, .wc-block-components-notice-banner.is-error' );
				if ( error ) { throw new Error( error.textContent.trim() ); }
				await confirmAdded();
			} catch ( error ) {
				pending = false;
				busy = false;
				announce( error.message || config.error, true );
				await refresh();
				sync();
			}
		} );
		button.addEventListener( 'click', function () {
			if ( needsOptions() ) { revealOptions(); return; }
			sync();
			if ( button.disabled ) { return; }
			if ( ! form.checkValidity() ) {
				hideNative( false );
				const invalid = form.querySelector( ':invalid' );
				if ( invalid ) { invalid.scrollIntoView( { block: 'center' } ); invalid.focus( { preventScroll: true } ); }
				form.reportValidity();
				return;
			}
			// If Store API is unavailable, the native form remains the fallback.
			if ( ! ready ) { nativeButton.click(); return; }
			pendingId = selectedId();
			beforeQuantity = items.filter( ( item ) => item.id === pendingId ).reduce( ( sum, item ) => sum + item.quantity, 0 );
			pending = true;
			busy = true;
			sync();
			nativeButton.click();
			setTimeout( () => {
				if ( pending ) { pending = false; busy = false; announce( config.error, true ); refresh(); }
			}, 35000 );
		} );
		async function changeQuantity( increase ) {
			const item = currentItem();
			if ( busy || ! item || ! ready ) { return; }
			const limits = item.quantity_limits || {};
			const next = item.quantity + ( increase ? 1 : -1 ) * ( limits.multiple_of || 1 );
			const remove = next < ( limits.minimum || 1 );
			busy = true;
			++requestVersion;
			sync();
			try {
				const cart = await cartRequest( remove ? 'remove-item' : 'update-item', remove ? { key: item.key } : { key: item.key, quantity: next } );
				items = cart.items || [];
				announce( remove ? config.removed : config.updated );
				refreshFragments();
			} catch ( error ) {
				announce( error.message || config.error, true );
				await refresh();
			} finally {
				busy = false;
				sync();
				if ( controls.hidden ) { button.focus( { preventScroll: true } ); }
			}
		}
		plus.addEventListener( 'click', () => changeQuantity( true ) );
		minus.addEventListener( 'click', () => changeQuantity( false ) );
		if ( variable ) {
			$( form ).on( 'show_variation.fsct', function ( event, variation, canPurchase ) {
				purchasableVariation = Boolean( canPurchase && variation.is_purchasable && variation.is_in_stock );
				price.innerHTML = variation.price_html || basePrice;
				sync();
			} );
			$( form ).on( 'hide_variation.fsct reset_data.fsct', function () { purchasableVariation = false; price.innerHTML = basePrice; sync(); } );
			$( form ).trigger( 'check_variations' );
		}
		new MutationObserver( sync ).observe( nativeButton, { attributes: true, attributeFilter: [ 'class', 'disabled' ] } );
		$( document.body ).on( 'added_to_cart.fsct', () => pending ? confirmAdded() : refresh() );
		$( document.body ).on( 'removed_from_cart.fsct updated_wc_div.fsct', () => { if ( ! busy ) { refresh(); } } );
		window.addEventListener( 'pageshow', () => { if ( ! busy ) { refresh(); } } );
		document.addEventListener( 'visibilitychange', () => { if ( ! document.hidden && ! busy ) { refresh(); } } );
		sync();
		refresh();
	} );
} )( jQuery );
