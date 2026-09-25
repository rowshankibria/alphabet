# Timestamp Colors (incl. Green #90ee90): .trdx + C# Implementation

Covers the 4 date fields: **TO Issued, TO Complete, RS Issued, RS Complete**.

- **C#** calculates each cell's color code after `LoadJobs`, using the same rules as `ca.dmt` `SetFMSColors`, with constant values from `Constant.vb`.
- **.trdx** turns each code into a color through **parameters**, so support can change any color in the designer.

Order of work: **Part A** (.trdx), then **Part B** (C#), then **Part C** (test).

---

## PART A — .trdx changes (`default.template`)

### A1. GrayOut color: keep `#808080`

Benchmark `1.pdf` uses gray **#808080** (sampled from the PDF). Make sure `GrayOutBg` is:

```xml
    <ReportParameter Name="GrayOutBg">
      <Value>
        <String>#808080</String>
      </Value>
    </ReportParameter>
```

### A2. Add 7 color parameters

Paste just before `</ReportParameters>`:

```xml
    <ReportParameter Name="FmsPaleGreen">
      <Value>
        <String>#90ee90</String>
      </Value>
    </ReportParameter>
    <ReportParameter Name="FmsRed">
      <Value>
        <String>#ff0000</String>
      </Value>
    </ReportParameter>
    <ReportParameter Name="FmsYellow">
      <Value>
        <String>#ffff00</String>
      </Value>
    </ReportParameter>
    <ReportParameter Name="FmsPaleRed">
      <Value>
        <String>#ffb6c1</String>
      </Value>
    </ReportParameter>
    <ReportParameter Name="FmsLightBrown">
      <Value>
        <String>#d2b48c</String>
      </Value>
    </ReportParameter>
    <ReportParameter Name="FmsPaleGray">
      <Value>
        <String>#a9a9a9</String>
      </Value>
    </ReportParameter>
    <ReportParameter Name="FmsBlack">
      <Value>
        <String>#000000</String>
      </Value>
    </ReportParameter>
```

| Parameter | Color code (from C#) | Default |
|---|---|---|
| `FmsPaleGreen` | 27 PALE_GREEN | `#90ee90` |
| `FmsRed` | 6 RED | `#ff0000` |
| `FmsYellow` | 9 YELLOW | `#ffff00` |
| `FmsPaleRed` | 26 PALE_RED | `#ffb6c1` |
| `FmsLightBrown` | 22 LIGHT_BROWN | `#d2b48c` |
| `FmsPaleGray` | 35 PALE_GRAY | `#a9a9a9` |
| `FmsBlack` | 1 BLACK | `#000000` |

These are the only codes the C# calculator produces. Any other value falls back to `JobBg` / `JobFg`.

### A3. Replace the 4 date fields

Only the two color bindings change. Priority: **GrayOut** (ActivityIdentifier = N, or the date is Ingres `''`, which arrives as `12/31 23:59`), then **the code from C#**, then **Job**.

A **NULL** date (step not done yet) is **not** gray. This matches `fcardjs.txt`, which only grays `== ''`, and benchmark `1.pdf`.

#### `txtTOIssued`: replace lines 285–296 (in `card-fdr.trdx`)

```xml
        <TextBox Width="0.75in" Height="0.34in" Left="0.35in" Top="0in" Value="= IIf(Format(&quot;{0:MM/dd HH:mm}&quot;, Fields.TOIssued) = &quot;12/31 23:59&quot;, &quot;&quot;, Format(&quot;{0:MM/dd HH:mm}&quot;, Fields.TOIssued))" Name="txtTOIssued">
          <Style TextAlign="Center" VerticalAlign="Middle">
            <Font Name="Arial" Size="10px" />
            <BorderStyle Default="Solid" />
            <BorderWidth Default="0.5pt" />
          </Style>
          <Bindings>
            <Binding Path="Visible" Expression="= Fields.JobClass &lt;&gt; 0" />
            <Binding Path="Style.BackgroundColor" Expression="= IIf(Fields.ActivityIdentifier = &quot;N&quot; Or Format(&quot;{0:MM/dd HH:mm}&quot;, Fields.TOIssued) = &quot;12/31 23:59&quot;, Parameters.GrayOutBg.Value, IIf(Fields.TOIssuedBG = 27, Parameters.FmsPaleGreen.Value, IIf(Fields.TOIssuedBG = 6, Parameters.FmsRed.Value, IIf(Fields.TOIssuedBG = 9, Parameters.FmsYellow.Value, IIf(Fields.TOIssuedBG = 26, Parameters.FmsPaleRed.Value, IIf(Fields.TOIssuedBG = 22, Parameters.FmsLightBrown.Value, IIf(Fields.TOIssuedBG = 35, Parameters.FmsPaleGray.Value, IIf(Fields.TOIssuedBG = 1, Parameters.FmsBlack.Value, Parameters.JobBg.Value))))))))" />
            <Binding Path="Style.Color" Expression="= IIf(Fields.ActivityIdentifier = &quot;N&quot; Or Format(&quot;{0:MM/dd HH:mm}&quot;, Fields.TOIssued) = &quot;12/31 23:59&quot;, Parameters.GrayOutFg.Value, IIf(Fields.TOIssuedFG = 27, Parameters.FmsPaleGreen.Value, IIf(Fields.TOIssuedFG = 6, Parameters.FmsRed.Value, IIf(Fields.TOIssuedFG = 9, Parameters.FmsYellow.Value, IIf(Fields.TOIssuedFG = 26, Parameters.FmsPaleRed.Value, IIf(Fields.TOIssuedFG = 22, Parameters.FmsLightBrown.Value, IIf(Fields.TOIssuedFG = 35, Parameters.FmsPaleGray.Value, IIf(Fields.TOIssuedFG = 1, Parameters.FmsBlack.Value, Parameters.JobFg.Value))))))))" />
          </Bindings>
        </TextBox>
```

#### `txtTOComplete`: replace lines 297–308 (in `card-fdr.trdx`)

```xml
        <TextBox Width="0.75in" Height="0.34in" Left="1.1in" Top="0in" Value="= IIf(Format(&quot;{0:MM/dd HH:mm}&quot;, Fields.TOComplete) = &quot;12/31 23:59&quot;, &quot;&quot;, Format(&quot;{0:MM/dd HH:mm}&quot;, Fields.TOComplete))" Name="txtTOComplete">
          <Style TextAlign="Center" VerticalAlign="Middle">
            <Font Name="Arial" Size="10px" />
            <BorderStyle Default="Solid" />
            <BorderWidth Default="0.5pt" />
          </Style>
          <Bindings>
            <Binding Path="Visible" Expression="= Fields.JobClass &lt;&gt; 0" />
            <Binding Path="Style.BackgroundColor" Expression="= IIf(Fields.ActivityIdentifier = &quot;N&quot; Or Format(&quot;{0:MM/dd HH:mm}&quot;, Fields.TOComplete) = &quot;12/31 23:59&quot;, Parameters.GrayOutBg.Value, IIf(Fields.TOCompleteBG = 27, Parameters.FmsPaleGreen.Value, IIf(Fields.TOCompleteBG = 6, Parameters.FmsRed.Value, IIf(Fields.TOCompleteBG = 9, Parameters.FmsYellow.Value, IIf(Fields.TOCompleteBG = 26, Parameters.FmsPaleRed.Value, IIf(Fields.TOCompleteBG = 22, Parameters.FmsLightBrown.Value, IIf(Fields.TOCompleteBG = 35, Parameters.FmsPaleGray.Value, IIf(Fields.TOCompleteBG = 1, Parameters.FmsBlack.Value, Parameters.JobBg.Value))))))))" />
            <Binding Path="Style.Color" Expression="= IIf(Fields.ActivityIdentifier = &quot;N&quot; Or Format(&quot;{0:MM/dd HH:mm}&quot;, Fields.TOComplete) = &quot;12/31 23:59&quot;, Parameters.GrayOutFg.Value, IIf(Fields.TOCompleteFG = 27, Parameters.FmsPaleGreen.Value, IIf(Fields.TOCompleteFG = 6, Parameters.FmsRed.Value, IIf(Fields.TOCompleteFG = 9, Parameters.FmsYellow.Value, IIf(Fields.TOCompleteFG = 26, Parameters.FmsPaleRed.Value, IIf(Fields.TOCompleteFG = 22, Parameters.FmsLightBrown.Value, IIf(Fields.TOCompleteFG = 35, Parameters.FmsPaleGray.Value, IIf(Fields.TOCompleteFG = 1, Parameters.FmsBlack.Value, Parameters.JobFg.Value))))))))" />
          </Bindings>
        </TextBox>
```

#### `txtRSIssued`: replace lines 403–414 (in `card-fdr.trdx`)

```xml
        <TextBox Width="0.72in" Height="0.34in" Left="8.55in" Top="0in" Value="= IIf(Format(&quot;{0:MM/dd HH:mm}&quot;, Fields.RSIssued) = &quot;12/31 23:59&quot;, &quot;&quot;, Format(&quot;{0:MM/dd HH:mm}&quot;, Fields.RSIssued))" Name="txtRSIssued">
          <Style TextAlign="Center" VerticalAlign="Middle">
            <Font Name="Arial" Size="10px" />
            <BorderStyle Default="Solid" />
            <BorderWidth Default="0.5pt" />
          </Style>
          <Bindings>
            <Binding Path="Visible" Expression="= Fields.JobClass &lt;&gt; 0" />
            <Binding Path="Style.BackgroundColor" Expression="= IIf(Fields.ActivityIdentifier = &quot;N&quot; Or Format(&quot;{0:MM/dd HH:mm}&quot;, Fields.RSIssued) = &quot;12/31 23:59&quot;, Parameters.GrayOutBg.Value, IIf(Fields.RSIssuedBG = 27, Parameters.FmsPaleGreen.Value, IIf(Fields.RSIssuedBG = 6, Parameters.FmsRed.Value, IIf(Fields.RSIssuedBG = 9, Parameters.FmsYellow.Value, IIf(Fields.RSIssuedBG = 26, Parameters.FmsPaleRed.Value, IIf(Fields.RSIssuedBG = 22, Parameters.FmsLightBrown.Value, IIf(Fields.RSIssuedBG = 35, Parameters.FmsPaleGray.Value, IIf(Fields.RSIssuedBG = 1, Parameters.FmsBlack.Value, Parameters.JobBg.Value))))))))" />
            <Binding Path="Style.Color" Expression="= IIf(Fields.ActivityIdentifier = &quot;N&quot; Or Format(&quot;{0:MM/dd HH:mm}&quot;, Fields.RSIssued) = &quot;12/31 23:59&quot;, Parameters.GrayOutFg.Value, IIf(Fields.RSIssuedFG = 27, Parameters.FmsPaleGreen.Value, IIf(Fields.RSIssuedFG = 6, Parameters.FmsRed.Value, IIf(Fields.RSIssuedFG = 9, Parameters.FmsYellow.Value, IIf(Fields.RSIssuedFG = 26, Parameters.FmsPaleRed.Value, IIf(Fields.RSIssuedFG = 22, Parameters.FmsLightBrown.Value, IIf(Fields.RSIssuedFG = 35, Parameters.FmsPaleGray.Value, IIf(Fields.RSIssuedFG = 1, Parameters.FmsBlack.Value, Parameters.JobFg.Value))))))))" />
          </Bindings>
        </TextBox>
```

#### `txtRSComplete`: replace lines 415–426 (in `card-fdr.trdx`)

```xml
        <TextBox Width="0.72in" Height="0.34in" Left="9.27in" Top="0in" Value="= IIf(Format(&quot;{0:MM/dd HH:mm}&quot;, Fields.RSComplete) = &quot;12/31 23:59&quot;, &quot;&quot;, Format(&quot;{0:MM/dd HH:mm}&quot;, Fields.RSComplete))" Name="txtRSComplete">
          <Style TextAlign="Center" VerticalAlign="Middle">
            <Font Name="Arial" Size="10px" />
            <BorderStyle Default="Solid" />
            <BorderWidth Default="0.5pt" />
          </Style>
          <Bindings>
            <Binding Path="Visible" Expression="= Fields.JobClass &lt;&gt; 0" />
            <Binding Path="Style.BackgroundColor" Expression="= IIf(Fields.ActivityIdentifier = &quot;N&quot; Or Format(&quot;{0:MM/dd HH:mm}&quot;, Fields.RSComplete) = &quot;12/31 23:59&quot;, Parameters.GrayOutBg.Value, IIf(Fields.RSCompleteBG = 27, Parameters.FmsPaleGreen.Value, IIf(Fields.RSCompleteBG = 6, Parameters.FmsRed.Value, IIf(Fields.RSCompleteBG = 9, Parameters.FmsYellow.Value, IIf(Fields.RSCompleteBG = 26, Parameters.FmsPaleRed.Value, IIf(Fields.RSCompleteBG = 22, Parameters.FmsLightBrown.Value, IIf(Fields.RSCompleteBG = 35, Parameters.FmsPaleGray.Value, IIf(Fields.RSCompleteBG = 1, Parameters.FmsBlack.Value, Parameters.JobBg.Value))))))))" />
            <Binding Path="Style.Color" Expression="= IIf(Fields.ActivityIdentifier = &quot;N&quot; Or Format(&quot;{0:MM/dd HH:mm}&quot;, Fields.RSComplete) = &quot;12/31 23:59&quot;, Parameters.GrayOutFg.Value, IIf(Fields.RSCompleteFG = 27, Parameters.FmsPaleGreen.Value, IIf(Fields.RSCompleteFG = 6, Parameters.FmsRed.Value, IIf(Fields.RSCompleteFG = 9, Parameters.FmsYellow.Value, IIf(Fields.RSCompleteFG = 26, Parameters.FmsPaleRed.Value, IIf(Fields.RSCompleteFG = 22, Parameters.FmsLightBrown.Value, IIf(Fields.RSCompleteFG = 35, Parameters.FmsPaleGray.Value, IIf(Fields.RSCompleteFG = 1, Parameters.FmsBlack.Value, Parameters.JobFg.Value))))))))" />
          </Bindings>
        </TextBox>
```

---

## PART B — C# changes

### B1. `FmsJob`: add 8 properties

They're filled in by C#, not by SQL, so `LoadJobs` doesn't change.

```csharp
public int TOIssuedBG   { get; set; }
public int TOIssuedFG   { get; set; }
public int TOCompleteBG { get; set; }
public int TOCompleteFG { get; set; }
public int RSIssuedBG   { get; set; }
public int RSIssuedFG   { get; set; }
public int RSCompleteBG { get; set; }
public int RSCompleteFG { get; set; }
```

### B2. New file `Engine/Colors/FmsColors.cs`

Contains the constants (with `Constant.vb` line numbers), the row classes for the new queries, and the calculator (a port of `ca.dmt` `SetFMSColors`, lines 105040–105431).

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
                                   public DateTime? AlertTime { get; set; } public int InitialAlert { get; set; } }

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
        public static bool IsNull(DateTime? d)  { return d == null; }
        public static bool IsBlank(DateTime? d) { return d != null && d.Value.Month == 12 && d.Value.Day == 31 && d.Value.Hour == 23 && d.Value.Minute == 59; }
        public static bool HasValue(DateTime? d) { return !IsNull(d) && !IsBlank(d); }

        private static int ToInt(string s) { int v; return int.TryParse((s ?? "").Trim(), out v) ? v : -1; }

        // ca.dmt 105079-105095 / 105195-105211 / 105288-105304 / 105368-105388
        private static void PickColor(FmsColorInputs inp, int alertType, int alertObject, int alertStatus,
                                      bool acknowledged, bool paleRed, out int bg, out int fg)
        {
            var bt = inp.Alerts.FirstOrDefault(a => a.Type == alertType && a.Object == alertObject && a.Status == alertStatus);
            DateTime? alertTime = bt == null ? null : bt.AlertTime;

            if (alertTime != null && alertTime.Value < inp.Now)          { bg = FmsConstants.CC_RED;        fg = FmsConstants.CC_BLACK; }
            else if (alertTime != null && bt.InitialAlert == 0)          { bg = FmsConstants.CC_YELLOW;     fg = FmsConstants.CC_BLACK; }
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

Notes:
- It compiles whether `FmsJob` dates are `DateTime` or `DateTime?`.
- It assumes `TOOperator` / `RSOperator` are `string`, as your Data Explorer shows. If they are `int`, replace `ToInt(j.TOOperator)` with `j.TOOperator`, and the same for `RSOperator`.

### B3. `FMSQueries`: add these queries

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
```

Numbers in the SQL come from `Constant.vb`: 10/15/20/50 = Order Opened/Downloaded/Acknowledged/Closed; 10 = Fault_Received; 15 = BlockStatus_Wait; 0/1 = Job_TakeOutInt/Job_RestoreInt.

### B4. `IFMSCardRepository`: add

```csharp
FmsColorInputs LoadFmsColorInputs(int cardId);
```

### B5. `FMSCardRepository`: add

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
```
Add `using FMS_PDFReportService.Engine.Colors;` at the top of the repository and interface files.

### B6. `FMSGrouper.ComposeCard`: replace the `jobs` line

Before:
```csharp
            var jobs = _repo.LoadJobs(cardId, request.ArchiveFlag);
```
After:
```csharp
            var jobs = _repo.LoadJobs(cardId, request.ArchiveFlag).ToList();
            if (request.ArchiveFlag == 0)
                FmsColorCalculator.Apply(jobs, _repo.LoadFmsColorInputs(cardId));
```
Add `using FMS_PDFReportService.Engine.Colors;` at the top.

---

## PART C — Test

1. Open the **52N** card on the web screen and generate the PDF.
2. Compare every TO/RS Issued/Complete cell. The **"To FCR: MAKE FAULT REPAIRS"** row's TO Issued must be green `#90ee90`.
3. If any color differs, check the item below that matches it.

| If this is wrong | Check |
|---|---|
| Colors missing on **archived** cards | B6 only colors live cards (`ArchiveFlag == 0`). If the web screen colors archived cards too, remove the `if`. |
| Red/yellow where the screen shows green, or the reverse | `TM_BogeyAlert.AlertTime`: a card with **no** alert must arrive as `null`. If Ingres returns an empty date as a real value, treat that value as `null` in `PickColor`. |
| A blank date cell is gray on one PDF and white on the other | NULL (step not done yet) must arrive as `null`, and Ingres `''` (step not used) as `12/31 23:59`. If they arrive differently, change only `IsNull` / `IsBlank` in `FmsColors.cs` and the `12/31 23:59` test in the 4 bindings. |
| Error on `SELECT date('now')` | Replace `Now = conn.QueryFirst<DateTime>(...)` with `Now = DateTime.Now`. Only the bogey-alert red/yellow timing depends on it. |

---

## Reference — what each color query does

The queries in B3 are the database lookups from `ca.dmt` `SetFMSColors`, which decides the color codes the feeder card screen (`fcardjs.txt`) shows. The 4 dates alone can't decide the color: for example, TO Issued is green because the FCR permit is **Acknowledged**, and that status is stored in another table.

```
ca.dmt SetFMSColors: runs these SELECTs, decides TOIssuedBG/FG etc.
      ↓
web screen (fcardjs.txt): shows the codes as colors (27 → #90ee90)

New PDF: C# runs the SAME SELECTs → FmsColorCalculator decides the codes → .trdx shows them
```

| Query | ca.dmt lines | Question it answers | Color it leads to |
|---|---|---|---|
| `ColorNow` | 104840 | What time is it now, on the DB server? | Needed to tell whether an alert is overdue (red) |
| `ColorFodMoves` | 104914–104928 | Which moves on this card are on an **FOD order**, and what's the order status? | Acknowledged → **green**; otherwise red, yellow or dim text |
| `ColorFaultMoves` | 104933–104944 | Which moves are an **FOD fault not yet reviewed**? | TO Issued text dimmed (gray text) |
| `ColorPaPermit`, `ColorPaFodTO`, `ColorPaFodRS`, `ColorPaOpTO`, `ColorPaOpRS` | 104956–105037 | Which **not-yet-issued** moves are set up for **process automation**? (5 queries, one per source: permit, FOD order TO/RS, operating order TO/RS) | Issued cell **light brown** |
| `ColorOpOrders` | 105153–105176, 105245–105269 | For moves issued to an **operating order** (Op = 10001), which order and what status? | Acknowledged → **green**; order missing → red text |
| `ColorPermits` | 105350–105353 | For moves issued to **FCR** (Op = 10002), what's the **work permit status**? | Acknowledged → **green**; Initialized → pale red |
| `ColorAlerts` | 105069–105078, 105185–105194, 105278–105287, 105358–105367 | Is there a **timer alert (bogey)** on that order or permit? | Overdue → **red**; first alert pending → **yellow**. Either one replaces green |

**Example (green cell):** "To FCR: MAKE FAULT REPAIRS", TO Issued 07/05 06:06
1. `LoadJobs` (existing): `TOOperator = 10002` (FCR), and TO Issued has a date.
2. `ColorPermits`: the permit status for this job is 20 (Acknowledged).
3. `ColorAlerts`: there's no pending alert for it.
4. `ColorNow`: the current time, used only if an alert exists.
5. The calculator sets `TOIssuedBG = 27`, and the `.trdx` shows `FmsPaleGreen` = `#90ee90`.

**Why per card, not per job:** OpenROAD ran some of these lookups once per job. The new code loads them once for the whole card, and C# matches rows by `Job` number. The result is the same with far fewer database calls.

**Only needed for green:** `ColorNow`, `ColorFodMoves`, `ColorOpOrders`, `ColorPermits`, `ColorAlerts`. `ColorFaultMoves` and the 5 `ColorPa…` queries only produce dim text and brown.
