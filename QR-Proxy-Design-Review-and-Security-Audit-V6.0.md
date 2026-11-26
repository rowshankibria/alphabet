# QR Proxy — Review of the Proposed Gateway Design, with Monitor Source Evidence (V6.0)

Replaces nothing. V5.0 stays the baseline for the QrDiode findings (Q-, S-, N-) and the build guide. V6.0 adds a review of `Gateway-QrDiode-Workflow.md`, the monitor and interface source code, and a re-check of QrDiode V3. Where V6.0 contradicts V5.0, section 1 says so.

**Evidence tags.** [D] read in a design document. [C] read in code. [R] reproduced by running code (V5.0 harness). [I] inferred, not read. [A] assumed. [U] unknown, an open question.

**Short names.** `GW` = `Gateway-QrDiode-Workflow.md`. `SRC` = `C:\WORKSPACE\RnD\workspace-master\source-code\`. `QD2`/`QD3` = `C:\WORKSPACE\RnD\QrDiode_V2\` and `QrDiode_V3\`. `FCR/SOO/FOD/FSS` = the monitor sources under `SRC\5-dmz-monitors\`.

**Limit of this review.** The Gateway code (`QrBridge.*`) is not on disk. GW links to `../src/QrBridge.Gateway/...`, and none of those paths resolve. I searched `C:\WORKSPACE\RnD`, `7_Repo`, `CURRENT` and `SOURCE` to depth 5 and found only the QrDiode trees. **Every statement about the Gateway below is read from GW alone [D]. I have not seen the Gateway code.** GW's "built" claims are unverified.

---

## 0. Verdict

**The Gateway is a sound store-and-forward skeleton. As designed it is not safe to put in front of permit and order traffic.** Three reasons stand out.

1. **It acknowledges before it delivers.** The DMZ gateway answers `RETURN_CODE 0` once the row is in SQLite (GW I13/O13, §7.1). The monitors' only safety net is a human fallback that fires after repeated non-zero codes (FCR `ir_fcrmonitor.dmt:2411-2440`, SOO `:2598-2611`, FOD `:1716-1776`). A synthetic success means that fallback never fires. A permit or order can then be lost on the link, and the dispatcher believes it was issued. This is the decisive finding (G-01).
2. **The link is one-way with no receipts.** GW itself states that a lost session is silent (§7.1, D14, §7.5). Delivery to the real service is at-least-once, and a retried call carries a new `RRMsgID`, so the receiver cannot recognise a duplicate (G-02, G-03).
3. **The data-returning calls are marked "Unavailable" (1599).** FTC (`GetFaultCorrelation`) and `PortalSyncRequest` are in scope and both return data. They need a defined mode, and the monitor source shows both tolerate failure, so a fail-fast round trip or a refresh fits them (section 5).

The shape of the answer is unchanged from V5.0: **round trip for state-changing calls, with the caller seeing the real reply or a real failure; snapshot or fail-fast for refreshable reads; unavailable for the rest.** What V6.0 adds is source evidence that makes this a requirement, not a preference.

What GW gets right [D]: one transaction for the sequence number plus the outbox row; per-direction sequence numbers; a body size cap; SafeXml parsing; route and contract checks before anything is stored; no redirects and a reply cap on egress; honest design-review notes (§7) that list most of the weaknesses below. The honesty is a strength. The problem is that the notes describe the gaps and the design does not close them.

---

## 1. Corrections to V5.0

| # | V5.0 said | Source shows | Evidence |
|---|---|---|---|
| 1 | Open item 2: behaviour after the fifth failure unknown | **Answered.** `MaxAttempt = 5`. On the last attempt the monitor sends an operator message with a manual procedure and **deletes the event**. Details in section 3 | FCR `:1763,2411-2440`; SOO `:1551,2598-2611`; FOD `:1151,1716-1776` [C] |
| 2 | Retry spacing "about 5 minutes" | The queue is swept every **180 s** (`Delay = 180`) or at once on a DB event. The log text says "5 minutes" but the code does not | FCR `:1841-1900`; FSS `:1018-1034` [C] |
| 3 | `FSS` has no endpoint | FSS has `FSSServiceUrl` (`...islcom.coned.com/feederstatusWs/FMS2FSSInterface.asmx`, host prefix masked), `DBServiceUrl` (`.../SubstationDashboardWS/FMS2Dashboard.asmx`) and `HVServiceUrl` | `SRC\6-dmz-outbound-interfaces\FMS_FMS2FSSService\FSS_rr1.reg.txt` [C] |
| 4 | FTC assumed to be a `.svc` service | FTC is an **ASMX** (`FMS2FTCInterfaceSoap`, action `http://tempuri.org/GetFaultCorrelation`). The code comment gives `https://comp.coned.com/eldisws/FMS2FTCInterface.asmx`. It is not in your `.svc` list | `FTCInterface.vb:116-190,306-382` [C] |
| 5 | Restriction import and common manholes "web call or database?" | **Database connections**: `RestrictionDBConnection` (ADO) and the Vision database. They cannot cross a SOAP gateway | FCR changelog; `RestrictionImportSched` [C] |
| 6 | Redirection mechanism unspecified | Each client reads its URL **per call from the registry**: `SOFTWARE\Con Edison\RapidRestore\<X>Interface` → `<X>ServiceUrl`. Redirection is a registry edit. See section 7 | `SSOInterface.vb:63-110` [C] |
| 7 | Retry reuses the message id? | **No.** `GetDownloadID()` runs per call, so every retry has a new `RRMsgID`. If key generation fails it falls back to `-99` | FCR `:564,796-806,1667-1700` [C] |

