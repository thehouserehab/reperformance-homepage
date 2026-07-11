# PE Exam Data Automation

## Purpose

The PE exam hub uses checked-in KUSF and ADIGA snapshots. Source changes must be reviewed before they reach production because parser success alone does not prove that official admission content is complete or semantically unchanged.

The `PE exam data maintenance` GitHub Actions workflow reduces repeated manual work without automatically publishing unreviewed admission data.

## Schedule and manual runs

- The workflow runs once a month at `05:17 KST` on the second calendar day.
- A repository operator can also open GitHub Actions, select `PE exam data maintenance`, and choose `Run workflow`.
- `verify` performs a read-only readiness and snapshot verification run.
- `refresh` fetches all KUSF/ADIGA sources, regenerates the status summary, runs the gates, typechecks, and builds the application.

## Review boundary

When a refresh changes source data, the workflow stages only these generated files:

- `app/pe-exam/kusfAdmissionData.ts`
- `app/pe-exam/kusfAdmissionDetailData.ts`
- `app/pe-exam/adigaRegularAdmissionData.ts`
- `app/pe-exam/adigaRegularSelectionData.ts`
- `app/pe-exam/peExamSourceStatus.js`

It then creates or updates the `automation/pe-exam-data-refresh` pull request. It never deploys or merges automatically.

Before merging, review source years, generated dates, row-count changes, unexpected university additions or removals, and any parser warnings. If an official source is incomplete, preserve the existing “official guideline check” wording instead of inferring missing numbers.

## Repository requirement

GitHub Actions must be allowed to create and approve pull requests, and the workflow token must retain the declared `contents: write` and `pull-requests: write` permissions. If repository policy blocks pull-request creation, the validated automation branch may still be pushed; an administrator must then create the pull request manually.

## Local verification

```powershell
npm.cmd run pe-exam:data:automation-policy
npm.cmd run pe-exam:data:readiness
npm.cmd run pe-exam:data:verify
```

Use `npm.cmd run pe-exam:data:refresh` only when outbound access to KUSF and ADIGA is available.
