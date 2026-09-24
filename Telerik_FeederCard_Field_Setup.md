# Feeder Card PDF — Field-by-Field Telerik Setup (manual, offline)

This is a work sheet. Do the steps in order. Every text box in the report is listed with exactly what to put in it.

**The approach, in one sentence:** all color decisions are made in the **SQL query** (it returns the final hex color for every cell). In the `.trdx`, each text box then only needs **2 Bindings** (background + font color). There is no complex logic inside the report.

Why this way: the database stores colors as numeric codes (1–35), and the screen converts them with a 31-entry lookup. Doing that lookup inside Telerik expressions means 31 nested `IIf`s × 8 cells. Doing it in SQL means one small lookup, written once.

---

## STEP 0 — Fill in these two sheets first (on paper or in this file)

### Sheet A — Column names
The SQL below uses these names. If your query's column is named differently, write the real name here, then use Find/Replace on the SQL in Step 2.

| Name used in this guide | What it is | Your real column name |
|---|---|---|
| `TOIssued` | Take Out issued date/time | |
| `TOComplete` | Take Out complete date/time | |
| `RSIssued` | Restore issued date/time | |
| `RSComplete` | Restore complete date/time | |
| `TOIssuedBG` / `TOIssuedFG` | Color codes for TO Issued (background / font) | |
| `TOCompleteBG` / `TOCompleteFG` | Color codes for TO Complete | |
| `RSIssuedBG` / `RSIssuedFG` | Color codes for RS Issued | |
| `RSCompleteBG` / `RSCompleteFG` | Color codes for RS Complete | |
| `PrintID` | ID column | |
| `EquipClassName` | Type column | |
| `EquipName` | Equipment column | |
| `G` | G column (number) | |
| `GroundsOn` | Grounds-on value on the job row | |
| `TOMove` | Move text | |
| `MoveType` | Move type (`'Dead'` etc.) | |
| `FGColor` | Row FG color code (used for Step Heading) | |
| `JobClass` | Job class (used for Step Heading) | |
| `MoveOrigin` | Origin letter (`N`, `S`, ...) | |
| `PhaseCheckColor` | Phase check color code | |
| `Response` | Response text | |
| `TypeOfCard` | Card type (header) | |
| `Value1` | Header flag for card-class cell | |

### Sheet B — Colors from the stylesheet
Open the `.css` file used by `feedercard.aspx`. For each class, copy `background-color` and `color`.
If a class has **no** `background-color`, write the normal cell background you see on screen. If it has **no** `color`, write the normal text color.
Then replace each `<<TOKEN>>` in the SQL of Step 2 with the hex value (keep the quotes), e.g. `'<<GRAYOUT_BG>>'` → `'#c0c0c0'`.

| CSS class | Token for background | Hex | Token for font color | Hex |
|---|---|---|---|---|
| `.Job` (normal cell) | `<<JOB_BG>>` | | `<<JOB_FG>>` | |
| `.GrayOut` | `<<GRAYOUT_BG>>` | | `<<GRAYOUT_FG>>` | |
| `.StepHead` | `<<STEPHEAD_BG>>` | | `<<STEPHEAD_FG>>` | |
| `.DeadMove` | `<<DEADMOVE_BG>>` | | `<<DEADMOVE_FG>>` | |
| `.Ground` | `<<GROUND_BG>>` | | `<<GROUND_FG>>` | |
| `.PhaseCheck` | `<<PHASECHECK_BG>>` | | `<<PHASECHECK_FG>>` | |
| `.AltPhaseCheck` | `<<ALTPHASECHECK_BG>>` | | `<<ALTPHASECHECK_FG>>` | |
| `.TakeOut` | — (static, Step 5) | | | |
| `.FMSCard` | `<<FMSCARD_BG>>` | | | |
| `.FMS4KV` | `<<FMS4KV_BG>>` | | | |
| `.Head_Reverse` | `<<HEADREVERSE_BG>>` | | `<<HEADREVERSE_FG>>` | |
| `.CardField` | `<<CARDFIELD_BG>>` | | `<<CARDFIELD_FG>>` | |

Also note if any class sets **bold/italic/underline**. You will add that in Step 4.

### Sheet C — Which field uses which CSS class (taken directly from feedercard.js)

Read each row as: *"this field, under this condition, is styled by this CSS class."* The line number points to the code that decides it.
Where a field has several conditions, **check them top to bottom; the first one that is true wins.**

#### C1. Job grid (detail rows)

| Report field (Value) | Screen column | Condition (first true wins) | CSS class | Tokens to use | JS line |
|---|---|---|---|---|---|
| `TOIssued` | Take Out → Issued | MoveOrigin = 'N' | `GrayOut` | GRAYOUT_BG / GRAYOUT_FG | 818 |
| | | TOIssued is empty | `GrayOut` | GRAYOUT_BG / GRAYOUT_FG | 825 |
| | | otherwise | `Job` **+ DB color** from TOIssuedBG / TOIssuedFG (via ColorMap; code 0 = keep Job color) | JOB_BG / JOB_FG as fallback | 829–832 |
| `TOComplete` | Take Out → Complete | same 3 rules, using TOComplete, TOCompleteBG, TOCompleteFG | `GrayOut` / `Job` + DB color | same | 819, 837, 841–844 |
| `PrintID` | ID | always | `Job` | JOB_BG / JOB_FG | 848 |
| `EquipClassName` | Type | always | `Job` | JOB_BG / JOB_FG | 849 |
| `EquipName` | Equipment | always | `Job` | JOB_BG / JOB_FG | 850 |
| `G` | G | G > 0 AND GroundsOn present AND row is **not** Step Heading AND **not** Dead | `Ground` | GROUND_BG / GROUND_FG | 868–871 |
| | | otherwise | `Job` | JOB_BG / JOB_FG | 853 |
| `TOMove` | Move | FGColor = 8 AND JobClass = 0 (Step Heading) | `StepHead` (+ centered) | STEPHEAD_BG / STEPHEAD_FG | 859–861, 976 |
| | | MoveType = 'Dead' | `DeadMove` | DEADMOVE_BG / DEADMOVE_FG | 864–866 |
| | | G > 0 AND GroundsOn present | `Ground` | GROUND_BG / GROUND_FG | 868–871 |
| | | otherwise | `Job` | JOB_BG / JOB_FG | 854 |
| `MoveOrigin` (shown as `OriginText`) | blank header, after Move | PhaseCheckColor = 6 | `PhaseCheck` | PHASECHECK_BG / PHASECHECK_FG | 876–878 |
| | | PhaseCheckColor = 26 | `AltPhaseCheck` | ALTPHASECHECK_BG / ALTPHASECHECK_FG | 880–882 |
| | | MoveOrigin = 'N' | `GrayOut` | GRAYOUT_BG / GRAYOUT_FG | 884–886 |
| | | otherwise | `Job` | JOB_BG / JOB_FG | 906 |
| `Response` | Response | always | `Job` | JOB_BG / JOB_FG | 908 |
| `RSIssued` | Restore → Issued | same 3 rules as TOIssued, using RSIssued, RSIssuedBG, RSIssuedFG | `GrayOut` / `Job` + DB color | same | 912, 919, 923–926 |
| `RSComplete` | Restore → Complete | same 3 rules, using RSComplete, RSCompleteBG, RSCompleteFG | `GrayOut` / `Job` + DB color | same | 913, 930, 934–937 |
| *(whole grid body)* | table behind all rows | always (even for 4KV cards) | `FMSCard` | FMSCARD_BG | 796 |
| *(column header row)* | "Take Out / ID / Type / ... / Restore" | always | `TblTitle` | add TBLTITLE_BG / TBLTITLE_FG to Sheet B | 761–785 |

