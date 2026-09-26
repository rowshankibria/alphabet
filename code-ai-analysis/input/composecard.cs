using System.Collections.Generic;
using System.Linq;
using Telerik.Reporting;
using FMS_PDFReportService.Data.Repositories;
using FMS_PDFReportService.Engine.Rendering;
using FMS_PDFReportService.Engine.Services;
using FMS_PDFReportService.Models.Cards;
using FMS_PDFReportService.Models.Reports;
using FMS_PDFReportService.Models.Reports.FmsDos;
using FMS_PDFReportService.Models.Reports.FmsOnline;

namespace FMS_PDFReportService.Engine.Groupers
{
    public class FMSGrouper : IReportGrouper
    {
        private readonly IFMSCardRepository _repo;
        private readonly TelerikReportRenderer _renderer;
        private readonly PermissionService _permissions;
        private readonly TemplatePathResolver _templatePath;

        public FMSGrouper(IFMSCardRepository repo, TelerikReportRenderer renderer,
            PermissionService permissions, TemplatePathResolver templatePath)
        {
            _repo = repo;
            _renderer = renderer;
            _permissions = permissions;
            _templatePath = templatePath;
        }

        public List<ReportSource> ComposeCard(int cardId, ReportRequest request)
        {
            var sources = new List<ReportSource>();

            // Feeder Card = header box (report header) + switching moves (detail) in a single report
            // so they share the page. The moves are the report's object data source; the header fields
            // are passed as report parameters.
            var header = _repo.LoadCardHeader(cardId, request.ArchiveFlag);
            var note = _repo.LoadCardNote(cardId);
            var jobs = _repo.LoadJobs(cardId, request.ArchiveFlag);
            sources.Add(_renderer.CreateReportSource(
                _templatePath.Resolve("FMS/FeederCard.trdx"), jobs, BuildHeaderParameters(header, note)));

            // Complete Set (ReportType=1)
            if (request.ReportType == 1)
            {
                var log = _repo.LoadFeederLog(cardId, request.ArchiveFlag);
                sources.Add(_renderer.CreateReportSource(_templatePath.Resolve("FMS/FMSCardLog.trdx"), log));

                // Tag permission gate (BR-RPT-040)
                if (_permissions.HasTagPermission(request.Permission))
                {
                    var tags = _repo.LoadRegisteredTags(header.Feeder);
                    sources.Add(_renderer.CreateReportSource(_templatePath.Resolve("FMS/FMSRegTag.trdx"), tags));
                }

                // Work Permits with nested protections, phase checks, location tags
                var permits = _repo.LoadWorkPermits(cardId, request.ArchiveFlag).ToList();
                if (permits.Any())
                {
                    foreach (var permit in permits)
                    {
                        permit.Protections = _repo.LoadProtections(permit.Job).ToList();
                        permit.PhaseChecks = _repo.LoadPhaseChecks(cardId, permit.Job).ToList();
                    }
                    var locationTags = _repo.LoadLocationTags(cardId).ToList();
                    // FMSWorkPermit.trdx is a Shape-A list of WorkPermit rows, so its DataSource must be
                    // the permit list itself (LocationTags is fed separately to FMSLocationTag below).
                    sources.Add(_renderer.CreateReportSource(_templatePath.Resolve("FMS/FMSWorkPermit.trdx"), permits));

                    // Phase checks and protections are their own list reports; flatten the nested
                    // per-permit collections into one list each so the templates can iterate them.
                    sources.Add(_renderer.CreateReportSource(_templatePath.Resolve("FMS/FMSPhaseCheck.trdx"), permits.SelectMany(p => p.PhaseChecks).ToList()));
                    sources.Add(_renderer.CreateReportSource(_templatePath.Resolve("FMS/FMSProtection.trdx"), permits.SelectMany(p => p.Protections).ToList()));
                    sources.Add(_renderer.CreateReportSource(_templatePath.Resolve("FMS/FMSLocationTag.trdx"), locationTags));
                }

                var relay = _repo.LoadRelaySummary(cardId, request.ArchiveFlag);
                sources.Add(_renderer.CreateReportSource(_templatePath.Resolve("FMS/FMSRelaySummary.trdx"), relay));
            }

            return sources;
        }

