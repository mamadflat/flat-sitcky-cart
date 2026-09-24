# flat-sitcky-vart

افزونه ووکامرس برای نمایش **قیمت و دکمه خرید ثابت پایین موبایل، از لحظه ورود به صفحه محصول**. در عرض ۷۶۸ پیکسل و بیشتر نوار نمایش داده نمی‌شود.

## Behavior

- Fixed bar at up to 767 CSS pixels, without scrolling or user-agent detection.
- Server-rendered price; purchase action enabled when the original form is ready.
- Variable products first focus the original option selector, then display the selected variation price.
- Delegates to the original WooCommerce button: quantities, selected attributes, validation and theme AJAX are preserved.
- Unavailable products are disabled. Backorders follow WooCommerce's settings.
- RTL, Persian translation, keyboard focus and a footer spacer sized to the actual bar.
- No custom cart endpoint, settings, database tables, telemetry or external calls.

## Install

Download the **flat-sitcky-vart-plugin** artifact from a passing GitHub Actions run. Extract the artifact wrapper and upload the contained `flat-sitcky-vart-0.1.0.zip` through WordPress Plugins → Add New → Upload.

Keep Flatsome's native **Sticky add to cart** setting off: that feature is separate and can display on desktop. All custom CSS/JS stays inside this plugin; theme files are untouched. Deactivation removes this feature.

## Testing

The workflow runs PHP syntax checks on PHP 7.4 and 8.3, WordPress Coding Standards (WPCS), WordPress Plugin Check, and Playwright against a disposable WordPress + WooCommerce + Storefront installation with MySQL. Product fixtures are generated only in CI. Tests cover real cart submission, quantity validation, variations including AJAX/default selections, reset, stock, backorders, sale pricing, mobile/desktop breakpoints, RTL and unsupported pages.

Reports, failure traces/screenshots, environment versions and the installable ZIP are workflow artifacts. Dependencies are lockfile-controlled; WordPress, WooCommerce and Storefront use the available stable versions at execution, recorded in `test-environment.txt`.

```sh
composer install
composer lint
npm ci
npm run check:js
npm run build:translations
# npm test requires the disposable WordPress setup and tests/fixtures.json from CI.
```

## Scope and limitations

Supports classic simple/variable WooCommerce forms. Flatsome's custom Product Add To Cart element exposes this form. Flatsome is proprietary and is **not bundled or exercised by the Storefront CI tests**; staging verification on the licensed site's layout is required before production deployment. Third-party bundles/subscriptions, block-only forms and custom option widgets need separate compatibility testing. Prices retain WooCommerce's formatting; the plugin never calculates prices itself.

No production site installation is performed by CI.

## References

- [WordPress PHP coding standards](https://developer.wordpress.org/coding-standards/wordpress-coding-standards/php/)
- [Enqueueing plugin assets](https://developer.wordpress.org/plugins/javascript/enqueuing/)
- [WooCommerce variation form implementation](https://github.com/woocommerce/woocommerce/blob/trunk/plugins/woocommerce/client/legacy/js/frontend/add-to-cart-variation.js)

License: GPL-2.0-or-later.
