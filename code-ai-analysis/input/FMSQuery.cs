namespace FMS_PDFReportService.Data.Queries
{
    /// <summary>
    /// SQL query constants for FMS card data retrieval.
    /// Ported from FMS_Card_ASE, Job_ASE, and related legacy ASE classes.
    /// All use ODBC ? parameter placeholders.
    /// </summary>
    public static class FMSQueries
    {
        public const string LoadCardHeader = @"
            SELECT C.Card, C.Activated, C.SubstationName, C.TypeOfCard,
                   C.Feeder, C.FeederName, C.FeederStatus, C.FeederStatusName,
                   C.Status, C.CardClass, C.CardClassName, C.Position,
                   C.StationGround, C.GroundsOn, C.DeadMoves, C.DeadMovesTO,
                   C.Loop1, C.Loop2, C.Loop3, C.Loop4,
                   C.Assoc, C.Relays, C.Notifications, C.Validated,
                   C.CutOut, C.CutIn, C.OpenAutoPlus, C.PhaseChecks,
                   C.EstTimeInService, C.EstTimeComplete, C.ActTimeComplete,
                   C.WorkpermitFlag, C.XferFlag, C.NotifyFlag,
                   C.ProcessAutoExecution, C.Closed, C.NetworkFeeder, C.TV_Bogey
            FROM   FMS_Card C
            WHERE  C.Card = ?";

        public const string LoadCardHeaderArchive = @"
            SELECT C.Card, C.Activated, C.SubstationName, C.TypeOfCard,
                   C.Feeder, C.FeederName, C.FeederStatus, C.FeederStatusName,
                   C.Status, C.CardClass, C.CardClassName, C.Position,
                   C.StationGround, C.GroundsOn, C.DeadMoves, C.DeadMovesTO,
                   C.Loop1, C.Loop2, C.Loop3, C.Loop4,
                   C.Assoc, C.Relays, C.Notifications, C.Validated,
                   C.CutOut, C.CutIn, C.OpenAutoPlus, C.PhaseChecks,
                   C.EstTimeInService, C.EstTimeComplete, C.ActTimeComplete,
                   C.WorkpermitFlag, 0 AS XferFlag, C.NotifyFlag,
                   0 AS ProcessAutoExecution, C.Closed, C.NetworkFeeder, C.TV_Bogey
            FROM   FMS_ArchiveCard C
            WHERE  C.Card = ?";

        public const string LoadJobs = @"
            SELECT J.Job, J.Status, J.JobClass,
                   SJ.Card, SJ.Seq,
                   J.Equip, J.EquipClass, SJ.MoveEquipClass,
                   J.EquipClassName, SJ.PrintID,
                   J.EquipName, SJ.StepPair,
                   J.Grounds, J.MoveType,
                   J.TOMove, J.TOOperator, J.TOIssued, J.TOComplete,
                   J.GroundOn,
                   J.RSMove, J.RSOperator, J.RSIssued, J.RSComplete,
                   J.TOMoveRules, J.RSMoveRules,
                   J.Response, J.MoveFGColor, J.MoveBGColor,
                   J.ControlCard, J.Substation,
                   J.MoveCategory, J.ActivityIdentifier
            FROM   SOA_JobControl SJ,
                   SOA_Job J
            WHERE  SJ.Card = ? AND
                   SJ.Job = J.Job AND
                   J.Status <> 'Del' AND
                   J.Status <> 'Hid'
            ORDER BY SJ.Seq";

        public const string LoadJobsArchive = @"
            SELECT J.Job, J.Status, J.JobClass,
                   J.Card, J.Seq,
                   J.Equip, J.MoveEquipClass, J.EquipClass,
                   J.EquipClassName, J.PrintID,
                   J.EquipName, J.StepPair,
                   J.G AS Grounds, J.MoveType,
                   J.TOMove, J.TOOperator, J.TOIssued, J.TOComplete,
                   J.GroundOn,
                   J.RSMove, J.RSOperator, J.RSIssued, J.RSComplete,
                   J.TOMoveRules, J.RSMoveRules,
                   J.Response, J.Colors AS MoveFGColor, 0 AS MoveBGColor,
                   J.Card AS ControlCard, 0 AS Substation,
                   0 AS MoveCategory, J.MoveOrigin AS ActivityIdentifier
            FROM   FMS_ArchiveJob J
            WHERE  J.Card = ? AND
                   J.Status <> 'Del' AND
                   J.Status <> 'Hid'
            ORDER BY J.Seq";

        public const string LoadCardNote = @"
            SELECT Note AS NoteText, ShowNoteFlag
            FROM   SOA_Card
            WHERE  Card = ?";

        public const string LoadNetworkObjects = @"
            SELECT CTO.Object, CTO.Type, CTO.Name, O.ValidatedBy
            FROM   TFMS_CardToObject CTO,
                   Udb_Object O
            WHERE  CTO.Card = ? AND
                   CTO.Object = O.Object";

        public const string LoadNetworkObjectsArchive = @"
            SELECT Object, Type, Name, '' AS ValidatedBy
            FROM   TFMS_ArchiveCardToObject
            WHERE  Card = ?";

        public const string LoadOperatingStep = @"
            SELECT OS.OperatingStepName, OS.StartTime
            FROM   FMS_OperatingStepStatus OS
            WHERE  OS.Card = ? AND
                   OS.EndTime = '' AND
                   OS.OperatingStep <> 0 AND
                   OS.StartTime = (
                       SELECT MAX(OS2.StartTime)
                       FROM   FMS_OperatingStepStatus OS2,
                              Udb_SuperType S
                       WHERE  OS2.Card = ? AND
                              OS2.EndTime = '' AND
                              OS2.OperatingStep <> 0 AND
                              OS2.OperatingStep = S.Type AND
                              S.SuperType = 10028
                   )";

        public const string LoadCurrentDelay = @"
            SELECT OS.OperatingStepName, OS.StartTime
            FROM   FMS_OperatingStepStatus OS
            WHERE  OS.Card = ? AND
                   OS.EndTime = '' AND
                   OS.OperatingStep <> 0 AND
                   OS.StartTime = (
                       SELECT MAX(OS2.StartTime)
                       FROM   FMS_OperatingStepStatus OS2,
                              Udb_SuperType S
                       WHERE  OS2.Card = ? AND
                              OS2.EndTime = '' AND
                              OS2.OperatingStep <> 0 AND
                              OS2.OperatingStep = S.Type AND
                              S.SuperType = 10029
                   )";

        public const string LoadChecklist = @"
            SELECT CL.Card, CL.VerifyPrint, CL.RequiredPaperwork,
                   CL.NewEquipment, CL.RFPSubmitted, CL.ProtectionLinked,
                   CL.TCContinuity, CL.TagsLinked
            FROM   FMS_CheckList CL
            WHERE  CL.Card = ?";

        public const string LoadFeederLog = @"
            SELECT FL.Card, FL.Log, FL.LogStatus, FL.LogTime,
                   FL.EnteredBy, O.Description AS EnteredByName
            FROM   FMS_FeederLog FL,
                   Udb_Object O
            WHERE  FL.Card = ? AND
                   FL.EnteredBy = O.Object
            ORDER BY FL.LogTime DESC";

        public const string LoadFeederLogArchive = @"
            SELECT FL.Card, FL.Log, FL.LogStatus, FL.LogTime,
                   FL.EnteredBy, O.Description AS EnteredByName
            FROM   FMS_ArchiveFeederLog FL,
                   Udb_Object O
            WHERE  FL.Card = ? AND
                   FL.EnteredBy = O.Object
            ORDER BY FL.LogTime DESC";

        public const string LoadWorkPermits = @"
            SELECT 0 AS CardType, 'FMS' AS CardTypeName,
                   C.FeederName AS CardName, '' AS CardStatus,
                   J.Job, J.Status, J.JobClass,
                   JC.Card, JC.Seq,
                   J.Equip, J.EquipClass, J.EquipClassName,
                   JC.MoveEquipClass, JC.PrintID,
                   J.EquipName,
                   C.SubstationName AS Subsordesk,
                   J.Substation,
                   JC.StepPair, J.MoveType,
                   J.TOMove, J.TOMoveRules, J.TOOperator,
                   J.TOIssued, J.TOComplete,
                   J.RSMove, J.RSMoveRules, J.RSOperator,
                   J.RSIssued, J.RSComplete,
                   J.Response, J.ActivityIdentifier,
                   J.MoveFGColor,
                   1 AS IsWorkPermit
            FROM   SOA_Job J,
                   SOA_JobControl JC,
                   FMS_Card C
            WHERE  C.Card = ? AND
                   JC.Card = C.Card AND
                   JC.Job = J.Job AND
                   J.Status IN ('', 'OPC') AND
                   JC.StepPair = 3 AND
                   J.JobClass <> 0
            ORDER BY JC.Seq";

        public const string LoadWorkPermitsArchive = @"
            SELECT 0 AS CardType, 'FMS' AS CardTypeName,
                   C.FeederName AS CardName, 'Cls' AS CardStatus,
                   J.Job, J.Status, J.JobClass,
                   J.Card, J.Seq,
                   J.Equip, J.EquipClass, J.EquipClassName,
                   J.MoveEquipClass, J.PrintID,
                   J.EquipName,
                   C.SubstationName AS Subsordesk,
                   0 AS Substation,
                   J.StepPair, J.MoveType,
                   J.TOMove, '' AS TOMoveRules, J.TOOperator,
                   J.TOIssued, J.TOComplete,
                   J.RSMove, '' AS RSMoveRules, J.RSOperator,
                   J.RSIssued, J.RSComplete,
                   J.Response, J.MoveOrigin AS ActivityIdentifier,
                   J.Colors AS MoveFGColor,
                   1 AS IsWorkPermit
            FROM   FMS_ArchiveJob J,
                   FMS_ArchiveCard C
            WHERE  C.Card = ? AND
                   J.Card = C.Card AND
                   J.Status <> 'Del' AND
                   J.StepPair = 3 AND
                   J.JobClass <> 0
            ORDER BY J.Seq";

        public const string LoadProtections = @"
            SELECT PermitCardType, PermitJobID, PermitCard,
                   ProtectionCardType, ProtectionJobID, ProtectionCard,
                   PrePost, Seq
            FROM   FMS_WorkPermitProtection
            WHERE  PermitJobID = ? AND
                   PermitCardType = 0
            ORDER BY Seq";

        public const string LoadProtectionRequired = @"
            SELECT ProtectionRequired
            FROM   FMS_WorkPermit
            WHERE  PermitJobId = ?";

        public const string LoadPhaseChecks = @"
            SELECT DISTINCT
                   P.PhaseCheckEquip, O.Name AS PCEquipName, O.Type,
                   OB.Name AS SatisfyEquipName, P.SatisfyEquip,
                   CASE WHEN P.CompletionTime IS NOT NULL AND P.CompletionTime <> '' THEN 1 ELSE 0 END AS SatisfyResult,
                   P.CompletionTime AS SatisfyTime
            FROM   TFMS_CardToObject CTO,
                   Udb_Grouping G,
                   Udb_Object O,
                   FMS_PhaseCheck P,
                   TFMS_CardToObject CTOB,
                   Udb_Grouping GB,
                   Udb_Object OB
            WHERE  CTO.Card = ? AND
                   CTO.Object = G.Grouping AND
                   G.Relationship = 20003 AND
                   G.Member = O.Object AND
                   P.PhaseCheckEquip = O.Object AND
                   CTOB.Card = ? AND
                   CTOB.Object = GB.Grouping AND
                   GB.Relationship = 20003 AND
                   GB.Member = OB.Object AND
                   P.SatisfyEquip = OB.Object AND
                   P.WorkPermit = ? AND
                   P.Card = ?";

        public const string LoadLocationTags = @"
            SELECT TagId, TagName, Location
            FROM   FMS_LocationTag
            WHERE  Card = ?";

        public const string LoadRelaySummary = @"
            SELECT B.SwitchingItem, B.CreationTime,
                   B.BusSection, O.Name AS BusSectionName,
                   B.BDPhaseA, B.BDPhaseB, B.BDPhaseC, B.BDRelayName,
                   B.BDLastUpd, B.BDLastUpdBy,
                   B.BOCPhaseA, B.BOCPhaseB, B.BOCPhaseC, B.BOCPhaseN,
                   B.BOCRelayName, B.BOCLastUpd, B.BOCLastUpdBy,
                   B.FBMPR, B.FBMPRValue, B.FBMPRTime, B.FBMPRUpdBy,
                   B.FTFeeder, B.FTPhaseA, B.FTPhaseB, B.FTPhaseC, B.FTPhaseN,
                   B.FTRelayName, B.FTLastUpd, B.FTLastUpdBy
            FROM   SOA_BusFaultOutage B,
                   Udb_Object O
            WHERE  B.SwitchingItem = ? AND
                   B.BusSection = O.Object";

        public const string LoadRelayTargets = @"
            SELECT RT.Comment, RT.Job, RT.Line,
                   RT.RelayName, RT.TimeStamp,
                   RT.TypeA, RT.TypeB, RT.TypeC,
                   RT.TypeInst, RT.TypeText,
                   RT.SubstationName, RT.Substation,
                   RT.Sequence, RT.IsVerbal
            FROM   IR_RelayTargets RT,
                   SOA_JobControl JC
            WHERE  JC.Card = ? AND
                   JC.SwitchingItem = ? AND
                   JC.Job = RT.Job
            UNION
            SELECT RT.Comment, RT.Job, RT.Line,
                   RT.RelayName, RT.TimeStamp,
                   RT.TypeA, RT.TypeB, RT.TypeC,
                   RT.TypeInst, RT.TypeText,
                   RT.SubstationName, RT.Substation,
                   RT.Sequence, RT.IsVerbal
            FROM   IR_RelayTargets RT
            WHERE  RT.Job = ?
            ORDER BY SubstationName, Sequence, TimeStamp";

        public const string LoadRelayTargetsArchive = @"
            SELECT RT.Comment, RT.Job, RT.Line,
                   RT.RelayName, RT.TimeStamp,
                   RT.TypeA, RT.TypeB, RT.TypeC,
                   RT.TypeInst, RT.TypeText,
                   RT.SubstationName, RT.Substation,
                   RT.Sequence, RT.IsVerbal
            FROM   IR_RelayTargets RT,
                   SOA_ArchiveJob J
            WHERE  J.Card = ? AND
                   J.SwitchingItem = ? AND
                   J.Job = RT.Job
            UNION
            SELECT RT.Comment, RT.Job, RT.Line,
                   RT.RelayName, RT.TimeStamp,
                   RT.TypeA, RT.TypeB, RT.TypeC,
                   RT.TypeInst, RT.TypeText,
                   RT.SubstationName, RT.Substation,
                   RT.Sequence, RT.IsVerbal
            FROM   IR_RelayTargets RT
            WHERE  RT.Job = ?
            ORDER BY SubstationName, Sequence, TimeStamp";

        public const string LoadRegisteredTags = @"
            SELECT R.Feeder, R.TagNumber, R.LocationStructure, R.LocationStreet,
                   R.TagSentDate, R.TagSentBy, R.Phases,
                   R.BrassTag, R.PlasticTag, R.TagNotes,
                   R.ExpirationDate, R.WarningDate, R.LastValidatedDate
            FROM   FMS_RegTag R
            WHERE  R.Feeder = ?
            ORDER BY R.TagNumber";
    }
}