---

## 2. What the monitor and interface source shows

### 2.1 The outbound clients

All are VB.NET COM-visible classes calling Rapid Restore through **ASMX `SoapHttpClientProtocol` proxies** (SOAP 1.1, BasicHttp(s), document style, namespace `http://tempuri.org/`) [C].

- The body is **one XML string parameter**, for example `IssueOrder(sXML) As String`. The reply is a string holding XML with `/RESPONSE/STATUS/RETURN_CODE`.
- Any exception returns `-1`. A reply that is not XML returns `-1`. The code never sets `Timeout`, so the .NET default of **100 s** applies [I].
- A URL containing `PSEUDO` is a training environment and returns success without a call.
- The TLS version comes from the registry (`TLSVersion`, default TLS 1.2).
- The URL must contain `.svc` (`.asmx` for FTC and FSS). **A `?wsdl` suffix, as in your service list, would be posted to as-is if copied into the registry** [I]. Use the bare service URL.

| Client | Service in your list | Operations seen in the proxy (prefix `http://tempuri.org/I<Svc>/`) |
|---|---|---|
| FMS2SSO | `SSOServiceUrl` | IssueOrder, DOResponse, DORescindOrder, SendPage |
| DSO2SSO | `DSOServiceURL` | ActivateCard, CloseCard, IssueOrder, SMRescindOrder, SMResponse |
| FMS2FC | `FCRServiceUrl` | AckLiftCaution, AckWPReturn, ActivateCard, CloseCard, CreateCard, DOFGOResponse, DORFPResponse, DOWPResponse, IssueFault, IssueWorkPermit, LinkRFP, ModifyCardTypeToPlus, WithdrawWP |
| FMS2PD | `PDServiceURL` (same URL as FCR) | The FMS2FC set plus **PortalSyncRequest** and PortalMoveDownload |
| FMS2FOD | `FODServiceUrl` | DOSendFaultResponse, DOSendMoveResponse, DOSendTagResponse, DOSendTransferCard, IssueOrder, ReplaceCertifiedTag, RescindMove, UpdateTcStatus |
| TLS2SSO | `TLS_SSOServiceUrl` | ActivateCard, CloseCard, DORescindOrder, DOResponse, IssueOrder, SendPage |
| TOMS2SSO | `TOMS_SSOServiceUrl` | The TLS2SSO set plus SetOrderPriority |
| FMS2FTC | not in your list | **GetFaultCorrelation** (ASMX) |
| FMS2FSS | not in your list | `fms2fss`, `fms2fssHighVoltage` (ASMX) |

### 2.2 Authentication at the wire

- FTC, PD, FSS and TOMS2SSO build `CredentialCache.Add(uri, "Negotiate", NetworkCredential(user, password, domain))` from registry values `ImpersonateUser` and `ImpersonatePassword`: **plaintext service-account credentials in the registry** [C]. The FMS2SSO proxy sets none. The FCR credential line is commented out (`FCRInterface.vb:1882-1885`).
- **Consequence for the gateway.** Negotiate is a multi-leg exchange bound to a connection. A DMZ gateway that terminates TLS cannot forward it. Either the DMZ gateway authenticates the caller itself, or it accepts anonymous calls. The Corp-side gateway then calls the real service **as its own identity** (GW §2 `UseDefaultCredentials`). The Rapid Restore side loses the caller identity and authorisation collapses onto one account (G-07).

### 2.3 Inbound

`FMS_FC2FMSInterface` exposes `EchoString`, `SendToFMS(sXML)` and **`GetFromFMS(sXML)`**, over BasicHttps with `maxReceivedMessageSize` and `maxBufferSize` of **64 MB**, 10-minute timeouts, `ORTimeout` 120 s, metadata enabled, `includeExceptionDetailInFaults=false` (`Web.config`) [C]. The other inbound services follow the same pattern but I did not read them [U].