"DB color" is **not** a CSS class. It is the numeric code stored in the database, converted by the ColorMap in Step 2. It overrides the `Job` colors only for that one cell.

#### C2. Card header

| Report field (Value) | Screen label | Condition (first true wins) | CSS class | Tokens to use | JS line |
|---|---|---|---|---|---|
| *(header panel background)* | whole header area | TypeOfCard = 10062 | `FMS4KV` | FMS4KV_BG | 632 |
| | | otherwise | `FMSCard` | FMSCARD_BG | 632 |
| `FeederName` | top-left box | card has feeder list AND any feeder type ≠ 1 | `CardField` + `FMS4KV` | FMS4KV_BG, CARDFIELD_FG | 645–656 |
| | | otherwise | `CardField` + same as header panel | Header_BG, CARDFIELD_FG | 656, 659 |
| `Position` | top row, 2nd box | always | `CardField` | CARDFIELD_BG / CARDFIELD_FG | 570 |
| `CardClassName` | top row, 3rd box | Value1 is set (not empty / 0 / null) | `Head_Reverse` | HEADREVERSE_BG / HEADREVERSE_FG | 560–561 |
| | | otherwise | `CardField` | CARDFIELD_BG / CARDFIELD_FG | 563 |
| `SubstationName` | top row, right | always | `CardField` | CARDFIELD_BG / CARDFIELD_FG | 572 |
| label "Cut Out:" + `Cutout` + `Loop1` | row 2 | always | none of its own → `Job` (from table) | JOB_BG / JOB_FG | 567, 574–577 |
| label "Cut In:" + `Cutin` + `Loop2` | row 3 | always | `Job` | JOB_BG / JOB_FG | 579–582 |
| label "Station Ground:" + `StationGround` | row 4, left | always | `Ground` | GROUND_BG / GROUND_FG | 585–586 |
| `Loop3` | row 4, right | always | none of its own → `Job` | JOB_BG / JOB_FG | 587 |
| label "Grounds:" + `GroundsOn` | row 5, left | always | `Ground` | GROUND_BG / GROUND_FG | 590–591 |
| `Loop4` | row 5, right | always | none of its own → `Job` | JOB_BG / JOB_FG | 592 |
| label "Dead Moves:" + `DeadMoves` | row 6, left | always | `DeadMove` | DEADMOVE_BG / DEADMOVE_FG | 595–596 |
| `Assoc` | row 6, right | always | none of its own → `Job` | JOB_BG / JOB_FG | 597 |
| label "Taken Out:" + `DeadMovesTO` | row 7, left | always | `TakeOut` | add TAKEOUT_BG / TAKEOUT_FG to Sheet B | 600–601 |
| label "Current Delay:" + `CurrentDelayName` | row 7, right | always | `Job` (text forced black) | JOB_BG, font #000000 | 602–603 |
| label "Card Closed:" + `Closed` | row 8, left | Closed has a value | `Job` | JOB_BG / JOB_FG | 606–608 |
| "MTA Lines" box | row 8, left | not closed AND MTA lines exist | `Job` | JOB_BG / JOB_FG | 611–612 |
| | | not closed AND no MTA lines, but ISO list exists | `GrayOut` (blank) | GRAYOUT_BG | 613–614 |
| "ISO Feeders" box | row 8, middle | not closed AND ISO list not empty | `Job` | JOB_BG / JOB_FG | 616–617 |
| | | not closed AND ISO list empty, but MTA lines exist | `GrayOut` (blank) | GRAYOUT_BG | 618–619 |
| row 8 left 3 cells merged | row 8, left | not closed AND no MTA lines AND no ISO list | `GrayOut` (blank) | GRAYOUT_BG | 623 |
| label "Operating Step:" + `CurrentStepName` | row 8, right | always | `Job` | JOB_BG / JOB_FG | 625–626 |

Cells marked **"none of its own → Job"** have no class in the code. They sit inside a table whose class includes `Job` (line 567), so they look like `Job` on screen.

**Add to Sheet B** (these were missing there): `.TblTitle` → TBLTITLE_BG / TBLTITLE_FG, and `.TakeOut` → TAKEOUT_BG / TAKEOUT_FG.

---

## STEP 1 — 2-minute test (do this first)

This confirms your Telerik version accepts a hex string for a color binding.

1. Open any report in the Telerik designer. Select any text box.
2. In the **Properties** pane find **Bindings** → click `...` → **Add**.
3. **Property path:** `Style.BackgroundColor`  **Expression:** `= '#ff0000'`
4. Preview. If the box is red, the approach works. Remove the test binding.

If it is not red, try `= 'Red'`. If a named color works but hex does not, change every hex in the ColorMap in Step 2 to its color name. (The names are in the comment column of the ColorMap.)

---

## STEP 2 — Replace the job-list query (SQL Server syntax)

Open the job-list **SqlDataSource** → edit the query. Wrap your existing query as shown. Paste your current SELECT where it says `/* YOUR EXISTING JOB QUERY */`.

Important: if your existing query has an `ORDER BY`, **remove it from inside** and put it at the very end (SQL Server does not allow `ORDER BY` inside a CTE).

