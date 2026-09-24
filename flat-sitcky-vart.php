<?php
/**
 * Plugin Name: flat-sitcky-vart
 * Description: An always-visible mobile price and cart bar using the original WooCommerce product form.
 * Version: 0.1.0
 * Requires at least: 6.5
 * Requires PHP: 7.4
 * Requires Plugins: woocommerce
 * Author: mamadflat
 * License: GPL-2.0-or-later
 * License URI: https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain: flat-sitcky-vart
 * Domain Path: /languages
 *
 * @package FlatSitckyVart
 */

defined( 'ABSPATH' ) || exit;

/**
 * Load bundled translations, including Persian.
 *
 * @return void
 */
function flat_sitcky_vart_load_textdomain() {
	// Private GitHub distribution needs bundled translations, not WordPress.org language packs.
	// phpcs:ignore PluginCheck.CodeAnalysis.DiscouragedFunctions.load_plugin_textdomainFound
	load_plugin_textdomain( 'flat-sitcky-vart', false, dirname( plugin_basename( __FILE__ ) ) . '/languages' );
}
add_action( 'init', 'flat_sitcky_vart_load_textdomain' );

/**
 * Get the queried product without relying on a theme's mutable global product.
 *
 * @return WC_Product|false Supported publicly viewable product, or false.
 */
function flat_sitcky_vart_get_product() {
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
function flat_sitcky_vart_enqueue_assets() {
	if ( ! flat_sitcky_vart_get_product() ) {
		return;
	}

	wp_enqueue_style( 'flat-sitcky-vart', plugins_url( 'assets/mobile-cart.css', __FILE__ ), array(), '0.1.0' );
	wp_enqueue_script( 'flat-sitcky-vart', plugins_url( 'assets/mobile-cart.js', __FILE__ ), array( 'jquery' ), '0.1.0', true );
}
add_action( 'wp_enqueue_scripts', 'flat_sitcky_vart_enqueue_assets' );

/**
 * Render one bar outside theme columns. No cart endpoint or duplicate form is
 * introduced: the button delegates to WooCommerce's original validated form.
 *
 * @return void
 */
function flat_sitcky_vart_render_bar() {
	$product = flat_sitcky_vart_get_product();
	if ( ! $product ) {
		return;
	}

	$available = $product->is_purchasable() && $product->is_in_stock();
	$variable  = $product->is_type( 'variable' );
	$price     = $product->get_price_html();
	$label     = $variable ? __( 'Choose options', 'flat-sitcky-vart' ) : __( 'Add to cart', 'flat-sitcky-vart' );
	if ( ! $available ) {
		$label = __( 'Unavailable', 'flat-sitcky-vart' );
	}
	?>
	<div id="fsvt-bar" role="region" aria-label="<?php esc_attr_e( 'Product purchase', 'flat-sitcky-vart' ); ?>"
		data-product-id="<?php echo esc_attr( $product->get_id() ); ?>"
		data-variable="<?php echo $variable ? '1' : '0'; ?>"
		data-available="<?php echo $available ? '1' : '0'; ?>"
		data-add-label="<?php esc_attr_e( 'Add to cart', 'flat-sitcky-vart' ); ?>"
		data-choose-label="<?php esc_attr_e( 'Choose options', 'flat-sitcky-vart' ); ?>"
		data-unavailable-label="<?php esc_attr_e( 'Unavailable', 'flat-sitcky-vart' ); ?>">
		<div class="fsvt-price" aria-live="polite" aria-atomic="true">
			<span class="fsvt-price-label"><?php esc_html_e( 'Price', 'flat-sitcky-vart' ); ?></span>
			<span id="fsvt-price-value"><?php echo wp_kses_post( $price ); ?></span>
		</div>
		<button id="fsvt-submit" type="button" disabled><?php echo esc_html( $label ); ?></button>
		<noscript><span><?php esc_html_e( 'Use the product form to purchase.', 'flat-sitcky-vart' ); ?></span></noscript>
	</div>
	<div id="fsvt-spacer" aria-hidden="true"></div>
	<?php
}
add_action( 'wp_footer', 'flat_sitcky_vart_render_bar', 5 );
