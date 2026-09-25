# GrayOut — CSS class logic and ready-to-paste .trdx blocks

Sources: `fcardjs.txt` (lines cited below), `css-file.txt`, and your current `.trdx` (`default.template`, line numbers cited below).

## 1. What the CSS class does

```css
.GrayOut {
    background-color: silver
}
```

- **Background:** `silver` = **`#C0C0C0`**.
- **Text color:** not set by `.GrayOut`. The cell sits inside `<tr class=Job>` (fcardjs.txt line 813), and `.Job` sets `color: black`, so the text inherits **black `#000000`**.
- **Font:** not set by `.GrayOut`; it is inherited from `.Job` (10pt, normal weight).

## 2. Where GrayOut is applied (fcardjs.txt)

| JS lines | Cell | Condition | What is shown |
|---|---|---|---|
| 816–820 | TO Issued, TO Complete | ActivityIdentifier = `'N'` | the date (still shown) |
| 823–826 | TO Issued | date = `''` (empty) | blank |
| 835–838 | TO Complete | date = `''` (empty) | blank |
| 884–887 | ActivityIdentifier (origin column) | ActivityIdentifier = `'N'` **and** the phase-check color is not red (6) or pale red (26), which are checked first (lines 876–883) | `N` |
| 910–914 | RS Issued, RS Complete | ActivityIdentifier = `'N'` | the date (still shown) |
| 917–920 | RS Issued | date = `''` (empty) | blank |
| 928–931 | RS Complete | date = `''` (empty) | blank |
| 612–623 | Header bottom-left (MTA Lines / ISO Feeders) | card not closed and that link is missing | blank |

Your `.trdx` has no MTA Lines / ISO Feeders fields, so the header rule has nothing to apply to.

## 3. What to change in your `.trdx`

The GrayOut **logic is already correct** in your file (5 fields below). The only thing wrong is the **color value**: `GrayOutBg` is `#808080` (Gray), but the CSS uses `silver` = `#C0C0C0`.

### 3a. Parameter fix (the only required change)

Replace lines **609–613** of `default.template`:

```xml
    <ReportParameter Name="GrayOutBg">
      <Value>
        <String>#c0c0c0</String>
      </Value>
    </ReportParameter>
```

`GrayOutFg` (lines 614–618) is already correct at `#000000`, so leave it unchanged:

```xml
    <ReportParameter Name="GrayOutFg">
      <Value>
        <String>#000000</String>
      </Value>
    </ReportParameter>
```

### 3b. The 5 GrayOut fields (for reference / re-paste)

These are copied **unchanged** from your file. Paste one only if you need to restore that field. Each block replaces the lines shown.

#### `txtTOIssued`: lines 284–295
TO Issued. GrayOut when ActivityIdentifier = N or the date is empty.

```xml
        <TextBox Width="0.75in" Height="0.34in" Left="0.35in" Top="0in" Value="= IIf(Format(&quot;{0:MM/dd HH:mm}&quot;, Fields.TOIssued) = &quot;12/31 23:59&quot;, &quot;&quot;, Format(&quot;{0:MM/dd HH:mm}&quot;, Fields.TOIssued))" Name="txtTOIssued">
          <Style TextAlign="Center" VerticalAlign="Middle">
            <Font Name="Arial" Size="10px" />
            <BorderStyle Default="Solid" />
            <BorderWidth Default="0.5pt" />
          </Style>
          <Bindings>
            <Binding Path="Visible" Expression="= Fields.JobClass &lt;&gt; 0" />
            <Binding Path="Style.BackgroundColor" Expression="= IIf(Fields.ActivityIdentifier = &quot;N&quot; Or (Format(&quot;{0:MM/dd HH:mm}&quot;, Fields.TOIssued) = &quot;12/31 23:59&quot; Or Format(&quot;{0:MM/dd HH:mm}&quot;, Fields.TOIssued) = &quot;&quot;), Parameters.GrayOutBg.Value, Parameters.JobBg.Value)" />
            <Binding Path="Style.Color" Expression="= IIf(Fields.ActivityIdentifier = &quot;N&quot; Or (Format(&quot;{0:MM/dd HH:mm}&quot;, Fields.TOIssued) = &quot;12/31 23:59&quot; Or Format(&quot;{0:MM/dd HH:mm}&quot;, Fields.TOIssued) = &quot;&quot;), Parameters.GrayOutFg.Value, Parameters.JobFg.Value)" />
          </Bindings>
        </TextBox>
```

