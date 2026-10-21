> **craft-design adaptation.** Run the bundled scripts directly with `node` from this
> entry's directory. They drive an installed Chrome, Edge or Chromium over the
> DevTools protocol and need no daemon; the `OD_*` environment variables are
> optional overrides and can be left unset. There is no daemon-owned CDP session:
> if the host sandbox blocks launching the browser, ask the user to allow it or to
> run the command, rather than installing Playwright or downloading Chromium.
