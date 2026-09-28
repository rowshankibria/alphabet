# Fix 4 — Blank rows after each group (query string LINE)

**Rule:** `LINE` = number of blank rows (0 to 10) added **at the end of every group**, including a group that has only its heading, **except the last group when it has no data rows**. `LINE=0` (the default) changes nothing.

## 1. How it works

- A **group** starts at a blue heading row (JobClass = 0 and MoveFGColor = 8, e.g. *De-load – Restore*, *Dead moves*, *Test*). This is the same test as `feedercard.js` line 976 and `txtHeadingMain`.
- A group ends just before the next heading. The last group ends at the end of the card, and gets blank rows only if it has at least one data row.
- A **data row** is every row that isn't a blue heading, including gray note rows like *TO FOD: Check for common locations…*.
- Rows above the first heading (if any) count as a group.
- The `.trdx` can't loop, so C# inserts the blank rows into the job list, and the `.trdx` draws them as empty grid rows.

Example with `LINE=2` (2W61):

| Group | Data rows | Blank rows added |
|---|---|---|
| De-load – Restore | 4 | 2 |
| De-energize – Energize | 1 | 2 |
| Dead moves | 1 | 2 |
| Locate fault | 0 | **2** |
| Identify | 4 | 2 |
| Out to work – Back from work | 1 | 2 |
| Test | 1 | 2 |
| PFS (last group) | 0 | **0** (last group with no data) |

## 2. Steps

### Step 1 — `FmsJob`: add one property
```csharp
public bool IsBlankRow { get; set; }   // set only by GroupSpacer; not a database column
```
Dapper ignores it when loading, so `LoadJobs` doesn't change.

### Step 2 — New file `Engine/Colors/GroupSpacer.cs`
```csharp
using System.Collections.Generic;
using FMS_PDFReportService.Models.Jobs;

namespace FMS_PDFReportService.Engine.Colors
{
    // Adds LINE blank rows at the end of every group, including a group that has only its heading,
    // EXCEPT the last group when it has no data rows (e.g. a final "PFS" heading on its own).
    // A group starts at a step heading row (the blue row: JobClass = 0 AND MoveFGColor = 8,
    // same test as feedercard.js card_IsStepHeading line 976 and txtHeadingMain Visible).
    // Every other row (including gray note rows) is a data row.
    // Rows above the first heading (if any) also form a group.
    public static class GroupSpacer
    {
        public const int MaxLines = 10;

        public static List<FmsJob> AddBlankRows(IEnumerable<FmsJob> jobs, int lines)
        {
            if (lines < 0) lines = 0;
            if (lines > MaxLines) lines = MaxLines;

            var result = new List<FmsJob>();
            bool lastGroupHasData = false;

            foreach (var j in jobs)
            {
                if (IsStepHeading(j))
                {
                    // A new heading closes the previous group (if there is one)
                    if (result.Count > 0) AddBlanks(result, lines);
                    lastGroupHasData = false;
                }
                else
                {
                    lastGroupHasData = true;
                }
                result.Add(j);
            }

            // Close the last group only if it has at least one data row
            if (lastGroupHasData) AddBlanks(result, lines);

            return result;
        }

        private static bool IsStepHeading(FmsJob j)
        {
            int? jobClass = j.JobClass;
            int? fg = j.MoveFGColor;
            return jobClass == 0 && fg == 8;
        }

        private static void AddBlanks(List<FmsJob> list, int lines)
        {
            for (int i = 0; i < lines; i++)
                list.Add(new FmsJob { IsBlankRow = true });
        }
    }
}
```

### Step 3 — Read `LINE` into your request object
`LINE` already exists in the query string. Map it to your `ReportRequest` the same way as `ARCH` and `TYPE`. Below it is called `request.Line`; use your real property name. `GroupSpacer` clamps it to 0–10, so a bad value (e.g. `99`, `-3`) can't break the layout.

### Step 4 — `ComposeCard`: add one line, **last**
```csharp
            var jobs = _repo.LoadJobs(cardId, request.ArchiveFlag).ToList();
            if (request.ArchiveFlag == 0)
                FmsColorCalculator.Apply(jobs, _repo.LoadFmsColorInputs(cardId));
            PhaseCheckRules.Apply(jobs, _repo.LoadOpenPhaseChecks(cardId));
            jobs = GroupSpacer.AddBlankRows(jobs, request.Line);   // NEW – keep it after the colour rules
```
It must come after the colour rules so they never run on blank rows.

### Step 5 — `.trdx` (already done in the delivered `FeederCard.trdx`)
Only the **Visible** bindings in the detail section change:

| Text box(es) | Old Visible | New Visible |
|---|---|---|
| `txtHeadingMain` | `= Fields.JobClass = 0 AND Fields.MoveFGColor = 8` | `… AND Not Fields.IsBlankRow` |
| `txtHeadingNote` | `= Fields.JobClass = 0 AND Fields.MoveFGColor <> 8` | `… AND Not Fields.IsBlankRow` |
| The 13 data cells (`txtTOOp` … `txtRSComplete`) | `= Fields.JobClass <> 0` | `= Fields.JobClass <> 0 Or Fields.IsBlankRow` |

A blank row therefore draws the 13 normal cells with borders, all empty and white, at the normal row height (0.34 in).

Deploy the C# (Steps 1–4) first. Without `IsBlankRow` on `FmsJob`, every detail row shows an error.

## 3. Test
1. **`LINE=0`:** the report is identical to before.
2. **`LINE=2` on 2W61:** 2 blank rows after every group, as in the table above, including after *Locate fault*, but **none after the final *PFS*** heading.
3. **`LINE=10` and `LINE=15`:** both give 10 blank rows per group.

## 4. Checked
- **C#:** 12 tests pass (the 2W61 layout: blanks after 7 groups incl. the empty *Locate fault*, none after the empty last *PFS*; last group with data; last group with only a note row; LINE 0; clamping 99 → 10 and −3 → 0; rows before the first heading; headings only; a single heading; data with no headings; an empty card; no real row lost or duplicated). It compiles with `JobClass`/`MoveFGColor` as `int` or `int?`.
- **`.trdx`:** checked by script. A heading row shows only the heading box, a note row only the note box, and data and blank rows show the 13 cells. Everything outside the detail section is unchanged, and Fixes 1–3 are still in place.

## 5. One assumption to confirm
Blank rows have **null** dates, so they print empty. That relies on `FmsJob` dates being nullable (`DateTime?`). Your PDFs print pending dates as blank, which points that way. If they were non-nullable, blank rows would print `01/01 00:00`; tell me and I'll blank them in the `.trdx` as well.
