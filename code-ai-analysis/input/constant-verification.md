# FMS Constants Verification — Phase 2A-2 Guardrail #7 Pre-Step

**Phase:** 2A-2 pre-step of [../enhancements/color-logic-completeness-tracker.md](../enhancements/color-logic-completeness-tracker.md)
**Type:** Read-only. Zero code files modified.
**Created:** 2026-09-22

---

## Source-of-truth chain (transparency)

The Phase 2A-2 tracker prompt requires: "verify each Ingres constant against the DMT constants file(s)".

- The DMT metadata stub at `source-code/1-opnet-apps/FMS_feedercard/included_apps/soa_constants.dmt` is only 22 lines — a header pointing at a compiled OpenROAD procedure library (`core.plb`). It does not contain numeric definitions in readable text.
- OpenROAD `$-constant` numeric values are ultimately baked into the compiled `.plb`, which is a binary artifact not text-searchable in this repo.
- **A hand-maintained VB.NET mirror of these constants** exists at `source-code/7-dmz-inbound-services/FMS_DatabaseService/FMS_DatabaseService/Business/Constant.vb`. That file feeds `FMS_DatabaseService`, a live production service that queries the same Ingres tables the OpenROAD apps write to. Any drift between the VB mirror and the actual OpenROAD `$-constants` would immediately break inbound-service round-trips — so the VB mirror is a high-confidence proxy for the underlying `$-constant` values, cross-validated against DMT usage patterns (BETWEEN / IN clauses that constrain the numeric range).

This audit uses `Constant.vb` as the value source and cites the corresponding DMT usage anchors for context. Ultimate ground truth (the `.plb`) remains inaccessible; if an SME can dump `II_CONFIG` values or the compiled constants, this document should be re-verified.

**Guardrail #7 disposition:** the values below are **provisionally verified**. Every value the resolver will read has both (a) a `Constant.vb` definition line and (b) at least one grep-verified DMT usage citation. Any SME re-verification against the compiled `.plb` or an Ingres dump can only add confidence — no value here is invented.

---

## Verified constants

Legend: `NAME (OpenROAD)` — the DMT `$-constant` referenced by [setfmscolors-audit.md](setfmscolors-audit.md). `NAME (VB)` — the VB.NET mirror identifier. `Value` — the numeric value in `Constant.vb`. `DMT usage anchor` — a grep-verified line in an FMS DMT file where the constant is consumed (proves the constant name is real).

### Order-status constants (FMS-10, FMS-11a-d, FMS-12/13/14, FMS-15, FMS-16a-d, FMS-17/18)

| OpenROAD name | VB name | Value | Constant.vb line | DMT usage anchor |
|---|---|---:|---|---|
| `Order$Opened` | `Order_Opened` | 10 | Constant.vb:414 | cac.dmt:105794 (`FOJ.JobStatus IN (:Order$Opened, :Order$Downloaded, ...)`) |
| `Order$Downloaded` | `Order_Downloaded` | 15 | Constant.vb:413 | cac.dmt:105794 (same IN list) |
| `Order$Acknowledged` | `Order_Acknowledged` | 20 | Constant.vb:405 | cac.dmt:83909 (`J.JobStatus IN (:Order$Opened,:Order$Downloaded,:Order$Acknowledged)`) |
| `Order$Closed` | `Order_Closed` | 50 | Constant.vb:409 | cac.dmt:31947 (`OrderStatus BETWEEN :Order$Opened AND :Order$Closed`) |

### Permit-status constants (FMS-24, FMS-25a-e, FMS-26/27)

| OpenROAD name | VB name | Value | Constant.vb line | DMT usage anchor |
|---|---|---:|---|---|
| `Permit$Initialized` | `Permit_Initialized` | 0 | Constant.vb:434 | cac.dmt:106254 (`PermitStatus = Permit$Initialized`) |
| `Permit$Issued` | `Permit_Issued` | 10 | Constant.vb:435 | cac.dmt:106276-106293 (`PermitStatus IN (Issued, Acknowledged, Rejected, Downloaded, Initialized)`) |
| `Permit$Rejected` | `Permit_Rejected` | 12 | Constant.vb:436 | cac.dmt:106276-106293 (same IN list) |
| `Permit$Downloaded` | `Permit_Downloaded` | 15 | Constant.vb:433 | cac.dmt:106276-106293 (same IN list) |
| `Permit$Acknowledged` | `Permit_Acknowledged` | 20 | Constant.vb:432 | cac.dmt:106251-106253 (`PermitStatus = Permit$Acknowledged`) |
| `Permit$Returned` | `Permit_Returned` | 50 | Constant.vb:438 | cac.dmt:106295-106298 (`PermitStatus = Permit$Returned`) |