---

## 3. How the monitors behave on failure (the heart of the matter)

| Monitor | Retry | Id per retry | Last-attempt action | Evidence |
|---|---|---|---|---|
| FCR (permits, cards, faults) | `MaxAttempt = 5`; swept every 180 s; events processed serially, in order, with synchronous COM calls | New `RRMsgID` each call | At `Attempt >= MaxAttempt-1`: operator message "ISSUE PERMIT FAILURE ... Please Withdraw the Work Permit and issue it verbally to an FCR"; return `PU_OK`, **event removed**. On `Attempt = 0` a failed permit also runs a compensating `IntMgr.CardCutOut` | `:1763,1841-1900,2411-2440` |
| SOO (switching orders) | `MaxAttempt = 5` | New id | "SSO Order ... has failed to download to Rapid Restore. Please rescind the order and issue verbally." Event removed | `:1551,1716,2044-2046,2598-2611` |
| FOD (field orders) | `MaxAttempt = 5` | New id | "...cannot be downloaded... Please rescind the order and issue verbally." Event removed | `:1151,1270,1655,1716-1776` |
| FSS (feeder status, FTC) | `MaxAttempt` loop; FTC always returns `PU_OK` ("feedercard will raise this event periodically in order to refresh the data") | n/a | The event is deleted even on failure | `:1018-1034,3327-3385` |
| Portal download | Sync loop; if `GetSyncTimeStamp` returns empty the monitor **exits** ("Network Communication may be down. Portal Download will not continue") and tries again on its next cycle | `GetDownloadID()` per call | None needed; a sync end date older than a year is rejected, and a start older than 3 days is clamped to 3 days | `fms_rrportaldownload.dmt:835-935` |

On the last attempt the event is deleted. After that, **nothing in FMS retries it**. The only remaining safety is the human who reads the operator message. On start-up a monitor purges events older than 7 days and reprocesses the last 30 minutes plus those with `Attempt < Max` (FCR `:1752-1930`) [C].

**What this means for the design.**

- A non-zero return is a feature. It is how the dispatcher is told to switch to the manual procedure. A gateway that always says "0, saved" disables the feature. See G-01.
- With 180 s sweeps, the fallback arrives after roughly 4 × 180 s = 12 minutes of failure [I, derived]. This is the time the link has to be healthy for, or the manual procedure takes over. It is also the budget for a retry loop on the Corp side. After about 12 minutes the dispatcher will have started the manual route, and a late delivery then conflicts with it.
- Retries are not identical messages. A dedupe that depends on `RRMsgID`, or on a hash of the whole body that includes it, never matches. A dedupe key has to come from the business content (G-03).

---

## 4. Findings on the proposed Gateway, ranked

Severity is for the intended use: permits, switching orders and field orders that change plant state.

| # | Sev | Finding | Tag |
|---|---|---|---|
| G-01 | **Critical** | Ack-before-delivery defeats the monitors' manual fallback | [D][C] |
| G-02 | **Critical** | Silent loss on the one-way link; no receipts, no gap detection | [D] |
| G-03 | **High** | At-least-once delivery plus a new `RRMsgID` per retry means duplicates at Rapid Restore | [D][C] |
| G-04 | **High** | QrDiode weaknesses carried into the design (frame authentication, key provisioning, session lock, replay-before-commit, process isolation) | [D][R] |
| G-05 | **High** | The decrypted message sits unencrypted in SQLite on both sides | [D] |
| G-06 | **High** | The gateway becomes a trusted TLS terminator and credential holder, with no hardening plan | [D][C] |
| G-07 | **High** | Identity and authorisation collapse (Negotiate, registry credentials) | [C][D] |
| G-08 | **High** | Data-returning calls (FTC, PortalSyncRequest, GetFromFMS) are "Unavailable" and not designed | [D][C] |
| G-09 | **Medium** | `http://` in GW versus `https://ecczfmsrr` in your list; names, certificates and trust unaddressed | [D] |
| G-10 | **Medium** | 1 MB body cap versus 64 MB service limits; real payload sizes unknown | [D][C] |
| G-11 | **Medium** | SOAP handling assumes SOAP 1.1/1.2 with WS-Addressing; the real clients are ASMX 1.1 with one string parameter | [D][C] |
| G-12 | **Medium** | Single serial worker per lane: head-of-line blocking across all services | [D] |
| G-13 | **Medium** | Backlog count races; 5000 cap is a service-wide limit, not per route; retention and replay windows unchecked | [D] |
| G-14 | **Medium** | Shared SQLite files and Windows named events across processes; permissions and single point of failure | [D] |
| G-15 | **Medium** | Routing and acceptance are driven by message content (`AllowedTypes`, `PayloadInspector`) instead of a signed, version-pinned route table | [D] |
| G-16 | **Medium** | Operational failure is invisible to the caller and to the other side; each side monitors only itself | [D] |
| G-17 | **Low** | Unrecognised 2xx replies count as Done | [D] |

