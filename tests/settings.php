<?php
/** Settings regression checks in the disposable WordPress instance. */
if ( ! defined( 'WP_CLI' ) || ! WP_CLI ) { exit( 1 ); }
$cases = array(
 array( array( 'color' => 'red;display:none', 'hide_native' => '1' ), array( 'color' => '#fec447', 'hide_native' => true ) ),
 array( array( 'color' => '#123456' ), array( 'color' => '#123456', 'hide_native' => false ) ),
 array( array( 'color' => array( '#fff' ) ), array( 'color' => '#fec447', 'hide_native' => false ) ),
 array( 'invalid', array( 'color' => '#fec447', 'hide_native' => false ) ),
);
foreach ( $cases as $case ) {
 if ( flat_sitcky_cart_sanitize_settings( $case[0] ) !== $case[1] ) { WP_CLI::error( 'Settings sanitization failed.' ); }
}
if ( '#ffffff' !== flat_sitcky_cart_text_color( '#123456' ) || '#111111' !== flat_sitcky_cart_text_color( '#fff' ) ) { WP_CLI::error( 'Color contrast failed.' ); }
WP_CLI::success( 'Settings input and contrast checks passed.' );