```sql
WITH ColorMap (Code, Hex) AS (
          SELECT  1, '#000000'   -- Black
UNION ALL SELECT  6, '#ff0000'   -- Red
UNION ALL SELECT  7, '#008000'   -- Green
UNION ALL SELECT  8, '#0000ff'   -- Blue
UNION ALL SELECT  9, '#ffff00'   -- Yellow
UNION ALL SELECT 10, '#00ffff'   -- Cyan
UNION ALL SELECT 11, '#ffc0c0'   -- (pink, no name)
UNION ALL SELECT 12, '#8B4513'   -- SaddleBrown
UNION ALL SELECT 13, '#ff8c00'   -- DarkOrange
UNION ALL SELECT 14, '#800080'   -- Purple
UNION ALL SELECT 15, '#696969'   -- DimGray
UNION ALL SELECT 16, '#ff4500'   -- OrangeRed
UNION ALL SELECT 17, '#3cb371'   -- MediumSeaGreen
UNION ALL SELECT 18, '#6495ed'   -- CornflowerBlue
UNION ALL SELECT 19, '#f0e68c'   -- Khaki
UNION ALL SELECT 20, '#b0e0e6'   -- PowderBlue
UNION ALL SELECT 21, '#ee82ee'   -- Violet
UNION ALL SELECT 22, '#d2b48c'   -- Tan
UNION ALL SELECT 23, '#ffa500'   -- Orange
UNION ALL SELECT 24, '#8a2be2'   -- BlueViolet
UNION ALL SELECT 25, '#808080'   -- Gray
UNION ALL SELECT 26, '#ffb6c1'   -- LightPink
UNION ALL SELECT 27, '#90ee90'   -- LightGreen
UNION ALL SELECT 28, '#87cefa'   -- LightSkyBlue
UNION ALL SELECT 29, '#fafad2'   -- LightGoldenrodYellow
UNION ALL SELECT 30, '#e0ffff'   -- LightCyan
UNION ALL SELECT 31, '#d8bfd8'   -- Thistle
UNION ALL SELECT 32, '#deb887'   -- BurlyWood
UNION ALL SELECT 33, '#ffd700'   -- Gold
UNION ALL SELECT 34, '#e6e6fa'   -- Lavender
UNION ALL SELECT 35, '#a9a9a9'   -- DarkGray
),
Base AS (
    SELECT j.*,

        -- Timestamp cells: gray when origin is N or date is empty
        CASE WHEN j.MoveOrigin = 'N' OR j.TOIssued   IS NULL THEN 'GrayOut' ELSE 'Job' END AS TOIssuedClass,
        CASE WHEN j.MoveOrigin = 'N' OR j.TOComplete IS NULL THEN 'GrayOut' ELSE 'Job' END AS TOCompleteClass,
        CASE WHEN j.MoveOrigin = 'N' OR j.RSIssued   IS NULL THEN 'GrayOut' ELSE 'Job' END AS RSIssuedClass,
        CASE WHEN j.MoveOrigin = 'N' OR j.RSComplete IS NULL THEN 'GrayOut' ELSE 'Job' END AS RSCompleteClass,

        -- Move cell: first match wins
        CASE
            WHEN j.FGColor = 8 AND j.JobClass = 0      THEN 'StepHead'
            WHEN j.MoveType = 'Dead'                   THEN 'DeadMove'
            WHEN j.G > 0 AND j.GroundsOn IS NOT NULL   THEN 'Ground'
            ELSE 'Job'
        END AS MoveClass,

        -- Origin cell: first match wins
        CASE
            WHEN j.PhaseCheckColor = 6  THEN 'PhaseCheck'
            WHEN j.PhaseCheckColor = 26 THEN 'AltPhaseCheck'
            WHEN j.MoveOrigin = 'N'     THEN 'GrayOut'
            ELSE 'Job'
        END AS OriginClass,

        -- Origin text: 'S' is hidden on closed/archived cards (unless phase-check colored)
        CASE
            WHEN j.PhaseCheckColor IN (6, 26)             THEN j.MoveOrigin
            WHEN j.MoveOrigin = 'S' AND @ArchFlag <> 0    THEN ''
            ELSE j.MoveOrigin
        END AS OriginText

    FROM ( /* YOUR EXISTING JOB QUERY */ ) j
)
SELECT b.*,

    -- ===== Column 1: TO Issued =====
    CASE WHEN b.TOIssuedClass = 'GrayOut' THEN '<<GRAYOUT_BG>>' ELSE COALESCE(c1.Hex, '<<JOB_BG>>') END AS TOIssued_BG,
    CASE WHEN b.TOIssuedClass = 'GrayOut' THEN '<<GRAYOUT_FG>>' ELSE COALESCE(c2.Hex, '<<JOB_FG>>') END AS TOIssued_FG,

    -- ===== Column 2: TO Complete =====
    CASE WHEN b.TOCompleteClass = 'GrayOut' THEN '<<GRAYOUT_BG>>' ELSE COALESCE(c3.Hex, '<<JOB_BG>>') END AS TOComplete_BG,
    CASE WHEN b.TOCompleteClass = 'GrayOut' THEN '<<GRAYOUT_FG>>' ELSE COALESCE(c4.Hex, '<<JOB_FG>>') END AS TOComplete_FG,

    -- ===== Column 10: RS Issued =====
    CASE WHEN b.RSIssuedClass = 'GrayOut' THEN '<<GRAYOUT_BG>>' ELSE COALESCE(c5.Hex, '<<JOB_BG>>') END AS RSIssued_BG,
    CASE WHEN b.RSIssuedClass = 'GrayOut' THEN '<<GRAYOUT_FG>>' ELSE COALESCE(c6.Hex, '<<JOB_FG>>') END AS RSIssued_FG,

    -- ===== Column 11: RS Complete =====
    CASE WHEN b.RSCompleteClass = 'GrayOut' THEN '<<GRAYOUT_BG>>' ELSE COALESCE(c7.Hex, '<<JOB_BG>>') END AS RSComplete_BG,
    CASE WHEN b.RSCompleteClass = 'GrayOut' THEN '<<GRAYOUT_FG>>' ELSE COALESCE(c8.Hex, '<<JOB_FG>>') END AS RSComplete_FG,

    -- ===== Column 6: G =====
    CASE WHEN b.MoveClass = 'Ground' THEN '<<GROUND_BG>>' ELSE '<<JOB_BG>>' END AS G_BG,
    CASE WHEN b.MoveClass = 'Ground' THEN '<<GROUND_FG>>' ELSE '<<JOB_FG>>' END AS G_FG,

    -- ===== Column 7: Move =====
    CASE b.MoveClass
        WHEN 'StepHead' THEN '<<STEPHEAD_BG>>'
        WHEN 'DeadMove' THEN '<<DEADMOVE_BG>>'
        WHEN 'Ground'   THEN '<<GROUND_BG>>'
        ELSE '<<JOB_BG>>'
    END AS Move_BG,
    CASE b.MoveClass
        WHEN 'StepHead' THEN '<<STEPHEAD_FG>>'
        WHEN 'DeadMove' THEN '<<DEADMOVE_FG>>'
        WHEN 'Ground'   THEN '<<GROUND_FG>>'
        ELSE '<<JOB_FG>>'
    END AS Move_FG,

    -- ===== Column 8: Origin =====
    CASE b.OriginClass
        WHEN 'PhaseCheck'    THEN '<<PHASECHECK_BG>>'
        WHEN 'AltPhaseCheck' THEN '<<ALTPHASECHECK_BG>>'
        WHEN 'GrayOut'       THEN '<<GRAYOUT_BG>>'
        ELSE '<<JOB_BG>>'
    END AS Origin_BG,
    CASE b.OriginClass
        WHEN 'PhaseCheck'    THEN '<<PHASECHECK_FG>>'
        WHEN 'AltPhaseCheck' THEN '<<ALTPHASECHECK_FG>>'
        WHEN 'GrayOut'       THEN '<<GRAYOUT_FG>>'
        ELSE '<<JOB_FG>>'
    END AS Origin_FG

FROM Base b
LEFT JOIN ColorMap c1 ON c1.Code = b.TOIssuedBG
LEFT JOIN ColorMap c2 ON c2.Code = b.TOIssuedFG
LEFT JOIN ColorMap c3 ON c3.Code = b.TOCompleteBG
LEFT JOIN ColorMap c4 ON c4.Code = b.TOCompleteFG
LEFT JOIN ColorMap c5 ON c5.Code = b.RSIssuedBG
LEFT JOIN ColorMap c6 ON c6.Code = b.RSIssuedFG
LEFT JOIN ColorMap c7 ON c7.Code = b.RSCompleteBG
LEFT JOIN ColorMap c8 ON c8.Code = b.RSCompleteFG
/* ORDER BY ... (move your original ORDER BY here) */
```

