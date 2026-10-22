import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Search,
  RefreshCw,
  UserRound,
  Phone,
  MapPin,
  Building2,
  FileText,
  ExternalLink,
  CheckCircle2,
  XCircle,
  Clock3,
  ShieldCheck,
  AlertCircle,
  Loader2,
  Eye,
  Users,
  X,
  ArrowRight,
  CalendarDays,
  Info,
  ShieldAlert,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../../config/supabaseClient';
import { useAuth } from '../../context/AuthContext';

const DOCUMENT_LABELS = {
  id_document: 'Valid ID Document',
  passport_photo: 'Passport Photograph',
  proof_of_address: 'Proof of Address',
  supporting_document: 'Supporting Document',
};

const REQUIRED_DOCUMENTS = [
  'id_document',
  'passport_photo',
  'proof_of_address',
];

const formatDate = (value) => {
  if (!value) return 'Not available';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return 'Not available';

  return date.toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
};

const formatRole = (role) => {
  if (!role) return 'Unknown role';

  return role
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
};

const getStatusStyles = (status) => {
  switch (status) {
    case 'approved':
      return 'bg-emerald-50 text-emerald-700 ring-emerald-600/20';

    case 'rejected':
      return 'bg-red-50 text-red-700 ring-red-600/20';

    default:
      return 'bg-amber-50 text-amber-800 ring-amber-600/20';
  }
};

