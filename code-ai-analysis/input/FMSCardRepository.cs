using System;
using System.Collections.Generic;
using System.Data;
using System.Diagnostics;
using System.Linq;
using Dapper;
using Serilog;
using FMS_PDFReportService.Data.Connection;
using FMS_PDFReportService.Data.Queries;
using FMS_PDFReportService.Models.Cards;
using FMS_PDFReportService.Models.Jobs;

namespace FMS_PDFReportService.Data.Repositories
{
    public class FMSCardRepository : IFMSCardRepository
    {
        private readonly IConnectionFactory _connectionFactory;

        public FMSCardRepository(IConnectionFactory connectionFactory)
        {
            _connectionFactory = connectionFactory;
        }

        public FmsCardHeader LoadCardHeader(int cardId, int archiveFlag)
        {
            var sql = archiveFlag == 1 ? FMSQueries.LoadCardHeaderArchive : FMSQueries.LoadCardHeader;
            var sw = Stopwatch.StartNew();
            using (var conn = _connectionFactory.GetConnection())
            {
                var result = conn.QueryFirstOrDefault<FmsCardHeader>(sql, new { p1 = cardId });
                Log.Debug("FMS LoadCardHeader CardId={CardId} Archive={Archive} in {ElapsedMs}ms",
                    cardId, archiveFlag, sw.ElapsedMilliseconds);
                return result;
            }
        }

        public CardNote LoadCardNote(int cardId)
        {
            var sw = Stopwatch.StartNew();
            using (var conn = _connectionFactory.GetConnection())
            {
                var result = conn.QueryFirstOrDefault<CardNote>(FMSQueries.LoadCardNote, new { p1 = cardId });
                Log.Debug("FMS LoadCardNote CardId={CardId} in {ElapsedMs}ms", cardId, sw.ElapsedMilliseconds);
                return result;
            }
        }

        public IEnumerable<NetworkObject> LoadNetworkObjects(int cardId)
        {
            var sw = Stopwatch.StartNew();
            using (var conn = _connectionFactory.GetConnection())
            {
                var result = conn.Query<NetworkObject>(FMSQueries.LoadNetworkObjects, new { p1 = cardId }).ToList();
                Log.Debug("FMS LoadNetworkObjects CardId={CardId} Rows={Count} in {ElapsedMs}ms",
                    cardId, result.Count, sw.ElapsedMilliseconds);
                return result;
            }
        }

        public OperatingStep LoadOperatingStep(int cardId)
        {
            using (var conn = _connectionFactory.GetConnection())
            {
                return conn.QueryFirstOrDefault<OperatingStep>(
                    FMSQueries.LoadOperatingStep, new { p1 = cardId, p2 = cardId });
            }
        }

        public OperatingStep LoadCurrentDelay(int cardId)
        {
            using (var conn = _connectionFactory.GetConnection())
            {
                return conn.QueryFirstOrDefault<OperatingStep>(
                    FMSQueries.LoadCurrentDelay, new { p1 = cardId, p2 = cardId });
            }
        }

        public FmsChecklist LoadChecklist(int cardId)
        {
            using (var conn = _connectionFactory.GetConnection())
            {
                return conn.QueryFirstOrDefault<FmsChecklist>(FMSQueries.LoadChecklist, new { p1 = cardId });
            }
        }

        public IEnumerable<FmsJob> LoadJobs(int cardId, int archiveFlag)
        {
            var sql = archiveFlag == 1 ? FMSQueries.LoadJobsArchive : FMSQueries.LoadJobs;
            var sw = Stopwatch.StartNew();
            using (var conn = _connectionFactory.GetConnection())
            {
                var result = conn.Query<FmsJob>(sql, new { p1 = cardId }).ToList();
                Log.Debug("FMS LoadJobs CardId={CardId} Archive={Archive} Rows={Count} in {ElapsedMs}ms",
                    cardId, archiveFlag, result.Count, sw.ElapsedMilliseconds);
                return result;
            }
        }

        public IEnumerable<FeederLogEntry> LoadFeederLog(int cardId, int archiveFlag)
        {
            var sql = archiveFlag == 1 ? FMSQueries.LoadFeederLogArchive : FMSQueries.LoadFeederLog;
            var sw = Stopwatch.StartNew();
            using (var conn = _connectionFactory.GetConnection())
            {
                var result = conn.Query<FeederLogEntry>(sql, new { p1 = cardId }).ToList();
                Log.Debug("FMS LoadFeederLog CardId={CardId} Archive={Archive} Rows={Count} in {ElapsedMs}ms",
                    cardId, archiveFlag, result.Count, sw.ElapsedMilliseconds);
                return result;
            }
        }

        public IEnumerable<WorkPermit> LoadWorkPermits(int cardId, int archiveFlag)
        {
            var sql = archiveFlag == 1 ? FMSQueries.LoadWorkPermitsArchive : FMSQueries.LoadWorkPermits;
            using (var conn = _connectionFactory.GetConnection())
            {
                var permits = conn.Query<WorkPermit>(sql, new { p1 = cardId }).ToList();

                foreach (var permit in permits)
                {
                    var protReq = conn.QueryFirstOrDefault<int?>(
                        FMSQueries.LoadProtectionRequired, new { p1 = permit.Job });
                    permit.ProtectionRequired = protReq ?? 0;
                }

                return permits;
            }
        }

        public IEnumerable<PermitProtection> LoadProtections(int permitJobId)
        {
            using (var conn = _connectionFactory.GetConnection())
            {
                return conn.Query<PermitProtection>(FMSQueries.LoadProtections, new { p1 = permitJobId }).ToList();
            }
        }

        public IEnumerable<PhaseCheck> LoadPhaseChecks(int cardId, int permitJobId)
        {
            using (var conn = _connectionFactory.GetConnection())
            {
                return conn.Query<PhaseCheck>(
                    FMSQueries.LoadPhaseChecks,
                    new { p1 = cardId, p2 = cardId, p3 = permitJobId, p4 = cardId }).ToList();
            }
        }

        public IEnumerable<LocationTag> LoadLocationTags(int cardId)
        {
            using (var conn = _connectionFactory.GetConnection())
            {
                return conn.Query<LocationTag>(FMSQueries.LoadLocationTags, new { p1 = cardId }).ToList();
            }
        }

        public RelaySummaryData LoadRelaySummary(int cardId, int archiveFlag)
        {
            var result = new RelaySummaryData { CardId = cardId };

            using (var conn = _connectionFactory.GetConnection())
            {
                result.BusFaultEntries = conn.Query<BusFaultOutageEntry>(
                    FMSQueries.LoadRelaySummary, new { p1 = cardId }).ToList();

                var relayTargetSql = archiveFlag == 1
                    ? FMSQueries.LoadRelayTargetsArchive
                    : FMSQueries.LoadRelayTargets;

                result.RelayTargets = conn.Query<RelayTargetEntry>(
                    relayTargetSql, new { p1 = cardId, p2 = cardId, p3 = cardId }).ToList();
            }

            return result;
        }

        public IEnumerable<RegisteredTag> LoadRegisteredTags(int feederId)
        {
            using (var conn = _connectionFactory.GetConnection())
            {
                return conn.Query<RegisteredTag>(FMSQueries.LoadRegisteredTags, new { p1 = feederId }).ToList();
            }
        }
    }
}
