
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ShieldAlert,
  Activity,
  RefreshCw,
  Loader2,
  Search,
  Database,
  UserRound,
  CalendarDays,
  X,
  Eye,
  FilePlus2,
  FilePenLine,
  FileX2,
  Info,
  ChevronDown,
  ChevronRight,
  Clock3,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  History,
  RotateCcw,
} from 'lucide-react';
import { supabase } from '../../config/supabaseClient';
import toast from 'react-hot-toast';

const INITIAL_STATS = {
  total: 0,
  inserts: 0,
  updates: 0,
  deletes: 0,
};

const SENSITIVE_KEY_PATTERN =
  /password|passwd|secret|token|authorization|api[_-]?key|access[_-]?key|private[_-]?key|refresh[_-]?token|credential/i;

export const AdminAudits = () => {
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [tableFilter, setTableFilter] = useState('all');
  const [selectedLog, setSelectedLog] = useState(null);

  const requestIdRef = useRef(0);

  const fetchAuditLogs = useCallback(async (showRefresh = false) => {
    const requestId = ++requestIdRef.current;

    if (showRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setLoadError('');

    try {
      const { data: logs, error: logsError } = await supabase
        .from('audit_logs')
        .select(`
          id,
          actor_id,
          action,
          target_table,
          target_id,
          description,
          old_data,
          new_data,
          created_at
        `)
        .order('created_at', { ascending: false })
        .limit(100);

      if (logsError) {
        throw logsError;
      }

      if (requestId !== requestIdRef.current) return;

      const actorIds = [
        ...new Set(
          (logs || [])
            .map((log) => log.actor_id)
            .filter(Boolean)
        ),
      ];

      let actors = [];

      // A profile lookup failure should not hide the audit history.
      if (actorIds.length > 0) {
        const { data: actorData, error: actorsError } = await supabase
          .from('profiles')
          .select('id, full_name, role')
          .in('id', actorIds);

        if (actorsError) {
          console.warn('Could not load audit actor profiles:', actorsError);
        } else {
          actors = actorData || [];
        }
      }

      if (requestId !== requestIdRef.current) return;

      const formattedLogs = (logs || []).map((log) => {
        const actor = actors.find(
          (user) => user.id === log.actor_id
        );

        return {
          ...log,
          actorName: actor?.full_name || (
            log.actor_id ? 'Unknown user' : 'Unidentified actor'
          ),
          actorRole: actor?.role || 'Unknown role',
        };
      });

      setAuditLogs(formattedLogs);
      setHasLoaded(true);
      setLoadError('');
    } catch (error) {
      console.error('Error fetching audit logs:', error);

      if (requestId !== requestIdRef.current) return;

      setLoadError(
        'We could not load the activity history. Check your connection or permissions and try again.'
      );

      toast.error('Unable to load audit history.');
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    fetchAuditLogs();

    const auditChannel = supabase
      .channel('audit-logs-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'audit_logs',
        },
        () => fetchAuditLogs(true)
      )
      .subscribe();

    return () => {
      requestIdRef.current += 1;
      supabase.removeChannel(auditChannel);
    };
  }, [fetchAuditLogs]);

  // Keep the selected record in sync if a refreshed record changes.
  useEffect(() => {
    if (!selectedLog) return;

    const updatedLog = auditLogs.find(
      (log) => log.id === selectedLog.id
    );

    if (updatedLog) {
      setSelectedLog(updatedLog);
    }
  }, [auditLogs, selectedLog]);

  const stats = useMemo(() => ({
    total: auditLogs.length,
    inserts: auditLogs.filter(
      (log) => log.action?.toUpperCase() === 'INSERT'
    ).length,
    updates: auditLogs.filter(
      (log) => log.action?.toUpperCase() === 'UPDATE'
    ).length,
    deletes: auditLogs.filter(
      (log) => log.action?.toUpperCase() === 'DELETE'
    ).length,
  }), [auditLogs]);

  const tableNames = useMemo(() => [
    ...new Set(
      auditLogs
        .map((log) => log.target_table)
        .filter(Boolean)
    ),
  ].sort(), [auditLogs]);

  const filteredLogs = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();

    return auditLogs.filter((log) => {
      const action = log.action?.toUpperCase() || '';

      const matchesAction =
        actionFilter === 'all' || action === actionFilter;

      const matchesTable =
        tableFilter === 'all' ||
        log.target_table === tableFilter;

      if (!matchesAction || !matchesTable) return false;
      if (!search) return true;

      const searchableValues = [
        log.actorName,
        log.actorRole,
        log.action,
        formatTableName(log.target_table),
        log.target_id,
        log.description,
      ];

      return searchableValues.some((value) =>
        String(value ?? '').toLowerCase().includes(search)
      );
    });
  }, [auditLogs, searchTerm, actionFilter, tableFilter]);

  if (loading && !hasLoaded && !loadError) {
    return <LoadingState />;
  }

  if (loadError && !hasLoaded) {
    return (
      <ErrorState
        message={loadError}
        onRetry={() => fetchAuditLogs()}
        loading={loading}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Page heading */}
      <section className="flex flex-col gap-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 lg:flex-row lg:items-center lg:justify-between lg:p-8">
        <div>
          <div className="mb-3 flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50">
              <ShieldAlert className="h-5 w-5 text-emerald-600" />
            </div>

            <span className="text-xs font-extrabold uppercase tracking-widest text-emerald-700">
              Security &amp; Oversight
            </span>
          </div>

          <h1 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
            Activity History
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-500">
            Review important actions performed across AgroLink.
            See who performed an action, when it happened, and
            what information changed.
          </p>
        </div>

        <button
          type="button"
          onClick={() => fetchAuditLogs(true)}
          disabled={refreshing}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
        >
          <RefreshCw
            className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`}
          />
          {refreshing ? 'Refreshing...' : 'Refresh activity'}
        </button>
      </section>

      {/* Recoverable refresh error */}
      {loadError && hasLoaded && (
        <div
          role="alert"
          className="flex flex-col gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
            <div>
              <p className="text-sm font-bold text-amber-900">
                Could not refresh the activity history
              </p>
              <p className="mt-1 text-sm text-amber-800">
                The previously loaded records are still displayed.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => fetchAuditLogs(true)}
            disabled={refreshing}
            className="rounded-lg border border-amber-300 bg-white px-4 py-2 text-sm font-bold text-amber-900 hover:bg-amber-100 disabled:opacity-60"
          >
            Try again
          </button>
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          icon={<Activity className="h-5 w-5" />}
          label="Events Loaded"
          value={stats.total}
          description="Most recent records"
        />

        <StatCard
          icon={<FilePlus2 className="h-5 w-5" />}
          label="Records Created"
          value={stats.inserts}
          description="New records"
        />

        <StatCard
          icon={<FilePenLine className="h-5 w-5" />}
          label="Records Updated"
          value={stats.updates}
          description="Existing records changed"
        />

        <StatCard
          icon={<FileX2 className="h-5 w-5" />}
          label="Records Deleted"
          value={stats.deletes}
          description="Removal events"
        />
      </div>

      {/* Search and filters */}
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="mb-4">
          <h2 className="text-sm font-black text-slate-900">
            Find an activity
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Search for a person or filter by action or area of the platform.
          </p>
        </div>

        <div className="flex flex-col gap-3 lg:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

            <input
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search person, activity or record..."
              aria-label="Search activity history"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm outline-none transition focus:border-emerald-400 focus:bg-white focus:ring-2 focus:ring-emerald-100"
            />
          </div>

          <select
            value={actionFilter}
            onChange={(event) => setActionFilter(event.target.value)}
            aria-label="Filter by action"
            className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
          >
            <option value="all">All activities</option>
            <option value="INSERT">Records created</option>
            <option value="UPDATE">Records updated</option>
            <option value="DELETE">Records deleted</option>
          </select>

          <select
            value={tableFilter}
            onChange={(event) => setTableFilter(event.target.value)}
            aria-label="Filter by platform area"
            className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
          >
            <option value="all">All platform areas</option>
            {tableNames.map((table) => (
              <option key={table} value={table}>
                {formatTableName(table)}
              </option>
            ))}
          </select>

          {(searchTerm || actionFilter !== 'all' || tableFilter !== 'all') && (
            <button
              type="button"
              onClick={() => {
                setSearchTerm('');
                setActionFilter('all');
                setTableFilter('all');
              }}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50"
            >
              <RotateCcw className="h-4 w-4" />
              Clear
            </button>
          )}
        </div>
      </section>

      {/* Activity list */}
      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 lg:p-8">
        <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-base font-black text-slate-900">
              <History className="h-5 w-5 text-emerald-600" />
              Recent Activities
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Showing {filteredLogs.length} of {auditLogs.length} loaded events.
            </p>
          </div>

          {refreshing && (
            <span className="inline-flex items-center gap-2 text-xs font-semibold text-emerald-700">
              <Loader2 className="h-4 w-4 animate-spin" />
              Updating activity...
            </span>
          )}
        </div>

        {filteredLogs.length === 0 ? (
          <EmptyState
            hasFilters={
              Boolean(searchTerm) ||
              actionFilter !== 'all' ||
              tableFilter !== 'all'
            }
            onClear={() => {
              setSearchTerm('');
              setActionFilter('all');
              setTableFilter('all');
            }}
          />
        ) : (
          <div className="space-y-3">
            {filteredLogs.map((log) => (
              <ActivityItem
                key={log.id}
                log={log}
                onView={() => setSelectedLog(log)}
              />
            ))}
          </div>
        )}

        <p className="mt-6 border-t border-slate-100 pt-4 text-xs leading-relaxed text-slate-400">
          This page shows the 100 most recent audit records available
          to your account. It is not necessarily a complete history
          of every action performed on AgroLink.
        </p>
      </section>

      {/* Activity details */}
      {selectedLog && (
        <AuditDetailModal
          log={selectedLog}
          onClose={() => setSelectedLog(null)}
        />
      )}
    </div>
  );
};

const LoadingState = () => (
  <div className="flex min-h-[420px] items-center justify-center">
    <div className="text-center">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50">
        <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
      </div>
      <p className="text-sm font-bold text-slate-700">
        Loading activity history...
      </p>
      <p className="mt-1 text-xs text-slate-400">
        Retrieving recorded platform activity
      </p>
    </div>
  </div>
);

const ErrorState = ({ message, onRetry, loading }) => (
  <div className="rounded-3xl border border-red-200 bg-white p-8 text-center shadow-sm sm:p-12">
    <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50">
      <AlertCircle className="h-7 w-7 text-red-600" />
    </div>
    <h2 className="text-lg font-black text-slate-900">
      Activity history is unavailable
    </h2>
    <p className="mx-auto mt-2 max-w-lg text-sm leading-relaxed text-slate-500">
      {message}
    </p>
    <button
      type="button"
      onClick={onRetry}
      disabled={loading}
      className="mt-6 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-60"
    >
      <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
      Try again
    </button>
  </div>
);

const StatCard = ({ icon, label, value, description }) => (
  <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md sm:p-5">
    <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
      {icon}
    </div>
    <p className="text-xs font-semibold text-slate-500">{label}</p>
    <p className="mt-1 text-2xl font-black tabular-nums text-slate-900">
      {value.toLocaleString('en-NG')}
    </p>
    <p className="mt-1 text-xs text-slate-400">{description}</p>
  </div>
);

const ActivityItem = ({ log, onView }) => {
  const style = getActionStyle(log.action);
  const Icon = getActionIconComponent(log.action);

  return (
    <article className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-emerald-200 hover:shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-5">
      <div className="flex min-w-0 items-start gap-3">
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border ${style}`}>
          <Icon className="h-5 w-5" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-extrabold text-slate-900">
              {getReadableAction(log.action, log.target_table)}
            </h3>
            <ActionBadge action={log.action} />
          </div>

          <p className="mt-1 text-sm text-slate-600">
            {log.description || getFallbackDescription(log)}
          </p>

          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-500">
            <span className="inline-flex items-center gap-1.5">
              <UserRound className="h-3.5 w-3.5" />
              {log.actorName}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Database className="h-3.5 w-3.5" />
              {formatTableName(log.target_table)}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Clock3 className="h-3.5 w-3.5" />
              {formatRelativeDate(log.created_at)}
            </span>
          </div>
        </div>
      </div>

      <div className="flex shrink-0 items-center justify-between gap-3 sm:flex-col sm:items-end sm:justify-center">
        <span className="text-xs text-slate-400">
          {formatDate(log.created_at)}
        </span>

        <button
          type="button"
          onClick={onView}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 transition hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-800"
        >
          <Eye className="h-4 w-4" />
          View details
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </article>
  );
};