#### `txtTOComplete`: lines 296–307
TO Complete. Same rule.

```xml
        <TextBox Width="0.75in" Height="0.34in" Left="1.1in" Top="0in" Value="= IIf(Format(&quot;{0:MM/dd HH:mm}&quot;, Fields.TOComplete) = &quot;12/31 23:59&quot;, &quot;&quot;, Format(&quot;{0:MM/dd HH:mm}&quot;, Fields.TOComplete))" Name="txtTOComplete">
          <Style TextAlign="Center" VerticalAlign="Middle">
            <Font Name="Arial" Size="10px" />
            <BorderStyle Default="Solid" />
            <BorderWidth Default="0.5pt" />
          </Style>
          <Bindings>
            <Binding Path="Visible" Expression="= Fields.JobClass &lt;&gt; 0" />
            <Binding Path="Style.BackgroundColor" Expression="= IIf(Fields.ActivityIdentifier = &quot;N&quot; Or (Format(&quot;{0:MM/dd HH:mm}&quot;, Fields.TOComplete) = &quot;12/31 23:59&quot; Or Format(&quot;{0:MM/dd HH:mm}&quot;, Fields.TOComplete) = &quot;&quot;), Parameters.GrayOutBg.Value, Parameters.JobBg.Value)" />
            <Binding Path="Style.Color" Expression="= IIf(Fields.ActivityIdentifier = &quot;N&quot; Or (Format(&quot;{0:MM/dd HH:mm}&quot;, Fields.TOComplete) = &quot;12/31 23:59&quot; Or Format(&quot;{0:MM/dd HH:mm}&quot;, Fields.TOComplete) = &quot;&quot;), Parameters.GrayOutFg.Value, Parameters.JobFg.Value)" />
          </Bindings>
        </TextBox>
```

#### `txtAct`: lines 368–379
ActivityIdentifier (origin column). PhaseCheck (6) and AltPhaseCheck (26) first, then GrayOut when ActivityIdentifier = N.

```xml
        <TextBox Width="0.25in" Height="0.34in" Left="6.85in" Top="0in" Value="= IIf(Fields.MoveBGColor = 6 Or Fields.MoveBGColor = 26, Fields.ActivityIdentifier, IIf(Fields.ActivityIdentifier = &quot;S&quot; And Parameters.ArchFlag.Value &lt;&gt; 0, &quot;&quot;, Fields.ActivityIdentifier))" Name="txtAct">
          <Style TextAlign="Center" VerticalAlign="Middle">
            <Font Name="Arial" Size="10px" />
            <BorderStyle Default="Solid" />
            <BorderWidth Default="0.5pt" />
          </Style>
          <Bindings>
            <Binding Path="Visible" Expression="= Fields.JobClass &lt;&gt; 0" />
            <Binding Path="Style.BackgroundColor" Expression="= IIf(Fields.MoveBGColor = 6, Parameters.PhaseCheckBg.Value, IIf(Fields.MoveBGColor = 26, Parameters.AltPhaseCheckBg.Value, IIf(Fields.ActivityIdentifier = &quot;N&quot;, Parameters.GrayOutBg.Value, Parameters.JobBg.Value)))" />
            <Binding Path="Style.Color" Expression="= IIf(Fields.MoveBGColor = 6, Parameters.PhaseCheckFg.Value, IIf(Fields.MoveBGColor = 26, Parameters.AltPhaseCheckFg.Value, IIf(Fields.ActivityIdentifier = &quot;N&quot;, Parameters.GrayOutFg.Value, Parameters.JobFg.Value)))" />
          </Bindings>
        </TextBox>
```

#### `txtRSIssued`: lines 402–413
RS Issued. GrayOut when ActivityIdentifier = N or the date is empty.