        private static Dictionary<string, object> BuildHeaderParameters(FmsCardHeader header, CardNote note)
        {
            if (header == null)
                return new Dictionary<string, object>();

            return new Dictionary<string, object>
            {
                { "Position", header.Position },
                { "FeederName", header.FeederName },
                { "CardClassName", header.CardClassName },
                { "SubstationName", header.SubstationName },
                { "CutOut", header.CutOut },
                { "CutIn", header.CutIn },
                { "StationGround", header.StationGround },
                { "GroundsOn", header.GroundsOn },
                { "DeadMoves", header.DeadMoves },
                { "DeadMovesTO", header.DeadMovesTO },
                { "Loop1", header.Loop1 },
                { "Loop2", header.Loop2 },
                { "Loop3", header.Loop3 },
                { "Loop4", header.Loop4 },
                { "Assoc", header.Assoc },
                { "NoteText", note?.NoteText }
            };
        }
    }

    public class TFMSGrouper : IReportGrouper
    {
        private readonly ITFMSCardRepository _repo;
        private readonly TelerikReportRenderer _renderer;
        private readonly TemplatePathResolver _templatePath;

        public TFMSGrouper(ITFMSCardRepository repo, TelerikReportRenderer renderer, TemplatePathResolver templatePath)
        {
            _repo = repo;
            _renderer = renderer;
            _templatePath = templatePath;
        }

        public List<ReportSource> ComposeCard(int cardId, ReportRequest request)
        {
            var sources = new List<ReportSource>();

            sources.Add(_renderer.CreateReportSource(_templatePath.Resolve("TFMS/TFMSCardHeader.trdx"),
                _repo.LoadCardHeader(cardId, request.ArchiveFlag)));
            sources.Add(_renderer.CreateReportSource(_templatePath.Resolve("TFMS/TFMSCard.trdx"),
                _repo.LoadJobs(cardId, request.ArchiveFlag)));

            if (request.ReportType == 1)
            {
                sources.Add(_renderer.CreateReportSource(_templatePath.Resolve("TFMS/TFMSCardLog.trdx"),
                    _repo.LoadCardLog(cardId, request.ArchiveFlag)));
                sources.Add(_renderer.CreateReportSource(_templatePath.Resolve("TFMS/TOMSWorkPermit.trdx"),
                    _repo.LoadWorkPermits(cardId, request.ArchiveFlag)));
            }

            return sources;
        }
    }

    public class SLCGrouper : IReportGrouper
    {
        private readonly ISLCCardRepository _repo;
        private readonly TelerikReportRenderer _renderer;
        private readonly TemplatePathResolver _templatePath;

        public SLCGrouper(ISLCCardRepository repo, TelerikReportRenderer renderer, TemplatePathResolver templatePath)
        {
            _repo = repo;
            _renderer = renderer;
            _templatePath = templatePath;
        }

        public List<ReportSource> ComposeCard(int cardId, ReportRequest request)
        {
            var sources = new List<ReportSource>();

            sources.Add(_renderer.CreateReportSource(_templatePath.Resolve("SLC/SLCCardHeader.trdx"),
                _repo.LoadCardHeader(cardId, request.ArchiveFlag)));
            sources.Add(_renderer.CreateReportSource(_templatePath.Resolve("SLC/SLCCard.trdx"),
                _repo.LoadJobs(cardId, request.ArchiveFlag, request.SLCItemType, request.SWItemID)));

            if (request.ReportType == 1)
            {
                sources.Add(_renderer.CreateReportSource(_templatePath.Resolve("SLC/SLCCardLog.trdx"),
                    _repo.LoadCardLog(cardId, request.ArchiveFlag)));
                sources.Add(_renderer.CreateReportSource(_templatePath.Resolve("SLC/SLCWorkPermit.trdx"),
                    _repo.LoadWorkPermits(cardId, request.ArchiveFlag)));
            }

            return sources;
        }
    }

