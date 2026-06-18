# NORE Integration Bridge

This repository now contains an environment-variable driven bridge for connecting RePERFORMANCE homepage flows to NORE after the final API spec is confirmed.

## Implemented Surfaces

- `lib/noreClient.js`
  - Central server-side adapter for NORE API calls.
  - Reads API base URL, key, endpoints, chat links, and tokens from environment variables.
  - Does not initialize an SDK or read secrets at module import time.

- `/api/rp/service-application`
  - After a RePERFORMANCE consultation/application record is saved, calls `createNoreMemberCardSafely`.
  - NORE failure does not break the local application completion flow.

- `/api/rp/signup`
  - After a member signup is saved, calls `createNoreMemberCardSafely`.
  - Passwords are never sent to NORE.

- `/api/nore/chat`
  - Redirects `/member` and `/pe-exam` AI consultation buttons to a NORE chat URL.
  - Supports `NORE_MEMBER_CHAT_URL`, `NORE_PE_EXAM_CHAT_URL`, and optional token query parameters.

- `/api/nore/nutrition-analysis`
  - Receives a food photo as `multipart/form-data`.
  - Forwards the image to the NORE nutrition analysis endpoint.

- `/api/nore/nutrition-feedback`
  - Sends a coach-edited feedback draft back to NORE.

- `/api/nore/reservations`
  - Supports reservation slot recommendation, reservation sync, cancel, no-show, and waitlist notification actions.

- `/api/nore/pe-exam`
  - Saves PE exam management inputs to NORE and requests an AI training plan draft.

## Dashboard UI

- `/member`
  - Adds `AI 상담하기`.
  - Adds food photo analysis and coach feedback panel.
  - Adds empty slot recommendation panel.

- `/pe-exam`
  - Adds `AI 상담하기`.
  - Adds PE exam goal/record/training/condition/schedule bridge panel.

## Required Vercel Environment Variables

Set secrets in Vercel Project Settings or with `vercel env add`; do not commit real values.

```bash
NORE_API_BASE_URL=
NORE_API_KEY=
NORE_API_KEY_HEADER=Authorization
NORE_API_KEY_PREFIX=Bearer
NORE_ORG_ID=
NORE_MEMBER_CARD_ENDPOINT=/members
NORE_CHAT_URL=
NORE_MEMBER_CHAT_URL=
NORE_PE_EXAM_CHAT_URL=
NORE_CHAT_TOKEN=
NORE_MEMBER_CHAT_TOKEN=
NORE_PE_EXAM_CHAT_TOKEN=
NORE_CHAT_TOKEN_PARAM=token
NORE_NUTRITION_ANALYSIS_ENDPOINT=/nutrition/analyze
NORE_NUTRITION_FEEDBACK_ENDPOINT=/nutrition/feedback
NORE_RESERVATION_ENDPOINT=/reservations
NORE_RESERVATION_RECOMMEND_ENDPOINT=/reservations/recommend-slots
NORE_RESERVATION_NOTIFY_ENDPOINT=/reservations/no-show-notify
NORE_PE_EXAM_PROFILE_ENDPOINT=/pe-exam/profile
NORE_PE_EXAM_PLAN_ENDPOINT=/pe-exam/plan
```

## API Spec Mapping Notes

When NORE provides the final API document, check these items first:

- Authentication header name and prefix:
  - Keep `Authorization: Bearer {key}` or switch to `NORE_API_KEY_HEADER=x-api-key` and `NORE_API_KEY_PREFIX=`.
- Member card endpoint and expected payload keys:
  - Current payload sends basic identity, service, PAR-Q status, goals, and PE exam fields.
- Nutrition response shape:
  - Current normalizer accepts `calories`, `kcal`, `macros`, `draftFeedback`, and similar keys.
- Reservation actions:
  - Current bridge sends an `action` field: `recommendSlots`, `syncReservation`, `cancelReservation`, `markNoShow`, `notifyNoShowWaitlist`.
- PE exam actions:
  - Current bridge sends `targetUniversities`, `practicalRecords`, `trainingPlan`, `conditionCheck`, and `admissionSchedule`.

## Safety

- API keys and chat tokens are server-side only.
- Browser components call local `/api/nore/*` routes, not NORE directly.
- No new login, DB schema, payment, Google Sheets, or Drive implementation was added for this integration.
- NORE sync failure is reported in JSON responses but does not block existing RePERFORMANCE application/signup completion.
