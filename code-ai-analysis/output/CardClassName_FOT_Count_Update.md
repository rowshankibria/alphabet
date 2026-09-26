# Card Class Name (FOT1 / Auto+ / CIOA+): Step-by-Step C# Update

**Problem:** 1.pdf shows **FOT1**, but 2.pdf shows **FOT**.

**Cause:** the legacy `ca.dmt` method `LoadCard` (lines **67922–67942**) changes the name after reading `FMS_Card.CardClassName`. The new service reads the column and stops there.

| Card class | Legacy rule (ca.dmt) | Shows |
|---|---|---|
| FOT (10100) | `SELECT FOTCount FROM IR_FOTCount WHERE Card = :Card`; if not 0, append it | `FOT1`, `FOT2`, … |
| Auto (10116) / CIOA (10165) | If `OpenAutoPlus IS NOT NULL AND <> ''`, append `+` | `Auto+`, `CIOA+` |

- **Applies to live and archived cards.** The block runs after both the `FMS_Card` and the `FMS_ArchiveCard` load (it's outside the `IF ArchiveCard` block, which ends at line 67864).
- **Constants:** from `Constant.vb`: `Type_FOT` 10100 (line 837), `Type_Auto` 10116 (line 743), `Type_CIOA` 10165 (line 766). Same values in `ds.js`.
- **Web screen:** `fcardjs.txt` line 458 checks for `"Auto+"`, which confirms the screen receives the changed name.

**Where it goes:** in the repository, right after the card header is loaded. That's the same place the legacy code does it (inside `LoadCard`). `ComposeCard`, `BuildHeaderParameters` and the `.trdx` **don't change**: the `CardClassName` parameter simply receives `FOT1`.

---

## Step 1 — `FMSQueries` (`query.cs`): add one query

Add below `LoadCardHeaderArchive`:

```csharp
        // ca.dmt LoadCard 67934-67936
        public const string LoadFotCount = @"
            SELECT FOTCount
            FROM   IR_FOTCount
            WHERE  Card = ?";
```

## Step 2 — New file `Engine/Colors/CardHeaderRules.cs`

Put it in the same folder as `FmsColors.cs`.

```csharp
using System;
using System.Globalization;
using FMS_PDFReportService.Models.Cards;

namespace FMS_PDFReportService.Engine.Colors
{
    // Port of ca.dmt METHOD LoadCard, lines 67922-67942 (runs for live AND archived cards)
    public static class CardHeaderRules
    {
        public const int Type_FOT  = 10100;   // Constant.vb:837  Type$FOT   (ds.js kdb_FMS_Card_FOT)
        public const int Type_Auto = 10116;   // Constant.vb:743  Type$Auto  (ds.js kdb_FMS_Card_AUTO)
        public const int Type_CIOA = 10165;   // Constant.vb:766  Type$CIOA  (ds.js kdb_FMS_Card_CIOA)

        public static void ApplyCardClassSuffix(FmsCardHeader h, Func<int?> loadFotCount)
        {
            if (h == null) return;

            // 67925-67930: Auto / CIOA with OpenAutoPlus set -> append '+'
            if ((h.CardClass == Type_Auto || h.CardClass == Type_CIOA) && IsSet(h.OpenAutoPlus))
                h.CardClassName = (h.CardClassName ?? "").TrimEnd() + "+";

            // 67932-67942: FOT -> append FOTCount from IR_FOTCount when it is not 0
            if (h.CardClass == Type_FOT)
            {
                int fotCount = loadFotCount() ?? 0;      // no row -> 0 (OpenROAD sets FOTCount = 0 before the SELECT)
                if (fotCount != 0)
                    h.CardClassName = (h.CardClassName ?? "").TrimEnd() + fotCount.ToString(CultureInfo.InvariantCulture);
            }
        }

        // OpenROAD: OpenAutoPlus IS NOT NULL AND OpenAutoPlus <> ''
        // Works whatever the C# type of OpenAutoPlus is (string, DateTime, DateTime?).
        private static bool IsSet(object v)
        {
            if (v == null) return false;
            var s = v as string;
            if (s != null) return s.Trim().Length > 0;
            if (v is DateTime)
            {
                var d = (DateTime)v;
                if (d == DateTime.MinValue) return false;                                     // NULL read into a non-nullable DateTime
                return !(d.Month == 12 && d.Day == 31 && d.Hour == 23 && d.Minute == 59);   // Ingres '' date
            }
            return true;
        }
    }
}
```

## Step 3 — `FMSCardRepository` (`repository.cs`): change `LoadCardHeader`

Add at the top of the file:

```csharp
using FMS_PDFReportService.Engine.Colors;
```

Replace the whole `LoadCardHeader` method with:

```csharp
        public FmsCardHeader LoadCardHeader(int cardId, int archiveFlag)
        {
            var sql = archiveFlag == 1 ? FMSQueries.LoadCardHeaderArchive : FMSQueries.LoadCardHeader;
            var sw = Stopwatch.StartNew();
            using (var conn = _connectionFactory.GetConnection())
            {
                var result = conn.QueryFirstOrDefault<FmsCardHeader>(sql, new { p1 = cardId });

                // ca.dmt LoadCard 67922-67942: FOT count / Auto+ / CIOA+ (live and archived cards)
                CardHeaderRules.ApplyCardClassSuffix(result,
                    () => conn.QueryFirstOrDefault<int?>(FMSQueries.LoadFotCount, new { p1 = cardId }));

                Log.Debug("FMS LoadCardHeader CardId={CardId} Archive={Archive} in {ElapsedMs}ms",
                    cardId, archiveFlag, sw.ElapsedMilliseconds);
                return result;
            }
        }
```

The only new lines are the two `CardHeaderRules…` lines; everything else is your existing method. The FOT query runs only for FOT cards.

## Step 4 — Nothing else

| File | Change |
|---|---|
| `IFMSCardRepository` | None (the method signature is unchanged) |
| `ComposeCard` / `BuildHeaderParameters` | None (it already passes `header.CardClassName`) |
| `.trdx` | None (`pgCardClass` and `txtCardClass` show `Parameters.CardClassName.Value`) |

## Step 5 — Test

1. Generate card **23M61 / 52N**. The header and the page-2 heading must show **FOT1**, as in 1.pdf.
2. If you have one, test an **Auto** or **CIOA** card with Open Auto Plus set. It must show `Auto+` / `CIOA+`, the same as the web screen.
3. Test a card of another class, e.g. WR or SCHD. The name must be unchanged.

## Notes

- **Checked:** the code compiles whether `FmsCardHeader.OpenAutoPlus` is `string`, `DateTime` or `DateTime?`, and 9 tests pass (FOT1, padded names, no `IR_FOTCount` row, count 0, Auto+, blank Open Auto Plus, other classes, null header).
- **Trailing spaces:** the name is trimmed before appending, so a space-padded column value gives `FOT1`, not `FOT   1`.
- **Not included:** the **TV Bogey** rule in the same method (lines 67912–67921). When `TV_Bogey > 0`, the card-class box is shown in reverse video (black background, white text) with a reason text. It needs a `.trdx` change and is a separate step.