const EmptyState = ({ hasFilters, onClear }) => (
  <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-5 py-14 text-center">
    <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-white">
      {hasFilters ? (
        <Search className="h-6 w-6 text-slate-400" />
      ) : (
        <History className="h-6 w-6 text-slate-400" />
      )}
    </div>
    <h3 className="text-sm font-bold text-slate-700">
      {hasFilters ? 'No matching activities' : 'No activity recorded yet'}
    </h3>
    <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
      {hasFilters
        ? 'Try a different search term or remove some filters.'
        : 'When audit events are recorded and available to your account, they will appear here.'}
    </p>
    {hasFilters && (
      <button
        type="button"
        onClick={onClear}
        className="mt-4 rounded-lg px-4 py-2 text-sm font-bold text-emerald-700 hover:bg-emerald-50"
      >
        Clear filters
      </button>
    )}
  </div>
);

const AuditDetailModal = ({ log, onClose }) => {
  const safeOldData = sanitizeAuditData(parseAuditData(log.old_data));
  const safeNewData = sanitizeAuditData(parseAuditData(log.new_data));
  const changes = getDataChanges(
    log.action,
    safeOldData,
    safeNewData
  );

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-3 backdrop-blur-sm sm:p-5"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="audit-detail-title"
        className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl"
      >
        {/* Modal header */}
        <header className="flex items-start justify-between gap-4 border-b border-slate-200 p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <div className={`mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border ${getActionStyle(log.action)}`}>
              {React.createElement(getActionIconComponent(log.action), {
                className: 'h-5 w-5',
              })}
            </div>

            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-emerald-700">
                Activity details
              </p>
              <h2
                id="audit-detail-title"
                className="mt-1 text-lg font-black text-slate-900 sm:text-xl"
              >
                {getReadableAction(log.action, log.target_table)}
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                {formatDate(log.created_at)}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close activity details"
            className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-800"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        {/* Scrollable modal content */}
        <div className="overflow-y-auto p-5 sm:p-6">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <DetailItem
              icon={<UserRound className="h-4 w-4" />}
              label="Performed by"
              value={log.actorName}
              helper={formatRole(log.actorRole)}
            />
            <DetailItem
              icon={<Database className="h-4 w-4" />}
              label="Area of AgroLink"
              value={formatTableName(log.target_table)}
              helper="Record affected"
            />
            <DetailItem
              icon={<CalendarDays className="h-4 w-4" />}
              label="Date and time"
              value={formatDate(log.created_at)}
            />
            <DetailItem
              icon={<Activity className="h-4 w-4" />}
              label="Activity type"
              value={getActionVerb(log.action)}
              helper={getActionExplanation(log.action)}
            />
          </div>

          <section className="mt-6">
            <h3 className="text-sm font-black text-slate-900">
              What happened?
            </h3>
            <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm leading-6 text-slate-700">
                {log.description || getFallbackDescription(log)}
              </p>
            </div>
          </section>

          <section className="mt-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-black text-slate-900">
                  Information changed
                </h3>
                <p className="mt-1 text-xs text-slate-500">
                  A readable comparison of the recorded values.
                </p>
              </div>
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">
                {changes.length} {changes.length === 1 ? 'field' : 'fields'}
              </span>
            </div>

            {changes.length > 0 ? (
              <div className="mt-3 space-y-3">
                {changes.map((change) => (
                  <ChangeRow
                    key={change.key}
                    change={change}
                    action={log.action}
                  />
                ))}
              </div>
            ) : (
              <div className="mt-3 rounded-2xl border border-dashed border-slate-300 p-5">
                <div className="flex items-start gap-3">
                  <Info className="mt-0.5 h-5 w-5 shrink-0 text-slate-400" />
                  <div>
                    <p className="text-sm font-bold text-slate-700">
                      No field-by-field comparison is available
                    </p>
                    <p className="mt-1 text-sm leading-5 text-slate-500">
                      This event may not contain the previous or new
                      values. Its description and event details above
                      may still provide useful context.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* Technical information is hidden by default */}
          <details className="group mt-6 overflow-hidden rounded-2xl border border-slate-200">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4 hover:bg-slate-50 [&::-webkit-details-marker]:hidden">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                  <Database className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-800">
                    Technical details
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Record identifiers and structured data
                  </p>
                </div>
              </div>
              <ChevronDown className="h-4 w-4 shrink-0 text-slate-400 transition group-open:rotate-180" />
            </summary>

            <div className="space-y-4 border-t border-slate-200 bg-slate-50 p-4">
              <TechnicalValue label="Audit record ID" value={log.id} />
              <TechnicalValue label="Actor ID" value={log.actor_id} />
              <TechnicalValue label="Target record ID" value={log.target_id} />

              <SafeJsonBlock
                title="Previous data"
                data={safeOldData}
              />
              <SafeJsonBlock
                title="New data"
                data={safeNewData}
              />
              <p className="text-xs leading-5 text-slate-500">
                Sensitive fields are hidden where their names indicate
                passwords, tokens, secrets or credentials. Access to
                this section does not replace database access controls.
              </p>
            </div>
          </details>
        </div>

        <footer className="flex justify-end border-t border-slate-200 bg-white p-4 sm:px-6">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-emerald-700"
          >
            Close details
          </button>
        </footer>
      </section>
    </div>
  );
};

