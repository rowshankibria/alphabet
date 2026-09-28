# Feeder Card Colors: A Developer's Walkthrough

**Who this is for:** a .NET developer who has never seen this project.
**What you'll be able to do:** explain why any cell on the feeder card PDF has its color, and build the color logic yourself.

| Part | What it gives you | Time |
|---|---|---|
| [Part 1: The story](#part-1-the-story) | Why the colors work the way they do, told by following real rows | 10 minutes |
| [Part 2: Build it](#part-2-build-it) | 8 tasks in order, each with a "done when" check | about 1 day |
| [Part 3: Rule book](#part-3-rule-book) | Every rule on one page, for looking things up later | — |
| [Appendix: Code](#appendix-code-copy-paste) | Every C# file, ready to copy | — |

---

# Part 1: The story

## 1.1 What we're building

The feeder card PDF is a table. Each row is one **move** (one step on the card). Some cells are colored, so an operator can see the state at a glance:

```
 Take Out                                                                               Restore
┌────┬─────────────┬─────────────┬────┬──────┬───────┬───┬──────────────────────┬───┬──────────┬────┬───────────┬─────────────┐
│ Op │ Issued      │ Complete    │ ID │ Type │ Equip │ G │ Move                 │   │ Response │ Op │ Issued    │ Complete    │
├────┼─────────────┼─────────────┼────┼──────┼───────┼───┼──────────────────────┼───┼──────────┼────┼───────────┼─────────────┤
│    │ 07/05 06:06 │             │ .. │ ...  │ ...   │   │ To FCR: MAKE FAULT … │   │          │    │           │             │
│    │  ▲ green    │             │    │      │       │ ▲ │  ▲ red/green text    │ ▲ │          │    │  ▲        │  ▲          │
└────┴─────────────┴─────────────┴────┴──────┴───────┴───┴──────────────────────┴───┴──────────┴────┴───────────┴─────────────┘
```

**Only 7 cells on a row can change color:**

| Cell | What its color tells the operator |
|---|---|
| The **4 date cells** (TO Issued, TO Complete, RS Issued, RS Complete) | The status of the order or permit behind that step (acknowledged, overdue, not used…) |
| **G** and **Move** | Grounded move (red text), dead move or switching move (green text) |
| **Origin cell** (the small cell right of Move) | An open **phase check** on that equipment (red / pale red) |

Every other cell is always white with black text.

## 1.2 The one idea: C# picks a number, the report picks the color

Two programs share the work:

```
 DATABASE ──────► C#  ─────────────────────► .trdx report ────────────────► PDF
                  "this cell is code 27"     "code 27 = FmsPaleGreen
                                              = #90ee90"
```

- **C# decides the meaning.** It writes a number on the row, for example `TOIssuedBG = 27`, which means "acknowledged". C# does this part because the rules need other tables (permits, orders, alerts), and a Telerik expression can't query a database.
- **The report decides the look.** It maps 27 to a **report parameter** called `FmsPaleGreen`, whose value is `#90ee90`. The report does this part because support must be able to change a color in the Telerik designer without a C# release.

> **Rule you must never break:** no hex color in C#, and no hex color typed into a report expression. A hex color lives in exactly one place: a report parameter.

The numbers are the old OpenROAD color codes, kept so the logic can be checked line by line against the legacy source (`ca.dmt`):

| Code | Meaning | Color by default |
|---|---|---|
| 0 | nothing special | white (`JobBg`) |
| 1 | black text | black |
| 6 | red | red |
| 9 | yellow | yellow |
| 22 | light brown | tan |
| 26 | pale red | pink |
| 27 | pale green | green |
| 35 | pale gray | gray |

## 1.3 Story 1: why is this date cell green?

Row **"To FCR: MAKE FAULT REPAIRS"**, TO Issued `07/05 06:06`.

**Step 1: the database gives us the row.** `LoadJobs` returns an `FmsJob` with:

```
TOOperator = 10002        ← who the step was issued to (10002 = FCR, the field crew)
TOIssued   = 07/05 06:06
RSComplete = null
TOIssuedBG = 0            ← not decided yet
```

**Step 2: C# asks three questions** (`FmsColorCalculator`):

1. *Who was it issued to?* 10002, the FCR, so the answer depends on the **work permit**.
2. *What is the permit status?* It's 20, **Acknowledged**.
3. *Is there an overdue timer alert on it?* No.

"Acknowledged, no alert" means pale green, so C# sets `TOIssuedBG = 27` and `TOIssuedFG = 1` (black text).

**Step 3: the report turns 27 into a color.** The report expression is a long `IIf(...)` chain. In C# it reads:

```csharp
// txtTOIssued background (FeederCard.trdx line 293), written as C#
if (row.ActivityIdentifier == "N" || Format(row.TOIssued) == "12/31 23:59") bg = GrayOutBg;
else if (row.TOIssuedBG == 27) bg = FmsPaleGreen;     // ← our row stops here: #90ee90
else if (row.TOIssuedBG == 6)  bg = FmsRed;
else if (row.TOIssuedBG == 9)  bg = FmsYellow;
else if (row.TOIssuedBG == 26) bg = FmsPaleRed;
else if (row.TOIssuedBG == 22) bg = FmsLightBrown;
else if (row.TOIssuedBG == 35) bg = FmsPaleGray;
else if (row.TOIssuedBG == 1)  bg = FmsBlack;
else                           bg = JobBg;            // white
```

The text color works the same way, using `TOIssuedFG`, `GrayOutFg` and `JobFg`. The other 3 date cells are identical, each with its own field.

**Lesson:** a date cell's color = C#'s number, translated by the report.

## 1.4 Story 2: the two kinds of "empty". This is the #1 trap.

Two date cells can both look empty and still mean opposite things:

| In the database (Ingres) | Arrives in C# as | Meaning | The cell shows |
|---|---|---|---|
| `NULL` | `null` | The step **hasn't happened yet** | **white**, empty |
| `''` (empty string) | a date at **12/31 23:59** | This step **isn't used** on this move | **gray**, empty |

So the code never asks "is it empty?". It asks one of three questions:

```csharp
FmsColorCalculator.IsNull(d)    // null            → not done yet
FmsColorCalculator.IsBlank(d)   // 12/31 23:59     → not used
FmsColorCalculator.HasValue(d)  // a real date    → done
```

The report checks for `"12/31 23:59"` too: it greys the cell and prints nothing in it.

**Lesson:** if you ever write `d == null` for a date, you've probably merged the two meanings. Use the three helpers.

## 1.5 Story 3: an `N` row (2W61, "Check Elbows Dead")

Some rows have `ActivityIdentifier = "N"` (the letter shown in the origin cell). On the benchmark PDF:

- its **4 date cells are gray**, even with dates in them (`06/03 15:48` on gray);
- its **origin cell shows `N` on white**.

How the code does it:

- **Date cells:** the report checks `ActivityIdentifier == "N"` **first**, before any code, so it's always `GrayOutBg`.
- **Origin cell:** only red phase checks color it. `N` isn't one, so it's white.

> The **web screen** shows the `N` origin cell gray. The PDF follows the **DOS PDF** benchmark, which shows it white. Don't "fix" this to match the screen.

## 1.6 Story 4: a red origin cell (1B51, rows AJ, AS, BB, BC)

A **phase check** is recorded in `FMS_PhaseCheck` against a piece of equipment. While it's open (not completed), the legacy system marks that equipment's move with a **red** origin cell, and the PDF must do the same.

`PhaseCheckRules` (C#) does this in four steps:

1. Load the **open** phase checks (`FMS_PhaseCheck.CompletionTime IS NULL`) for this card and its linked cards.
2. For each row, the cell is red only if all three are true:
   - the move is under the **De-load** (100) or **ISO** (150) heading,
   - **RS Complete is NULL** (not restored yet),
   - the row's equipment is in an open phase check.
3. If that phase check has an **alternate** equipment, the cell is **pale red** instead.
4. It writes the answer as `PhaseCheckColor` (6 = red, 26 = pale red).

The report then colors the cell:

```csharp
// txtAct background (line 377), written as C#
if (row.PhaseCheckColor == 6)       bg = PhaseCheckBg;     // #ff0000
else if (row.PhaseCheckColor == 26) bg = AltPhaseCheckBg;  // #ffc0c0
else                                bg = JobBg;            // white, including N
```

On 1B51, AJ, AS, BB and BC are under De-load with RS Complete empty, so they're red. O, V, X and BD have RS Complete filled, so they're white.

## 1.7 Story 5: the G and Move cells (no C# needed)

These use only database fields, so the report decides everything:

```csharp
// "Grounded" = Grounds > 0 AND GroundOn is a real date (not null, not 12/31 23:59)

// txtMove text color (line 366)
if (row.MoveType == "Dead")      fg = DeadMoveFg;   // green
else if (grounded)               fg = GroundFg;     // red
else if (row.MoveCategory == 2)  fg = SwitchingFg;  // green
else                             fg = JobFg;        // black

// txtG text color (line 354)
fg = (row.MoveType != "Dead" && grounded) ? GroundFg : JobFg;
```

The backgrounds use `DeadMoveBg` (dead), `GroundBg` (grounded) or `JobBg` (everything else; there's no switching branch for the background). All three are white by default, so in practice only the text color changes.

## 1.8 Story 6: blank rows (query string `LINE`)

`LINE=2` asks for 2 empty rows at the end of each group (a group = a blue step heading plus its moves). A report can't loop, so **C# adds the rows**: `GroupSpacer` inserts `new FmsJob { IsBlankRow = true }`.

A new `FmsJob` has every code 0, no dates and no `ActivityIdentifier`, so every color rule above falls through to **white**. There's no special color logic for blank rows. It works because of the defaults.

The only exception: the **last** group gets no blank rows when it has no moves (for example a final "PFS" heading on its own).

## 1.9 Putting it together: 4 lines, order matters

All of this happens in `FMSGrouper.ComposeCard`:

```csharp
var jobs = _repo.LoadJobs(cardId, request.ArchiveFlag).ToList();          // 1. rows from the DB
if (request.ArchiveFlag == 0)
    FmsColorCalculator.Apply(jobs, _repo.LoadFmsColorInputs(cardId));     // 2. date-cell codes (live cards only)
PhaseCheckRules.Apply(jobs, _repo.LoadOpenPhaseChecks(cardId));           // 3. origin-cell code
jobs = GroupSpacer.AddBlankRows(jobs, request.Line);                      // 4. blank rows, ALWAYS LAST
```

**Why this order:**
- Steps 2 and 3 need real rows from step 1.
- Step 4 is last so the color rules never see blank rows.
- Step 2 is skipped for **archived** cards: the legacy system only calculated these colors for live cards.

You now know the whole design. Part 2 builds it.

---

# Part 2: Build it

Do the tasks in order. Build after each one. **Don't start the next task until "Done when" is true.**

### Task 1: Add 10 properties to `FmsJob`

In `FMS_PDFReportService.Models.Jobs.FmsJob`, add the properties from [Appendix A1](#a1-fmsjob-new-properties). They're filled by C#, not by SQL, so `LoadJobs` doesn't change.

**Done when:** the solution builds.
**Why it matters:** the report reads these names. A missing or renamed property makes the PDF show an error in that cell.

### Task 2: Add the 3 rule files

Create the folder `Engine/Colors/` and add:

| File | Code | What it does |
|---|---|---|
| `FmsColors.cs` | [A2](#a2-enginecolorsfmscolorscs) | Date-cell codes (Stories 1 and 2) |
| `PhaseCheckRules.cs` | [A3](#a3-enginecolorsphasecheckrulescs) | Origin-cell code (Story 4) |
| `GroupSpacer.cs` | [A4](#a4-enginecolorsgroupspacercs) | Blank rows (Story 6) |

**Done when:** the solution builds.
**Watch out:** `FmsColors.cs` assumes `TOOperator` and `RSOperator` are **strings**. If they're `int` in your `FmsJob`, replace `ToInt(j.TOOperator)` with `j.TOOperator`, and do the same for `RSOperator`.

### Task 3: Add the SQL queries

Add the queries in [A5](#a5-queries-fmsqueries) to `FMSQueries` (`query.cs`).

**Done when:** it builds.
**Watch out:** the queries use ODBC `?` placeholders, so the parameters are matched **by position** (`p1`, `p2`, …), not by name.

### Task 4: Add the repository methods

Add the two interface lines and the two methods in [A6](#a6-repository), then add `using FMS_PDFReportService.Engine.Colors;` to the repository file and the interface file.

**Done when:** it builds.
**Watch out:** if the Data project can't see `Engine.Colors` (a circular project reference), move the small row classes (`FodMoveRow`, `PermitRow`, `PhaseCheckEquipRow`, …) to the Models project. The compiler will tell you when this is needed.

### Task 5: Read `LINE` from the query string

`LINE` already exists in the query string. Map it to your request object the same way as `ARCH`. This guide calls it `request.Line`; use your real property name. Don't validate it: `GroupSpacer` already clamps it to 0–10.

**Done when:** `request.Line` has the value from the URL (check in the debugger).

### Task 6: Wire it up in `ComposeCard`

Replace the `var jobs = ...` line with the 4 lines from [section 1.9](#19-putting-it-together-4-lines-order-matters), in the same order.

**Done when:** it builds, and a card renders with no errors.

### Task 7: Deploy the report

1. **Back up** the current live `FeederCard.trdx`.
2. Copy the new `FeederCard.trdx` into place. It already contains every expression and parameter; you don't edit it.
3. Refresh the ObjectDataSource in the designer if it doesn't see the new properties.

**Done when:** the designer opens the file with no errors.

### Task 8: Test against the benchmark PDFs

Test in a **test environment** first. Compare with the DOS PDFs.

| # | Card / setting | Check | Expected |
|---|---|---|---|
| 1 | 1B51, `LINE=0` | Origin cell on rows AJ, AS, BB, BC | **Red** |
| 2 | 1B51 | Origin cell on rows O, V, X, BD | White |
| 3 | 1B51 and 2W61 | Both **Op** columns | Empty on every row |
| 4 | 2W61 | `N` rows: origin cell | **White**, shows `N` |
| 5 | 2W61 | `N` rows: 4 date cells | **Gray** |
| 6 | 52N | "To FCR: MAKE FAULT REPAIRS", TO Issued | **Green** `#90ee90` |
| 7 | 2W61, `LINE=2` | Rows after each group | 2 blank white rows, including after "Locate fault"; **none** after the final "PFS" |
| 8 | Any, `LINE=15` | Rows after each group | 10 (clamped) |
| 9 | Any archived card | Whole card | Renders; date cells white except the gray ones |
| 10 | Every page | Any cell | No error text |

**Done when:** all 10 rows match. If one doesn't, use the [troubleshooting table](#34-why-is-this-cell-this-color).

---

# Part 3: Rule book

You don't need to memorize this. It's here to look up while you test or debug.

## 3.1 Date cells: the C# steps (`FmsColorCalculator`, live cards only)

The steps run top to bottom for each row, and **a later step overwrites an earlier one.**

| Step | Applies when | Sets |
|---|---|---|
| 1 | Always | Text = 1 (black), background = 0 (white) |
| 2 | Move is on an **FOD order** | The step's cell = **Alert pick** |
| 3 | Unreviewed FOD fault, TO issued, TO Complete NULL | TO Issued text = 35 (dim) |
| 4 | `TOOperator = 10001` (operating order) | See 3.2 |
| 5 | `RSOperator = 10001` (operating order) | See 3.2 |
| 6 | A date is `''` (12/31 23:59) | That cell's background = 35 |
| 7 | `ActivityIdentifier = "N"` | All 4 backgrounds = 35 |
| 8 | TO Issued not NULL, `TOOperator = 10002` (FCR), a permit exists | TO Issued (permit still out) or RS Complete (permit returned, status 50) = **Alert pick** |
| 9 | Process automation, not issued yet | TO Issued or RS Issued background = 22 (light brown) |

**Alert pick** (the first matching line wins):

| Condition | Background | Text |
|---|---|---|
| Timer alert **overdue** (`AlertTime` before now) | 6 red | black |
| Timer alert, `InitialAlert = 0` | 9 yellow | black |
| Order / permit **Acknowledged** (20) | 27 **green** | black |
| FCR permit **Initialized** (0) and RS Complete NULL | 26 pale red | black |
| Anything else | 0 white | 35 dim gray |

## 3.2 Operating order (steps 4 and 5)

| Situation | Result |
|---|---|
| No order row at all, and that side isn't complete | Issued **text red** (6), meaning the order is missing |
| Active order (status 10/15/20/50) | **Alert pick** on the cell for the current stage: Issued while in progress, Complete once done |
| Order rows exist but none active | No change |

## 3.3 All color parameters (bottom of `FeederCard.trdx`)

**To change a color:** in the Telerik designer, open **Report Parameters**, change the value, and save. No C# change is needed.

| Parameter | Default | Where |
|---|---|---|
| `JobBg` / `JobFg` | `#ffffff` / `#000000` | Fallback for every cell |
| `GrayOutBg` / `GrayOutFg` | `#808080` / `#000000` | Date cell not used, or `N` row |
| `FmsPaleGreen` | `#90ee90` | Date code 27 |
| `FmsRed` | `#ff0000` | Date code 6 |
| `FmsYellow` | `#ffff00` | Date code 9 |
| `FmsPaleRed` | `#ffb6c1` | Date code 26 |
| `FmsLightBrown` | `#d2b48c` | Date code 22 |
| `FmsPaleGray` | `#a9a9a9` | Date code 35 (in practice only as text) |
| `FmsBlack` | `#000000` | Date code 1 (text only) |
| `PhaseCheckBg` / `PhaseCheckFg` | `#ff0000` / `#000000` | Origin cell, code 6 |
| `AltPhaseCheckBg` / `AltPhaseCheckFg` | `#ffc0c0` / `#000000` | Origin cell, code 26 |
| `StepHeadBg` / `StepHeadFg` | `#ffffff` / `#000080` | Blue step heading row |
| `DeadMoveBg` / `DeadMoveFg` | `#ffffff` / `#008000` | Dead move (Move cell and header box) |
| `GroundBg` / `GroundFg` | `#ffffff` / `#ff0000` | Grounded (G, Move and header boxes) |
| `SwitchingFg` | `#008000` | Switching move text |
| `TakeOutBg` / `TakeOutFg` | `#ffffff` / `#008000` | Header "Taken Out" box only |

Two pale reds on purpose: `FmsPaleRed` is for date cells, and `AltPhaseCheckBg` is for the origin cell.

## 3.4 Why is this cell this color?

| You see | In | Because | Story / rule |
|---|---|---|---|
| Gray, empty | Date | Date is `''` (not used) | 1.4 |
| Gray, with a date | Date | `N` row | 1.5 |
| White, empty | Date | Date is NULL (not done yet), or a blank row | 1.4, 1.8 |
| Green | Date | Acknowledged, no alert | 1.3 |
| Red background | Date | Timer alert overdue | 3.1 |
| Yellow | Date | Timer alert, initial alert pending | 3.1 |
| Pink | TO Issued | FCR permit Initialized | 3.1 step 8 |
| Tan | Issued | Process automation | 3.1 step 9 |
| Red text | Issued | Operating order missing | 3.2 |
| Dim gray text | Date | Found, not acknowledged; or unreviewed fault | 3.1 |
| No date colors at all | Date | Archived card (C# step skipped) | 1.9 |
| Red / pale red | Origin | Open phase check | 1.6 |
| Green text | Move | Dead or switching move | 1.7 |
| Red text | G / Move | Grounded | 1.7 |
| **Error text** | Any | A property is missing or misspelled on `FmsJob` | Task 1 |

## 3.5 The 7 mistakes a new developer makes

1. **Treating NULL and `''` dates the same.** Use `IsNull` / `IsBlank` / `HasValue` (Story 2).
2. **Moving `GroupSpacer` earlier.** It must be last (1.9).
3. **Putting a hex color in C#**, or typing one into a report expression. Use a parameter.
4. **"Fixing" the `N` origin cell to gray** to match the web screen. The benchmark is the DOS PDF (1.5).
5. **Showing the operator number in the Op columns.** They're blank on the DOS PDF; the value is an internal ID.
6. **Renaming an `FmsJob` property.** The report reads the names, so the cell shows an error.
7. **Removing the `ArchiveFlag == 0` check** without confirming that archived cards should have date colors.

## 3.6 Known limits

| Item | Detail |
|---|---|
| A real event at exactly 12/31 23:59 | Shown as "not used" (gray). This is the same test the old report used. |
| Several alerts or active orders for one move | C# uses the first row. |
| Pale red shades | Not in any benchmark PDF yet; confirm them on a real card. |
| TV Bogey (reverse-video card class box) | Not implemented. |
| 33 kV Response color | Not ported, because the web screen never uses it. The Response cell is always white. |

## 3.7 Where the rules came from (for reviewers)

| Rule | Legacy source |
|---|---|
| Date-cell codes | `ca.dmt` `SetFMSColors`, lines 105040–105431 |
| Phase check | `ca.dmt` `LoadPhaseCheckMoves`, 104378–104501; `feedercard.js` 876–883 |
| Step heading test | `feedercard.js` line 976 |
| Constants | `Constant.vb` (line numbers in the code comments) |
| Color codes | `database.js` / `ds.js` |

---

# Appendix: Code (copy-paste)

This is the same code that was compiled and tested (PhaseCheckRules: 12 tests, GroupSpacer: 12 tests).

## A1. `FmsJob`: new properties

```csharp
public int TOIssuedBG   { get; set; }
public int TOIssuedFG   { get; set; }
public int TOCompleteBG { get; set; }
public int TOCompleteFG { get; set; }
public int RSIssuedBG   { get; set; }
public int RSIssuedFG   { get; set; }
public int RSCompleteBG { get; set; }
public int RSCompleteFG { get; set; }
public int PhaseCheckColor { get; set; }
public bool IsBlankRow { get; set; }   // set only by GroupSpacer; not a database column
```

## A2. `Engine/Colors/FmsColors.cs`

```csharp
using System;
using System.Collections.Generic;
using System.Linq;
using FMS_PDFReportService.Models.Jobs;

namespace FMS_PDFReportService.Engine.Colors
{
    // Values from Constant.vb (line numbers in comments). Names follow ca.dmt $-constants.
    public static class FmsConstants
    {
        public const int Order_Opened        = 10;     // Constant.vb:414  Order$Opened
        public const int Order_Downloaded    = 15;     // Constant.vb:413  Order$Downloaded
        public const int Order_Acknowledged  = 20;     // Constant.vb:405  Order$Acknowledged
        public const int Order_Closed        = 50;     // Constant.vb:409  Order$Closed
        public const int Permit_Initialized  = 0;      // Constant.vb:434  Permit$Initialized
        public const int Permit_Issued       = 10;     // Constant.vb:435  Permit$Issued
        public const int Permit_Rejected     = 12;     // Constant.vb:436  Permit$Rejected
        public const int Permit_Downloaded   = 15;     // Constant.vb:433  Permit$Downloaded
        public const int Permit_Acknowledged = 20;     // Constant.vb:432  Permit$Acknowledged
        public const int Permit_Returned     = 50;     // Constant.vb:438  Permit$Returned
        public const int Fault_Received      = 10;     // Constant.vb:119  Fault$Received
        public const int Operator_OpOrder    = 10001;  // Constant.vb:371  Operator$OpOrder
        public const int Operator_FCR        = 10002;  // Constant.vb:366  Operator$FCR
        public const int Job_TakeOutInt      = 0;      // Constant.vb:223  Job$TakeoutInt
        public const int Job_RestoreInt      = 1;      // Constant.vb:221  Job$RestoreInt
        public const int TM_FODOrder         = 10004;  // Constant.vb:707  TM$FODOrder
        public const int BlockStatus_Wait    = 15;     // Constant.vb:43   BlockStatus$Wait

        // OpenROAD color codes (ds.js)
        public const int CC_BLACK        = 1;
        public const int CC_RED          = 6;
        public const int CC_YELLOW       = 9;
        public const int CC_LIGHT_BROWN  = 22;
        public const int CC_PALE_RED     = 26;
        public const int CC_PALE_GREEN   = 27;
        public const int CC_PALE_GRAY    = 35;
    }

    // ---- Rows returned by the new queries ----
    public class FodMoveRow      { public int Job { get; set; } public int TORS { get; set; } public int JobStatus { get; set; } }
    public class FaultMoveRow    { public int Job { get; set; } }
    public class PaMoveRow       { public int Job { get; set; } public int TORS { get; set; } }
    public class OpOrderRow      { public int Job { get; set; } public int TORS { get; set; } public int OrderNumber { get; set; } public int OrderStatus { get; set; } }
    public class PermitRow       { public int WorkPermit { get; set; } public int PermitStatus { get; set; } }
    public class BogeyAlertRow   { public int Type { get; set; } public int Object { get; set; } public int Status { get; set; }
                                   public DateTime? AlertTime { get; set; } public int? InitialAlert { get; set; } }

    public class FmsColorInputs
    {
        public DateTime Now { get; set; }
        public List<FodMoveRow>    FodMoves    { get; set; } = new List<FodMoveRow>();
        public List<FaultMoveRow>  FaultMoves  { get; set; } = new List<FaultMoveRow>();
        public List<PaMoveRow>     PaMoves     { get; set; } = new List<PaMoveRow>();
        public List<OpOrderRow>    OpOrders    { get; set; } = new List<OpOrderRow>();
        public List<PermitRow>     Permits     { get; set; } = new List<PermitRow>();
        public List<BogeyAlertRow> Alerts      { get; set; } = new List<BogeyAlertRow>();
    }

    // Port of ca.dmt METHOD SetFMSColors (lines 105040-105431)
    public static class FmsColorCalculator
    {
        private static readonly int[] ActiveOrderStatuses =
            { FmsConstants.Order_Opened, FmsConstants.Order_Downloaded, FmsConstants.Order_Acknowledged, FmsConstants.Order_Closed };

        private static readonly int[] FcrIssuedStatuses =
            { FmsConstants.Permit_Issued, FmsConstants.Permit_Acknowledged, FmsConstants.Permit_Rejected,
              FmsConstants.Permit_Downloaded, FmsConstants.Permit_Initialized };

        // Ingres keeps two different "no date" values, and the legacy code treats them differently:
        //   NULL -> step not done yet  -> arrives in C# as null                -> cell stays white
        //   ''   -> step not used       -> arrives as the 12/31 23:59 value    -> cell is grayed
        // (OpenROAD "IS NULL" = IsNull,  "= ''" = IsBlank,  "IS NOT NULL AND <> ''" = HasValue)
        public static bool IsNull(DateTime? d)  { return d == null || d.Value == DateTime.MinValue; }   // MinValue = NULL read into a non-nullable DateTime
        public static bool IsBlank(DateTime? d) { return d != null && d.Value.Month == 12 && d.Value.Day == 31 && d.Value.Hour == 23 && d.Value.Minute == 59; }
        public static bool HasValue(DateTime? d) { return !IsNull(d) && !IsBlank(d); }

        private static int ToInt(string s) { int v; return int.TryParse((s ?? "").Trim(), out v) ? v : -1; }

        // ca.dmt 105079-105095 / 105195-105211 / 105288-105304 / 105368-105388
        private static void PickColor(FmsColorInputs inp, int alertType, int alertObject, int alertStatus,
                                      bool acknowledged, bool paleRed, out int bg, out int fg)
        {
            var bt = inp.Alerts.FirstOrDefault(a => a.Type == alertType && a.Object == alertObject && a.Status == alertStatus);
            DateTime? alertTime = bt == null ? null : bt.AlertTime;
            bool hasAlert = HasValue(alertTime);   // OpenROAD: BT.AlertTime <> ''  (NULL and '' both mean no alert)

            if (hasAlert && alertTime.Value < inp.Now)                    { bg = FmsConstants.CC_RED;        fg = FmsConstants.CC_BLACK; }
            else if (hasAlert && bt.InitialAlert == 0)                    { bg = FmsConstants.CC_YELLOW;     fg = FmsConstants.CC_BLACK; }
            else if (acknowledged)                                        { bg = FmsConstants.CC_PALE_GREEN; fg = FmsConstants.CC_BLACK; }
            else if (paleRed)                                             { bg = FmsConstants.CC_PALE_RED;   fg = FmsConstants.CC_BLACK; }
            else                                                          { bg = 0;                          fg = FmsConstants.CC_PALE_GRAY; }
        }

        public static void Apply(IEnumerable<FmsJob> jobs, FmsColorInputs inp)
        {
            var fodMoves = inp.FodMoves.ToList();   // rows are removed as they are used (ca.dmt 105103 etc.)

            foreach (var j in jobs)
            {
                int bg, fg;

                // Defaults (105043-105046)
                j.TOIssuedFG = j.RSIssuedFG = j.TOCompleteFG = j.RSCompleteFG = FmsConstants.CC_BLACK;
                j.TOIssuedBG = j.RSIssuedBG = j.TOCompleteBG = j.RSCompleteBG = 0;

                // FOD order moves (105067-105133), last row first
                for (int m = fodMoves.Count - 1; m >= 0; m--)
                {
                    var f = fodMoves[m];
                    if (f.Job != j.Job) continue;
                    PickColor(inp, FmsConstants.TM_FODOrder, f.Job, f.JobStatus,
                              f.JobStatus == FmsConstants.Order_Acknowledged, false, out bg, out fg);

                    if (f.TORS == FmsConstants.Job_TakeOutInt && HasValue(j.TOIssued) && IsNull(j.TOComplete))
                    { j.TOIssuedFG = fg; j.TOIssuedBG = bg; fodMoves.RemoveAt(m); continue; }
                    if (f.TORS == FmsConstants.Job_TakeOutInt && HasValue(j.TOComplete))
                    { j.TOCompleteFG = fg; j.TOCompleteBG = bg; fodMoves.RemoveAt(m); continue; }
                    if (f.TORS == FmsConstants.Job_RestoreInt && HasValue(j.RSIssued) && IsNull(j.RSComplete))
                    { j.RSIssuedFG = fg; j.RSIssuedBG = bg; fodMoves.RemoveAt(m); continue; }
                    if (f.TORS == FmsConstants.Job_RestoreInt && HasValue(j.RSComplete))
                    { j.RSCompleteFG = fg; j.RSCompleteBG = bg; fodMoves.RemoveAt(m); continue; }
                }

                // Unreviewed FOD fault (105138-105145)
                if (inp.FaultMoves.Any(x => x.Job == j.Job) && HasValue(j.TOIssued) && IsNull(j.TOComplete))
                    j.TOIssuedFG = FmsConstants.CC_PALE_GRAY;

                // Take Out issued to Operating Order (105150-105238)
                if (ToInt(j.TOOperator) == FmsConstants.Operator_OpOrder)
                    ApplyOpOrder(j, inp, FmsConstants.Job_TakeOutInt);

                // Restore issued to Operating Order (105242-105319)
                if (ToInt(j.RSOperator) == FmsConstants.Operator_OpOrder)
                    ApplyOpOrder(j, inp, FmsConstants.Job_RestoreInt);

                // Empty timestamps (105321-105335)
                if (IsBlank(j.TOIssued))   j.TOIssuedBG   = FmsConstants.CC_PALE_GRAY;
                if (IsBlank(j.TOComplete)) j.TOCompleteBG = FmsConstants.CC_PALE_GRAY;
                if (IsBlank(j.RSIssued))   j.RSIssuedBG   = FmsConstants.CC_PALE_GRAY;
                if (IsBlank(j.RSComplete)) j.RSCompleteBG = FmsConstants.CC_PALE_GRAY;

                // ActivityIdentifier = 'N' (105337-105342)
                if (j.ActivityIdentifier == "N")
                    j.TOIssuedBG = j.TOCompleteBG = j.RSIssuedBG = j.RSCompleteBG = FmsConstants.CC_PALE_GRAY;

                // Take Out issued to FCR (105347-105413)
                if (!IsNull(j.TOIssued) && ToInt(j.TOOperator) == FmsConstants.Operator_FCR)
                {
                    var p = inp.Permits.FirstOrDefault(x => x.WorkPermit == j.Job);
                    int permitStatus = p == null ? -1 : p.PermitStatus;
                    if (permitStatus != -1)
                    {
                        PickColor(inp, FmsConstants.Operator_FCR, j.Job, permitStatus,
                                  permitStatus == FmsConstants.Permit_Acknowledged,
                                  permitStatus == FmsConstants.Permit_Initialized && IsNull(j.RSComplete),
                                  out bg, out fg);

                        if (IsNull(j.RSComplete) && HasValue(j.TOIssued) && FcrIssuedStatuses.Contains(permitStatus))
                        { j.TOIssuedBG = bg; j.TOIssuedFG = fg; }
                        else if (permitStatus == FmsConstants.Permit_Returned)
                        { j.RSCompleteFG = fg; j.RSCompleteBG = bg; }
                    }
                }

                // Process Automation (105420-105428)
                foreach (var pa in inp.PaMoves.Where(x => x.Job == j.Job))
                {
                    if (pa.TORS == FmsConstants.Job_TakeOutInt) j.TOIssuedBG = FmsConstants.CC_LIGHT_BROWN;
                    else                                        j.RSIssuedBG = FmsConstants.CC_LIGHT_BROWN;
                }
            }
        }

        private static void ApplyOpOrder(FmsJob j, FmsColorInputs inp, int tors)
        {
            var rows = inp.OpOrders.Where(o => o.Job == j.Job && o.TORS == tors).ToList();
            var active = rows.FirstOrDefault(o => ActiveOrderStatuses.Contains(o.OrderStatus));

            if (active == null)
            {
                // Order not found at all -> red text (105166-105182 / 105259-105275)
                if (rows.Count == 0)
                {
                    if (tors == FmsConstants.Job_TakeOutInt && IsNull(j.TOComplete)) j.TOIssuedFG = FmsConstants.CC_RED;
                    if (tors == FmsConstants.Job_RestoreInt && IsNull(j.RSComplete)) j.RSIssuedFG = FmsConstants.CC_RED;
                }
                return;
            }

            int bg, fg;
            PickColor(inp, FmsConstants.Operator_OpOrder, active.OrderNumber, active.OrderStatus,
                      active.OrderStatus == FmsConstants.Order_Acknowledged, false, out bg, out fg);

            if (tors == FmsConstants.Job_TakeOutInt)
            {
                if (HasValue(j.TOIssued) && (IsNull(j.TOComplete) || IsBlank(j.TOComplete))) { j.TOIssuedFG = fg;   j.TOIssuedBG = bg; }
                if (IsBlank(j.TOComplete) && IsBlank(j.RSIssued) && !IsNull(j.RSComplete))   { j.RSCompleteFG = fg; j.RSCompleteBG = bg; }
                if (HasValue(j.TOComplete))                                                  { j.TOCompleteFG = fg; j.TOCompleteBG = bg; }
            }
            else
            {
                if (HasValue(j.RSIssued) && IsNull(j.RSComplete))  { j.RSIssuedFG = fg;   j.RSIssuedBG = bg; }
                if (HasValue(j.RSComplete))                        { j.RSCompleteFG = fg; j.RSCompleteBG = bg; }
            }
        }
    }
}
```

## A3. `Engine/Colors/PhaseCheckRules.cs`

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

## A4. `Engine/Colors/GroupSpacer.cs`

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

## A5. Queries (`FMSQueries`)

```csharp
// ---- Color inputs (ca.dmt SetFMSColors) ----
public const string ColorNow = @"SELECT date('now') AS Now";

public const string ColorFodMoves = @"
    SELECT FOJ.Job, FOJ.TORS, FOJ.JobStatus
    FROM   IR_FODOrder FO, IR_FODOrderJobs FOJ
    WHERE  FO.Card = ? AND
           FO.OrderNumber = FOJ.OrderNumber AND
           FOJ.JobStatus IN (10, 15, 20, 50)";

public const string ColorFaultMoves = @"
    SELECT F.Job
    FROM   SOA_JobControl JC, FMS_Fault F
    WHERE  JC.Card = ? AND
           JC.Job = F.Job AND
           F.FODFaultStatus = 10";

public const string ColorPaPermit = @"
    SELECT J.Job, 0 AS TORS
    FROM   FMS_AutomationBlock AB, IR_WorkPermit WP, SOA_Job J
    WHERE  AB.Card = ? AND AB.BlockStatus <= 15 AND
           AB.Block = WP.WorkPermit AND AB.Block = J.Job AND
           J.TOIssued IS NULL";

public const string ColorPaFodTO = @"
    SELECT J.Job, FOJ.TORS
    FROM   FMS_AutomationBlock AB, IR_FODOrderJobs FOJ, SOA_Job J
    WHERE  AB.Card = ? AND AB.BlockStatus <= 15 AND
           AB.Block = FOJ.OrderNumber AND FOJ.TORS = 0 AND
           FOJ.Job = J.Job AND J.TOIssued IS NULL";

public const string ColorPaFodRS = @"
    SELECT J.Job, FOJ.TORS
    FROM   FMS_AutomationBlock AB, IR_FODOrderJobs FOJ, SOA_Job J
    WHERE  AB.Card = ? AND AB.BlockStatus <= 15 AND
           AB.Block = FOJ.OrderNumber AND FOJ.TORS = 1 AND
           FOJ.Job = J.Job AND J.RSIssued IS NULL";

public const string ColorPaOpTO = @"
    SELECT J.Job, OJ.TORS
    FROM   FMS_AutomationBlock AB, IR_OpOrderJobs OJ, SOA_Job J
    WHERE  AB.Card = ? AND AB.BlockStatus <= 15 AND
           AB.Block = OJ.OrderNumber AND OJ.TORS = 0 AND
           OJ.Job = J.Job AND J.TOIssued IS NULL";

public const string ColorPaOpRS = @"
    SELECT J.Job, OJ.TORS
    FROM   FMS_AutomationBlock AB, IR_OpOrderJobs OJ, SOA_Job J
    WHERE  AB.Card = ? AND AB.BlockStatus <= 15 AND
           AB.Block = OJ.OrderNumber AND OJ.TORS = 1 AND
           OJ.Job = J.Job AND J.RSIssued IS NULL";

public const string ColorOpOrders = @"
    SELECT OJ.Job, OJ.TORS, O.OrderNumber, O.OrderStatus
    FROM   SOA_JobControl JC, IR_OpOrderJobs OJ, IR_OperatingOrder O
    WHERE  JC.Card = ? AND
           JC.Job = OJ.Job AND
           OJ.OrderNumber = O.OrderNumber";

public const string ColorPermits = @"
    SELECT WP.WorkPermit, WP.PermitStatus
    FROM   SOA_JobControl JC, IR_WorkPermit WP
    WHERE  JC.Card = ? AND
           JC.Job = WP.WorkPermit";

public const string ColorAlerts = @"
    SELECT B.Type, B.Object, B.Status, B.AlertTime, B.InitialAlert
    FROM   TM_BogeyAlert B
    WHERE  B.Card = ?";

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

## A6. Repository

`IFMSCardRepository`:

```csharp
FmsColorInputs LoadFmsColorInputs(int cardId);
IEnumerable<PhaseCheckEquipRow> LoadOpenPhaseChecks(int cardId);
```

`FMSCardRepository`:

```csharp
public FmsColorInputs LoadFmsColorInputs(int cardId)
{
    var sw = Stopwatch.StartNew();
    using (var conn = _connectionFactory.GetConnection())
    {
        var p = new { p1 = cardId };
        var inputs = new FmsColorInputs
        {
            Now        = conn.QueryFirst<DateTime>(FMSQueries.ColorNow),
            FodMoves   = conn.Query<FodMoveRow>(FMSQueries.ColorFodMoves, p).ToList(),
            FaultMoves = conn.Query<FaultMoveRow>(FMSQueries.ColorFaultMoves, p).ToList(),
            OpOrders   = conn.Query<OpOrderRow>(FMSQueries.ColorOpOrders, p).ToList(),
            Permits    = conn.Query<PermitRow>(FMSQueries.ColorPermits, p).ToList(),
            Alerts     = conn.Query<BogeyAlertRow>(FMSQueries.ColorAlerts, p).ToList()
        };
        inputs.PaMoves.AddRange(conn.Query<PaMoveRow>(FMSQueries.ColorPaPermit, p));
        inputs.PaMoves.AddRange(conn.Query<PaMoveRow>(FMSQueries.ColorPaFodTO, p));
        inputs.PaMoves.AddRange(conn.Query<PaMoveRow>(FMSQueries.ColorPaFodRS, p));
        inputs.PaMoves.AddRange(conn.Query<PaMoveRow>(FMSQueries.ColorPaOpTO, p));
        inputs.PaMoves.AddRange(conn.Query<PaMoveRow>(FMSQueries.ColorPaOpRS, p));

        Log.Debug("FMS LoadFmsColorInputs CardId={CardId} in {ElapsedMs}ms", cardId, sw.ElapsedMilliseconds);
        return inputs;
    }
}

public IEnumerable<PhaseCheckEquipRow> LoadOpenPhaseChecks(int cardId)
{
    using (var conn = _connectionFactory.GetConnection())
    {
        return conn.Query<PhaseCheckEquipRow>(FMSQueries.LoadOpenPhaseChecks,
            new { p1 = cardId, p2 = cardId, p3 = cardId, p4 = cardId, p5 = cardId }).ToList();
    }
}
```