    public class TLSGrouper : IReportGrouper
    {
        private readonly ITLSCardRepository _repo;
        private readonly TelerikReportRenderer _renderer;
        private readonly TemplatePathResolver _templatePath;

        public TLSGrouper(ITLSCardRepository repo, TelerikReportRenderer renderer, TemplatePathResolver templatePath)
        {
            _repo = repo;
            _renderer = renderer;
            _templatePath = templatePath;
        }

        public List<ReportSource> ComposeCard(int cardId, ReportRequest request)
        {
            // TLS ALWAYS generates card-only regardless of ReportType (BR-RPT-029)
            var sources = new List<ReportSource>();

            sources.Add(_renderer.CreateReportSource(_templatePath.Resolve("TLS/TLSCardHeader.trdx"),
                _repo.LoadCardHeader(cardId, request.ArchiveFlag)));
            sources.Add(_renderer.CreateReportSource(_templatePath.Resolve("TLS/TLSCard.trdx"),
                _repo.LoadJobs(cardId, request.ArchiveFlag)));

            return sources;
        }
    }

    public class DSOGrouper : IReportGrouper
    {
        private readonly IDSOCardRepository _repo;
        private readonly TelerikReportRenderer _renderer;
        private readonly TemplatePathResolver _templatePath;

        public DSOGrouper(IDSOCardRepository repo, TelerikReportRenderer renderer, TemplatePathResolver templatePath)
        {
            _repo = repo;
            _renderer = renderer;
            _templatePath = templatePath;
        }

        public List<ReportSource> ComposeCard(int cardId, ReportRequest request)
        {
            var sources = new List<ReportSource>();

            sources.Add(_renderer.CreateReportSource(_templatePath.Resolve("DSO/DSOCardHeader.trdx"),
                _repo.LoadCardHeader(cardId, request.ArchiveFlag)));
            sources.Add(_renderer.CreateReportSource(_templatePath.Resolve("DSO/DSOCard.trdx"),
                _repo.LoadJobs(cardId, request.ArchiveFlag)));

            if (request.ReportType == 1)
            {
                // Log only — Work Permits disabled in legacy (BR-RPT-031)
                sources.Add(_renderer.CreateReportSource(_templatePath.Resolve("DSO/DSOCardLog.trdx"),
                    _repo.LoadCardLog(cardId, request.ArchiveFlag)));
            }

            return sources;
        }
    }

    public class SteamGrouper : IReportGrouper
    {
        private readonly ISteamCardRepository _repo;
        private readonly TelerikReportRenderer _renderer;
        private readonly TemplatePathResolver _templatePath;

        public SteamGrouper(ISteamCardRepository repo, TelerikReportRenderer renderer, TemplatePathResolver templatePath)
        {
            _repo = repo;
            _renderer = renderer;
            _templatePath = templatePath;
        }

        public List<ReportSource> ComposeCard(int cardId, ReportRequest request)
        {
            // Steam ALWAYS generates card-only (BR-RPT-030)
            var sources = new List<ReportSource>();

            sources.Add(_renderer.CreateReportSource(_templatePath.Resolve("Steam/SteamCardHeader.trdx"),
                _repo.LoadCardHeader(cardId, request.ArchiveFlag)));
            sources.Add(_renderer.CreateReportSource(_templatePath.Resolve("Steam/SteamCard.trdx"),
                _repo.LoadJobs(cardId, request.ArchiveFlag)));

            return sources;
        }
    }

