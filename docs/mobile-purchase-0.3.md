# Mobile purchase interactions — 0.3.0

## Reference and brand

Reference inspected on 2026-10-19: [Digikala mobile A56 product page](https://www.digikala.com/product/dkp-18575915/), viewport 390 × 844. Observed primary purchase button: 48px height, 12px type, 8px radius, 12px × 16px padding, approximately 173px width. RTL action is on the physical right, price on the left. This release uses that compact hierarchy with Lahvaz's configured blue (#4664DE), existing site font and original icons. It is an adaptation, not a copied proprietary stylesheet or a claim of pixel-identical behavior across every Digikala experiment.

## Layout

- Existing 767px mobile breakpoint is retained; desktop is unchanged.
- White fixed rail, 15px side gutters, 10px vertical padding plus safe-area inset.
- Action uses 48% of available inner width, minimum 48px height. Price is 15px/700, currency 11px; button 12px/700. Ranges and discounted prices wrap without horizontal overflow at 320px.
- Only the main native price and purchase controls are hidden after API readiness and with the administrator setting enabled. Attribute choices, warranty, service conditions and related-product prices remain intact.

## Price feedback

After a real variation-select change, changed price markup receives a single 180ms ease-out animation: 3px upward settle with opacity .45 → 1. Initial page resolution and repeated identical prices do not animate. A subsequent change cancels any unfinished price animation. Web Animations API is feature-detected; unsupported browsers simply update the price. Reduced-motion users receive the price immediately without animation. No polling, counters, timers per animation frame, forced layout read, network call or library is introduced for motion.

## Selection flow

All variable products initially show «انتخاب گزینه‌ها». Merchant defaults are retained, not cleared or silently bought. The first sticky click scrolls smoothly to the first incomplete attribute row (or the first row for already-complete defaults) and focuses a visible native select or Flatsome radio swatch. Already-complete defaults then enable the next purchase click. A deliberate attribute change also enables purchase once WooCommerce resolves a purchasable variation. Missing or unavailable combinations cannot be bought. Reduced-motion scrolling is immediate.

## Confirmed-success sheet

Only a verified increase in the server cart opens the native modal dialog. Failed validation, stock errors, timeout, or an unconfirmed cart never show it. The sheet enters from 24px below in 180ms using only transform/opacity, with a subtle dimmed backdrop. It includes success icon, message, product name and full-width «مشاهده سبد خرید» link to WooCommerce's actual cart URL.

Native `<dialog>` provides inert background and focus containment. Focus starts on the 44px close control; Escape, backdrop click or the close control dismiss it and return focus to the active cart control. The sheet stays open until dismissed or followed to cart; no auto-dismiss deadline. It closes when resizing to desktop and releases scroll locking. Reduced motion removes sheet/backdrop animation. Browsers without showModal retain the existing live success status and cart link.

## Verification and release gate

CI runs PHP 7.4/8.3 syntax and WordPress Coding Standards, Plugin Check, settings sanitization and isolated WooCommerce/Storefront browser integration. Dedicated 0.3 tests cover initial/default option prompts, hidden-select swatch focus, real cart confirmation and navigation, failure suppression, Escape/focus restoration, reduced motion, price-animation duration, desktop resize and archive isolation. Existing purchase, stock, native fallback, no-JavaScript, quantity and settings tests remain in the suite.

Production deployment must follow passing CI. Verify representative simple, variable and service-enabled product layouts on mobile/desktop, plus unchanged parent/child archives. Do not place real orders; a disposable cart addition may be removed immediately after UI verification. Commercial Flatsome is not bundled in automated CI. Keep the previous installable ZIP for rollback; settings are retained during upgrade.