**About `@ArchFlag`:** 0 = active card, anything else = closed/archived card. In the SqlDataSource **Parameters**, map `@ArchFlag` to a report parameter (or to however your report knows the card is closed).

**Why code 0 and unknown codes fall back to the normal color:** code 0 is not in `ColorMap`, so the join returns NULL and `COALESCE` gives the normal `.Job` color. This matches the screen exactly (the screen skips code 0 and ignores unmapped codes).

**Two assumptions in this SQL. Verify both against the screen in Step 6:**
- `TOIssued IS NULL` = "empty date" (screen checks for an empty string).
- `GroundsOn IS NOT NULL` = "GroundsOn exists on the row" (screen checks that the property exists).

After saving the query, click **Refresh schema / Fields** so the new columns appear in the Data Explorer.

---

## STEP 2-ALT — No SQL change: do the same logic inside the .trdx

Use this **instead of Step 2** if you cannot change the query, for example when the data source calls a stored procedure. Do **not** do both.

**Where:** select the job-list data source (SqlDataSource / ObjectDataSource / WebServiceDataSource) → Properties → **CalculatedFields** → `...` → **Add** one entry per field below. Set **Name** exactly as shown, **DataType** = String, and paste the **Expression**.

The names are identical to the SQL version, so **Step 3 does not change**.

Before pasting:
1. Replace every `<<TOKEN>>` with the hex from Sheet B (same as Step 2).
2. If your real column names differ from Sheet A, Find/Replace them (e.g. `Fields.TOIssuedBG` → `Fields.YourColumn`).
3. Create a report parameter **ArchFlag** (Integer; 0 = active card, anything else = closed/archived). It is used by `OriginText`.

**Each expression is self-contained.** No calculated field refers to another calculated field, so the order you add them does not matter.

### Test these 2 things first (5 minutes, one text box)
These two expression pieces are the only ones whose behavior depends on your Telerik version and data. Test them before adding all 16.

| Test | Put this in a text box Value | Preview a row where TOIssued is empty | Preview a row where TOIssued has a date |
|---|---|---|---|
| Empty-date check | `= CStr(IsNull(Fields.TOIssued, 'X')) = 'X'` | must show **True** | must show **False** |
| Code lookup | `= IIf(Fields.TOIssuedBG = 6, 'RED', 'OTHER')` | — | shows RED on a row you know is red on screen |

If the empty-date test errors or shows the wrong value, the rest will be wrong too. Fix this one piece first: replace every `CStr(IsNull(Fields.XXX, 'X')) = 'X'` in the expressions below with whatever empty check works for you.

### The 16 calculated fields

**TOIssued_BG** (DataType: String)
```
= IIf(Fields.MoveOrigin = 'N' Or CStr(IsNull(Fields.TOIssued, 'X')) = 'X', '<<GRAYOUT_BG>>', IIf(Fields.TOIssuedBG = 1, '#000000', IIf(Fields.TOIssuedBG = 6, '#ff0000', IIf(Fields.TOIssuedBG = 7, '#008000', IIf(Fields.TOIssuedBG = 8, '#0000ff', IIf(Fields.TOIssuedBG = 9, '#ffff00', IIf(Fields.TOIssuedBG = 10, '#00ffff', IIf(Fields.TOIssuedBG = 11, '#ffc0c0', IIf(Fields.TOIssuedBG = 12, '#8B4513', IIf(Fields.TOIssuedBG = 13, '#ff8c00', IIf(Fields.TOIssuedBG = 14, '#800080', IIf(Fields.TOIssuedBG = 15, '#696969', IIf(Fields.TOIssuedBG = 16, '#ff4500', IIf(Fields.TOIssuedBG = 17, '#3cb371', IIf(Fields.TOIssuedBG = 18, '#6495ed', IIf(Fields.TOIssuedBG = 19, '#f0e68c', IIf(Fields.TOIssuedBG = 20, '#b0e0e6', IIf(Fields.TOIssuedBG = 21, '#ee82ee', IIf(Fields.TOIssuedBG = 22, '#d2b48c', IIf(Fields.TOIssuedBG = 23, '#ffa500', IIf(Fields.TOIssuedBG = 24, '#8a2be2', IIf(Fields.TOIssuedBG = 25, '#808080', IIf(Fields.TOIssuedBG = 26, '#ffb6c1', IIf(Fields.TOIssuedBG = 27, '#90ee90', IIf(Fields.TOIssuedBG = 28, '#87cefa', IIf(Fields.TOIssuedBG = 29, '#fafad2', IIf(Fields.TOIssuedBG = 30, '#e0ffff', IIf(Fields.TOIssuedBG = 31, '#d8bfd8', IIf(Fields.TOIssuedBG = 32, '#deb887', IIf(Fields.TOIssuedBG = 33, '#ffd700', IIf(Fields.TOIssuedBG = 34, '#e6e6fa', IIf(Fields.TOIssuedBG = 35, '#a9a9a9', '<<JOB_BG>>'))))))))))))))))))))))))))))))))
```