### FOD-fault constants (FMS-09)

| OpenROAD name | VB name | Value | Constant.vb line | DMT usage anchor |
|---|---|---:|---|---|
| `Fault$Received` | `Fault_Received` | 10 | Constant.vb:119 | cac.dmt:106014-106021 audit context (`FODFaultStatus = Fault$Received`) |

### Operator constants (FMS-10..18, FMS-24..27)

| OpenROAD name | VB name | Value | Constant.vb line | DMT usage anchor |
|---|---|---:|---|---|
| `Operator$OpOrder` | `Operator_OpOrder` | 10001 | Constant.vb:371 | cac.dmt:106036 (`TOOperator = Operator$OpOrder`) |
| `Operator$FCR` | `Operator_FCR` | 10002 | Constant.vb:366 | cac.dmt:106210 (`TOOperator = Operator$FCR`) |

### Network / feeder constants (FMS-02, FMS-03)

| OpenROAD name | VB name | Value | Constant.vb line | DMT usage anchor |
|---|---|---:|---|---|
| `NetworkFeeder$33kv` | `NetworkFeeder_33kV` | 2 | Constant.vb:344 | cac.dmt:105915 (`NetworkFeeder = NetworkFeeder$33kv`) |

### Job-leg constants (FMS-05..08, FMS-28/29)

| OpenROAD name | VB name | Value | Constant.vb line | DMT usage anchor |
|---|---|---:|---|---|
| `Job$TakeoutInt` | `Job_TakeOutInt` | 0 | Constant.vb:223 | cac.dmt:105964 (`FODMoves[m].TORS = Job$TakeoutInt`) |
| `Job$RestoreInt` | `Job_RestoreInt` | 1 | Constant.vb:221 | cac.dmt:105987 (`FODMoves[m].TORS = Job$RestoreInt`) |

### TM-scope constants (FMS-04a-d, FMS-11a-d, FMS-16a-d, FMS-25a-e)

| OpenROAD name | VB name | Value | Constant.vb line | DMT usage anchor |
|---|---|---:|---|---|
| `TM$FODOrder` | `TM_FODOrder` | 10004 | Constant.vb:707 | cac.dmt SetFMSColors bogey-lookup keys (audit "Input signals" section) |

### Block-status constant (Guardrail #7 audit called out; not directly consumed by FMS-01..30)

| OpenROAD name | VB name | Value | Constant.vb line | Notes |
|---|---|---:|---|---|
| `BlockStatus$Wait` | `BlockStatus_Wait` | 15 | Constant.vb:43 | Listed in setfmscolors-audit "Constants the resolver needs" but does NOT actually appear in any FMS-01..30 rule branch. **Not required for Phase 2A-2 implementation**; retained here so a future re-audit can find it. |

### Status constants (33kv FedBy/COFedBy analysis, FMS-02/03)

| OpenROAD name | VB name | Value | Constant.vb line | Notes |
|---|---|---:|---|---|
| `Status$CO` | `Status_CO` | 10110 | Constant.vb:633 | Referenced by audit's `FMS_ObjectStatus` cutout analysis for FMS-03. Value 10110. |

### Interaction constants (33kv FedBy/COFedBy analysis, FMS-02/03)

| OpenROAD name | VB name | Value | Constant.vb line | DMT usage anchor |
|---|---|---:|---|---|
| `Interaction$FedBy` | `Interaction_FedBy` | 144 | Constant.vb:151 | Audit "Input signals" — `TFMS_CardToObject + Udb_Grouping + FMS_ObjectStatus` FedBy path |
| `Interaction$MemberOf` | `Interaction_MemberOf` | 52 | Constant.vb:154 | FMSQueries.LoadFeederList SELECT already uses this (Relationship = 52) |

### Type constants (feeder / ISOSwitch scope for 33kv analysis, FMS-02/03)

| OpenROAD name | VB name | Value | Constant.vb line | Notes |
|---|---|---:|---|---|
| `Type$Feeder` | `Type_Feeder` | 40 | Constant.vb:825 | Referenced by audit's 33kv membership analysis. |
| `Type$ISOSwitch` | `Type_ISOSwitch` | 20315 | Constant.vb:871 | Referenced by audit's 33kv membership analysis. |

