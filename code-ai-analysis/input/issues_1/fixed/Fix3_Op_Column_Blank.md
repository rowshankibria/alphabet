# Fix 3 — Op columns must be blank

**Benchmarks:** `1B51-dos.pdf` and `2w61-dos.pdf`: **Op** under *Take Out* and under *Restore* is empty in every row.
**Our report:** Restore **Op** shows numbers, e.g. `234062`, `176642`, `10003` (1B51) and `236137`, `122432`, `0` (2W61). Take Out Op was already empty.

## 1. Cause

`txtRSOp` printed **`Fields.RSOperator`**, which is the raw operator **object ID** from `SOA_Job.RSOperator`, not something meant for display:

| Value seen | Meaning (`Constant.vb`) |
|---|---|
| `10001` | `Operator_OpOrder` (line 371) |
| `10002` | `Operator_FCR` (line 366) |
| `10003` | `Operator_FOD` (line 367) |
| `234062`, `176642` … | an individual operator's object ID |
| `0` | no operator |

- **`feedercard.js`:** the web screen has **no Op column at all**. `card_LoadJobHeader` (lines 758–789) builds Issued/Complete/ID/Type/Equipment/G/Move/origin/Response/Issued/Complete only.
- **`fms.css` / `database.js`:** nothing about Op.
- **DOS PDF:** has the Op header but leaves the cells empty, in every row of both benchmarks, for every operator type (OpOrder, FOD, individual operators, none).

## 2. The logic now

| Column | Value |
|---|---|
| Take Out Op (`txtTOOp`) | blank (no change; it was already `""`) |
| Restore Op (`txtRSOp`) | **blank** |

The two **Op header** cells stay, as in the benchmark.

## 3. Steps

Only the `.trdx` changes. It's already done in the delivered `FeederCard.trdx`:

| Line | Item | Before | After |
|---|---|---|---|
| 393 | `txtRSOp` Value | `= Fields.RSOperator` | *(empty)* |

No C# change is needed.

## 4. Test

Generate **1B51** and **2W61**. Both Op columns must be empty on every page.

## 5. Open item

The DOS report's own code isn't in the files, so "always blank" comes from both benchmarks (every row) plus the web screen having no Op column. It isn't proven for every possible card. If a benchmark ever shows something in Op, send it and I'll trace what it prints.
