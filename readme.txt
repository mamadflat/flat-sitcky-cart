=== flat-sitcky-cart ===
Contributors: mamadflat
Tags: woocommerce, mobile, cart, sticky
Requires at least: 6.5
Tested up to: 7.1
Requires PHP: 7.4
Requires Plugins: woocommerce
Stable tag: 0.2.0
License: GPL-2.0-or-later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

An always-visible mobile price and add-to-cart bar that uses the original WooCommerce form.

== Description ==

Displays a fixed bottom purchase bar immediately on simple and variable product pages at viewport widths up to 767px. Nothing is displayed at 768px and above. Works with classic WooCommerce product forms, including Flatsome custom product layouts that contain Product Add To Cart.

Supports variation prices, option selection, stock status, native quantity validation, sale prices, RTL, Persian translations and safe-area spacing. Products that are unavailable cannot be purchased. No custom cart endpoint, external service, telemetry or database table is used.

Keep Flatsome's own Sticky add to cart setting disabled to avoid a separate desktop bar. This plugin does not modify theme settings or theme files.

== Installation ==

1. Install and activate WooCommerce.
2. Upload the ZIP in Plugins > Add New > Upload Plugin.
3. Activate flat-sitcky-cart.
4. Visit a simple or variable product on a mobile viewport.

== Frequently Asked Questions ==

= Does it change desktop pages? =
The bar and spacer are hidden at 768px and above. The original purchase form is preserved.

= What happens before a variation is selected? =
The button says Choose options and focuses the original attribute selector. Once a purchasable variation is selected, it shows Add to cart and uses the selected price.

= Does it work with every product type? =
Version 0.2.0 supports simple and variable products using classic WooCommerce forms. Grouped, external, subscription, bundle and block-only product forms are not supported. No bar is rendered for password-protected products.

= Is Flatsome included? =
No. Flatsome is a commercial theme. Automated integration tests use Storefront. Validate your licensed Flatsome layout in staging before production installation.

= How is it removed? =
Deactivate and delete the plugin. It creates no options, tables or stored customer data.

== Changelog ==

= 0.2.0 =
Initial mobile purchase bar with native WooCommerce form delegation.
