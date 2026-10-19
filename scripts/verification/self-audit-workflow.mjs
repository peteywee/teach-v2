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
      - name: Pin additional hosted-source Node runtime
        id: hosted_node24
        uses: actions/setup-node@949feb2413d6458794dcd2491c4babbbce0c15c1
        with:
          node-version: '24.19.0'
      - name: Enable pinned pnpm for Node24 checks
        id: hosted_pnpm
        run: |
          corepack enable
          corepack prepare pnpm@12.8.1 --activate
      - name: Verify schema source controls
        id: hosted_schema
        run: pnpm exec node scripts/verification/run-hosted-source-check.mjs schema
      - name: Verify disabled hosted runtime and adapter
        id: hosted_hosted
        run: pnpm exec node scripts/verification/run-hosted-source-check.mjs hosted
      - name: Verify disabled Node24 package
        id: hosted_package
        run: pnpm exec node scripts/verification/run-hosted-source-check.mjs package
      - name: Verify disabled successor controls
        id: hosted_successor
        run: pnpm exec node scripts/verification/run-hosted-source-check.mjs successor
      - name: Verify reproducible successor package
        id: hosted_successor_package
        run: pnpm exec node scripts/verification/run-hosted-source-check.mjs successor_package
      - name: Verify isolated model catalog equivalence
        id: hosted_successor_model
        run: pnpm exec node scripts/verification/run-hosted-source-check.mjs successor_model
      - name: Verify nonowner successor PostgreSQL runtime
        id: hosted_successor_postgres
        run: pnpm exec node scripts/verification/run-hosted-source-check.mjs successor_postgres
      - name: Verify opt-in accepting artifact
        id: hosted_accepting_package
        run: pnpm exec node scripts/verification/run-hosted-source-check.mjs accepting_package
      - name: Verify packaged accepting PostgreSQL runtime
        id: hosted_accepting_postgres
        run: pnpm exec node scripts/verification/run-hosted-source-check.mjs accepting_postgres
      - name: Retain hosted source evidence
        id: hosted_upload
        if: always()
        uses: actions/upload-artifact@cf430e030ddbb5b0abf93d22962f4752f3646cd9
        with:
          name: hosted-source-\${{ github.event.pull_request.head.sha || github.sha }}
          path: verification/generated/hosted-source/
          if-no-files-found: error
      - name: Restore historical lifecycle Node runtime
        id: hosted_restore_node20
        if: always()
        uses: actions/setup-node@949feb2413d6458794dcd2491c4babbbce0c15c1
        with:
          node-version: '20.20.2'
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
