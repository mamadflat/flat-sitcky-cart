<?php
/** Disposable CI data, executed by wp eval-file, never shipped in the plugin. */
if ( ! defined( 'WP_CLI' ) || ! WP_CLI ) {
	exit( 1 );
}

update_option( 'woocommerce_currency', 'USD' );
update_option( 'woocommerce_hide_out_of_stock_items', 'no' );
update_option( 'woocommerce_cart_redirect_after_add', 'no' );
update_option( 'woocommerce_enable_ajax_add_to_cart', 'no' );
update_option( 'woocommerce_allow_tracking', 'no' );
update_option( 'woocommerce_show_marketplace_suggestions', 'no' );
WC_Install::create_pages();
$fixtures = array();

foreach ( array( 'simple', 'sale', 'outofstock', 'backorder', 'individual', 'protected', 'limited' ) as $kind ) {
	$product = new WC_Product_Simple();
	$product->set_name( 'FSCT ' . $kind );
	$product->set_slug( 'fsct-' . $kind );
	$product->set_status( 'publish' );
	$product->set_regular_price( '100' );
	$product->set_description( str_repeat( '<p>Product details for scroll verification.</p>', 40 ) );
	if ( 'sale' === $kind ) {
		$product->set_sale_price( '75' );
	}
	if ( 'outofstock' === $kind ) {
		$product->set_stock_status( 'outofstock' );
	}
	if ( 'backorder' === $kind ) {
		$product->set_manage_stock( true );
		$product->set_stock_quantity( 0 );
		$product->set_backorders( 'yes' );
	}
	if ( 'limited' === $kind ) {
		$product->set_manage_stock( true );
		$product->set_stock_quantity( 2 );
	}
	if ( 'individual' === $kind ) {
		$product->set_sold_individually( true );
	}
	$product->save();
	if ( 'protected' === $kind ) {
		wp_update_post( array( 'ID' => $product->get_id(), 'post_password' => 'ci-only-password' ) );
	}
	$fixtures[ $kind ] = array( 'id' => $product->get_id(), 'url' => get_permalink( $product->get_id() ) );
}

foreach ( array( 'variable', 'defaults', 'ajax' ) as $kind ) {
	$product = new WC_Product_Variable();
	$product->set_name( 'FSCT ' . $kind );
	$product->set_slug( 'fsct-' . $kind );
	$product->set_status( 'publish' );
	$values = 'ajax' === $kind ? array_map( 'strval', range( 1, 32 ) ) : array( 'short', 'long', 'unavailable' );
	$attribute = new WC_Product_Attribute();
	$attribute->set_name( 'Length' );
	$attribute->set_options( $values );
	$attribute->set_visible( true );
	$attribute->set_variation( true );
	$product->set_attributes( array( $attribute ) );
	if ( 'defaults' === $kind ) {
		$product->set_default_attributes( array( 'length' => 'long' ) );
	}
	$product->save();
	foreach ( $values as $index => $value ) {
		$variation = new WC_Product_Variation();
		$variation->set_parent_id( $product->get_id() );
		$variation->set_attributes( array( 'length' => $value ) );
		$variation->set_regular_price( (string) ( 100 + 25 * $index ) );
		$variation->set_stock_status( 'unavailable' === $value ? 'outofstock' : 'instock' );
		$variation->save();
	}
	WC_Product_Variable::sync( $product->get_id() );
	$fixtures[ $kind ] = array( 'id' => $product->get_id(), 'url' => get_permalink( $product->get_id() ) );
}

$external = new WC_Product_External();
$external->set_name( 'FSCT external' );
$external->set_status( 'publish' );
$external->set_regular_price( '100' );
$external->set_product_url( 'https://example.com/' );
$external->save();
$fixtures['external'] = array( 'id' => $external->get_id(), 'url' => get_permalink( $external->get_id() ) );
$fixtures['cart'] = wc_get_cart_url();
$fixtures['shop'] = get_permalink( wc_get_page_id( 'shop' ) );
$fixtures['home'] = home_url( '/' );
file_put_contents( getenv( 'FSCT_FIXTURES' ), wp_json_encode( $fixtures ) );
WP_CLI::success( 'Disposable WooCommerce fixtures created.' );