**TOIssued_FG** (DataType: String)
```
= IIf(Fields.MoveOrigin = 'N' Or CStr(IsNull(Fields.TOIssued, 'X')) = 'X', '<<GRAYOUT_FG>>', IIf(Fields.TOIssuedFG = 1, '#000000', IIf(Fields.TOIssuedFG = 6, '#ff0000', IIf(Fields.TOIssuedFG = 7, '#008000', IIf(Fields.TOIssuedFG = 8, '#0000ff', IIf(Fields.TOIssuedFG = 9, '#ffff00', IIf(Fields.TOIssuedFG = 10, '#00ffff', IIf(Fields.TOIssuedFG = 11, '#ffc0c0', IIf(Fields.TOIssuedFG = 12, '#8B4513', IIf(Fields.TOIssuedFG = 13, '#ff8c00', IIf(Fields.TOIssuedFG = 14, '#800080', IIf(Fields.TOIssuedFG = 15, '#696969', IIf(Fields.TOIssuedFG = 16, '#ff4500', IIf(Fields.TOIssuedFG = 17, '#3cb371', IIf(Fields.TOIssuedFG = 18, '#6495ed', IIf(Fields.TOIssuedFG = 19, '#f0e68c', IIf(Fields.TOIssuedFG = 20, '#b0e0e6', IIf(Fields.TOIssuedFG = 21, '#ee82ee', IIf(Fields.TOIssuedFG = 22, '#d2b48c', IIf(Fields.TOIssuedFG = 23, '#ffa500', IIf(Fields.TOIssuedFG = 24, '#8a2be2', IIf(Fields.TOIssuedFG = 25, '#808080', IIf(Fields.TOIssuedFG = 26, '#ffb6c1', IIf(Fields.TOIssuedFG = 27, '#90ee90', IIf(Fields.TOIssuedFG = 28, '#87cefa', IIf(Fields.TOIssuedFG = 29, '#fafad2', IIf(Fields.TOIssuedFG = 30, '#e0ffff', IIf(Fields.TOIssuedFG = 31, '#d8bfd8', IIf(Fields.TOIssuedFG = 32, '#deb887', IIf(Fields.TOIssuedFG = 33, '#ffd700', IIf(Fields.TOIssuedFG = 34, '#e6e6fa', IIf(Fields.TOIssuedFG = 35, '#a9a9a9', '<<JOB_FG>>'))))))))))))))))))))))))))))))))
```

**TOComplete_BG** (DataType: String)
```
= IIf(Fields.MoveOrigin = 'N' Or CStr(IsNull(Fields.TOComplete, 'X')) = 'X', '<<GRAYOUT_BG>>', IIf(Fields.TOCompleteBG = 1, '#000000', IIf(Fields.TOCompleteBG = 6, '#ff0000', IIf(Fields.TOCompleteBG = 7, '#008000', IIf(Fields.TOCompleteBG = 8, '#0000ff', IIf(Fields.TOCompleteBG = 9, '#ffff00', IIf(Fields.TOCompleteBG = 10, '#00ffff', IIf(Fields.TOCompleteBG = 11, '#ffc0c0', IIf(Fields.TOCompleteBG = 12, '#8B4513', IIf(Fields.TOCompleteBG = 13, '#ff8c00', IIf(Fields.TOCompleteBG = 14, '#800080', IIf(Fields.TOCompleteBG = 15, '#696969', IIf(Fields.TOCompleteBG = 16, '#ff4500', IIf(Fields.TOCompleteBG = 17, '#3cb371', IIf(Fields.TOCompleteBG = 18, '#6495ed', IIf(Fields.TOCompleteBG = 19, '#f0e68c', IIf(Fields.TOCompleteBG = 20, '#b0e0e6', IIf(Fields.TOCompleteBG = 21, '#ee82ee', IIf(Fields.TOCompleteBG = 22, '#d2b48c', IIf(Fields.TOCompleteBG = 23, '#ffa500', IIf(Fields.TOCompleteBG = 24, '#8a2be2', IIf(Fields.TOCompleteBG = 25, '#808080', IIf(Fields.TOCompleteBG = 26, '#ffb6c1', IIf(Fields.TOCompleteBG = 27, '#90ee90', IIf(Fields.TOCompleteBG = 28, '#87cefa', IIf(Fields.TOCompleteBG = 29, '#fafad2', IIf(Fields.TOCompleteBG = 30, '#e0ffff', IIf(Fields.TOCompleteBG = 31, '#d8bfd8', IIf(Fields.TOCompleteBG = 32, '#deb887', IIf(Fields.TOCompleteBG = 33, '#ffd700', IIf(Fields.TOCompleteBG = 34, '#e6e6fa', IIf(Fields.TOCompleteBG = 35, '#a9a9a9', '<<JOB_BG>>'))))))))))))))))))))))))))))))))
```

**TOComplete_FG** (DataType: String)
```
= IIf(Fields.MoveOrigin = 'N' Or CStr(IsNull(Fields.TOComplete, 'X')) = 'X', '<<GRAYOUT_FG>>', IIf(Fields.TOCompleteFG = 1, '#000000', IIf(Fields.TOCompleteFG = 6, '#ff0000', IIf(Fields.TOCompleteFG = 7, '#008000', IIf(Fields.TOCompleteFG = 8, '#0000ff', IIf(Fields.TOCompleteFG = 9, '#ffff00', IIf(Fields.TOCompleteFG = 10, '#00ffff', IIf(Fields.TOCompleteFG = 11, '#ffc0c0', IIf(Fields.TOCompleteFG = 12, '#8B4513', IIf(Fields.TOCompleteFG = 13, '#ff8c00', IIf(Fields.TOCompleteFG = 14, '#800080', IIf(Fields.TOCompleteFG = 15, '#696969', IIf(Fields.TOCompleteFG = 16, '#ff4500', IIf(Fields.TOCompleteFG = 17, '#3cb371', IIf(Fields.TOCompleteFG = 18, '#6495ed', IIf(Fields.TOCompleteFG = 19, '#f0e68c', IIf(Fields.TOCompleteFG = 20, '#b0e0e6', IIf(Fields.TOCompleteFG = 21, '#ee82ee', IIf(Fields.TOCompleteFG = 22, '#d2b48c', IIf(Fields.TOCompleteFG = 23, '#ffa500', IIf(Fields.TOCompleteFG = 24, '#8a2be2', IIf(Fields.TOCompleteFG = 25, '#808080', IIf(Fields.TOCompleteFG = 26, '#ffb6c1', IIf(Fields.TOCompleteFG = 27, '#90ee90', IIf(Fields.TOCompleteFG = 28, '#87cefa', IIf(Fields.TOCompleteFG = 29, '#fafad2', IIf(Fields.TOCompleteFG = 30, '#e0ffff', IIf(Fields.TOCompleteFG = 31, '#d8bfd8', IIf(Fields.TOCompleteFG = 32, '#deb887', IIf(Fields.TOCompleteFG = 33, '#ffd700', IIf(Fields.TOCompleteFG = 34, '#e6e6fa', IIf(Fields.TOCompleteFG = 35, '#a9a9a9', '<<JOB_FG>>'))))))))))))))))))))))))))))))))
```

