# Platform delivery contracts

Read for native platforms (iOS, Android, tablet,
desktop app), several targets, app prototypes or device frames; a responsive web
page needs only the first point below.

- **Responsive web** is one product adapting across breakpoints. Verify no
  horizontal scroll at 360/390/430/600/768/820/1024/1366/1440/1920px; use
  `clamp()` scales and container queries; the mobile layout is a redesign with
  prioritized content and real navigation. The preview's width switch and
  `scripts/shot.mjs --width 1440,390` (add widths for doubtful breakpoints) cover
  the checks.
- **Multi-target briefs** get one real file per target (`mobile-ios.html`,
  `mobile-android.html`, `tablet.html`, `desktop.html`) with native patterns:
  large titles, tab bar and 44pt targets for iOS; Material navigation and 48dp
  for Android; split panes for tablet; hover and keyboard states for desktop.
  Never one tabbed comparison page; `index.html` is then a launcher linking the
  targets.
- **App prototypes** include the domain's real in-app modules by default (player
  for media, cart and checkout for commerce, balance and transactions for
  finance), with states and working interactions. OS widgets and lock-screen
  surfaces only when explicitly requested.

## Screens and OS chrome

A screen is the product, so it draws no OS chrome: no status bar with a clock,
signal or battery, no home indicator, no drawn keyboard or browser bar. This
holds on both paths, the shared frames below and the single-screen `mobile-app`
entry, and overrides any checklist item that asks for a status bar. A native app
screen keeps the safe-area insets as empty padding (iPhone: about 59px at the
top under the notch, 34px at the bottom for the home indicator; Android: about
24–36px at the top, 24px at the bottom) and works opened directly at its width;
`shot.mjs` at a width below 600 emulates the phone. A web page viewed on a phone
has no such padding: the browser owns the insets, and `env(safe-area-inset-*)`
is all it needs. Device chrome belongs to a frame around the screen, for
presentation only, and only when the user asked for a realistic device mockup.

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

The phone frames draw their own status bar (`.statusbar`, 47px on the iPhone,
36px on the Pixel) and the iPhone frame a home-indicator row (`.home-indicator`,
28px). Delete both from your copy: the screen's own safe-area padding is that
space. Keep them only for a realistic device mockup the user asked for, and
then drop the screen's top and bottom insets so the space is not counted twice.
The iPhone frame's screen area is 366px wide inside the bezel, so a screen
built for 390px is checked at 390 on its own and at 366 inside the frame.

The single-screen `mobile-app` entry inlines its frame and has the same
`.statusbar` and `.home-indicator`; remove them there too, and treat its
checklist's status-bar items as satisfied by the empty insets. For
cross-platform work, keep shared tokens and content in one root CSS file and
give each platform its own screen files so native adaptations compare side by
side.
