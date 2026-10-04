# TransactionControl First Physical Slice — Owner Decision Packet

Status: **proposed — owner approval required**.

Target: `SLICE-P01`, ReconciliationRecord persistence.

The K00 0.14.0 semantic closure removes the IdempotencyKey candidate blocker. Four decisions still prevent physical schema admission:

1. **Idempotency-key source:** recommended `BOTH_BY_OPERATION` — every retryable operation explicitly declares client-supplied or server-derived key policy; no implicit fallback.
2. **Retention:** recommended `OPERATION_DECLARED_MINIMUM` — every retryable operation declares a retention duration at least as long as its full retry/reconciliation horizon. No universal duration is invented here.
3. **Relationship:** recommended `ReconciliationRecord -> IdempotencyKey` as many-to-zero-or-one. Absence is allowed only where the effect is non-retryable or has a documented non-key safe strategy. A linked key never authorizes retry by itself.
4. **Scope:** recommended `INHERIT_ORIGINATING_OPERATION_SCOPE` — reconciliation records inherit authoritative scope and never broaden it.

Approval of these choices still does not create a table. It releases relationship registration + another Persistence admission check.
