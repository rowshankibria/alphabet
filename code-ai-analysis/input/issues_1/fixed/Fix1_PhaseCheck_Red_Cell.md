# Fix 1 — Red / Pale-Red cell next to the Move column (Phase Check)

**Benchmark:** `1B51-dos.pdf`, page 1: rows **AJ, AS, BB, BC** have a **red** cell next to Move.
**Our report:** `1B51-rpt.pdf`: no red anywhere.

## 1. Cause

The `.trdx` coloured this cell from **`Fields.MoveBGColor`**. That is the wrong field.

| Source | What it says |
|---|---|
| `feedercard.js` 876–883 | Cell is red when `kPhaseCheckColor == kdb_CC_RED`, pale red when `== kdb_CC_PALE_RED` |
| `database.js` 166, 188 | `kdb_CC_RED = 6`, `kdb_CC_PALE_RED = 26` |
| `fms.css` 237–249 | `.PhaseCheck` = background **red**; `.AltPhaseCheck` = background **pink** |
| `ca.dmt` 104378–104501 (`LoadPhaseCheckMoves`) | **Calculates** `PhaseCheckColor` from table **`FMS_PhaseCheck`**. It is not a database column of the job. |
| `Constant.vb` 675, 677, 1106, 1128, 1137 | `StepHeading_Deload = 100`, `StepHeading_ISO = 150`, `CC_RED = 6`, `CC_PALE_RED = 26`, `CC_PALE_GRAY = 35` |

`MoveBGColor` (`SOA_Job.MoveBGColor`) is a different value, so the red rule never fired. `FmsJob` has no `PhaseCheckColor`, and a Telerik expression can't read `FMS_PhaseCheck`, so it must be calculated in C# after `LoadJobs`, the same way as the timestamp colours.

## 2. The logic (`ca.dmt` 104408–104498)

1. Read every **open** phase check (`FMS_PhaseCheck.CompletionTime IS NULL`) for this card, plus its step-down and portion cards.
2. **RED list** = every `PhaseCheckEquip`.
3. **PALE RED list** = `PhaseCheckEquip` **and** `SatisfyEquip`, only when they differ (the phase check has an alternate).
4. For each move:

| Order | Condition | PhaseCheckColor | Cell |
|---|---|---|---|
| 1 | default | 0 | normal |
| 2 | StepPair is **100 (De-load)** or **150 (ISO)** **and** RSComplete **IS NULL** **and** Equip is in RED list | 6 | red |
| 3 | same, and Equip is in PALE RED list (overrides 2) | 26 | pale red |
| 4 | ActivityIdentifier = `N` (overrides all) | 35 | normal in the PDF (see Fix 2) |

**Checked against 1B51-dos:** AJ, AS, BB, BC = Phase Check under *De-load*, Restore Complete blank → red. O, V, X, BD, BL, YW = Restore Complete filled → not red. VS-2503 again on page 3 is under *Identify* → not red.

## 3. Steps

### Step 1 — `FmsJob`: add one property
```csharp
public int PhaseCheckColor { get; set; }
```

### Step 2 — `query.cs` (`FMSQueries`): add
```csharp
        // ca.dmt LoadPhaseCheckMoves 104408-104433
        public const string LoadOpenPhaseChecks = @"
            SELECT PhaseCheckEquip, SatisfyEquip
            FROM   FMS_PhaseCheck
            WHERE  Card = ? AND
                   CompletionTime IS NULL
            UNION
            SELECT P.PhaseCheckEquip, P.SatisfyEquip
            FROM   FMS_PhaseCheck P,
                   FMS_StepDownLink L
            WHERE ((L.Card = ? AND L.StepDownCard = P.Card) OR
                   (L.StepDownCard = ? AND L.Card = P.Card)) AND
                   P.CompletionTime IS NULL
            UNION
            SELECT P.PhaseCheckEquip, P.SatisfyEquip
            FROM   FMS_PhaseCheck P,
                   FMS_PortionLink L
            WHERE ((L.Card = ? AND L.PortionCard = P.Card) OR
                   (L.PortionCard = ? AND L.Card = P.Card)) AND
                   P.CompletionTime IS NULL";
```

### Step 3 — `IFMSCardRepository`: add
```csharp
IEnumerable<PhaseCheckEquipRow> LoadOpenPhaseChecks(int cardId);
```

### Step 4 — `FMSCardRepository` (`repository.cs`): add
```csharp
        public IEnumerable<PhaseCheckEquipRow> LoadOpenPhaseChecks(int cardId)
        {
            using (var conn = _connectionFactory.GetConnection())
            {
                return conn.Query<PhaseCheckEquipRow>(FMSQueries.LoadOpenPhaseChecks,
                    new { p1 = cardId, p2 = cardId, p3 = cardId, p4 = cardId, p5 = cardId }).ToList();
            }
        }
```
Add `using FMS_PDFReportService.Engine.Colors;` at the top of the repository and interface files (if not already there).

