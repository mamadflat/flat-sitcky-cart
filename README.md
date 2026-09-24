# flat-sitcky-cart 0.2.0

نوار خرید موبایل ووکامرس، از لحظه ورود به صفحه محصول، با قیمت، پیام موفقیت و کنترل تعداد واقعی سبد خرید.

## Settings / تنظیمات

WordPress → Settings → Mobile cart bar (تنظیمات ← نوار سبد خرید موبایل).

- **Button color:** native color picker, validated hexadecimal color; contrasting text is calculated automatically.
- **Hide original button and quantity on mobile:** optional, off by default for safe upgrades. Only the main product form's button and quantity are hidden, below 768px, after the sticky bar and Store API are ready. Attributes remain visible. Desktop, API failure, disabled JavaScript and plugin deactivation retain the original form.

## Cart behavior

- Mobile-only fixed bar, RTL support, safe-area padding and a measured footer spacer.
- Inspired by the observed Digikala mobile purchase pattern: add → confirmed success message → increase/count/decrease (remove at minimum), with price alongside and a cart link. Brand color remains configurable; no third-party assets are copied.
- Only a confirmed server cart increase produces the success message. Failed stock/validation/network requests show an error and do not increment the displayed quantity optimistically.
- Sticky purchases submit the original WooCommerce form via AJAX, preserving PHP validation, variation attributes and other form fields. Desktop and native button submissions are not intercepted. Existing theme AJAX is respected when it cancels native submission and emits WooCommerce's added_to_cart event.
- Cart state/update/remove use the official WooCommerce Store API and its fresh response nonce, quantity limits, stock checks and session cookies. No custom cart mutation endpoint or disabled nonce checks.
- Cart state is refreshed on entry, bfcache restoration, returning to the tab and native cart events. Variation controls target the selected variation only. Distinct addon lines sharing one product ID are deliberately not merged; use the cart for those configurations.
- Sold-individually and stock limits disable increment. The last decrement removes the cart line and restores Add to cart.

## Install / update

Download the ZIP from the GitHub release or the passing **flat-sitcky-cart-plugin** Actions artifact. Upload `flat-sitcky-cart-0.2.0.zip` through Plugins → Add New → Upload; replace the existing version when WordPress prompts. Enable the hide option in settings if desired.

Keep Flatsome's native Sticky add to cart setting off. All new CSS/JS stays inside the plugin. No theme edits are required. Site installation is separate from CI.

## Validation

GitHub Actions installs disposable WordPress, WooCommerce and Storefront with MySQL. It runs PHP 7.4/8.3 syntax and WordPress Coding Standards, Plugin Check, and browser integration tests covering native and AJAX purchase, variants, quantities, errors, settings, mobile/desktop and no-JavaScript fallback. Reports record the installed versions. Production customer data is never used.

```sh
composer install
composer lint
npm ci
npm run check:js
npm run build:translations
# Requires the disposable WordPress environment and tests/fixtures.json:
npm test
```

## Compatibility

Classic simple and variable WooCommerce product forms. Flatsome's classic product form is supported; licensed Flatsome is not bundled in CI. Third-party bundles, subscriptions, file uploads, block-only product forms and custom JS validation widgets require additional compatibility testing. An unavailable Store API restores the native purchase controls. Page caches must exclude cart/REST requests as required by WooCommerce. AJAX native-form submission requires same-origin product form actions.

## References

- https://developer.woocommerce.com/docs/apis/store-api/resources-endpoints/cart
- https://developer.woocommerce.com/docs/apis/store-api/nonce-tokens
- https://developer.wordpress.org/plugins/settings/settings-api/

License: GPL-2.0-or-later.
