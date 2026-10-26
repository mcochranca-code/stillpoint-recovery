# Reminder model and feedback survey review

_Reviewed October 26, 2026. The review is read-only; no survey responses were accessed or submitted and no Jotform fields were changed._

## Reminder model on current main

The current main branch uses version 5 of its IndexedDB/preferences schema. Daily meditation reminder opt-in and time are stored with local preferences. Meeting reminders are represented in the local preference model, and `src/domain/reminders.ts` contains pure helpers for the next daily reminder time, next weekly meeting start, and next meeting reminder occurrence. The meeting helper uses the device's local timezone and the meeting listing's bundled weekday/time; no IANA timezone is captured in the reminder record.

The existing Settings control checks for the browser `Notification` API and requests permission only after the user enables the reminder. It enables the preference only when permission is granted, and the displayed copy warns that closed-app delivery varies by browser/device. Notifications should remain generic and should not disclose a recovery date, journal entry, named meeting, fellowship, or health detail.

The model should not be represented as a completed reminder-delivery feature yet. The current call sites do not run the daily/weekly occurrence helpers in a dispatch loop, and the Meetings screen does not provide per-listing add/remove controls or user-selected 15/30/60-minute lead time. Delivery de-duplication at dispatch, notification-tap routing, permission-denied UI tests, and DST/timezone/missed-occurrence behavior also remain open. The app is a web/PWA project; there is no native iOS/Android permission bridge in this repository. See [notification permission notes](notification-permissions.md) and the reminder TODO outcome.

Recommended completion path:

1. Add explicit, accessible per-meeting enable/remove controls and a Settings lead-time selector; do not request permission on page load or simply viewing a meeting.
2. Define whether reminders follow the bundled meeting's local clock or the user's current device clock, then persist a timezone policy and handle travel, DST transitions, removed/changed bundled listings, and missed events.
3. Use a single occurrence key and transactional de-duplication so repeated wake-ups cannot send duplicate notices; cancel pending items when the user opts out or deletes data.
4. Keep titles/body neutral and test browser-visible delivery only under documented conditions. Do not claim guaranteed background or closed-app delivery.

## Jotform design and question review

**Form:** [Stillpoint Recovery — Experience & Usability Feedback](https://form.jotform.com/262961231783057).

The form is structured in sections for feature use and usability, trust/usefulness, then reminder preferences/open feedback and device/recommendation. It asks about feature areas tried (including “None yet”), ease of use, navigation, readability/accessibility, reassurance, privacy confidence, perceived feature usefulness, reminder preferences, optional written comments, device type, and a 0–10 recommendation rating. Rating questions include “Haven't tried” choices for feature-specific usefulness, which avoids treating non-use as a negative rating. The introduction warns respondents not to include names, recovery dates, journal content, diagnoses, or other sensitive information.

The rating coverage is useful, but several design issues should be corrected before broad promotion:

1. **Required-field mismatch:** the introduction says questions can be skipped, while Jotform marks several fields required, including areas tried, ease, navigation, readability/accessibility, device and recommendation. Prefer making these optional for a recovery audience, or correct the introduction to name the required fields precisely.
2. **Third-party data disclosure:** state in the form itself that submitting answers sends them to Jotform and is subject to Jotform's privacy/data practices. A README disclaimer does not travel with a copied direct link.
3. **Trust scale coverage:** the privacy-confidence response set (“Very confident,” “Somewhat confident,” “Not sure”) lacks an explicit low-confidence/concern choice. Add “Not very confident” and “Not at all confident,” or an equivalent nonjudgmental scale.
4. **Star endpoint anchors:** explain what one and five stars mean, or replace the star item with a fully labeled five-point response scale.
5. **Accessibility wording:** split visual readability from accessibility, or clarify with examples such as keyboard navigation, text size, screen readers and motion controls.
6. **Recommendation optionality:** leave the 0–10 recommendation question optional and retain wording that does not imply pressure to recommend a recovery tool.
7. **Visual branding:** the form is legible but uses generic pale-blue section styling. Apply the app's restrained sage/forest/cream palette while maintaining contrast, visible focus, labels and responsive layout.

The GitHub README now identifies the form as Jotform-hosted and discloses that responses leave the device. The external form itself was not edited in this task, so the required-field mismatch remains an open recommendation.
