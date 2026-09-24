/* global jQuery */
( function ( $ ) {
	'use strict';

	$( function () {
		const bar = document.getElementById( 'amc-bar' );
		if ( ! bar ) {
			return;
		}

		const button = document.getElementById( 'amc-submit' );
		const price = document.getElementById( 'amc-price-value' );
		const basePrice = price.innerHTML;
		const product = document.getElementById( 'product-' + bar.dataset.productId );
		// Scope to the main product, never a related product or a quick-view form.
		const form = product && product.querySelector( 'form.cart' );
		const nativeButton = form && form.querySelector( '.single_add_to_cart_button' );
		const variable = bar.dataset.variable === '1';
		let purchasableVariation = false;
		let busy = false;

		/** Keep the last page content above the bar at all font sizes. */
		function measure() {
			document.documentElement.style.setProperty( '--amc-bar-height', bar.offsetHeight + 'px' );
		}
		if ( window.ResizeObserver ) {
			new ResizeObserver( measure ).observe( bar );
		}
		window.addEventListener( 'resize', measure );
		measure();

		if ( ! form || ! nativeButton || bar.dataset.available !== '1' ) {
			button.textContent = bar.dataset.unavailableLabel;
			return;
		}

		/** Whether WooCommerce is still waiting for an attribute selection. */
		function needsOptions() {
			return variable && ( ! form.querySelector( 'input[name="variation_id"]' )?.value ||
				form.querySelector( 'input[name="variation_id"]' ).value === '0' );
		}

		/** Follow the original button's state, including third-party restrictions. */
		function sync() {
			const choose = needsOptions();
			const unavailable = ! choose && ( nativeButton.disabled ||
				nativeButton.classList.contains( 'disabled' ) ||
				( variable && ! purchasableVariation ) );
			button.textContent = choose ? bar.dataset.chooseLabel :
				( unavailable ? bar.dataset.unavailableLabel : bar.dataset.addLabel );
			button.disabled = busy || unavailable;
			button.setAttribute( 'aria-busy', String( busy ) );
			measure();
		}

		/** Focus a required field without bypassing the native purchase form. */
		function revealOptions() {
			const selects = Array.from( form.querySelectorAll( '.variations select' ) );
			const target = selects.find( ( select ) => ! select.value ) || selects[ 0 ] || nativeButton;
			target.scrollIntoView( { block: 'center', behavior: 'auto' } );
			target.focus( { preventScroll: true } );
		}

		if ( variable ) {
			$( form ).on( 'show_variation.amc', function ( event, variation, canPurchase ) {
				purchasableVariation = Boolean( canPurchase && variation.is_purchasable && variation.is_in_stock );
				// This HTML comes from WooCommerce's server-rendered price, not user input.
				price.innerHTML = variation.price_html || basePrice;
				sync();
			} );
			$( form ).on( 'hide_variation.amc reset_data.amc', function () {
				purchasableVariation = false;
				price.innerHTML = basePrice;
				sync();
			} );
			// Also handle cached/default selections initialized before this script.
			$( form ).trigger( 'check_variations' );
		}

		new MutationObserver( sync ).observe( nativeButton, { attributes: true, attributeFilter: [ 'class', 'disabled' ] } );
		$( document.body ).on( 'added_to_cart.amc wc_cart_button_updated.amc', function () {
			busy = false;
			sync();
		} );
		window.addEventListener( 'pageshow', function () {
			busy = false;
			sync();
		} );

		button.addEventListener( 'click', function () {
			if ( needsOptions() ) {
				revealOptions();
				return;
			}
			sync();
			if ( button.disabled ) {
				return;
			}
			if ( ! form.checkValidity() ) {
				const invalid = form.querySelector( ':invalid' );
				if ( invalid ) {
					invalid.scrollIntoView( { block: 'center' } );
					invalid.focus( { preventScroll: true } );
				}
				form.reportValidity();
				return;
			}
			busy = true;
			sync();
			// Preserve WooCommerce validation, variation_id, quantity, add-ons and theme AJAX.
			nativeButton.click();
			// Recover when another extension cancels submission or its AJAX request fails.
			window.setTimeout( function () {
				busy = false;
				sync();
			}, 4000 );
		} );
		sync();
	} );
} )( jQuery );
