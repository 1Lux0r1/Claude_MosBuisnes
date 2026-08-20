# Versioning

The app version is `APP_VERSION` in `src/version.ts` (mirrored in `package.json`'s
`version` field), shown in Настройки → О приложении.

Bump it as part of every merge to `main`, based on what the merge contains:
- Hotfix / bug fix only → increment the **patch** number (third).
- Any new feature → increment the **minor** number (second).

Update both `src/version.ts` and `package.json` together so they stay in sync.