### Step 5 — New file `Engine/Colors/PhaseCheckRules.cs`
```csharp
using System.Collections.Generic;
using System.Linq;
using FMS_PDFReportService.Models.Jobs;

namespace FMS_PDFReportService.Engine.Colors
{
    // One row of FMS_PhaseCheck that is not completed yet (CompletionTime IS NULL)
    public class PhaseCheckEquipRow
    {
        public int? PhaseCheckEquip { get; set; }
        public int? SatisfyEquip { get; set; }
    }

    // Port of ca.dmt METHOD LoadPhaseCheckMoves (Job_ASE), lines 104378-104501.
    // Sets FmsJob.PhaseCheckColor, which fcardjs.txt (lines 876-883) uses to colour the
    // column next to Move:  6 = RED (PhaseCheck),  26 = PALE RED (AltPhaseCheck).
    public static class PhaseCheckRules
    {
        public const int StepHeading_Deload = 100;   // Constant.vb:675  StepHeading$Deload
        public const int StepHeading_ISO    = 150;   // Constant.vb:677  StepHeading$Iso
        public const int CC_RED             = 6;     // Constant.vb:1106
        public const int CC_PALE_RED        = 26;    // Constant.vb:1128
        public const int CC_PALE_GRAY       = 35;    // Constant.vb:1137
        public const int CardNormalColor    = 0;     // "normal" = no phase-check colour

        public static void Apply(IEnumerable<FmsJob> jobs, IEnumerable<PhaseCheckEquipRow> openPhaseChecks)
        {
            // 104408-104450: build the two equipment lists
            var red = new HashSet<int>();      // PhaseCheckEquip of every open phase check
            var paleRed = new HashSet<int>();  // both equipments, only when SatisfyEquip differs (has an alternate)
            foreach (var r in openPhaseChecks)
            {
                if (r.PhaseCheckEquip == null) continue;
                red.Add(r.PhaseCheckEquip.Value);
                if (r.SatisfyEquip != null && r.SatisfyEquip.Value != r.PhaseCheckEquip.Value)
                {
                    paleRed.Add(r.SatisfyEquip.Value);
                    paleRed.Add(r.PhaseCheckEquip.Value);
                }
            }

            // 104456-104498
            foreach (var j in jobs)
            {
                int? stepPair = j.StepPair;
                int? equip = j.Equip;
                j.PhaseCheckColor = CardNormalColor;

                if (stepPair == StepHeading_Deload || stepPair == StepHeading_ISO)
                {
                    bool rsCompleteNull = FmsColorCalculator.IsNull(j.RSComplete);   // OpenROAD: RSComplete IS NULL
                    if (equip != null && rsCompleteNull)
                    {
                        if (red.Contains(equip.Value))     j.PhaseCheckColor = CC_RED;       // first round
                        if (paleRed.Contains(equip.Value)) j.PhaseCheckColor = CC_PALE_RED;  // second round wins
                    }
                }

                if (j.ActivityIdentifier == "N")          // 104493-104495
                    j.PhaseCheckColor = CC_PALE_GRAY;
            }
        }
    }
}
```

### Step 6 — `ComposeCard`: add one line after the timestamp colours
```csharp
            var jobs = _repo.LoadJobs(cardId, request.ArchiveFlag).ToList();
            if (request.ArchiveFlag == 0)
                FmsColorCalculator.Apply(jobs, _repo.LoadFmsColorInputs(cardId));
            PhaseCheckRules.Apply(jobs, _repo.LoadOpenPhaseChecks(cardId));   // NEW
```

### Step 7 — `.trdx` (already done in the delivered `FeederCard.trdx`)
`txtAct` now uses `Fields.PhaseCheckColor` instead of `Fields.MoveBGColor` (lines 369, 377, 378):

| Line | Property | New expression |
|---|---|---|
| 369 | Value | `= IIf(Fields.PhaseCheckColor = 6 Or Fields.PhaseCheckColor = 26, Fields.ActivityIdentifier, IIf(Fields.ActivityIdentifier = "S" And Parameters.ArchFlag.Value <> 0, "", Fields.ActivityIdentifier))` |
| 377 | Style.BackgroundColor | `= IIf(Fields.PhaseCheckColor = 6, Parameters.PhaseCheckBg.Value, IIf(Fields.PhaseCheckColor = 26, Parameters.AltPhaseCheckBg.Value, Parameters.JobBg.Value))` |
| 378 | Style.Color | `= IIf(Fields.PhaseCheckColor = 6, Parameters.PhaseCheckFg.Value, IIf(Fields.PhaseCheckColor = 26, Parameters.AltPhaseCheckFg.Value, Parameters.JobFg.Value))` |

**Do Steps 1–6 before deploying the `.trdx`.** Without the `PhaseCheckColor` property the report shows an error in this column.

## 4. Test
Generate **1B51**. Page 1: AJ, AS, BB (showing `T`), BC must be red `#ff0000`; O, V, X, BD must be white.

## 5. Checked
- Compiles with `Equip`/`StepPair` as `int` or `int?` and dates as `DateTime` or `DateTime?`.
- 12 tests pass: the 1B51 rows above, ISO step, restore complete, restore `''`, other headings, both pale-red cases, N moves, no open phase checks.

## 6. Open items
1. **Archived cards.** The legacy method has no archive branch, so Step 6 runs for every card. Compare one **closed** card with its DOS PDF.
2. **Pale red colour.** No pale-red cell appears in the benchmarks. `AltPhaseCheckBg` stays `#ffc0c0` (your original report). The web CSS uses `pink` (#ffc0cb). Confirm on a card that has a phase check **with an alternate**.
3. **`SatisfyEquip` NULL** is treated as "no alternate". OpenROAD's behaviour for a NULL there isn't visible in the file.
4. **`CardNormalColor`** (the default) is set to 0. The only thing that matters is that it isn't 6 or 26.