```xml
        <TextBox Width="0.72in" Height="0.34in" Left="8.55in" Top="0in" Value="= IIf(Format(&quot;{0:MM/dd HH:mm}&quot;, Fields.RSIssued) = &quot;12/31 23:59&quot;, &quot;&quot;, Format(&quot;{0:MM/dd HH:mm}&quot;, Fields.RSIssued))" Name="txtRSIssued">
          <Style TextAlign="Center" VerticalAlign="Middle">
            <Font Name="Arial" Size="10px" />
            <BorderStyle Default="Solid" />
            <BorderWidth Default="0.5pt" />
          </Style>
          <Bindings>
            <Binding Path="Visible" Expression="= Fields.JobClass &lt;&gt; 0" />
            <Binding Path="Style.BackgroundColor" Expression="= IIf(Fields.ActivityIdentifier = &quot;N&quot; Or (Format(&quot;{0:MM/dd HH:mm}&quot;, Fields.RSIssued) = &quot;12/31 23:59&quot; Or Format(&quot;{0:MM/dd HH:mm}&quot;, Fields.RSIssued) = &quot;&quot;), Parameters.GrayOutBg.Value, Parameters.JobBg.Value)" />
            <Binding Path="Style.Color" Expression="= IIf(Fields.ActivityIdentifier = &quot;N&quot; Or (Format(&quot;{0:MM/dd HH:mm}&quot;, Fields.RSIssued) = &quot;12/31 23:59&quot; Or Format(&quot;{0:MM/dd HH:mm}&quot;, Fields.RSIssued) = &quot;&quot;), Parameters.GrayOutFg.Value, Parameters.JobFg.Value)" />
          </Bindings>
        </TextBox>
```

#### `txtRSComplete`: lines 414–425
RS Complete. Same rule.

```xml
        <TextBox Width="0.72in" Height="0.34in" Left="9.27in" Top="0in" Value="= IIf(Format(&quot;{0:MM/dd HH:mm}&quot;, Fields.RSComplete) = &quot;12/31 23:59&quot;, &quot;&quot;, Format(&quot;{0:MM/dd HH:mm}&quot;, Fields.RSComplete))" Name="txtRSComplete">
          <Style TextAlign="Center" VerticalAlign="Middle">
            <Font Name="Arial" Size="10px" />
            <BorderStyle Default="Solid" />
            <BorderWidth Default="0.5pt" />
          </Style>
          <Bindings>
            <Binding Path="Visible" Expression="= Fields.JobClass &lt;&gt; 0" />
            <Binding Path="Style.BackgroundColor" Expression="= IIf(Fields.ActivityIdentifier = &quot;N&quot; Or (Format(&quot;{0:MM/dd HH:mm}&quot;, Fields.RSComplete) = &quot;12/31 23:59&quot; Or Format(&quot;{0:MM/dd HH:mm}&quot;, Fields.RSComplete) = &quot;&quot;), Parameters.GrayOutBg.Value, Parameters.JobBg.Value)" />
            <Binding Path="Style.Color" Expression="= IIf(Fields.ActivityIdentifier = &quot;N&quot; Or (Format(&quot;{0:MM/dd HH:mm}&quot;, Fields.RSComplete) = &quot;12/31 23:59&quot; Or Format(&quot;{0:MM/dd HH:mm}&quot;, Fields.RSComplete) = &quot;&quot;), Parameters.GrayOutFg.Value, Parameters.JobFg.Value)" />
          </Bindings>
        </TextBox>
```

## 4. How the JS rules map to the .trdx

| JS | .trdx |
|---|---|
| `oJob[i][kMoveOrigin] == 'N'` | `Fields.ActivityIdentifier = "N"` |
| `oJob[i][kTOIssued] == ''` | `Format("{0:MM/dd HH:mm}", Fields.TOIssued) = "12/31 23:59"` or `= ""` |
| `class=GrayOut` | `Parameters.GrayOutBg.Value` (background) + `Parameters.GrayOutFg.Value` (text) |
| `class=Job` (no inline color) | `Parameters.JobBg.Value` + `Parameters.JobFg.Value` |

## 5. One thing to verify

The JS grays a date cell only when the value is exactly an empty string `''`. In the old PDF you compared, some empty date cells were **not** gray. Open the same card on the live web screen and check whether its empty date cells are silver.
- **If they are silver on screen**, the `.trdx` behavior is correct as it is.
- **If they are white on screen**, the service is sending something other than `''` for a missing date, so the web screen never grays them. In that case remove the empty-date part of the 4 date bindings and keep only the ActivityIdentifier = N check.