**RSIssued_BG** (DataType: String)
```
= IIf(Fields.MoveOrigin = 'N' Or CStr(IsNull(Fields.RSIssued, 'X')) = 'X', '<<GRAYOUT_BG>>', IIf(Fields.RSIssuedBG = 1, '#000000', IIf(Fields.RSIssuedBG = 6, '#ff0000', IIf(Fields.RSIssuedBG = 7, '#008000', IIf(Fields.RSIssuedBG = 8, '#0000ff', IIf(Fields.RSIssuedBG = 9, '#ffff00', IIf(Fields.RSIssuedBG = 10, '#00ffff', IIf(Fields.RSIssuedBG = 11, '#ffc0c0', IIf(Fields.RSIssuedBG = 12, '#8B4513', IIf(Fields.RSIssuedBG = 13, '#ff8c00', IIf(Fields.RSIssuedBG = 14, '#800080', IIf(Fields.RSIssuedBG = 15, '#696969', IIf(Fields.RSIssuedBG = 16, '#ff4500', IIf(Fields.RSIssuedBG = 17, '#3cb371', IIf(Fields.RSIssuedBG = 18, '#6495ed', IIf(Fields.RSIssuedBG = 19, '#f0e68c', IIf(Fields.RSIssuedBG = 20, '#b0e0e6', IIf(Fields.RSIssuedBG = 21, '#ee82ee', IIf(Fields.RSIssuedBG = 22, '#d2b48c', IIf(Fields.RSIssuedBG = 23, '#ffa500', IIf(Fields.RSIssuedBG = 24, '#8a2be2', IIf(Fields.RSIssuedBG = 25, '#808080', IIf(Fields.RSIssuedBG = 26, '#ffb6c1', IIf(Fields.RSIssuedBG = 27, '#90ee90', IIf(Fields.RSIssuedBG = 28, '#87cefa', IIf(Fields.RSIssuedBG = 29, '#fafad2', IIf(Fields.RSIssuedBG = 30, '#e0ffff', IIf(Fields.RSIssuedBG = 31, '#d8bfd8', IIf(Fields.RSIssuedBG = 32, '#deb887', IIf(Fields.RSIssuedBG = 33, '#ffd700', IIf(Fields.RSIssuedBG = 34, '#e6e6fa', IIf(Fields.RSIssuedBG = 35, '#a9a9a9', '<<JOB_BG>>'))))))))))))))))))))))))))))))))
```

**RSIssued_FG** (DataType: String)
```
= IIf(Fields.MoveOrigin = 'N' Or CStr(IsNull(Fields.RSIssued, 'X')) = 'X', '<<GRAYOUT_FG>>', IIf(Fields.RSIssuedFG = 1, '#000000', IIf(Fields.RSIssuedFG = 6, '#ff0000', IIf(Fields.RSIssuedFG = 7, '#008000', IIf(Fields.RSIssuedFG = 8, '#0000ff', IIf(Fields.RSIssuedFG = 9, '#ffff00', IIf(Fields.RSIssuedFG = 10, '#00ffff', IIf(Fields.RSIssuedFG = 11, '#ffc0c0', IIf(Fields.RSIssuedFG = 12, '#8B4513', IIf(Fields.RSIssuedFG = 13, '#ff8c00', IIf(Fields.RSIssuedFG = 14, '#800080', IIf(Fields.RSIssuedFG = 15, '#696969', IIf(Fields.RSIssuedFG = 16, '#ff4500', IIf(Fields.RSIssuedFG = 17, '#3cb371', IIf(Fields.RSIssuedFG = 18, '#6495ed', IIf(Fields.RSIssuedFG = 19, '#f0e68c', IIf(Fields.RSIssuedFG = 20, '#b0e0e6', IIf(Fields.RSIssuedFG = 21, '#ee82ee', IIf(Fields.RSIssuedFG = 22, '#d2b48c', IIf(Fields.RSIssuedFG = 23, '#ffa500', IIf(Fields.RSIssuedFG = 24, '#8a2be2', IIf(Fields.RSIssuedFG = 25, '#808080', IIf(Fields.RSIssuedFG = 26, '#ffb6c1', IIf(Fields.RSIssuedFG = 27, '#90ee90', IIf(Fields.RSIssuedFG = 28, '#87cefa', IIf(Fields.RSIssuedFG = 29, '#fafad2', IIf(Fields.RSIssuedFG = 30, '#e0ffff', IIf(Fields.RSIssuedFG = 31, '#d8bfd8', IIf(Fields.RSIssuedFG = 32, '#deb887', IIf(Fields.RSIssuedFG = 33, '#ffd700', IIf(Fields.RSIssuedFG = 34, '#e6e6fa', IIf(Fields.RSIssuedFG = 35, '#a9a9a9', '<<JOB_FG>>'))))))))))))))))))))))))))))))))
```

