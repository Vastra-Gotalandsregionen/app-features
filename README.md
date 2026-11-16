# app-features

Remote feature flags for VGR's patient apps.

## Layout

```
features/<app>/feature_flags.<env>.json
schema/feature_flags.schema.json
```

- `<app>`: `migraine`, `epilepsy`, `dermatology`, `antistress`
- `<env>`: `dev` or `prod`

## Fetching flags (client apps)

The repo is published with GitHub Pages from `main`. Apps fetch:

```
https://vastra-gotalandsregionen.github.io/app-features/features/<app>/feature_flags.<env>.json
```

e.g. `https://vastra-gotalandsregionen.github.io/app-features/features/migraine/feature_flags.prod.json`

- Changes go live a minute or so after merge to `main`.
- Responses are cached for up to 10 minutes (`Cache-Control: max-age=600`); use the `ETag` / `If-None-Match` header for cheap refreshes.
- Apps should keep the last good copy and fall back to built-in defaults if the fetch fails.
- Ignore flags whose `minAppVersion` for your platform is higher than the running app version, and refuse files with an unknown `schemaVersion`.

## Format

```json
{
  "schemaVersion": 1,
  "updatedAt": "2026-11-04T09:00:00Z",
  "programme": {
    "title": "VGR testar",
    "intro": "Här kan du prova nya funktioner som vi utvecklar."
  },
  "flags": {
    "ai_chat": {
      "control": "user",
      "status": "active",
      "defaultEnabled": false,
      "title": "AI-Chatt",
      "subtitle": "Chatta med vår AI-assistent i appen",
      "icon": { "ios": "bubble.left.and.bubble.right", "android": "chat" },
      "version": "1.0",
      "sortOrder": 0,
      "description": "Första stycket.\n\nAndra stycket.",
      "acknowledgement": "Jag förstår att AI-assistenten kan ge felaktiga svar.",
      "minAppVersion": { "ios": "1.5.0", "android": "2.3.0" }
    },
    "new_onboarding": {
      "control": "remote",
      "enabled": true,
      "minAppVersion": { "ios": "1.6.0", "android": "2.4.0" }
    }
  }
}
```

- `programme` (optional): `title` and `intro` for the "VGR testar" page.
- `user` flags are tests listed under "VGR testar", each with a list row and a detail page. The user toggles them.
  - Required: `control`, `status`, `defaultEnabled`, `title`, `minAppVersion`.
  - `status`: `active` (ongoing), `ended` (still shown, always off), `hidden` (not shown).
  - `icon` (optional): `ios` is an SF Symbol name, `android` an icon from Android's built-in icon library. The app falls back to a default icon.
  - `version` (optional): the test's own version label, e.g. `"1.0"`. Not the app version.
  - `sortOrder` (optional): integer >= 0; lower comes first.
  - `description` (optional): plain text; a blank line (`\n\n`) starts a new paragraph. No markdown.
  - `acknowledgement` (optional): text the user must confirm the first time they switch the test on.
- `remote` flags are never shown to the user; switched on/off with `enabled`.
- `minAppVersion` (both flag types): lowest app version the flag applies to, per platform, e.g. `{ "ios": "1.5.0", "android": "2.3.0" }`. Both keys are required; each app reads its own. Versions are `major.minor.patch`.
  - The app compares against the version inside its build, not the version label in App Store Connect / Google Play. How each app numbers its builds is declared in `schema/app_versions.json`, and `make validate` checks every value against it:
    - `date`: iOS production builds are versioned with the build date by Xcode Cloud (`yy.MM.dd`, e.g. `26.10.21`). Write a date: `"26.11.05"` means builds from 5 Nov 2026 onwards. A release number like `"1.9.4"` is rejected, since it would always pass.
    - `fixed`: every build carries the same version (iOS dev builds). `minAppVersion` can't tell builds apart there, so use `"0.0.0"`; a value above the fixed version is rejected, since the flag would never show.
    - `semver`: an ordinary increasing version.
  - When a dev build's fixed version is bumped, or an app changes how it numbers builds, update `schema/app_versions.json` in the same change.

Flag keys are `snake_case`. Bump `updatedAt` on every change.

## Validate

```sh
make doctor                                              # check required tools
make validate                                            # all files
make validate APP=migraine                               # one app
make validate FILE=features/migraine/feature_flags.dev.json
```

CI runs `make validate` on every push and PR.