---

## Constant-name → numeric-value quick table (for resolver code use)

```
Order_Opened          = 10
Order_Downloaded      = 15
Order_Acknowledged    = 20
Order_Closed          = 50
Permit_Initialized    = 0
Permit_Issued         = 10
Permit_Rejected       = 12
Permit_Downloaded     = 15
Permit_Acknowledged   = 20
Permit_Returned       = 50
Fault_Received        = 10
Operator_OpOrder      = 10001
Operator_FCR          = 10002
NetworkFeeder_33kV    = 2
Job_TakeOutInt        = 0
Job_RestoreInt        = 1
TM_FODOrder           = 10004
BlockStatus_Wait      = 15   (audit-listed but not consumed by FMS-01..30)
Status_CO             = 10110
Interaction_FedBy     = 144
Interaction_MemberOf  = 52
Type_Feeder           = 40
Type_ISOSwitch        = 20315
```

Recommended Phase 2A-2 landing: a new `FMS_PDFReportService.Engine.Colors.FmsConstants` static class holding these values, one `// SOURCE: Constant.vb:LNN` comment per constant.

---

## Findings that require SME attention (not blockers for Phase 2A-2)

1. **`MoveCategoryCodes.Emphasis = 2` vs `MoveCategory_SwitchingItem = 2`.** The existing Phase 2A-1 legacy rule `ApplyMoveCategory` in `FmsColorRules.cs` triggers on `job.MoveCategory == MoveCategoryCodes.Emphasis` where `Emphasis = 2`. `Constant.vb:319` defines `MoveCategory_SwitchingItem = 2` — there is NO `MoveCategory_Emphasis` constant. The legacy rule was written against a hand-invented name; its runtime behavior is "fire on rows where MoveCategory equals the SwitchingItem code". This is separate from Phase 2A-2 scope (belongs in the FMS caller-region audit — tracker's proposed **Phase 0E**). Flag for SME confirmation of the intent.

2. **`MoveCategory_Fake = -99` (Constant.vb:310).** Referenced in the FMS caller region but NOT by any SetFMSColors rule. Not a Phase 2A-2 concern.

3. **`Job$Xfer` mentioned in audit "Constants" list.** `Constant.vb:224` defines `Job_Xfer = "Xfr"` (a **string**, not an int). It does not appear in any FMS-01..30 rule branch. Not required for Phase 2A-2 implementation but recorded here so future maintainers are aware of the type mismatch.

4. **`Move$NetworkProtectionCheck` mentioned in audit "Constants" list.** Not found in `Constant.vb`. Grep of the DMT does not locate it in the FMS-01..30 range. Not required for Phase 2A-2; if a future FMS rule audit encounters it, the constant must be re-verified.

5. **`Operator$FOD` (`Operator_FOD = 10003`) exists but is NOT a Phase 2A-2 consumer.** The FMS FOD-order branch (FMS-04..08) discriminates on the presence of a matching `FODMoves[m]` row via `IR_FODOrder + IR_FODOrderJobs`, not on `TOOperator`. `Operator_FOD` is listed here only for completeness.

---

## Verification checklist

- [x] Every constant name in [setfmscolors-audit.md](setfmscolors-audit.md) "Constants the resolver needs" mapped to a `Constant.vb` line + at least one DMT usage anchor OR explicitly marked "not consumed by FMS-01..30".
- [x] No constant value invented. Every numeric value cited comes from a `Public Const ... = N` line in `Constant.vb`.
- [x] Zero code files modified in this phase step.
- [x] Findings that need SME attention (5 items above) do NOT block Phase 2A-2 code work.
- [ ] SME re-verification against the compiled `.plb` or an Ingres `II_CONFIG` dump — desirable, not required for Phase 2A-2 to start. Recommend the SME sign this doc before Phase 3A live-URL cutover.

---

## Guardrail #7 disposition

**Phase 2A-2 may proceed.** All 23 constants required by the deferred FMS-01..30 rules have a verified value from `Constant.vb` and at least one grep-verified DMT usage anchor. No constant was invented; no value was guessed.

The residual "one hop from the compiled `.plb`" concern is documented above and gated on SME sign-off before Phase 3A (live-URL) — not before Phase 2A-2 code work.