### G-01 — Ack-before-delivery defeats the manual fallback (Critical)

- **Evidence.** GW I13/O13 reply `RETURN_CODE 0` after the commit and say it means "saved, will be delivered", not "processed" (§7.1) [D]. The monitors act only on the return code (section 3) [C].
- **Why it matters.** Scenario: the permit is committed, the QR session is lost or the receiver is busy, the delivery goes `DeadLetter` after 8 tries (GW InboxWorker). The FCR monitor saw `0`, deleted the event, and never sent the "issue it verbally" message. **A dispatcher believes a permit exists that Rapid Restore never received.** This is a safety issue, not a reliability one.
- **Fix.** Do not return success until the Corp side confirms delivery. Hold the call, with a bounded timeout, and return the real `RETURN_CODE` from Rapid Restore. If no confirmation arrives in time, return a **non-zero** code so the monitor counts the attempt. This needs a return path (section 6). Without one, the only honest answers are "unavailable" or "queued, unconfirmed" for the call types where a human fallback exists, and the owner must accept the manual fallback as the confirmation.
- **Cost.** A reverse lane and a hold in the gateway. The monitors already wait synchronously, so no caller change.

### G-02 — Silent loss on a one-way link (Critical)

- **Evidence.** "Aired" is the sender's final state; `Acked`/`MarkAckedAsync` is never called (D14); GW §7.1 says screen → Inbox has no guarantee; known issues 1-3 (later session ignored after a partly read one, transmit queue of 14 drops older items, anti-replay committed before the store) are carried over unfixed [D]. There is no sequence-gap detection (§7.5) [D].
- **Fix.** Receipts over a reverse lane with retransmission until a deadline (REQ-03, invariant 3 of V5.0). A forward-only gap detector (sequence numbers plus a heartbeat) is a minimum, so the receiving side can at least *alarm*. Alarming is not repair.

### G-03 — Duplicates at Rapid Restore (High)

- **Evidence.** GW dedupes on a gateway-generated `MessageId` GUID only [D]. The monitor re-sends with a new `RRMsgID` per attempt (FCR `:796-806`) [C]. GW concedes duplicates at the real service (§7.2) [D]. A stuck `Processing` row is reset after 5 minutes and re-POSTed [D].
- **Why it matters.** Two `IssueOrder` or `IssueWorkPermit` deliveries for one event. Whether Rapid Restore tolerates that is unknown [U].
- **Fix.** Derive a **business idempotency key per message `TYPE`** from fields the schema marks as identifying (for example permit number plus operation plus state). Keep it in the signed envelope. On a repeat with the same key, return the stored first result instead of delivering again. Ask Rapid Restore's owners whether it is idempotent on that key (open question 3).

### G-04 — QrDiode weaknesses carried into the design (High)

GW takes `QrDiode.Core` as the transport. V5.0 findings apply unchanged unless V3 fixed them. Section 8 shows what V3 changed and what it left.

- Unauthenticated frames can still change receiver state (Q-03, Q-02, Q-10).
- Key and trust-store provisioning is still the demo design (S-04, S-07, S-13).
- Capture, decoding and key use share one process (S-05).
- Replay state commits before the payload is stored (Q-07). GW's "known issue 3" is exactly this [D].
- **Fix.** Per V5.0 Part C and D: authenticate every frame under a link key before any state change; separate the decoder process from the key holder; commit replay state and the inbox row in one transaction.

### G-05 — Plaintext at rest (High)

- GW §7.5: `MessageBytes` is stored unencrypted [D]. These are permits, orders and card numbers, plus the signed manifest and journal.
- **Fix.** Encrypt message columns with a key held in the TPM or DPAPI-machine scope, separate from the database file; restrict ACLs to the service account; encrypt the disk; purge after the retention window (invariants 13-14 of V5.0 §D).

### G-06 — The gateway is in the trusted computing base (High)

