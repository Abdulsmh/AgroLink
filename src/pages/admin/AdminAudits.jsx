import React, { useEffect, useMemo, useState } from 'react';
import {
  ShieldAlert,
  CheckCircle2,
  Info,
  Activity,
  RefreshCw,
  Loader2,
  Search,
  Database,
  User,
  CalendarDays,
  X,
  Eye,
  FilePlus2,
  FilePenLine,
  FileX2,
} from 'lucide-react';
import { supabase } from '../../config/supabaseClient';
import toast from 'react-hot-toast';

export const AdminAudits = () => {
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [tableFilter, setTableFilter] = useState('all');
  const [selectedLog, setSelectedLog] = useState(null);

  const fetchAuditLogs = async (showRefresh = false) => {
    try {
      if (showRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const { data: logs, error: logsError } = await supabase
        .from('audit_logs')
        .select(
          `
            id,
            actor_id,
            action,
            target_table,
            target_id,
            description,
            old_data,
            new_data,
            created_at
          `
        )
        .order('created_at', { ascending: false })
        .limit(100);

      if (logsError) {
        throw logsError;
      }

      const actorIds = [
        ...new Set(
          (logs || [])
            .map((log) => log.actor_id)
            .filter(Boolean)
        ),
      ];

      let actors = [];

      if (actorIds.length > 0) {
        const { data: actorData, error: actorsError } =
          await supabase
            .from('profiles')
            .select('id, full_name, role')
            .in('id', actorIds);

        if (actorsError) {
          throw actorsError;
        }

        actors = actorData || [];
      }

      const formattedLogs = (logs || []).map((log) => {
        const actor = actors.find(
          (user) => user.id === log.actor_id
        );

        return {
          ...log,
          actorName: actor?.full_name || 'System',
          actorRole: actor?.role || 'system',
        };
      });

      setAuditLogs(formattedLogs);
    } catch (error) {
      console.error('Error fetching audit logs:', error);
      toast.error('Failed to load audit logs.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

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
        () => {
          fetchAuditLogs(true);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(auditChannel);
    };
  }, []);

  const stats = useMemo(() => {
    const inserts = auditLogs.filter(
      (log) => log.action?.toUpperCase() === 'INSERT'
    ).length;

    const updates = auditLogs.filter(
      (log) => log.action?.toUpperCase() === 'UPDATE'
    ).length;

    const deletes = auditLogs.filter(
      (log) => log.action?.toUpperCase() === 'DELETE'
    ).length;

    return {
      total: auditLogs.length,
      inserts,
      updates,
      deletes,
    };
  }, [auditLogs]);

  const tableNames = useMemo(() => {
    return [
      ...new Set(
        auditLogs
          .map((log) => log.target_table)
          .filter(Boolean)
      ),
    ].sort();
  }, [auditLogs]);

  const filteredLogs = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();

    return auditLogs.filter((log) => {
      const action = log.action?.toUpperCase() || '';

      const matchesAction =
        actionFilter === 'all' || action === actionFilter;

      const matchesTable =
        tableFilter === 'all' ||
        log.target_table === tableFilter;

      if (!matchesAction || !matchesTable) {
        return false;
      }

      if (!search) {
        return true;
      }

      const searchableValues = [
        log.actorName,
        log.actorRole,
        log.action,
        log.target_table,
        log.target_id,
        log.description,
      ];

      return searchableValues.some((value) =>
        String(value || '').toLowerCase().includes(search)
      );
    });
  }, [
    auditLogs,
    searchTerm,
    actionFilter,
    tableFilter,
  ]);

  const getActionLabel = (action, tableName) => {
    const normalized = action?.toUpperCase();

    const readableTable = formatTableName(tableName);

    if (normalized === 'INSERT') {
      return `${readableTable} record created`;
    }

    if (normalized === 'UPDATE') {
      return `${readableTable} record updated`;
    }

    if (normalized === 'DELETE') {
      return `${readableTable} record deleted`;
    }

    return `${readableTable} activity`;
  };

  const getActionType = (action) => {
    const normalized = action?.toUpperCase();

    if (normalized === 'INSERT') {
      return 'success';
    }

    if (normalized === 'DELETE') {
      return 'danger';
    }

    return 'info';
  };

  const getActionStyle = (action) => {
    const type = getActionType(action);

    if (type === 'success') {
      return 'border-emerald-200 bg-emerald-50 text-emerald-700';
    }

    if (type === 'danger') {
      return 'border-red-200 bg-red-50 text-red-700';
    }

    return 'border-blue-200 bg-blue-50 text-blue-700';
  };

  const getActionIcon = (action) => {
    const normalized = action?.toUpperCase();

    if (normalized === 'INSERT') {
      return <FilePlus2 className="h-4 w-4" />;
    }

    if (normalized === 'DELETE') {
      return <FileX2 className="h-4 w-4" />;
    }

    if (normalized === 'UPDATE') {
      return <FilePenLine className="h-4 w-4" />;
    }

    return <Info className="h-4 w-4" />;
  };

  const formatDate = (date) => {
    if (!date) return 'Unknown';

    return new Date(date).toLocaleString('en-NG', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="flex min-h-[420px] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50">
            <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
          </div>

          <p className="text-sm font-bold text-slate-700">
            Loading audit logs...
          </p>

          <p className="mt-1 text-xs text-slate-400">
            Reading platform activity
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 lg:flex-row lg:items-center lg:justify-between lg:p-8">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50">
              <ShieldAlert className="h-5 w-5 text-emerald-600" />
            </div>

            <span className="text-xs font-extrabold uppercase tracking-widest text-emerald-600">
              Security & Oversight
            </span>
          </div>

          <h1 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
            System Audit Logs
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-500">
            Monitor automatically recorded activities from the
            AgroLink database.
          </p>
        </div>

        <button
          type="button"
          onClick={() => fetchAuditLogs(true)}
          disabled={refreshing}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-xs font-bold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
        >
          <RefreshCw
            className={`h-4 w-4 ${
              refreshing ? 'animate-spin' : ''
            }`}
          />
          Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          icon={<Activity className="h-5 w-5" />}
          label="Total Events"
          value={stats.total}
        />

        <StatCard
          icon={<FilePlus2 className="h-5 w-5" />}
          label="Created"
          value={stats.inserts}
        />

        <StatCard
          icon={<FilePenLine className="h-5 w-5" />}
          label="Updated"
          value={stats.updates}
        />

        <StatCard
          icon={<FileX2 className="h-5 w-5" />}
          label="Deleted"
          value={stats.deletes}
        />
      </div>

      {/* Filters */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search actor, table, action or target ID..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-emerald-400 focus:bg-white focus:ring-2 focus:ring-emerald-100"
            />
          </div>

          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-medium text-slate-700 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
          >
            <option value="all">All Actions</option>
            <option value="INSERT">Created</option>
            <option value="UPDATE">Updated</option>
            <option value="DELETE">Deleted</option>
          </select>

          <select
            value={tableFilter}
            onChange={(e) => setTableFilter(e.target.value)}
            className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-medium text-slate-700 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
          >
            <option value="all">All Tables</option>

            {tableNames.map((table) => (
              <option key={table} value={table}>
                {formatTableName(table)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Activity */}
      <div className="space-y-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 lg:p-8">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h3 className="flex items-center gap-2 text-sm font-black uppercase tracking-wider text-slate-900">
              <Activity className="h-4 w-4 text-emerald-600" />
              Recent Activity Stream
            </h3>

            <p className="mt-1 text-xs text-slate-500">
              Showing {filteredLogs.length} of {auditLogs.length} recorded
              events.
            </p>
          </div>
        </div>

        {filteredLogs.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 py-14 text-center">
            <Search className="mx-auto mb-3 h-9 w-9 text-slate-300" />

            <p className="text-sm font-bold text-slate-600">
              No matching audit activity
            </p>

            <p className="mt-1 text-xs text-slate-400">
              Try changing your search or filters.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredLogs.map((log) => {
              return (
                <div
                  key={log.id}
                  className="group flex flex-col gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 transition duration-300 hover:border-emerald-200 hover:bg-white hover:shadow-sm sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex min-w-0 items-start gap-3">
                    <div
                      className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${getActionStyle(
                        log.action
                      )}`}
                    >
                      {getActionIcon(log.action)}
                    </div>

                    <div className="min-w-0">
                      <h4 className="truncate text-xs font-black text-slate-900">
                        {getActionLabel(
                          log.action,
                          log.target_table
                        )}
                      </h4>

                      <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-slate-500">
                        <span className="inline-flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {log.actorName}
                        </span>

                        <span>•</span>

                        <span className="capitalize">
                          {log.actorRole}
                        </span>

                        <span>•</span>

                        <span className="inline-flex items-center gap-1">
                          <Database className="h-3 w-3" />
                          {formatTableName(log.target_table)}
                        </span>
                      </div>

                      {log.description && (
                        <p className="mt-1.5 line-clamp-2 text-[11px] text-slate-500">
                          {log.description}
                        </p>
                      )}

                      <p className="mt-1 text-[10px] text-slate-400">
                        Target: {log.target_id || 'Not available'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-3 sm:shrink-0 sm:flex-col sm:items-end">
                    <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-slate-400">
                      <CalendarDays className="h-3.5 w-3.5" />
                      {formatDate(log.created_at)}
                    </span>

                    <button
                      type="button"
                      onClick={() => setSelectedLog(log)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[10px] font-bold text-slate-600 transition hover:border-emerald-200 hover:text-emerald-700"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      Details
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedLog && (
        <AuditDetailModal
          log={selectedLog}
          onClose={() => setSelectedLog(null)}
          formatDate={formatDate}
        />
      )}
    </div>
  );
};

const StatCard = ({ icon, label, value }) => {
  return (
    <div className="group rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition duration-300 hover:-translate-y-0.5 hover:shadow-md">
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 text-slate-600 transition group-hover:scale-105">
        {icon}
      </div>

      <p className="text-xs font-semibold text-slate-500">
        {label}
      </p>

      <p className="mt-1 text-xl font-black text-slate-900">
        {value}
      </p>
    </div>
  );
};

const AuditDetailModal = ({
  log,
  onClose,
  formatDate,
}) => {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-3xl overflow-hidden rounded-3xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 p-5 sm:p-6">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-600">
              Audit Event
            </p>

            <h2 className="mt-1 text-lg font-black text-slate-900">
              {getReadableAction(
                log.action,
                log.target_table
              )}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="max-h-[calc(90vh-100px)] overflow-y-auto p-5 sm:p-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <DetailItem
              label="Actor"
              value={log.actorName}
            />

            <DetailItem
              label="Role"
              value={log.actorRole}
            />

            <DetailItem
              label="Action"
              value={log.action}
            />

            <DetailItem
              label="Target Table"
              value={formatTableName(log.target_table)}
            />

            <DetailItem
              label="Target ID"
              value={log.target_id || 'Not available'}
            />

            <DetailItem
              label="Timestamp"
              value={formatDate(log.created_at)}
            />
          </div>

          {log.description && (
            <div className="mt-5">
              <h3 className="mb-2 text-xs font-black uppercase tracking-wider text-slate-500">
                Description
              </h3>

              <div className="rounded-xl bg-slate-50 p-4 text-xs leading-5 text-slate-700">
                {log.description}
              </div>
            </div>
          )}

          <JsonSection
            title="Previous Data"
            data={log.old_data}
          />

          <JsonSection
            title="New Data"
            data={log.new_data}
          />
        </div>
      </div>
    </div>
  );
};

const DetailItem = ({ label, value }) => {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
      <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
        {label}
      </p>

      <p className="mt-1 break-all text-xs font-bold text-slate-800">
        {value}
      </p>
    </div>
  );
};

const JsonSection = ({ title, data }) => {
  if (!data) return null;

  return (
    <div className="mt-5">
      <h3 className="mb-2 text-xs font-black uppercase tracking-wider text-slate-500">
        {title}
      </h3>

      <pre className="max-h-72 overflow-auto rounded-xl bg-slate-950 p-4 text-[10px] leading-5 text-slate-300">
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  );
};

const formatTableName = (tableName) => {
  if (!tableName) return 'Unknown';

  return tableName
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

const getReadableAction = (action, tableName) => {
  const normalized = action?.toUpperCase();
  const table = formatTableName(tableName);

  if (normalized === 'INSERT') {
    return `${table} Record Created`;
  }

  if (normalized === 'UPDATE') {
    return `${table} Record Updated`;
  }

  if (normalized === 'DELETE') {
    return `${table} Record Deleted`;
  }

  return `${table} Activity`;
};