**RSComplete_BG** (DataType: String)
```
= IIf(Fields.MoveOrigin = 'N' Or CStr(IsNull(Fields.RSComplete, 'X')) = 'X', '<<GRAYOUT_BG>>', IIf(Fields.RSCompleteBG = 1, '#000000', IIf(Fields.RSCompleteBG = 6, '#ff0000', IIf(Fields.RSCompleteBG = 7, '#008000', IIf(Fields.RSCompleteBG = 8, '#0000ff', IIf(Fields.RSCompleteBG = 9, '#ffff00', IIf(Fields.RSCompleteBG = 10, '#00ffff', IIf(Fields.RSCompleteBG = 11, '#ffc0c0', IIf(Fields.RSCompleteBG = 12, '#8B4513', IIf(Fields.RSCompleteBG = 13, '#ff8c00', IIf(Fields.RSCompleteBG = 14, '#800080', IIf(Fields.RSCompleteBG = 15, '#696969', IIf(Fields.RSCompleteBG = 16, '#ff4500', IIf(Fields.RSCompleteBG = 17, '#3cb371', IIf(Fields.RSCompleteBG = 18, '#6495ed', IIf(Fields.RSCompleteBG = 19, '#f0e68c', IIf(Fields.RSCompleteBG = 20, '#b0e0e6', IIf(Fields.RSCompleteBG = 21, '#ee82ee', IIf(Fields.RSCompleteBG = 22, '#d2b48c', IIf(Fields.RSCompleteBG = 23, '#ffa500', IIf(Fields.RSCompleteBG = 24, '#8a2be2', IIf(Fields.RSCompleteBG = 25, '#808080', IIf(Fields.RSCompleteBG = 26, '#ffb6c1', IIf(Fields.RSCompleteBG = 27, '#90ee90', IIf(Fields.RSCompleteBG = 28, '#87cefa', IIf(Fields.RSCompleteBG = 29, '#fafad2', IIf(Fields.RSCompleteBG = 30, '#e0ffff', IIf(Fields.RSCompleteBG = 31, '#d8bfd8', IIf(Fields.RSCompleteBG = 32, '#deb887', IIf(Fields.RSCompleteBG = 33, '#ffd700', IIf(Fields.RSCompleteBG = 34, '#e6e6fa', IIf(Fields.RSCompleteBG = 35, '#a9a9a9', '<<JOB_BG>>'))))))))))))))))))))))))))))))))
```

**RSComplete_FG** (DataType: String)
```
= IIf(Fields.MoveOrigin = 'N' Or CStr(IsNull(Fields.RSComplete, 'X')) = 'X', '<<GRAYOUT_FG>>', IIf(Fields.RSCompleteFG = 1, '#000000', IIf(Fields.RSCompleteFG = 6, '#ff0000', IIf(Fields.RSCompleteFG = 7, '#008000', IIf(Fields.RSCompleteFG = 8, '#0000ff', IIf(Fields.RSCompleteFG = 9, '#ffff00', IIf(Fields.RSCompleteFG = 10, '#00ffff', IIf(Fields.RSCompleteFG = 11, '#ffc0c0', IIf(Fields.RSCompleteFG = 12, '#8B4513', IIf(Fields.RSCompleteFG = 13, '#ff8c00', IIf(Fields.RSCompleteFG = 14, '#800080', IIf(Fields.RSCompleteFG = 15, '#696969', IIf(Fields.RSCompleteFG = 16, '#ff4500', IIf(Fields.RSCompleteFG = 17, '#3cb371', IIf(Fields.RSCompleteFG = 18, '#6495ed', IIf(Fields.RSCompleteFG = 19, '#f0e68c', IIf(Fields.RSCompleteFG = 20, '#b0e0e6', IIf(Fields.RSCompleteFG = 21, '#ee82ee', IIf(Fields.RSCompleteFG = 22, '#d2b48c', IIf(Fields.RSCompleteFG = 23, '#ffa500', IIf(Fields.RSCompleteFG = 24, '#8a2be2', IIf(Fields.RSCompleteFG = 25, '#808080', IIf(Fields.RSCompleteFG = 26, '#ffb6c1', IIf(Fields.RSCompleteFG = 27, '#90ee90', IIf(Fields.RSCompleteFG = 28, '#87cefa', IIf(Fields.RSCompleteFG = 29, '#fafad2', IIf(Fields.RSCompleteFG = 30, '#e0ffff', IIf(Fields.RSCompleteFG = 31, '#d8bfd8', IIf(Fields.RSCompleteFG = 32, '#deb887', IIf(Fields.RSCompleteFG = 33, '#ffd700', IIf(Fields.RSCompleteFG = 34, '#e6e6fa', IIf(Fields.RSCompleteFG = 35, '#a9a9a9', '<<JOB_FG>>'))))))))))))))))))))))))))))))))
```

**MoveClass** (DataType: String)
```
= IIf(Fields.FGColor = 8 And Fields.JobClass = 0, 'StepHead', IIf(Fields.MoveType = 'Dead', 'DeadMove', IIf(IsNull(Fields.G, 0) > 0 And CStr(IsNull(Fields.GroundsOn, 'X')) <> 'X', 'Ground', 'Job')))
```

**Move_BG** (DataType: String)
```
= IIf(Fields.FGColor = 8 And Fields.JobClass = 0, '<<STEPHEAD_BG>>', IIf(Fields.MoveType = 'Dead', '<<DEADMOVE_BG>>', IIf(IsNull(Fields.G, 0) > 0 And CStr(IsNull(Fields.GroundsOn, 'X')) <> 'X', '<<GROUND_BG>>', '<<JOB_BG>>')))
```

**Move_FG** (DataType: String)
```
= IIf(Fields.FGColor = 8 And Fields.JobClass = 0, '<<STEPHEAD_FG>>', IIf(Fields.MoveType = 'Dead', '<<DEADMOVE_FG>>', IIf(IsNull(Fields.G, 0) > 0 And CStr(IsNull(Fields.GroundsOn, 'X')) <> 'X', '<<GROUND_FG>>', '<<JOB_FG>>')))
```

**G_BG** (DataType: String)
```
= IIf(Not (Fields.FGColor = 8 And Fields.JobClass = 0) And Not (Fields.MoveType = 'Dead') And IsNull(Fields.G, 0) > 0 And CStr(IsNull(Fields.GroundsOn, 'X')) <> 'X', '<<GROUND_BG>>', '<<JOB_BG>>')
```

**G_FG** (DataType: String)
```
= IIf(Not (Fields.FGColor = 8 And Fields.JobClass = 0) And Not (Fields.MoveType = 'Dead') And IsNull(Fields.G, 0) > 0 And CStr(IsNull(Fields.GroundsOn, 'X')) <> 'X', '<<GROUND_FG>>', '<<JOB_FG>>')
```

**Origin_BG** (DataType: String)
```
= IIf(Fields.PhaseCheckColor = 6, '<<PHASECHECK_BG>>', IIf(Fields.PhaseCheckColor = 26, '<<ALTPHASECHECK_BG>>', IIf(Fields.MoveOrigin = 'N', '<<GRAYOUT_BG>>', '<<JOB_BG>>')))
```

**Origin_FG** (DataType: String)
```
= IIf(Fields.PhaseCheckColor = 6, '<<PHASECHECK_FG>>', IIf(Fields.PhaseCheckColor = 26, '<<ALTPHASECHECK_FG>>', IIf(Fields.MoveOrigin = 'N', '<<GRAYOUT_FG>>', '<<JOB_FG>>')))
```

**OriginText** (DataType: String)
```
= IIf(Fields.PhaseCheckColor = 6 Or Fields.PhaseCheckColor = 26, Fields.MoveOrigin, IIf(Fields.MoveOrigin = 'S' And Parameters.ArchFlag.Value <> 0, '', Fields.MoveOrigin))
```