    public class ISWPPermitGrouper : IReportGrouper
    {
        private readonly IISWPRepository _repo;
        private readonly TelerikReportRenderer _renderer;
        private readonly TemplatePathResolver _templatePath;

        public ISWPPermitGrouper(IISWPRepository repo, TelerikReportRenderer renderer, TemplatePathResolver templatePath)
        {
            _repo = repo;
            _renderer = renderer;
            _templatePath = templatePath;
        }

        public List<ReportSource> ComposeCard(int cardId, ReportRequest request)
        {
            var permitId = cardId; // For ISWP, the "cardId" is actually a permit ID
            var sources = new List<ReportSource>();

            var permit = _repo.LoadPermitDetail(permitId);
            var equipment = _repo.LoadEquipment(permitId);
            var conditions = _repo.LoadConditions(permitId);
            var permitLog = _repo.LoadPermitLog(permitId);

            // ISWPPermit.trdx is a scalar permit-header sheet, so its DataSource must be the
            // ISWPPermitDetail itself. Equipment / Conditions / Log each flow to their own reports below.
            sources.Add(_renderer.CreateReportSource(_templatePath.Resolve("ISWP/ISWPPermit.trdx"), permit));
            sources.Add(_renderer.CreateReportSource(_templatePath.Resolve("ISWP/ISWPEquipment.trdx"), equipment));
            sources.Add(_renderer.CreateReportSource(_templatePath.Resolve("ISWP/ISWPConditions.trdx"), conditions));
            sources.Add(_renderer.CreateReportSource(_templatePath.Resolve("ISWP/ISWPPermitLog.trdx"), permitLog));

            if (request.ReportType == 1)
            {
                var requestDetail = _repo.LoadRequestDetail(permitId);
                var requestLog = _repo.LoadRequestLog(permitId);
                sources.Add(_renderer.CreateReportSource(_templatePath.Resolve("ISWP/ISWPRequest.trdx"), requestDetail));
                sources.Add(_renderer.CreateReportSource(_templatePath.Resolve("ISWP/ISWPRequestLog.trdx"), requestLog));
            }

            return sources;
        }
    }

    public class RPMGrouper : IReportGrouper
    {
        private readonly IRPMRepository _repo;
        private readonly TelerikReportRenderer _renderer;
        private readonly TemplatePathResolver _templatePath;

        public RPMGrouper(IRPMRepository repo, TelerikReportRenderer renderer, TemplatePathResolver templatePath)
        {
            _repo = repo;
            _renderer = renderer;
            _templatePath = templatePath;
        }

        public List<ReportSource> ComposeCard(int cardId, ReportRequest request)
        {
            // For RPM, cardId is the groupId
            return ComposeGroup(cardId);
        }

        public List<ReportSource> ComposeGroup(int groupId)
        {
            var sources = new List<ReportSource>();

            sources.Add(_renderer.CreateReportSource(_templatePath.Resolve("RPM/RPMFeeders.trdx"),
                _repo.LoadFeeders(groupId)));
            sources.Add(_renderer.CreateReportSource(_templatePath.Resolve("RPM/RPMCircuits.trdx"),
                _repo.LoadCircuits(groupId)));
            sources.Add(_renderer.CreateReportSource(_templatePath.Resolve("RPM/RPMGrid.trdx"),
                _repo.LoadMatrixGrid(groupId)));
            sources.Add(_renderer.CreateReportSource(_templatePath.Resolve("RPM/RPMNotes.trdx"),
                _repo.LoadNotes(groupId)));
            sources.Add(_renderer.CreateReportSource(_templatePath.Resolve("RPM/RPMRelayInfo.trdx"),
                _repo.LoadRelayInfo(groupId)));

            var diagrams = _repo.LoadDiagrams(groupId);
            if (diagrams != null && diagrams.Any())
            {
                sources.Add(_renderer.CreateReportSource(_templatePath.Resolve("RPM/RPMDiagrams.trdx"), diagrams));
            }

            return sources;
        }
    }
}