- The DMZ gateway terminates TLS for `comp.coned.com`-class services and parses the XML. The Corp gateway holds credentials and posts into Rapid Restore. Both run as IIS sites on shared hosts behind a load balancer [D].
- **Why it matters.** A parser bug in the DMZ gateway, which faces a less trusted network, reaches the signing key if both live in one process or account. GW does not describe privilege separation [D].
- **Fix.** Three processes with separate accounts: ingress (parse, validate, no keys), signer/sender (keys, no network input), egress (credentials, no QR input). Put WAF-style size and rate limits in front. Keep Windows Server patching on the V5.0 plan.

### G-07 — Identity collapse (High)

See section 2.2. Today Rapid Restore sees the VB service account (or none, for FMS2SSO). Through the gateway it sees one gateway account for every caller and every route [C][D].

- **Fix.** Per-route least-privilege Corp accounts, the caller's route and source host carried inside the signed envelope and logged at egress (invariant 16). Decide whether the DMZ gateway demands Negotiate from the callers that use it today (FTC, PD, FSS, TOMS2SSO) or accepts anonymous calls from an ACL-restricted host list. Credentials that sit in the registry in plaintext should be rotated if the DMZ gateway ever sees them.

### G-08 — Data-returning calls (High)

- `GetFromFMS` and `PortalSyncRequest` are "Unavailable", answered locally with `RETURN_CODE 1599` (GW) [D]. FTC is not listed in GW as covered.
- The monitors tolerate failure on these (section 3): FTC is dropped and refreshed; the portal sync exits and waits for the next cycle. So the right answer is a **defined mode**, not blanket "unavailable":
  - FTC: round trip with a tight timeout, or a refreshed cache, see section 5.
  - PortalSyncRequest: return an empty timestamp (monitor exits cleanly) while the link is down, or a round trip when it is up.
  - `GetFromFMS`: inbound direction, needs a decision per caller [U].

### G-09 — `http://` and names (Medium)

GW §2 uses `Receiver:DefaultBaseUrl = http://dmz-rr-server` [D]. Your inbound services are `https://ecczfmsrr/...` and outbound `https://comp.coned.com/...`. The design does not say which certificate the gateway presents, who issues it, whether callers trust that issuer, whether revocation checking works while islanded, or how the Corp egress validates the DMZ server's certificate. The gateway must not impersonate `comp.coned.com` with a certificate that Rapid Restore callers trust for other things. **Fix:** a dedicated, name-constrained internal CA; the registry URL points to the gateway's own name (section 7).

### G-10 — Size limits (Medium)

GW caps bodies at 1 MB and bundles at 128 KB / 50 messages [D]. The inbound binding allows 64 MB (`Web.config`) [C]. QrDiode V3 caps a payload at 16 MB (section 8). Actual message sizes are unknown [U]. At about 6.7 KB/s effective throughput (section 6), 1 MB takes about 2.6 minutes, which is longer than the 100 s caller timeout [I].

### G-11 — SOAP assumptions (Medium)

GW's header handling assumes SOAP 1.1/1.2 and WS-Addressing [D]. The callers are ASMX 1.1 with one string parameter and a `SOAPAction` header, with no WS-Addressing, WS-Security or sessions seen in the proxies [C]. That is *simpler* than GW assumes, which is good. **Fix:** make `SOAPAction`, the operation and the schema of the string parameter the route key, and reject everything else. Forward the original bytes unchanged.

### G-12 — Head-of-line blocking (Medium)

One worker claims the lowest-sequence ready row for all services on the lane, with a 120 s timeout [D]. One slow Rapid Restore operation holds every other call. A large FTC refresh delays a permit. **Fix:** priority classes and per-route concurrency, with permits and orders ahead of refreshes (invariant 18).

### G-13 — Backlog and clocks (Medium)

The backlog count is outside the transaction and races; the 5000 cap is global; `ReplayWindowDays <= RetentionDays` is not enforced; there is no shared time source while islanded (7-day window, 60 minute skew) [D]. **Fix:** count inside the transaction; per-route caps; refuse to start on inconsistent settings; use counters and epochs for replay, with time only as a hint (invariant 7).

### G-14 — Shared files and named events (Medium)

Sender and receiver processes share two SQLite files and two named events [D]. WAL with `synchronous=NORMAL` can lose the last commits on power failure [I]. A single disk is a single point of failure. `EnsureCreated` means no schema migration. **Fix:** `synchronous=FULL` for the outbox and inbox; explicit ACLs on the events; a migration step; backups of sequence state with epoch markers (invariant 7).

### G-15 — Content-driven routing (Medium)

`AllowedTypes` is checked against the message `TYPE`, and a `PayloadInspector` reads the content [D]. The check is useful but sits after parsing. **Fix:** a signed, versioned route table (operation, `SOAPAction`, schema, size, priority, mode) distributed offline to both sides and checked for equal versions at start-up and in every envelope.

### G-16 — Invisible failure (Medium)