### Notes on these expressions
- They implement exactly the same rules as the SQL in Step 2 and the table in Sheet C: first match wins, code 0 or an unmapped code falls back to the `Job` color, and `N` origin or an empty date gives `GrayOut`.
- `G_BG` / `G_FG` repeat the Move conditions (not Step Heading, not Dead, is Ground). This keeps each field self-contained.
- `MoveClass` is only needed for the Step 4 conditional formatting (centering Step Heading rows).
- The long nested `IIf` is the 31-entry color map. It was generated by script from `database.js`, not typed by hand. If you edit it, keep every `(` matched with a `)`.

---

## STEP 3 — Detail section: what to put on each text box

For every row below:
- **Value:** set the text box `Value` property.
- **Bindings:** Properties → `Bindings` → `...` → **Add** one entry per line (Property path + Expression).

| # | Column header | Text box Value | Binding 1: `Style.BackgroundColor` | Binding 2: `Style.Color` | Extra |
|---|---|---|---|---|---|
| 1 | TO Issued | `= Fields.TOIssued` | `= Fields.TOIssued_BG` | `= Fields.TOIssued_FG` | Left align. Set date format to match the screen. |
| 2 | TO Complete | `= Fields.TOComplete` | `= Fields.TOComplete_BG` | `= Fields.TOComplete_FG` | Left align. Same date format. |
| 3 | ID | `= Fields.PrintID` | — none — | — none — | Center. Static style = `.Job` colors. |
| 4 | Type | `= Fields.EquipClassName` | — none — | — none — | Left. Static `.Job`. |
| 5 | Equipment | `= Fields.EquipName` | — none — | — none — | Left. Static `.Job`. |
| 6 | G | `= Fields.G` | `= Fields.G_BG` | `= Fields.G_FG` | Center. |
| 7 | Move | `= Fields.TOMove` | `= Fields.Move_BG` | `= Fields.Move_FG` | Left. **Plus Conditional Formatting (Step 4).** |
| 8 | (blank header) Origin | `= Fields.OriginText` | `= Fields.Origin_BG` | `= Fields.Origin_FG` | Center. Note: Value is **OriginText**, not MoveOrigin. |
| 9 | Response | `= Fields.Response` | — none — | — none — | Left. Static `.Job`. |
| 10 | RS Issued | `= Fields.RSIssued` | `= Fields.RSIssued_BG` | `= Fields.RSIssued_FG` | Left. Same date format. |
| 11 | RS Complete | `= Fields.RSComplete` | `= Fields.RSComplete_BG` | `= Fields.RSComplete_FG` | Left. Same date format. |

That is all the color logic for the job grid: **8 text boxes × 2 bindings = 16 bindings.**

---

## STEP 4 — Conditional Formatting (only on the Move text box, column 7)

Step Heading rows are **centered** on screen. Colors are already handled by the bindings; this step handles alignment only.

Select the **Move** text box → Properties → `ConditionalFormatting` → `...` → **New Rule**:

| Rule | Filter Expression | Operator | Value | Style to set |
|---|---|---|---|---|
| 1 | `= Fields.MoveClass` | `=` | `='StepHead'` | TextAlign = **Center** |

**Only if Sheet B showed bold/italic in a CSS class:** add one more rule per class on the affected text box. Use the same pattern: Filter `= Fields.MoveClass` (or `= Fields.OriginClass` for the Origin box) `=` `='DeadMove'` → Font Bold. Class name values you can use: `StepHead`, `DeadMove`, `Ground`, `Job` (Move/G) and `PhaseCheck`, `AltPhaseCheck`, `GrayOut`, `Job` (Origin).

---

## STEP 5 — Card header (report header / card data source)

In the card header query, add these two columns (same `<<TOKEN>>` replacement as Step 2):

```sql
CASE WHEN TypeOfCard = 10062 THEN '<<FMS4KV_BG>>' ELSE '<<FMSCARD_BG>>' END AS Header_BG,

CASE WHEN Value1 IS NOT NULL AND Value1 <> 0 THEN '<<HEADREVERSE_BG>>' ELSE '<<CARDFIELD_BG>>' END AS CardClass_BG,
CASE WHEN Value1 IS NOT NULL AND Value1 <> 0 THEN '<<HEADREVERSE_FG>>' ELSE '<<CARDFIELD_FG>>' END AS CardClass_FG
```
(`Value1 <> 0` assumes `Value1` is numeric. If it is text, use `Value1 <> ''`. The screen treats the flag as ON when it is not empty, not 0, and not null.)

| Header element | What to do |
|---|---|
| Header panel (container behind all header boxes) | Binding `Style.BackgroundColor` = `= Fields.Header_BG` |
| Card class box (shows CardClassName) | Binding `Style.BackgroundColor` = `= Fields.CardClass_BG`, `Style.Color` = `= Fields.CardClass_FG` |
| "Station Ground:" label + its value box | **Static** style: `.Ground` colors (no logic) |
| "Grounds:" label + its value box | **Static** style: `.Ground` colors |
| "Dead Moves:" label + its value box | **Static** style: `.DeadMove` colors |
| "Taken Out:" label + its value box | **Static** style: `.TakeOut` colors |
| All other header boxes (Cut Out, Cut In, loops, Delay, Operating Step, Substation, Position) | **Static** style: `.Job` / `.CardField` colors |
| Feeder name box | Same as header panel (`= Fields.Header_BG`). *Exception on screen:* if the card has an expanded feeder list where any feeder's type ≠ 1, the screen uses the 4KV color. If your cards have such lists, add that condition to `Header_BG` for this one box only. |

The job grid background is **always** `.FMSCard` (even for 4KV cards). Only the header changes.

---

## STEP 6 — Test against the live screen

Open the same card on screen and in the PDF preview. Check each case cell by cell:

| Test case | Cell(s) to compare |
|---|---|
| A move with a colored TO/RS timestamp | Columns 1, 2, 10, 11 |
| A move with origin `N` | Columns 1, 2, 8, 10, 11 should all be gray; timestamps still show |
| A move with an empty TO or RS date | That cell gray and blank (**confirms the NULL assumption**) |
| A Step Heading row | Move centered, StepHead color |
| A Dead move | Move = DeadMove color |
| A Ground move | G **and** Move = Ground color (**confirms the GroundsOn assumption**) |
| Phase check red / pale red | Origin cell |
| Origin `S` on an active card vs a closed card | Shows `S` / blank |
| A 4KV card | Header background |

If a Ground or empty-date case does not match, fix only the matching `CASE` line in Step 2. Nothing in the `.trdx` needs to change.
