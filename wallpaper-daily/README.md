# Wallpaper Daily website

Public page: <https://morecats.github.io/wallpaper-daily/>.

This directory is a standalone static website. It has no build dependencies and is not referenced by the Xcode workspace. Open `index.html` directly or serve this directory with a static HTTP server. Publish the complete directory, including its relative `assets/` paths.

The page uses a fixed, full-screen Bing wallpaper with `object-fit: cover`. The app icon, name, four brand lines, and official App Store badge sit toward the lower left on desktop. Mobile and short windows use normal document flow so the introduction and photo credit remain accessible. The background gradient supports readable text; the date uses a narrow Roboto Flex face beside a two-line photo description.

English, Simplified Chinese, and Traditional Chinese cover the name, copy, metadata, photo caption, and download badge. The animated language capsule accepts `?lang=en`, `?lang=zh-Hans`, and `?lang=zh-Hant`, updates the URL without a reload, and remembers choices. It follows the browser language when no explicit or saved choice exists.

A local Victoria Harbour image and prelocalized metadata are visible immediately, including without JavaScript or network access. Bing's current image loads in the background, with per-market metadata caches, archive fallback, date-aware refresh, cancellation of stale requests, and silent retries after failure. New images decode before a 600 ms crossfade. Interrupted fades preserve the visible blend; old layers are removed after completion. Both background and language animations respect reduced motion.

Search metadata includes localized titles, descriptions and keywords, language alternatives, one language-specific canonical URL, Open Graph/Twitter sharing information, and SoftwareApplication structured data. It declares no unverified price or ratings. Keywords are descriptive metadata; they are not a guarantee of search ranking.

To synchronize with `MORECATS/morecats.github.io`, copy this directory to `wallpaper-daily/`, keep the homepage's Wallpaper Daily list entry pointing to `wallpaper-daily/`, and push the Pages repository's `master` branch. GitHub Pages publishes from the repository root. The app download destination is <https://apps.apple.com/app/id1195400858>.

Asset origins, font details, and third-party licenses are documented in [assets/README.md](assets/README.md).
