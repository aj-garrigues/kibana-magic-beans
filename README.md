# Kibana Magic Beans

Chrome extension for Kibana that makes you feel as powerful as a Super Saiyan that even Bini Jhoanna might notice you.

Pretty-prints the JSON inside Kibana Discover's `msg` column — syntax-colored, 2-space indented, with search-term highlights preserved — and lets each row grow up to 500px with its own scrollbar (instead of Kibana's default 115px clamp).

## What it does

- Finds the Discover table column whose header is named `msg` (works regardless of column position).
- Extracts the JSON after log prefixes like `mobileOutLog :`, `outLog:`, `gatewayLog:` using an escape-aware brace matcher.
- Re-renders it as pretty-printed JSON with syntax colors (light and dark theme aware).
- Keeps Kibana's search-hit `<mark>` highlights inside the formatted output.
- Caps each cell at `max-height: 500px` with internal scrolling.
- Survives re-renders (new query, time range change, scrolling) via a MutationObserver.
- Rows whose content isn't parseable JSON are left untouched.
- Falls back to the default `_source` Document view when no `msg` column is present.

## Install (unpacked)

1. Open `chrome://extensions`
2. Enable **Developer mode** (top right)
3. Click **Load unpacked** and select this folder
4. Reload your Kibana Discover tab

## Files

| File | Purpose |
| --- | --- |
| `manifest.json` | Manifest V3, content script scoped to the Kibana host |
| `content.js` | Column detection, JSON extraction/parsing, colored rendering, observer |
| `styles.css` | 500px height override + syntax colors (light/dark) |
| `icons/` | Extension icons (16/32/48/128px) |

## Notes

- Targets Kibana 7.x legacy Discover (`docTable`) markup.
- The content script only runs on the host listed in `manifest.json` — edit the `matches` pattern to use it on another Kibana instance.
- No data is collected or sent anywhere; the extension only reformats text already rendered on the page.
