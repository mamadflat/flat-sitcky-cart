<?php
/**
 * Plugin Name: Abzarak Mobile Cart
 * Description: An always-visible mobile price and cart bar using the original WooCommerce product form.
 * Version: 0.1.0
 * Requires at least: 6.5
 * Requires PHP: 7.4
 * Requires Plugins: woocommerce
 * Author: Abzarak Mobile
 * License: GPL-2.0-or-later
 * License URI: https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain: abzarak-mobile-cart
 * Domain Path: /languages
 *
 * @package AbzarakMobileCart
 */

defined( 'ABSPATH' ) || exit;

/**
 * Load bundled translations, including Persian.
 *
 * @return void
 */
function amc_load_textdomain() {
	load_plugin_textdomain( 'abzarak-mobile-cart', false, dirname( plugin_basename( __FILE__ ) ) . '/languages' );
}
add_action( 'init', 'amc_load_textdomain' );

/**
 * Get the queried product without relying on a theme's mutable global product.
 *
 * @return WC_Product|false Supported publicly viewable product, or false.
 */
function amc_get_product() {
	if ( ! function_exists( 'is_product' ) || ! is_product() || post_password_required() ) {
		return false;
	}

	$product = wc_get_product( get_queried_object_id() );
	if ( ! $product || ! $product->is_type( array( 'simple', 'variable' ) ) ) {
		return false;
	}

	return $product;
}

/**
 * Enqueue assets only on supported product pages. CSS handles device width so
 * full-page caches never need a separate mobile HTML variant.
 *
 * @return void
 */
function amc_enqueue_assets() {
	if ( ! amc_get_product() ) {
		return;
	}

	wp_enqueue_style( 'abzarak-mobile-cart', plugins_url( 'assets/mobile-cart.css', __FILE__ ), array(), '0.1.0' );
	wp_enqueue_script( 'abzarak-mobile-cart', plugins_url( 'assets/mobile-cart.js', __FILE__ ), array( 'jquery' ), '0.1.0', true );
}
add_action( 'wp_enqueue_scripts', 'amc_enqueue_assets' );

/**
 * Render one bar outside theme columns. No cart endpoint or duplicate form is
 * introduced: the button delegates to WooCommerce's original validated form.
 *
 * @return void
 */
function amc_render_bar() {
	$product = amc_get_product();
	if ( ! $product ) {
		return;
	}

	$available = $product->is_purchasable() && $product->is_in_stock();
	$variable  = $product->is_type( 'variable' );
	$price     = $product->get_price_html();
	$label     = $variable ? __( 'Choose options', 'abzarak-mobile-cart' ) : __( 'Add to cart', 'abzarak-mobile-cart' );
	if ( ! $available ) {
		$label = __( 'Unavailable', 'abzarak-mobile-cart' );
	}
	?>
	<div id="amc-bar" role="region" aria-label="<?php esc_attr_e( 'Product purchase', 'abzarak-mobile-cart' ); ?>"
		data-product-id="<?php echo esc_attr( $product->get_id() ); ?>"
		data-variable="<?php echo $variable ? '1' : '0'; ?>"
		data-available="<?php echo $available ? '1' : '0'; ?>"
		data-add-label="<?php esc_attr_e( 'Add to cart', 'abzarak-mobile-cart' ); ?>"
		data-choose-label="<?php esc_attr_e( 'Choose options', 'abzarak-mobile-cart' ); ?>"
		data-unavailable-label="<?php esc_attr_e( 'Unavailable', 'abzarak-mobile-cart' ); ?>">
		<div class="amc-price" aria-live="polite" aria-atomic="true">
			<span class="amc-price-label"><?php esc_html_e( 'Price', 'abzarak-mobile-cart' ); ?></span>
			<span id="amc-price-value"><?php echo wp_kses_post( $price ); ?></span>
		</div>
		<button id="amc-submit" type="button" disabled><?php echo esc_html( $label ); ?></button>
		<noscript><span><?php esc_html_e( 'Use the product form to purchase.', 'abzarak-mobile-cart' ); ?></span></noscript>
	</div>
	<div id="amc-spacer" aria-hidden="true"></div>
	<?php
}
add_action( 'wp_footer', 'amc_render_bar', 5 );