Each side monitors only itself; no reverse lane tells the sender about the receiver's state [D]. **Fix:** a heartbeat in each direction and a visible link-state alarm for the dispatcher console (REQ-22).

### G-17 — Unrecognised 2xx counts as Done (Low)

[D] A reply that is not a recognisable result is treated as success. Combined with `-1` mapping in the callers, an HTML error page from a proxy would be marked delivered. **Fix:** require a parseable `RETURN_CODE`; anything else is Failed.

---

## 5. Data-returning calls: which mode for which call

The caller is synchronous and waits for the reply. Hold-and-return needs the reverse lane. Without it, only snapshot or unavailable are possible.

| Call | Caller and need | What the caller does on failure | Recommended mode | Why |
|---|---|---|---|---|
| FTC `GetFaultCorrelation` | FSS monitor, triggered by the DO's request; also interactive `cac`/`cas` apps [U] | Event deleted; "feedercard will raise this event periodically" | **Round trip with a short deadline, fail fast.** If a reverse lane is absent: unavailable, because a stale correlation shown to a dispatcher could mislead | Reply is consumed by the VB service and written into FMS (`ProcessFaultCorrelation`); failure is tolerated |
| `PortalSyncRequest` | Portal download monitor, scheduled | Empty timestamp → monitor exits and retries next cycle | **Fail fast with empty timestamp** while down. Round trip when up | Monitor already handles "network may be down" |
| `GetFromFMS` (inbound) | Unknown caller [U] | Unknown | Decide per caller; hold only if a reverse lane exists | No source seen for the caller |
| Permit / order / card / response posts (`IssueOrder`, `IssueWorkPermit`, ...) | FCR, SOO, FOD, DSO, TLS, TOMS monitors | Retry up to 5 times, then human fallback | **Round trip; never ack before delivery** | G-01 |
| Restriction import, common manholes | DB connections | n/a | Out of scope for a SOAP gateway; **unavailable** while islanded, with an explicit owner decision | Section 1, row 5 |
| FSS, Dashboard | ASMX posts | Event handling like FTC [I] | Decide once scope is confirmed [U] | Not in your list |
| Verizon, SSL/Maximo, RTF | External or LocalHost | n/a | Out of scope by default | `HttpWebRequest` with client certificate to an internet host; not CorpNET |

Stale-while-revalidate is only acceptable where the monitor itself refreshes (FTC) and where the reply carries its own timestamp so the user sees its age. It is not acceptable for any call that changes state.

---

## 6. The reverse lane and the arithmetic

GW has no return path (D14) [D]. Round trip needs one. Options, from the QrDiode V3 `docs\QrDiode-Return-Channel-Options.md` (which I read in outline): acknowledgement-only semantics and key establishment over a constrained optical lane (its option M2) or an optocoupled serial link (M3). Its own verdict is that a full reverse QR lane brings an image-processing stack into the trusted side to carry a very small message, and recommends the constrained forms [D, outline only]. For this system the receipt is a `RETURN_CODE`, a message id and a short status. That fits a constrained lane. Replies for data-returning calls (FTC XML) are larger and would need the full reverse QR lane or the snapshot mode. **Decision needed from you (open question 1).**

