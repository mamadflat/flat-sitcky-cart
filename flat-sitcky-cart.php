<?php
/**
 * Plugin Name: flat-sitcky-cart
 * Description: An always-visible mobile price and cart bar using the original WooCommerce product form.
 * Version: 0.2.0
 * Requires at least: 6.5
 * Requires PHP: 7.4
 * Requires Plugins: woocommerce
 * Author: mamadflat
 * License: GPL-2.0-or-later
 * License URI: https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain: flat-sitcky-cart
 * Domain Path: /languages
 *
 * @package FlatSitckyCart
 */

defined( 'ABSPATH' ) || exit;

/**
 * Load bundled translations, including Persian.
 *
 * @return void
 */
function flat_sitcky_cart_load_textdomain() {
	// Private GitHub distribution needs bundled translations, not WordPress.org language packs.
	// phpcs:ignore PluginCheck.CodeAnalysis.DiscouragedFunctions.load_plugin_textdomainFound
	load_plugin_textdomain( 'flat-sitcky-cart', false, dirname( plugin_basename( __FILE__ ) ) . '/languages' );
}
add_action( 'init', 'flat_sitcky_cart_load_textdomain' );

/**
 * Get the queried product without relying on a theme's mutable global product.
 *
 * @return WC_Product|false Supported publicly viewable product, or false.
 */
