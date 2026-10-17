import { expectedPlan } from './self-audit-catalog.mjs';

// Node24 action pins: checkout v7.0.1, setup-node v7.1.0, upload-artifact v7.0.2.
// The application Node version is a separate runtime contract.
// Exact constrained producer template. Execution overrides require a reviewed model change.
export function renderConsolidatedProducerWorkflow() {
  const prefix=`name: Development Self Audit
on:
  pull_request:
  push:
    branches: [main]
  workflow_dispatch:
permissions:
  contents: read
jobs:
  self-audit:
    runs-on: ubuntu-latest
    timeout-minutes: 15
    services:
      postgres:
        image: postgres:17.11-alpine
        env:
          POSTGRES_USER: postgres
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: teach_v2
        ports:
          - 5432:5432
        options: >-
          --health-cmd "pg_isready -U postgres -d teach_v2"
          --health-interval 5s
          --health-timeout 5s
          --health-retries 10
    env:
      DATABASE_URL: postgresql://postgres:postgres@127.0.0.1:5432/teach_v2
      TEACH_ISOLATED_DB: '1'
      AUDIT_EXPECTED_SHA: \${{ github.event.pull_request.head.sha || github.sha }}
    steps:
      - uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1
        id: workflow_step_001
        with:
          ref: \${{ github.event.pull_request.head.sha || github.sha }}
          persist-credentials: false
          fetch-depth: 0
      - uses: actions/setup-node@949feb2413d6458794dcd2491c4babbbce0c15c1
        id: workflow_step_002
        with:
          node-version: '20.20.2'
      - name: Enable pinned pnpm
        id: workflow_step_003
        run: |
          corepack enable
          corepack prepare pnpm@12.8.1 --activate
      - name: Install frozen dependencies
        id: workflow_step_004
        run: pnpm install --frozen-lockfile
`;
  const suffix=`      - name: Reconcile exact-source evidence
        id: audit_finalize
        if: always()
        run: node scripts/verification/run-self-audit.mjs --finish
      - name: Save audit evidence
        id: audit_upload
        if: always()
        uses: actions/upload-artifact@cf430e030ddbb5b0abf93d22962f4752f3646cd9
        with:
          name: development-self-audit-\${{ github.event.pull_request.head.sha || github.sha }}
          path: verification/generated/self-audit/
          if-no-files-found: error
      - name: Record workflow lifecycle checkpoint
        id: lifecycle_record
        if: always()
        env:
          LIFECYCLE_STEPS: \${{ toJson(steps) }}
          LIFECYCLE_JOB_STATUS: \${{ job.status }}
          LIFECYCLE_EXPECTED_SHA: \${{ github.event.pull_request.head.sha || github.sha }}
          LIFECYCLE_WORKFLOW_PATH: .github/workflows/development-self-audit.yml
        run: node scripts/verification/record-workflow-lifecycle.mjs
      - name: Retain workflow lifecycle evidence
        id: lifecycle_upload
        if: always()
        uses: actions/upload-artifact@cf430e030ddbb5b0abf93d22962f4752f3646cd9
        with:
          name: workflow-lifecycle-\${{ github.run_id }}-\${{ github.run_attempt }}-\${{ github.job }}
          path: verification/generated/workflow-lifecycle/report.json
          if-no-files-found: error
`;
  const stages=expectedPlan.stages.map(({id})=>`      - name: Audit ${id}\n        id: audit_${id.replaceAll('-','_')}\n        run: node scripts/verification/run-self-audit.mjs --stage ${id}\n`).join('');
  return prefix+stages+suffix;
}
