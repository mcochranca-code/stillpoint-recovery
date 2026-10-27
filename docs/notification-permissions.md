# Notification permissions: web today, mobile host boundary

## Current web behavior

Stillpoint is a React progressive web app. The daily meditation reminder toggle in Settings is the explicit opt-in action. Turning it off does not prompt. Turning it on checks browser support and reads the current permission; it calls `Notification.requestPermission()` only if the browser still reports `default`. The preference is enabled only when permission is `granted`. Denied, dismissed, and unsupported cases leave the reminder off and show a clear notice.

The copy identifies delivery as best-effort while the app is open and says closed-app delivery depends on browser support. That is the correct boundary: browser/OS lifecycle policy, focus modes, battery management, notification settings, PWA installation and service-worker support vary. A stored reminder preference or a computed next occurrence is not proof that a notification was delivered.

`src/platform/notificationPermissions.ts` centralizes permission status reads and the explicit request path. Reading permission does not prompt. The Settings opt-in handler calls the request helper; the helper uses the browser API by default and gracefully reports `unsupported` when neither capability exists.

Notification titles and text must remain neutral. Do not place a recovery date, meeting name, fellowship, journal excerpt, diagnosis, or other sensitive field in the lock-screen payload. Do not request geolocation or contact a trusted person as part of permission handling.

## Native mobile status and bridge contract

This repository does not contain a native iOS/Android application or native bridge implementation. A browser opened on a phone still follows the web path above. The web layer defines an optional `window.StillpointNotificationBridge` contract and uses it if an authorized future host provides it; this is an interface only, not a claim that native permission or delivery currently works:

```ts
type PermissionResult = 'granted' | 'denied' | 'default' | 'unsupported';

interface StillpointNotificationHost {
  getPermission?(): Promise<PermissionResult>;
  requestPermission(): Promise<PermissionResult>;
}
```

A native wrapper may expose this capability to the web layer, but it must not trigger a system prompt merely because the app loaded. The call to `requestPermission()` must be the direct result of a clearly labeled user action. A missing bridge returns `unsupported`; permission status is not inferred from a user agent. Keep the web API as a fallback for ordinary browsers.

Before a native scheduler is added, define a versioned request/cancel interface and test opt-in, opt-out, rescheduling, time-zone changes, stale/cancelled occurrences, and notification-tap routing. Native code must cancel any pending notifications after opt-out or deleting reminder data. It should send only a generic message such as “A quiet pause is here if it helps,” not sensitive event details.

## Reminder implementation boundary

The current local model includes daily-time and weekly meeting-occurrence calculations, and IndexedDB stores the optional settings. The calculation helpers are not yet a complete delivery service: in particular, meeting-card controls, dispatch scheduling, deduplication at delivery, background guarantees, and notification-tap routing remain open. Keep the README and in-app copy aligned with that status. See [the reminder and survey review](reminder-and-survey-review.md) and the open reminder outcome in [`TODO.md`](../TODO.md).
