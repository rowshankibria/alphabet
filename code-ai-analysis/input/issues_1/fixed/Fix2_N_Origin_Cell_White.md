# Fix 2 — "N" cell next to the Move column must stay white

**Benchmark:** `2w61-dos.pdf`, page 1: both `N` rows (B PADMNT) show the `N` cell **white**.
**Our report:** `2w61-rpt.pdf`: the `N` cell is **gray**.

Pixels sampled from the PDFs: benchmark `#ffffff`, our report `#808080`.

## 1. Cause

The `.trdx` had this rule on `txtAct`: *ActivityIdentifier = "N" → GrayOut*. I copied it from the **web screen** logic:

| Source | What it says |
|---|---|
| `feedercard.js` 884–887 | Web screen: `kMoveOrigin == 'N'` → `<td class=GrayOut>N</td>` |
| `fms.css` 251–253 | `.GrayOut` = background silver |
| `ca.dmt` 104493–104495 | For an N move, `PhaseCheckColor = CC_PALE_GRAY` (35) |

The DOS PDF (your benchmark) does **not** paint this cell for `N`. It only colours it for phase check red (6) and pale red (26). The web screen and the DOS PDF differ here, and the report must follow the DOS PDF.

## 2. The logic now (cell next to Move, `txtAct`)

| Order | Condition | Background / text |
|---|---|---|
| 1 | PhaseCheckColor = 6 | `PhaseCheckBg` / `PhaseCheckFg` (red) |
| 2 | PhaseCheckColor = 26 | `AltPhaseCheckBg` / `AltPhaseCheckFg` (pale red) |
| 3 | anything else, **including N** | `JobBg` / `JobFg` (white / black) |

Text shown in the cell is unchanged: the ActivityIdentifier (`N`, `S`, `T` …). `S` is hidden on closed cards (`ArchFlag` ≠ 0) unless the cell is red or pale red.

The **other cells** of an N row are not affected. TO/RS Issued/Complete stay gray for N, which matches the benchmark (2W61 row B "Check Elbows Dead": dates 06/03 15:48 on gray).

## 3. Steps

Only the `.trdx` changes. It's already done in the delivered `FeederCard.trdx`, `txtAct`:

| Line | Property | Expression |
|---|---|---|
| 377 | Style.BackgroundColor | `= IIf(Fields.PhaseCheckColor = 6, Parameters.PhaseCheckBg.Value, IIf(Fields.PhaseCheckColor = 26, Parameters.AltPhaseCheckBg.Value, Parameters.JobBg.Value))` |
| 378 | Style.Color | `= IIf(Fields.PhaseCheckColor = 6, Parameters.PhaseCheckFg.Value, IIf(Fields.PhaseCheckColor = 26, Parameters.AltPhaseCheckFg.Value, Parameters.JobFg.Value))` |

Removed from both: `IIf(Fields.ActivityIdentifier = "N", Parameters.GrayOut….Value, …)`.

These are the same two lines as Fix 1, so this fix also needs the Fix 1 C# (`PhaseCheckColor`) to be in place.

## 4. Test

Generate **2W61**. Page 1: both rows with `N` must show `N` on **white**; their Issued/Complete cells stay gray.

## 5. Checked

The new expressions were evaluated for PhaseCheckColor 0/1/6/26/35 × ActivityIdentifier N/S/T/A/blank × open/closed card (50 cases). `N` is never gray, and red/pale red still work.

## 6. Open item

This deliberately differs from the **web screen**, which grays the `N` cell. If anyone compares the PDF with the screen instead of the DOS PDF, this cell will differ. Confirm with the SME that the DOS PDF is the reference.