**Throughput [I, from GW's parameters].** Symbols up to 1350 B at 15 fps ≈ 20 KB/s raw. GW sends at least 3 × K frames, so effective goodput is about 6.7 KB/s before Brotli. Frame time is at least 6 s plus a 1.5 s gap per session.

| Payload | K (1350 B) | Frames (3 × K) | Air time at 15 fps |
|---|---|---|---|
| One small message (about 4 KB) | 3 | at least 90 (6 s floor) | about 7.5 s with gap |
| A full bundle (128 KB) | 97 | 291 | about 19 s |
| 1 MB (GW's cap) | 777 | 2331 | about 155 s |
| 16 MB (QrDiode V3 cap) | 12 440 | 37 320 | about 41 min |
| 64 MB (service limit) | 49 700 | 149 100 | about 2.8 h |

Compression helps on XML, so these are upper bounds [A]. Round trip for a small message is the forward session plus egress plus the return session, about 15-20 s with an idle link [I]. That is inside the 100 s default caller timeout. It is not inside it when the lane is busy with a bundle. A queue of 10 bundles is about 3 minutes.

---

## 7. What you must change (stated explicitly)

The applications are not modified. One configuration change is unavoidable:

1. **Per outbound client, the registry value `*ServiceUrl`** under `SOFTWARE\Con Edison\RapidRestore\<X>Interface` must point to the DMZ gateway [C]. Use the bare service URL (no `?wsdl`) and keep `.svc` or `.asmx` in the path.
2. If you do **not** want the registry change, the alternative is to resolve `comp.coned.com` to the gateway by DNS or a hosts entry. That also requires the gateway to present a certificate for `comp.coned.com`, which means the gateway impersonates a real production name. I recommend against it [A].
3. The gateway's certificate must chain to a CA the callers already trust or the root must be added to those hosts (a trust configuration change).
4. The registry credentials for FTC, PD, FSS and TOMS2SSO are used by the callers against the DMZ gateway. Decide how it authenticates them (G-07).

---

## 8. QrDiode V3 versus V2 (verified by hashing and diff)

The tree `QD3` differs from `QD2` in 14 source files plus lock files and one new test file. GW cites `QrDiode.Sender\Transmit\TransmitEngine.cs` and `QrDiode.Core\Pipeline\*`, which exist in both, and its known issues 1-3 match V2. **GW appears to target V2 or an unfixed V3 [I].** Verify which build you will use.

| V5.0 finding | In V3? | Evidence |
|---|---|---|
| N-01 manifest reveals templated content (plaintext hash on the wire) | **Fixed.** The hash left the manifest; the receiver computes it. Protocol version bumped to 0x02 | `QD3\src\QrDiode.Core\Pipeline\ReceiveEngine.cs` (`PlaintextSha256` property), `Framing\FrameFormat.cs` [C] |
| N-03 decoder memory growth from chosen symbol ids | **Mitigated.** Buffered symbols capped at `Clamp(4*K,1024,8192)`, seen ids at `Clamp(16*K,4096,131072)`, with eviction counters | `Fountain\LtDecoder.cs` [C] |
| Q-12 symbol size 1 allocates gigabytes | **Fixed.** `MaxPayloadBytes` 16 MB, `MinSymbolSize` 256, `MaxSymbolSize`, `MaxSourceSymbols` 65 536 | `Manifest\TransferManifest.cs` [C] |
| N-04 sender-named files and any content type | **Partly.** `AllowOpaqueFiles` option added, **default true**; a transaction-only deployment must pass false | `ReceiveEngine.cs` constructor [C] |
| Settled-session set grows without limit | **Fixed.** Capped at 4096 | `ReceiveEngine.cs` [C] |
| N-05 malleable signature (`n - s`) | **Not fixed.** No low-S check found in `Crypto` | grep of `QD3\src\QrDiode.Core` [C, by absence] |
| N-06 / Q-08 counter exhaustion and rollback | **Not fixed.** `checked(current + 1)` throws at the maximum; the counter is still a DPAPI user-scope file | `Crypto\CounterStore.cs:25-47` [C] |
| Q-07 replay committed before the payload is stored | **Not fixed.** `Check` at `ReceiveEngine.cs:175`, `Commit` at `:267` before the caller stores | [C] |
| S-05 native decoder in the key-holding process | **Not addressed** in the diff | [C, by absence of change] |
| Q-03, Q-02, Q-10 unauthenticated reset and lock | **Not addressed** in the files that changed; I did not re-run the harness on V3 | [U] |
| N-02, S-04, S-07, S-09, S-13 | Not examined in V3 | [U] |

V3 is better and should be the base. Its fixes are the cheap ones; the structural findings remain. V3 also adds `packages.lock.json` (partly answers S-14) and a `PayloadStoreTests.cs`.

---

## 9. Requirement gaps of the Gateway design against V5.0

| REQ / invariant | Topic | GW status |
|---|---|---|
| 01-02 | Authenticated frames, per-message bounded state | Not met (G-04) |
| 03 | Loss detected and repaired | Not met (G-02) |
| 06 | Persist before acknowledging, one transaction | **Met for the DMZ ack, and that is the problem**: persisting is not delivering (G-01) |
| 07 | Monotonic state survives rebuild | Not met (G-14, N-06) |
| 10 | Forward secrecy, key separation | Not met (static-static, S-09) |
| 12-13 | Hardware keys, signed trust list | Not met (N-02, S-07, S-13) |
| 15 | Schema validation per `TYPE`, no opaque types | Partly (SafeXml, `AllowedTypes`; opaque default true) |
| 16 | Caller identity in the envelope | Not met (G-07) |
| 18 | Quotas, priority classes | Partly (global backlog cap only; G-12, G-13) |
| 19 | Privilege separation | Not met (G-06) |
| 20 | Service accounts, ACLs, encryption at rest | Not met (G-05, G-14) |
| 21 | Bounded logs and audit | Unknown [U] |
| 23 | Do not depend on wall clocks | Not met (7-day window, skew 60 min) |

---

## 10. Revised design

```
Caller (monitor, unchanged)
  | HTTPS POST, registry *ServiceUrl -> DMZ gateway
  v
DMZ Gateway ingress (no keys)
  - size cap, SafeXml, route table lookup (signed, versioned), schema check
  - business idempotency key; if seen: return stored result
  - persist outbox row (encrypted), take sequence, commit
  - HOLD the HTTP request (deadline < 100 s)
        |
        | forward QR lane (authenticated frames, fixed geometry)
        v
Corp receiver (decoder in a sandbox, no keys) -> signer/verifier -> inbox (encrypted, one transaction)
  v
Corp egress (credentials only): POST to the real service, parse RETURN_CODE
        |
        | return lane: receipt = message id + RETURN_CODE (+ reply for FTC)
        v
DMZ gateway releases the held request with the real reply
  - receipt not received by the deadline: non-zero RETURN_CODE (monitor counts the attempt)
  - late receipt: stored under the idempotency key; the next retry gets it
```

What changes from GW: a held request with a deadline; a business idempotency key; a return lane; a signed route table; process separation; encryption at rest; a per-route mode (round trip / fail-fast / unavailable); priority and per-route concurrency; one transaction for replay state and the inbox row.

What stays: the SQLite outbox/inbox pattern, per-direction sequence numbers, SafeXml, 202/non-zero conventions, backoff, the design-review notes habit.

**Build order (rough).** (1) Decide the return lane and the modes per call. (2) Confirm payload sizes and Rapid Restore idempotency. (3) Replace `RRMsgID` dedupe with the business key. (4) Hold-and-receipt in the gateway. (5) Frame authentication and decoder isolation on QrDiode V3. (6) Key ceremony, route table signing. (7) Fault-injection tests on loss, reorder, reset and late receipts. (8) Cut over one low-risk route (FTC or portal sync) first, then orders, then permits.

---

## 11. Open questions

| # | Question | Gates | Default if unanswered |
|---|---|---|---|
| 1 | Is a reverse lane allowed, and of which kind (constrained optical, serial, full QR)? | G-01, G-02, G-08 | No return path: permits and orders may not be acked; only fail-fast and manual fallback |
| 2 | Where is the Gateway (`QrBridge.*`) source, and does it match GW? | Every [D] claim | Treated as unverified |
| 3 | Is Rapid Restore idempotent on a business key for each operation? Which fields identify a message? | G-03 | Not idempotent; dedupe at the gateway, per `TYPE` key |
| 4 | Real payload sizes and call frequency per operation; the acknowledgement-delay values FMS applies | G-10, section 6 | Assumed small (below 128 KB) |
| 5 | Is QrDiode V2 or V3 the base? Will you run my harness on V3? | G-04, section 8 | V3 |
| 6 | Does the interactive `cac`/`cas` call `GetFaultCorrelation` with a user waiting? | FTC mode | Round trip with a short deadline |
| 7 | Who calls `GetFromFMS`, and what does it return? | G-08 | Unavailable |
| 8 | In scope: FSS, Dashboard, SSL/Maximo, RTF, Verizon? Host names are masked for FSS | Route table | Out |
| 9 | Certificates: issuer, trust on the caller hosts, revocation while islanded, names for `comp.coned.com` and `ecczfmsrr` | G-09 | Name-constrained internal CA |
| 10 | Authentication at the DMZ gateway for the Negotiate callers; account model at Corp egress | G-07 | Per-route accounts; anonymous only from an ACL host list |
| 11 | Do you accept the registry `*ServiceUrl` change (section 7)? | Deployment | Yes |
| 12 | What should the dispatcher see when the link is down? Is the 12-minute fallback acceptable operationally? | G-01, G-16 | Immediate non-zero and an on-screen link-state alarm |
| 13 | Is "zero copper or fibre" a mandate? Which standards apply (NERC CIP)? | Lane choice | QR; unknown and flagged |
| 14 | Inbound services other than FC2FMS: same shape? I did not read them | Section 2.3 | Assumed the same |

---

## 12. What I did and did not verify

**Verified.** All of GW read. Monitor, outbound-interface and inbound-service source read at the file and line cited. QD2 and QD3 compared by SHA-256 and by diff. The V5.0 harness results stand for V2 [R].

**Not verified.** Any Gateway code. Whether V3 fixes the unauthenticated-reset and session-lock findings (I did not re-run the harness on V3). The `cac`/`cas` call context. Inbound services other than FC2FMS. Rapid Restore's own behaviour. Real payload sizes. The throughput numbers are arithmetic from GW's parameters, not measurements.

**Files changed.** None other than this report. V3.0, V4.0, V5.0, the monitors, the interface sources and both QrDiode trees were only read.
