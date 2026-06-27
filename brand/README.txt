GROUNDWORK — BRAND ASSET PACKAGE
================================

The "Grounded Frame" mark: a design tool's selection bracket planted on
architectural ground hatch. It fuses the two halves of the name — design
tool (corner handles) + groundwork / local-first (the ground = your own
machine, not the cloud).

Brand colors
  Amber (primary) ...... #F2A33C
  Ink (on amber) ....... #17140D
  Near-black bg ........ #0D0D0F
  Light surface ........ #F5F3EE
  Mono light ........... #E9E9EC
  Hatch neutral (dark) . #5A5A60
  Hatch neutral (light)  #B8B2A6
Typeface: IBM Plex Sans (wordmark) · IBM Plex Mono (captions/measurements)

Note on small sizes: assets at 48px and below use a "compact" mark
(no ground hatch) so it stays legible. 64px and up include the hatch.

--------------------------------------------------------------------
master/                 Vector + raster source of truth
  mark-amber.svg            Full-color mark (amber on transparent)
  mark-mono-light.svg       Monochrome #E9E9EC (use on dark)
  mark-mono-dark.svg        Monochrome #0D0D0F (use on light)
  mark-currentcolor.svg     In-app mark — inherits CSS `color` (theme to amber)
  wordmark-dark.svg / -light.svg     "Groundwork" logotype
  lockup-horizontal-dark.svg / -light.svg
  lockup-stacked-dark.svg / -light.svg
  mark-1024.png             1024² master raster (transparent)

public/                 Drop into your web app's /public
  favicon.svg               Primary, modern browsers
  favicon.ico               Multi-res fallback (16/32/48)
  favicon-16.png / -32.png / -48.png
  apple-touch-icon.png      180² — solid amber, ~12% padding
  icon-192.png / icon-512.png            PWA standard (purpose: any)
  icon-192-maskable.png / icon-512-maskable.png   PWA maskable (safe zone)
  icon-monochrome.svg       Android themed icon
  manifest.webmanifest      Ready to reference the icons above

social/
  og-image.png              1200×630  Open Graph
  twitter-card.png          1200×600

desktop/                Only needed if wrapped in Tauri/Electron
  app.ico                   Windows (16/24/32/48/64/128/256)
  app.icns                  macOS (16…1024, PNG-based)
  linux/                    512/256/128/64/48/32 + 1024 master
  tray/                     Monochrome template PNGs (macOS menu-bar / tray)

--------------------------------------------------------------------
HTML <head> snippet
--------------------------------------------------------------------
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="icon" href="/favicon.ico" sizes="48x48">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="manifest" href="/manifest.webmanifest">
<meta name="theme-color" content="#f2a33c">
<meta property="og:image" content="/og-image.png">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:image" content="/twitter-card.png">

In-app mark (themeable):
  <img src="/mark-currentcolor.svg" style="width:24px;color:#f2a33c">  (when used inline via CSS mask, or)
  Inline the SVG and set `color:#f2a33c` on its container.