const DetailItem = ({ icon, label, value, helper }) => (
  <div className="rounded-2xl border border-slate-200 bg-white p-4">
    <div className="flex items-center gap-2 text-slate-400">
      {icon}
      <p className="text-xs font-semibold">{label}</p>
    </div>
    <p className="mt-2 break-words text-sm font-bold text-slate-800">
      {value || 'Not available'}
    </p>
    {helper && (
      <p className="mt-1 break-words text-xs text-slate-500">{helper}</p>
    )}
  </div>
);

const ChangeRow = ({ change, action }) => {
  const normalized = action?.toUpperCase();
  const isInsert = normalized === 'INSERT';
  const isDelete = normalized === 'DELETE';

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <p className="mb-3 text-sm font-bold text-slate-800">
        {change.label}
      </p>

      {isInsert ? (
        <div className="rounded-xl bg-emerald-50 p-3">
          <p className="text-xs font-semibold text-emerald-700">
            Recorded value
          </p>
          <p className="mt-1 break-words text-sm text-emerald-950">
            {formatAuditValue(change.newValue, change.key)}
          </p>
        </div>
      ) : isDelete ? (
        <div className="rounded-xl bg-red-50 p-3">
          <p className="text-xs font-semibold text-red-700">
            Value before removal
          </p>
          <p className="mt-1 break-words text-sm text-red-950">
            {formatAuditValue(change.oldValue, change.key)}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
          <div className="min-w-0 rounded-xl bg-red-50 p-3">
            <p className="text-xs font-semibold text-red-700">
              Previous value
            </p>
            <p className="mt-1 break-words text-sm text-red-950">
              {formatAuditValue(change.oldValue, change.key)}
            </p>
          </div>

          <ArrowRight className="hidden h-4 w-4 text-slate-400 sm:block" />

          <div className="min-w-0 rounded-xl bg-emerald-50 p-3">
            <p className="text-xs font-semibold text-emerald-700">
              New value
            </p>
            <p className="mt-1 break-words text-sm text-emerald-950">
              {formatAuditValue(change.newValue, change.key)}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

const TechnicalValue = ({ label, value }) => (
  <div>
    <p className="mb-1 text-xs font-bold text-slate-500">{label}</p>
    <p className="break-all rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-xs text-slate-700">
      {value || 'Not recorded'}
    </p>
  </div>
);

const SafeJsonBlock = ({ title, data }) => {
  if (data === null || data === undefined) return null;

  return (
    <div>
      <p className="mb-1 text-xs font-bold text-slate-500">{title}</p>
      <pre className="max-h-64 overflow-auto rounded-xl border border-slate-200 bg-white p-3 text-xs leading-5 text-slate-700">
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  );
};

const ActionBadge = ({ action }) => {
  const normalized = action?.toUpperCase();

  const styles = {
    INSERT: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    UPDATE: 'bg-blue-50 text-blue-700 border-blue-200',
    DELETE: 'bg-red-50 text-red-700 border-red-200',
  };

  const labels = {
    INSERT: 'Created',
    UPDATE: 'Updated',
    DELETE: 'Deleted',
  };

  return (
    <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold ${styles[normalized] || 'border-slate-200 bg-slate-50 text-slate-600'}`}>
      {labels[normalized] || 'Recorded'}
    </span>
  );
};

const getActionStyle = (action) => {
  const normalized = action?.toUpperCase();

  if (normalized === 'INSERT') {
    return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  }

  if (normalized === 'DELETE') {
    return 'border-red-200 bg-red-50 text-red-700';
  }

  if (normalized === 'UPDATE') {
    return 'border-blue-200 bg-blue-50 text-blue-700';
  }

  return 'border-slate-200 bg-slate-50 text-slate-600';
};

const getActionIconComponent = (action) => {
  const normalized = action?.toUpperCase();

  if (normalized === 'INSERT') return FilePlus2;
  if (normalized === 'UPDATE') return FilePenLine;
  if (normalized === 'DELETE') return FileX2;

  return Info;
};

const getReadableAction = (action, tableName) => {
  const table = formatTableName(tableName);
  const normalized = action?.toUpperCase();

  if (normalized === 'INSERT') return `${table} record created`;
  if (normalized === 'UPDATE') return `${table} record updated`;
  if (normalized === 'DELETE') return `${table} record deleted`;

  return `${table} activity recorded`;
};

const getActionVerb = (action) => {
  const normalized = action?.toUpperCase();

  if (normalized === 'INSERT') return 'Record created';
  if (normalized === 'UPDATE') return 'Record updated';
  if (normalized === 'DELETE') return 'Record deleted';

  return 'Activity recorded';
};

const getActionExplanation = (action) => {
  const normalized = action?.toUpperCase();

  if (normalized === 'INSERT') {
    return 'A new record was added';
  }
  if (normalized === 'UPDATE') {
    return 'An existing record was changed';
  }
  if (normalized === 'DELETE') {
    return 'A record was removed';
  }

  return 'An event was recorded';
};

const getFallbackDescription = (log) => {
  const table = formatTableName(log.target_table);
  const action = log.action?.toUpperCase();

  if (action === 'INSERT') {
    return `A new ${table.toLowerCase()} record was created.`;
  }

  if (action === 'UPDATE') {
    return `An existing ${table.toLowerCase()} record was updated.`;
  }

  if (action === 'DELETE') {
    return `A ${table.toLowerCase()} record was deleted.`;
  }

  return `An activity involving ${table.toLowerCase()} was recorded.`;
};

const formatTableName = (tableName) => {
  if (!tableName) return 'Unknown area';

  return tableName
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

const formatFieldName = (key) => {
  const friendlyNames = {
    id: 'Record ID',
    actor_id: 'User ID',
    buyer_id: 'Buyer',
    producer_id: 'Producer',
    aggregator_id: 'Aggregator',
    product_id: 'Product',
    order_id: 'Order',
    full_name: 'Full Name',
    business_name: 'Business Name',
    farm_name: 'Farm Name',
    phone_number: 'Phone Number',
    lga_location: 'Local Government Area',
    verification_status: 'Verification Status',
    role: 'Account Role',
    status: 'Status',
    crop_name: 'Crop Name',
    price_per_unit: 'Price Per Unit',
    total_amount: 'Total Amount',
    quantity: 'Quantity',
    delivery_location: 'Delivery Location',
    created_at: 'Created At',
    updated_at: 'Last Updated',
    target_id: 'Target Record ID',
    target_table: 'Platform Area',
  };

  if (friendlyNames[key]) return friendlyNames[key];

  return String(key || '')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

const formatRole = (role) => {
  if (!role || role === 'Unknown role') return 'Role not available';

  const roles = {
    admin: 'Administrator',
    producer: 'Producer',
    buyer: 'Buyer',
    aggregator: 'Aggregator',
    system: 'System process',
  };

  return roles[String(role).toLowerCase()] || formatFieldName(role);
};

const formatDate = (date) => {
  if (!date) return 'Date not available';

  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return 'Date not available';

  return parsed.toLocaleString('en-NG', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatRelativeDate = (date) => {
  if (!date) return 'Date not available';

  const timestamp = new Date(date).getTime();
  if (Number.isNaN(timestamp)) return 'Date not available';

  const diff = Date.now() - timestamp;
  const minutes = Math.max(0, Math.floor(diff / 60000));

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} min${minutes === 1 ? '' : 's'} ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} day${days === 1 ? '' : 's'} ago`;

  return new Date(date).toLocaleDateString('en-NG', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

const parseAuditData = (data) => {
  if (data === null || data === undefined || data === '') return null;

  if (typeof data !== 'string') return data;

  try {
    return JSON.parse(data);
  } catch {
    return data;
  }
};

// Redact sensitive values before they reach either UI representation.
const sanitizeAuditData = (value) => {
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeAuditData(item));
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        SENSITIVE_KEY_PATTERN.test(key)
          ? '[Hidden for security]'
          : sanitizeAuditData(item),
      ])
    );
  }

  return value;
};

const toComparableObject = (data) => {
  if (data === null || data === undefined) return {};

  if (
    typeof data === 'object' &&
    !Array.isArray(data)
  ) {
    return data;
  }

  return { value: data };
};

const getDataChanges = (action, oldData, newData) => {
  const normalized = action?.toUpperCase();
  const previous = toComparableObject(oldData);
  const next = toComparableObject(newData);

  let keys;

  if (normalized === 'INSERT') {
    keys = Object.keys(next);
  } else if (normalized === 'DELETE') {
    keys = Object.keys(previous);
  } else {
    keys = [...new Set([
      ...Object.keys(previous),
      ...Object.keys(next),
    ])];
  }

  return keys
    .filter((key) => !SENSITIVE_KEY_PATTERN.test(key))
    .filter((key) => {
      if (normalized === 'INSERT') {
        return next[key] !== undefined;
      }

      if (normalized === 'DELETE') {
        return previous[key] !== undefined;
      }

      return JSON.stringify(previous[key]) !== JSON.stringify(next[key]);
    })
    .map((key) => ({
      key,
      label: formatFieldName(key),
      oldValue: previous[key],
      newValue: next[key],
    }))
    .sort((a, b) => a.label.localeCompare(b.label));
};

const formatAuditValue = (value, fieldName = '') => {
  if (value === undefined) return 'Not recorded';
  if (value === null) return 'Not set';

  if (SENSITIVE_KEY_PATTERN.test(fieldName)) {
    return 'Hidden for security';
  }

  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }

  if (typeof value === 'number') {
    if (/price|amount/i.test(fieldName)) {
      return `₦${value.toLocaleString('en-NG')}`;
    }
    return value.toLocaleString('en-NG');
  }

  if (Array.isArray(value)) {
    if (value.length === 0) return 'None';

    return value
      .map((item) => formatAuditValue(item, fieldName))
      .join(', ');
  }

  if (value && typeof value === 'object') {
    const entries = Object.entries(value)
      .filter(([key]) => !SENSITIVE_KEY_PATTERN.test(key));

    if (entries.length === 0) return 'No details available';

    return entries
      .map(([key, item]) => (
        `${formatFieldName(key)}: ${formatAuditValue(item, key)}`
      ))
      .join(' · ');
  }

  const text = String(value);

  if (!text.trim()) return 'Empty';

  if (/verification_status|^status$/i.test(fieldName)) {
    return formatFieldName(text);
  }

  return text;
};

export default AdminAudits;