function flat_sitcky_cart_get_product() {
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
function flat_sitcky_cart_enqueue_assets() {
	if ( ! flat_sitcky_cart_get_product() ) {
		return;
	}

	wp_enqueue_style( 'flat-sitcky-cart', plugins_url( 'assets/mobile-cart.css', __FILE__ ), array(), '0.2.0' );
	wp_enqueue_script( 'flat-sitcky-cart', plugins_url( 'assets/mobile-cart.js', __FILE__ ), array( 'jquery', 'wc-cart-fragments' ), '0.2.0', true );
	$settings = flat_sitcky_cart_settings();
	wp_add_inline_style( 'flat-sitcky-cart', '#fsct-bar{--fsct-color:' . $settings['color'] . ';--fsct-text:' . flat_sitcky_cart_text_color( $settings['color'] ) . ';}' );
	wp_localize_script(
		'flat-sitcky-cart',
		'flatSitckyCart',
		array(
			'cartApi'     => esc_url_raw( rest_url( 'wc/store/v1/cart' ) ),
			'hideNative'  => $settings['hide_native'],
			'success'     => __( 'Your product was added to the cart.', 'flat-sitcky-cart' ),
			'error'       => __( 'Could not confirm the cart. Please check your cart before trying again.', 'flat-sitcky-cart' ),
			'updated'     => __( 'Cart quantity updated.', 'flat-sitcky-cart' ),
			'removed'     => __( 'Product removed from the cart.', 'flat-sitcky-cart' ),
			'removeLabel' => __( 'Remove from cart', 'flat-sitcky-cart' ),
			'decrease'    => __( 'Decrease quantity', 'flat-sitcky-cart' ),
			'inCart'      => __( 'In your cart', 'flat-sitcky-cart' ),
		)
	);
}
add_action( 'wp_enqueue_scripts', 'flat_sitcky_cart_enqueue_assets' );

/**
 * Render one bar outside theme columns. No cart endpoint or duplicate form is
 * introduced: the button delegates to WooCommerce's original validated form.
 *
 * @return void
 */
function flat_sitcky_cart_render_bar() {
	$product = flat_sitcky_cart_get_product();
	if ( ! $product ) {
		return;
	}

	$available = $product->is_purchasable() && $product->is_in_stock();
	$variable  = $product->is_type( 'variable' );
	$price     = $product->get_price_html();
	$label     = $variable ? __( 'Choose options', 'flat-sitcky-cart' ) : __( 'Add to cart', 'flat-sitcky-cart' );
	if ( ! $available ) {
		$label = __( 'Unavailable', 'flat-sitcky-cart' );
	}
	?>
	<div id="fsct-bar" role="region" aria-label="<?php esc_attr_e( 'Product purchase', 'flat-sitcky-cart' ); ?>"
		data-product-id="<?php echo esc_attr( $product->get_id() ); ?>"
		data-variable="<?php echo $variable ? '1' : '0'; ?>"
		data-available="<?php echo $available ? '1' : '0'; ?>"
		data-add-label="<?php esc_attr_e( 'Add to cart', 'flat-sitcky-cart' ); ?>"
		data-choose-label="<?php esc_attr_e( 'Choose options', 'flat-sitcky-cart' ); ?>"
		data-unavailable-label="<?php esc_attr_e( 'Unavailable', 'flat-sitcky-cart' ); ?>">
		<div class="fsct-price" aria-live="polite" aria-atomic="true">
			<span class="fsct-price-label"><?php esc_html_e( 'Price', 'flat-sitcky-cart' ); ?></span>
			<span id="fsct-price-value"><?php echo wp_kses_post( $price ); ?></span>
		</div>
		<button id="fsct-submit" type="button" disabled><?php echo esc_html( $label ); ?></button>
		<div id="fsct-cart-controls" hidden>
			<div class="fsct-stepper">
				<button id="fsct-plus" type="button" aria-label="<?php esc_attr_e( 'Increase quantity', 'flat-sitcky-cart' ); ?>">+</button>
				<output id="fsct-quantity" aria-live="polite" aria-label="<?php esc_attr_e( 'Quantity in cart', 'flat-sitcky-cart' ); ?>">0</output>
				<button id="fsct-minus" type="button" aria-label="<?php esc_attr_e( 'Decrease quantity', 'flat-sitcky-cart' ); ?>">−</button>
			</div>
			<a href="<?php echo esc_url( wc_get_cart_url() ); ?>"><?php esc_html_e( 'View cart', 'flat-sitcky-cart' ); ?></a>
		</div>
		<div id="fsct-status" role="status" aria-live="polite" aria-atomic="true"></div>
		<noscript><span><?php esc_html_e( 'Use the product form to purchase.', 'flat-sitcky-cart' ); ?></span></noscript>
	</div>
	<div id="fsct-spacer" aria-hidden="true"></div>
	<?php
}
add_action( 'wp_footer', 'flat_sitcky_cart_render_bar', 5 );

/**
 * Get sanitized settings, including safe upgrade defaults.
 *
 * @return array Settings.
 */
function flat_sitcky_cart_settings() {
	return flat_sitcky_cart_sanitize_settings( get_option( 'flat_sitcky_cart_settings', array() ) );
}

/**
 * Validate Settings API input; never allow arbitrary CSS.
 *
 * @param mixed $input Submitted options.
 * @return array Validated options.
 */
function flat_sitcky_cart_sanitize_settings( $input ) {
	$input = is_array( $input ) ? $input : array();
	$color = isset( $input['color'] ) && is_string( $input['color'] ) ? sanitize_hex_color( $input['color'] ) : '';
	return array(
		'color'       => $color ? $color : '#fec447',
		'hide_native' => ! empty( $input['hide_native'] ),
	);
}

/**
 * Choose a readable label for the administrator's button color.
 *
 * @param string $color Sanitized hexadecimal color.
 * @return string Black or white label.
 */
function flat_sitcky_cart_text_color( $color ) {
	$hex = ltrim( $color, '#' );
	if ( 3 === strlen( $hex ) ) {
		$hex = $hex[0] . $hex[0] . $hex[1] . $hex[1] . $hex[2] . $hex[2];
	}
	$luminance = 0;
	foreach ( array( 0.2126, 0.7152, 0.0722 ) as $index => $weight ) {
		$value      = hexdec( substr( $hex, $index * 2, 2 ) ) / 255;
		$luminance += $weight * ( $value <= 0.04045 ? $value / 12.92 : pow( ( $value + 0.055 ) / 1.055, 2.4 ) );
	}
	return $luminance > 0.179 ? '#111111' : '#ffffff';
}

/**
 * Register options with WordPress capability and nonce protection.
 *
 * @return void
 */
function flat_sitcky_cart_register_settings() {
	register_setting(
		'flat_sitcky_cart',
		'flat_sitcky_cart_settings',
		array(
			'type'              => 'array',
			'sanitize_callback' => 'flat_sitcky_cart_sanitize_settings',
			'default'           => array(),
		)
	);
}
add_action( 'admin_init', 'flat_sitcky_cart_register_settings' );

/**
 * Add the administrator settings screen.
 *
 * @return void
 */
function flat_sitcky_cart_admin_menu() {
	add_options_page( 'Flat Sitcky Cart', __( 'Mobile cart bar', 'flat-sitcky-cart' ), 'manage_options', 'flat-sitcky-cart', 'flat_sitcky_cart_settings_page' );
}
add_action( 'admin_menu', 'flat_sitcky_cart_admin_menu' );

/**
 * Render the settings screen. Saving uses options.php and Settings API.
 *
 * @return void
 */
function flat_sitcky_cart_settings_page() {
	if ( ! current_user_can( 'manage_options' ) ) {
		return;
	}
	$settings = flat_sitcky_cart_settings();
	?>
	<div class="wrap">
		<h1><?php esc_html_e( 'Mobile cart bar', 'flat-sitcky-cart' ); ?></h1>
		<form action="options.php" method="post">
			<?php settings_fields( 'flat_sitcky_cart' ); ?>
			<table class="form-table" role="presentation">
				<tr><th scope="row"><label for="fsct-color"><?php esc_html_e( 'Button color', 'flat-sitcky-cart' ); ?></label></th>
					<td><input type="color" id="fsct-color" name="flat_sitcky_cart_settings[color]" value="<?php echo esc_attr( $settings['color'] ); ?>"></td></tr>
				<tr><th scope="row"><?php esc_html_e( 'Mobile product form', 'flat-sitcky-cart' ); ?></th><td>
					<label><input type="checkbox" name="flat_sitcky_cart_settings[hide_native]" value="1" <?php checked( $settings['hide_native'] ); ?>>
						<?php esc_html_e( 'Hide the original add-to-cart button and quantity on mobile', 'flat-sitcky-cart' ); ?></label>
					<p class="description"><?php esc_html_e( 'Only hidden after the sticky bar is ready. Options stay visible; desktop and the no-JavaScript form remain unchanged.', 'flat-sitcky-cart' ); ?></p>
				</td></tr>
			</table>
			<?php submit_button(); ?>
		</form>
	</div>
	<?php
}
