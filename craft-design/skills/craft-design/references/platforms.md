# Platform delivery contracts

Adapted from OpenDesign. Read when the brief names a platform, several targets or
an app prototype.

- **Responsive web** is one product adapting across breakpoints. Verify no
  horizontal scroll at 360/390/430/600/768/820/1024/1366/1440/1920px; use
  `clamp()` scales and container queries; the mobile layout is a redesign with
  prioritized content and real navigation. The preview's width switch and
  `scripts/shot.mjs --width <px>` cover the checks.
- **Multi-target briefs** get one real file per target (`mobile-ios.html`,
  `mobile-android.html`, `tablet.html`, `desktop.html`) with native chrome and
  patterns: iPhone frame, Dynamic Island and 44px targets for iOS; Pixel frame,
  Material navigation and 48dp for Android; split panes for tablet; hover and
  keyboard states for desktop. Never one tabbed comparison page; `index.html` is
  then a launcher linking the targets.
- **App prototypes** include the domain's real in-app modules by default (player
  for media, cart and checkout for commerce, balance and transactions for
  finance), with states and working interactions. OS widgets and lock-screen
  surfaces only when explicitly requested.

## Shared device frames

For the same product on several devices, or several app screens side by side, do
not draw device chrome. Copy the needed frame from `library/frames/` into the
artifact directory (`iphone-15-pro.html` 390×844, `android-pixel.html` 412×900,
`ipad-pro.html` 1024×1366, `macbook.html` 1440×900, `browser-chrome.html`) and
embed screens through it; `?screen=` resolves relative to the embedding page:

```text
design/<slug>/
├── index.html            ← gallery composing the frames
├── iphone-15-pro.html    ← copied frame
└── screens/01-onboarding.html, 02-paywall.html, 03-home.html
```

```html
<iframe src="iphone-15-pro.html?screen=screens/01-onboarding.html"
        width="390" height="844" loading="lazy"></iframe>
```

The single-screen `mobile-app` entry already inlines its iPhone frame. For
cross-platform work, keep shared tokens and content in one root CSS file and give
each platform its own screen files so native adaptations compare side by side.