const StatusBadge = ({ status }) => {
  const normalizedStatus = status || 'pending';

  const Icon =
    normalizedStatus === 'approved'
      ? CheckCircle2
      : normalizedStatus === 'rejected'
        ? XCircle
        : Clock3;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ring-1 ring-inset ${getStatusStyles(
        normalizedStatus
      )}`}
    >
      <Icon className="h-3.5 w-3.5" />
      {formatRole(normalizedStatus)}
    </span>
  );
};

const DetailItem = ({ icon: Icon, label, value }) => (
  <div className="flex min-w-0 gap-3 rounded-xl border border-slate-200 bg-slate-50/80 p-3">
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-100 bg-white text-slate-500">
      <Icon className="h-4 w-4" />
    </div>

    <div className="min-w-0">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className="mt-1 break-words text-sm font-semibold text-slate-800">
        {value || 'Not provided'}
      </p>
    </div>
  </div>
);

const SummaryCard = ({ title, count, icon: Icon, color }) => {
  const colorStyles = {
    amber: 'bg-amber-50 text-amber-700',
    emerald: 'bg-emerald-50 text-emerald-700',
    red: 'bg-red-50 text-red-700',
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="mt-2 text-3xl font-black tracking-tight text-slate-900">
            {count}
          </p>
        </div>

        <div
          className={`flex h-11 w-11 items-center justify-center rounded-xl ${colorStyles[color]}`}
        >
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
};

const ConfirmationDialog = ({
  action,
  request,
  processing,
  onCancel,
  onConfirm,
}) => {
  if (!action || !request) return null;

  const isApproval = action === 'approved';
  const applicantName =
    request.applicant?.full_name || 'this applicant';

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center overflow-y-auto bg-slate-950/60 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (
          event.target === event.currentTarget &&
          !processing
        ) {
          onCancel();
        }
      }}
    >
      <section
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="role-confirmation-title"
        aria-describedby="role-confirmation-description"
        className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
      >
        <div className="p-6">
          <div
            className={`flex h-12 w-12 items-center justify-center rounded-2xl ${
              isApproval
                ? 'bg-emerald-50 text-emerald-700'
                : 'bg-red-50 text-red-600'
            }`}
          >
            {isApproval ? (
              <ShieldCheck className="h-6 w-6" />
            ) : (
              <ShieldAlert className="h-6 w-6" />
            )}
          </div>

          <h2
            id="role-confirmation-title"
            className="mt-5 text-xl font-black tracking-tight text-slate-900"
          >
            {isApproval
              ? 'Approve aggregator role request?'
              : 'Reject aggregator role request?'}
          </h2>

          <p
            id="role-confirmation-description"
            className="mt-2 text-sm leading-6 text-slate-600"
          >
            {isApproval
              ? `You are about to approve ${applicantName}'s request to become an AgroLink aggregator. Their role will change to Aggregator, but their account verification will remain pending.`
              : `You are about to reject ${applicantName}'s request to become an AgroLink aggregator. Their role will not be changed by this decision.`}
          </p>

          <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Applicant
            </p>

            <p className="mt-1 font-bold text-slate-900">
              {applicantName}
            </p>

            <p className="mt-1 text-sm text-slate-600">
              {formatRole(request.previous_role)}{' '}
              <ArrowRight className="inline h-3.5 w-3.5" />{' '}
              Aggregator
            </p>

            <div className="mt-3 flex items-center justify-between gap-3 border-t border-slate-200 pt-3">
              <span className="text-sm text-slate-500">
                Current request status
              </span>
              <StatusBadge status={request.status} />
            </div>
          </div>

          {isApproval && (
            <div className="mt-4 flex gap-2.5 rounded-xl border border-amber-200 bg-amber-50 p-3">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />

              <p className="text-xs leading-5 text-amber-900">
                This decision approves the role request only. It does not
                verify the applicant's identity or automatically grant
                access to restricted aggregator features.
              </p>
            </div>
          )}
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-slate-100 bg-slate-50/80 p-4 sm:flex-row sm:justify-end">
          <button
            type="button"
            disabled={processing}
            onClick={onCancel}
            className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            type="button"
            disabled={processing}
            onClick={onConfirm}
            className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-white transition disabled:cursor-not-allowed disabled:opacity-60 ${
              isApproval
                ? 'bg-emerald-600 hover:bg-emerald-700'
                : 'bg-red-600 hover:bg-red-700'
            }`}
          >
            {processing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : isApproval ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : (
              <XCircle className="h-4 w-4" />
            )}

            {processing
              ? 'Processing...'
              : isApproval
                ? 'Confirm approval'
                : 'Confirm rejection'}
          </button>
        </div>
      </section>
    </div>
  );
};

const AdminRoleRequests = () => {
  const { user } = useAuth();

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('pending');
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [confirmationAction, setConfirmationAction] = useState(null);
  const [processingId, setProcessingId] = useState(null);
  const [openingDocumentId, setOpeningDocumentId] = useState(null);
  const [previewDocument, setPreviewDocument] = useState(null);
  const [error, setError] = useState('');

  const fetchRequests = useCallback(async ({ silent = false } = {}) => {
    if (silent) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError('');

    try {
      const {
        data: requestData,
        error: requestError,
      } = await supabase
        .from('role_requests')
        .select(`
          id,
          user_id,
          previous_role,
          requested_role,
          status,
          reason,
          reviewed_by,
          reviewed_at,
          created_at
        `)
        .eq('requested_role', 'aggregator')
        .order('created_at', { ascending: false });

      if (requestError) throw requestError;

      if (!requestData?.length) {
        setRequests([]);
        setSelectedRequest(null);
        return;
      }

      const userIds = [
        ...new Set(requestData.map((request) => request.user_id)),
      ];

      const requestIds = requestData.map((request) => request.id);

      const [
        { data: profiles, error: profilesError },
        { data: documents, error: documentsError },
      ] = await Promise.all([
        supabase
          .from('profiles')
          .select(`
            id,
            full_name,
            phone_number,
            role,
            lga_location,
            verification_status,
            farm_name,
            farm_location,
            farm_size,
            farm_type,
            business_name,
            business_address
          `)
          .in('id', userIds),

        supabase
          .from('aggregator_documents')
          .select(`
            id,
            role_request_id,
            user_id,
            document_type,
            file_name,
            file_path,
            file_size,
            mime_type,
            uploaded_at
          `)
          .in('role_request_id', requestIds),
      ]);

      if (profilesError) throw profilesError;
      if (documentsError) throw documentsError;

      const profileMap = new Map(
        (profiles || []).map((profile) => [profile.id, profile])
      );

      const documentsMap = new Map();

      (documents || []).forEach((document) => {
        const existing = documentsMap.get(document.role_request_id) || [];
        existing.push(document);
        documentsMap.set(document.role_request_id, existing);
      });

      const combinedRequests = requestData.map((request) => ({
        ...request,
        applicant: profileMap.get(request.user_id) || null,
        documents: documentsMap.get(request.id) || [],
      }));

      setRequests(combinedRequests);

      setSelectedRequest((current) => {
        if (!current) return null;

        return (
          combinedRequests.find((item) => item.id === current.id) || null
        );
      });
    } catch (fetchError) {
      console.error('Failed to fetch aggregator role requests:', fetchError);

      setError(
        fetchError.message || 'Unable to load aggregator role requests.'
      );

      if (silent) {
        toast.error('Could not refresh role requests.');
      } else {
        toast.error('Could not load role requests.');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const filteredRequests = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    return requests.filter((request) => {
      const matchesStatus =
        statusFilter === 'all' || request.status === statusFilter;

      const applicant = request.applicant || {};

      const searchableText = [
        applicant.full_name,
        applicant.phone_number,
        applicant.lga_location,
        applicant.farm_name,
        applicant.business_name,
        applicant.business_address,
        request.previous_role,
        request.reason,
        request.status,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return matchesStatus && searchableText.includes(term);
    });
  }, [requests, searchTerm, statusFilter]);

  const pendingCount = requests.filter(
    (request) => request.status === 'pending'
  ).length;

  const approvedCount = requests.filter(
    (request) => request.status === 'approved'
  ).length;

  const rejectedCount = requests.filter(
    (request) => request.status === 'rejected'
  ).length;

  const getMissingDocuments = (request) => {
    const uploadedTypes = new Set(
      (request.documents || []).map((document) => document.document_type)
    );

    return REQUIRED_DOCUMENTS.filter((type) => !uploadedTypes.has(type));
  };

  const openDocument = async (document) => {
    if (!document?.file_path || !document?.id) {
      toast.error('This document has no valid storage path.');
      return;
    }

    setOpeningDocumentId(document.id);

    try {
      const {
        data,
        error: storageError,
      } = await supabase.storage
        .from('aggregator-verification')
        .createSignedUrl(document.file_path, 300);

      if (storageError) throw storageError;

      if (!data?.signedUrl) {
        throw new Error('Could not generate a secure document link.');
      }

      // Keep the admin on this page and display the signed file in a modal.
      setPreviewDocument({
        ...document,
        signedUrl: data.signedUrl,
      });
    } catch (documentError) {
      console.error('Unable to preview verification document:', documentError);
      toast.error('Could not open this document. Please try again.');
    } finally {
      setOpeningDocumentId(null);
    }
  };

  useEffect(() => {
    if (!previewDocument) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setPreviewDocument(null);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [previewDocument]);

  const requestReviewConfirmation = (request, decision) => {
    if (processingId) return;

    if (!request?.id || !request?.applicant) {
      toast.error('The applicant profile could not be found.');
      return;
    }

    if (request.status !== 'pending') {
      toast.error('This request has already been reviewed. Refresh the list.');
      return;
    }

    if (decision !== 'approved' && decision !== 'rejected') {
      toast.error('Invalid review decision.');
      return;
    }

    if (decision === 'approved') {
      const missingDocuments = getMissingDocuments(request);

      if (missingDocuments.length > 0) {
        const labels = missingDocuments
          .map((type) => DOCUMENT_LABELS[type] || type)
          .join(', ');

        toast.error(`Required documents are missing: ${labels}`);
        return;
      }
    }

    setConfirmationAction({
      request,
      decision,
    });
  };

  const reviewRequest = async () => {
    const request = confirmationAction?.request;
    const decision = confirmationAction?.decision;

    if (!request?.id || !decision) return;

    if (!user?.id) {
      toast.error('Your admin session could not be verified. Sign in again.');
      setConfirmationAction(null);
      return;
    }

    if (processingId) return;

    // Re-check the latest locally loaded status before submitting.
    const latestRequest = requests.find((item) => item.id === request.id);

    if (!latestRequest || latestRequest.status !== 'pending') {
      toast.error('This request is no longer pending. Refresh and try again.');
      setConfirmationAction(null);
      return;
    }

    if (decision === 'approved') {
      const missingDocuments = getMissingDocuments(latestRequest);

      if (missingDocuments.length > 0) {
        toast.error('Required verification documents are missing.');
        setConfirmationAction(null);
        return;
      }
    }

    setProcessingId(request.id);

    let profileWasUpdated = false;

    try {
      /*
       * First, update the request only if it is still pending.
       * This reduces the chance of two admins reviewing the same request.
       *
       * Note: Supabase operations across separate tables are not atomic.
       * A database transaction/RPC is the stronger long-term solution.
       */
      const reviewedAt = new Date().toISOString();

      const {
        data: updatedRequest,
        error: requestError,
      } = await supabase
        .from('role_requests')
        .update({
          status: decision,
          reviewed_by: user.id,
          reviewed_at: reviewedAt,
        })
        .eq('id', request.id)
        .eq('status', 'pending')
        .select('id');

      if (requestError) throw requestError;

      if (!updatedRequest?.length) {
        throw new Error(
          'This request has already been changed. Refresh and review the latest status.'
        );
      }

      if (decision === 'approved') {
        /*
         * Change the role only after the request update succeeds.
         * The applicant's account verification remains pending.
         */
        const {
          data: updatedProfile,
          error: profileError,
        } = await supabase
          .from('profiles')
          .update({
            role: 'aggregator',
            verification_status: 'pending',
            updated_at: new Date().toISOString(),
          })
          .eq('id', request.user_id)
          .eq('role', request.previous_role)
          .select('id');

        if (profileError) throw profileError;

        if (!updatedProfile?.length) {
          throw new Error(
            'The applicant role has changed since this request was submitted. The request will be restored if possible.'
          );
        }

        profileWasUpdated = true;
      }
    } catch (reviewError) {
      console.error('Failed to review aggregator role request:', reviewError);

      /*
       * If the request was updated but the profile operation failed,
       * restore the request to pending. This is a compensating action,
       * not a substitute for a database transaction.
       */
      if (
        decision === 'approved' &&
        !profileWasUpdated
      ) {
        const {
          data: requestState,
          error: stateError,
        } = await supabase
          .from('role_requests')
          .select('id, status, reviewed_by')
          .eq('id', request.id)
          .maybeSingle();

        if (
          !stateError &&
          requestState?.status === 'approved' &&
          requestState?.reviewed_by === user.id
        ) {
          const { error: rollbackError } = await supabase
            .from('role_requests')
            .update({
              status: 'pending',
              reviewed_by: null,
              reviewed_at: null,
            })
            .eq('id', request.id)
            .eq('status', 'approved')
            .eq('reviewed_by', user.id);

          if (rollbackError) {
            console.error(
              'Could not restore the role request to pending:',
              rollbackError
            );

            toast.error(
              'The profile update failed and the request could not be restored. Please inspect the request in Supabase before retrying.'
            );

            setConfirmationAction(null);
            await fetchRequests({ silent: true });
            return;
          }
        }
      }

      toast.error(
        reviewError.message || 'Could not complete this review.'
      );

      setConfirmationAction(null);
      await fetchRequests({ silent: true });
      return;
    } finally {
      setProcessingId(null);
    }

    toast.success(
      decision === 'approved'
        ? 'Role request approved. Account verification remains pending.'
        : 'Aggregator role request rejected.'
    );

    setConfirmationAction(null);
    setSelectedRequest(null);

    await fetchRequests({ silent: true });
  };

  const closeDetails = () => {
    if (processingId) return;
    setSelectedRequest(null);
  };

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 pb-10">
      {/* PAGE HEADER */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-emerald-700">
            <ShieldCheck className="h-4 w-4" />
            Administration / Role Management
          </div>

          <h1 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
            Aggregator Role Requests
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            Review applications from buyers and producers requesting
            permission to operate as AgroLink aggregators.
          </p>
        </div>

        <button
          type="button"
          onClick={() => fetchRequests({ silent: true })}
          disabled={loading || refreshing || Boolean(processingId)}
          className="inline-flex items-center justify-center gap-2 self-start rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700 disabled:cursor-not-allowed disabled:opacity-60 sm:self-auto"
        >
          <RefreshCw
            className={`h-4 w-4 ${
              loading || refreshing ? 'animate-spin' : ''
            }`}
          />
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </button>
      </header>

     

      {/* SUMMARY CARDS */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <SummaryCard
          title="Pending Requests"
          count={pendingCount}
          icon={Clock3}
          color="amber"
        />

        <SummaryCard
          title="Approved Requests"
          count={approvedCount}
          icon={CheckCircle2}
          color="emerald"
        />

        <SummaryCard
          title="Rejected Requests"
          count={rejectedCount}
          icon={XCircle}
          color="red"
        />
      </section>

      {/* SEARCH AND FILTERS */}
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

            <input
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search applicant, phone, LGA or business..."
              aria-label="Search aggregator role requests"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm text-slate-800 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            aria-label="Filter requests by status"
            className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
          >
            <option value="pending">Pending requests</option>
            <option value="approved">Approved requests</option>
            <option value="rejected">Rejected requests</option>
            <option value="all">All requests</option>
          </select>
        </div>
      </section>

      {/* REQUEST LIST */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <h2 className="font-bold text-slate-900">Applications</h2>
            <p className="mt-1 text-xs text-slate-500">
              {filteredRequests.length}{' '}
              {filteredRequests.length === 1 ? 'application' : 'applications'}
              {' '}found
            </p>
          </div>

          <Users className="h-5 w-5 text-slate-400" />
        </div>

        {loading ? (
          <div className="flex min-h-64 flex-col items-center justify-center gap-3 p-8">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
            <p className="text-sm text-slate-500">
              Loading aggregator applications...
            </p>
          </div>
        ) : error ? (
          <div className="p-8 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-red-50 text-red-600">
              <AlertCircle className="h-6 w-6" />
            </div>

            <h3 className="mt-3 font-bold text-slate-900">
              Could not load applications
            </h3>

            <p className="mt-2 text-sm text-slate-500">{error}</p>

            <button
              type="button"
              onClick={() => fetchRequests()}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-700"
            >
              <RefreshCw className="h-4 w-4" />
              Try again
            </button>
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
              <FileText className="h-7 w-7 text-slate-400" />
            </div>

            <h3 className="mt-4 font-bold text-slate-900">
              {searchTerm || statusFilter !== 'all'
                ? 'No matching applications'
                : 'No role requests yet'}
            </h3>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
              {searchTerm || statusFilter !== 'all'
                ? 'Try a different search term or status filter.'
                : 'Applications will appear here when users request permission to become AgroLink aggregators.'}
            </p>

            {(searchTerm || statusFilter !== 'pending') && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('pending');
                }}
                className="mt-4 text-sm font-bold text-emerald-700 hover:text-emerald-800"
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredRequests.map((request) => {
              const applicant = request.applicant;
              const isProcessing = processingId === request.id;
              const missingDocuments = getMissingDocuments(request);

              return (
                <article
                  key={request.id}
                  className="flex flex-col gap-4 p-5 transition hover:bg-slate-50/70 lg:flex-row lg:items-center lg:justify-between"
                >
                  <div className="flex min-w-0 gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-emerald-100 bg-emerald-50 text-emerald-700">
                      <UserRound className="h-6 w-6" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-bold text-slate-900">
                          {applicant?.full_name || 'Unknown applicant'}
                        </h3>

                        <StatusBadge status={request.status} />
                      </div>

                      <p className="mt-1 flex flex-wrap items-center gap-1.5 text-sm text-slate-500">
                        {formatRole(request.previous_role)}
                        <ArrowRight className="h-3.5 w-3.5" />
                        <span className="font-semibold text-slate-700">
                          Aggregator
                        </span>
                      </p>

                      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs text-slate-500">
                        <span className="inline-flex items-center gap-1.5">
                          <Phone className="h-3.5 w-3.5" />
                          {applicant?.phone_number || 'No phone provided'}
                        </span>

                        <span className="inline-flex items-center gap-1.5">
                          <MapPin className="h-3.5 w-3.5" />
                          {applicant?.lga_location || 'No LGA provided'}
                        </span>

                        <span className="inline-flex items-center gap-1.5">
                          <FileText className="h-3.5 w-3.5" />
                          {request.documents.length} document
                          {request.documents.length === 1 ? '' : 's'}
                        </span>

                        <span className="inline-flex items-center gap-1.5">
                          <CalendarDays className="h-3.5 w-3.5" />
                          {formatDate(request.created_at)}
                        </span>
                      </div>

                      {request.status === 'pending' &&
                        missingDocuments.length > 0 && (
                          <p className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-amber-50 px-2.5 py-1.5 text-xs font-medium text-amber-800">
                            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                            {missingDocuments.length} required document
                            {missingDocuments.length === 1 ? '' : 's'} missing
                          </p>
                        )}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 lg:shrink-0">
                    <button
                      type="button"
                      onClick={() => setSelectedRequest(request)}
                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-bold text-slate-700 transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700"
                    >
                      <Eye className="h-4 w-4" />
                      Review details
                    </button>

                    {request.status === 'pending' && (
                      <>
                        <button
                          type="button"
                          disabled={Boolean(processingId) || isProcessing}
                          onClick={() =>
                            requestReviewConfirmation(request, 'approved')
                          }
                          className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-3.5 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <CheckCircle2 className="h-4 w-4" />
                          Approve
                        </button>

                        <button
                          type="button"
                          disabled={Boolean(processingId) || isProcessing}
                          onClick={() =>
                            requestReviewConfirmation(request, 'rejected')
                          }
                          className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-3.5 py-2.5 text-sm font-bold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <XCircle className="h-4 w-4" />
                          Reject
                        </button>
                      </>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* APPLICATION DETAILS MODAL */}
      {selectedRequest && (
        <div
          className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-950/60 p-0 backdrop-blur-sm sm:items-center sm:p-4"
          onMouseDown={(event) => {
            if (
              event.target === event.currentTarget &&
              !processingId &&
              !confirmationAction
            ) {
              closeDetails();
            }
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="application-details-title"
            className="max-h-[94vh] w-full max-w-3xl overflow-y-auto rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl"
          >
            <header className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-100 bg-white/95 px-5 py-5 backdrop-blur sm:px-7">
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-widest text-emerald-700">
                  Application review
                </p>

                <h2
                  id="application-details-title"
                  className="mt-2 text-xl font-black text-slate-900"
                >
                  {selectedRequest.applicant?.full_name || 'Unknown applicant'}
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Submitted {formatDate(selectedRequest.created_at)}
                </p>
              </div>

              <button
                type="button"
                onClick={closeDetails}
                disabled={Boolean(processingId)}
                aria-label="Close application details"
                className="rounded-xl border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-50 hover:text-slate-900 disabled:opacity-50"
              >
                <X className="h-5 w-5" />
              </button>
            </header>

            <div className="space-y-7 p-5 sm:p-7">
              {/* STATUS AND ROLE */}
              <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 p-4">
                <div>
                  <p className="text-xs font-medium text-slate-500">
                    Requested role
                  </p>

                  <p className="mt-1 flex flex-wrap items-center gap-2 font-bold text-slate-900">
                    {formatRole(selectedRequest.previous_role)}
                    <ArrowRight className="h-4 w-4 text-slate-400" />
                    Aggregator
                  </p>
                </div>

                <StatusBadge status={selectedRequest.status} />
              </section>

              {/* APPLICANT INFORMATION */}
              <section>
                <h3 className="mb-3 font-bold text-slate-900">
                  Applicant information
                </h3>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <DetailItem
                    icon={UserRound}
                    label="Full name"
                    value={selectedRequest.applicant?.full_name}
                  />

                  <DetailItem
                    icon={Phone}
                    label="Phone number"
                    value={selectedRequest.applicant?.phone_number}
                  />

                  <DetailItem
                    icon={MapPin}
                    label="LGA / Community"
                    value={selectedRequest.applicant?.lga_location}
                  />

                  <DetailItem
                    icon={ShieldCheck}
                    label="Account verification"
                    value={formatRole(
                      selectedRequest.applicant?.verification_status
                    )}
                  />

                  <DetailItem
                    icon={Building2}
                    label="Farm name"
                    value={selectedRequest.applicant?.farm_name}
                  />

                  <DetailItem
                    icon={MapPin}
                    label="Farm location"
                    value={selectedRequest.applicant?.farm_location}
                  />

                  <DetailItem
                    icon={Building2}
                    label="Farm type"
                    value={selectedRequest.applicant?.farm_type}
                  />

                  <DetailItem
                    icon={FileText}
                    label="Farm size"
                    value={selectedRequest.applicant?.farm_size}
                  />

                  <DetailItem
                    icon={Building2}
                    label="Business name"
                    value={selectedRequest.applicant?.business_name}
                  />

                  <DetailItem
                    icon={MapPin}
                    label="Business address"
                    value={selectedRequest.applicant?.business_address}
                  />
                </div>
              </section>

              {/* APPLICATION REASON */}
              <section>
                <h3 className="mb-3 font-bold text-slate-900">
                  Reason for applying
                </h3>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="whitespace-pre-wrap text-sm leading-6 text-slate-700">
                    {selectedRequest.reason?.trim() ||
                      'The applicant did not provide a reason.'}
                  </p>
                </div>
              </section>

              {/* DOCUMENTS */}
              <section>
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <h3 className="font-bold text-slate-900">
                      Verification documents
                    </h3>

                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      Documents are accessed through time-limited signed
                      links from a private storage bucket.
                    </p>
                  </div>

                  <span className="shrink-0 rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                    {selectedRequest.documents.length} uploaded
                  </span>
                </div>

                {selectedRequest.documents.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-center">
                    <FileText className="mx-auto h-8 w-8 text-slate-400" />

                    <p className="mt-2 text-sm font-semibold text-slate-700">
                      No documents uploaded
                    </p>

                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      The applicant has not uploaded documents for this
                      request.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {selectedRequest.documents.map((document) => {
                      const isOpening = openingDocumentId === document.id;

                      return (
                        <div
                          key={document.id}
                          className="flex flex-col gap-3 rounded-2xl border border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between"
                        >
                          <div className="flex min-w-0 items-start gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                              <FileText className="h-5 w-5" />
                            </div>

                            <div className="min-w-0">
                              <p className="text-sm font-bold text-slate-800">
                                {DOCUMENT_LABELS[document.document_type] ||
                                  document.document_type ||
                                  'Verification document'}
                              </p>

                              <p className="mt-1 break-all text-xs text-slate-500">
                                {document.file_name || 'Unnamed file'}
                              </p>

                              <p className="mt-1 text-xs text-slate-400">
                                Uploaded {formatDate(document.uploaded_at)}
                                {document.file_size
                                  ? ` · ${(document.file_size / 1024 / 1024).toFixed(2)} MB`
                                  : ''}
                              </p>
                            </div>
                          </div>

                          <button
                            type="button"
                            disabled={Boolean(openingDocumentId)}
                            onClick={() => openDocument(document)}
                            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-bold text-slate-700 transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {isOpening ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}

                            {isOpening ? 'Loading preview...' : 'Preview document'}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}

                {selectedRequest.status === 'pending' &&
                  getMissingDocuments(selectedRequest).length > 0 && (
                    <div className="mt-3 flex gap-2.5 rounded-xl border border-amber-200 bg-amber-50 p-3">
                      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />

                      <div>
                        <p className="text-sm font-bold text-amber-900">
                          Required documents are missing
                        </p>

                        <p className="mt-1 text-xs leading-5 text-amber-800">
                          {getMissingDocuments(selectedRequest)
                            .map((type) => DOCUMENT_LABELS[type] || type)
                            .join(', ')}
                        </p>
                      </div>
                    </div>
                  )}
              </section>

              {/* REVIEW HISTORY */}
              {selectedRequest.status !== 'pending' && (
                <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <h3 className="font-bold text-slate-900">
                    Review record
                  </h3>

                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    This request was marked as{' '}
                    <span className="font-bold">
                      {formatRole(selectedRequest.status)}
                    </span>
                    {selectedRequest.reviewed_at
                      ? ` on ${formatDate(selectedRequest.reviewed_at)}`
                      : ''}
                    .
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    Reviewer ID: {selectedRequest.reviewed_by || 'Not recorded'}
                  </p>
                </section>
              )}

              {/* REVIEW ACTIONS */}
              {selectedRequest.status === 'pending' && (
                <section className="border-t border-slate-100 pt-5">
                  <p className="mb-3 text-sm leading-6 text-slate-500">
                    Review the applicant's information and documents before
                    recording a decision.
                  </p>

                  <div className="flex flex-col gap-3 sm:flex-row">
                    <button
                      type="button"
                      disabled={Boolean(processingId)}
                      onClick={() =>
                        requestReviewConfirmation(selectedRequest, 'approved')
                      }
                      className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <CheckCircle2 className="h-5 w-5" />
                      Approve role request
                    </button>

                    <button
                      type="button"
                      disabled={Boolean(processingId)}
                      onClick={() =>
                        requestReviewConfirmation(selectedRequest, 'rejected')
                      }
                      className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-5 py-3 text-sm font-bold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <XCircle className="h-5 w-5" />
                      Reject request
                    </button>
                  </div>
                </section>
              )}
            </div>
          </section>
        </div>
      )}

      {/* SECURE DOCUMENT PREVIEW MODAL */}
      {previewDocument && (
        <div
          className="fixed inset-0 z-[140] flex items-center justify-center bg-slate-950/80 p-3 backdrop-blur-sm sm:p-6"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setPreviewDocument(null);
            }
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="document-preview-title"
            className="flex max-h-[95vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-white shadow-2xl"
          >
            <header className="flex items-center justify-between gap-4 border-b border-slate-200 px-4 py-3 sm:px-5">
              <div className="min-w-0">
                <h2 id="document-preview-title" className="truncate text-sm font-bold text-slate-900 sm:text-base">
                  {DOCUMENT_LABELS[previewDocument.document_type] || previewDocument.document_type || 'Verification document'}
                </h2>
                <p className="mt-0.5 truncate text-xs text-slate-500">
                  {previewDocument.file_name || 'Uploaded document'}
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <a
                  href={previewDocument.signedUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="hidden items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 sm:inline-flex"
                >
                  <ExternalLink className="h-4 w-4" />
                  Open separately
                </a>
                <button
                  type="button"
                  onClick={() => setPreviewDocument(null)}
                  aria-label="Close document preview"
                  className="rounded-lg border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </header>

            <div className="flex min-h-[45vh] flex-1 items-center justify-center overflow-auto bg-slate-900 p-2 sm:min-h-[60vh] sm:p-5">
              {String(previewDocument.mime_type || '').startsWith('image/') || /\.(png|jpe?g|gif|webp|bmp|avif)$/i.test(previewDocument.file_name || '') ? (
                <img
                  src={previewDocument.signedUrl}
                  alt={DOCUMENT_LABELS[previewDocument.document_type] || previewDocument.file_name || 'Verification document'}
                  className="max-h-[78vh] max-w-full rounded-lg object-contain shadow-xl"
                />
              ) : (previewDocument.mime_type === 'application/pdf' || /\.pdf$/i.test(previewDocument.file_name || '')) ? (
                <iframe
                  title={previewDocument.file_name || 'PDF verification document'}
                  src={previewDocument.signedUrl}
                  className="h-[75vh] w-full rounded-lg bg-white"
                />
              ) : (
                <div className="max-w-md rounded-2xl bg-white p-6 text-center">
                  <FileText className="mx-auto h-10 w-10 text-emerald-600" />
                  <p className="mt-3 font-bold text-slate-900">Preview unavailable for this file type</p>
                  <p className="mt-1 text-sm leading-6 text-slate-500">You can open the secure file in a separate tab to inspect it.</p>
                  <a
                    href={previewDocument.signedUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-4 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-700"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Open document
                  </a>
                </div>
              )}
            </div>

            <footer className="flex items-center justify-between gap-3 border-t border-slate-200 bg-white px-4 py-3">
              <p className="text-xs text-slate-500">Secure preview link expires in approximately 5 minutes.</p>
              <button
                type="button"
                onClick={() => setPreviewDocument(null)}
                className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white transition hover:bg-slate-700"
              >
                Done
              </button>
            </footer>
          </section>
        </div>
      )}

      {/* BRANDED DECISION CONFIRMATION */}
      <ConfirmationDialog
        action={confirmationAction?.decision}
        request={confirmationAction?.request}
        processing={processingId === confirmationAction?.request?.id}
        onCancel={() => {
          if (!processingId) setConfirmationAction(null);
        }}
        onConfirm={reviewRequest}
      />
    </div>
  );
};

export default AdminRoleRequests;  