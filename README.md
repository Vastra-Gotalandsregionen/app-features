# app-features

Remote feature flags for VGR's patient apps.

## Layout

```
features/<app>/feature_flags.<env>.json
schema/feature_flags.schema.json
```

- `<app>`: `migraine`, `epilepsy`, `dermatology`, `antistress`
- `<env>`: `dev` or `prod`

## Format

```json
{
  "schemaVersion": 1,
  "updatedAt": "2026-11-02T09:00:00Z",
  "flags": {
    "ai_chat": {
      "control": "user",
      "available": true,
      "defaultEnabled": false,
      "title": "AI-Chatt",
      "subtitle": "Chatta med vår AI-assistent i appen",
      "minAppVersion": "1.5.0"
    },
    "new_onboarding": {
      "control": "remote",
      "enabled": true,
      "minAppVersion": "1.6.0"
    }
  }
}
```

- `user`: shown in Settings and toggled by the user. `available: false` hides it.
- `remote`: never shown to the user; switched on/off with `enabled`.

Flag keys are `snake_case`. Bump `updatedAt` on every change.

## Validate

```sh
make doctor                                              # check required tools
make validate                                            # all files
make validate APP=migraine                               # one app
make validate FILE=features/migraine/feature_flags.dev.json
```

CI runs `make validate` on every push and PR.
