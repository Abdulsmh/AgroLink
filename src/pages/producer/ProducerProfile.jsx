import React, { useEffect, useMemo, useState } from 'react';
import {
  Save,
  User,
  MapPin,
  Sprout,
  Building2,
  Phone,
  ShieldCheck,
  Lock,
  CheckCircle2,
  Tractor,
  Users,
  Clock3,
  Send,
  XCircle,
  Upload,
  FileText,
  Image as ImageIcon,
  AlertCircle,
  Trash2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../../config/supabaseClient';
import { useAuth } from '../../context/AuthContext';

const MAX_FILE_SIZE = 5 * 1024 * 1024;

const DOCUMENT_CONFIG = [
  {
    type: 'id_document',
    label: 'Valid ID Document',
    description:
      'Upload a valid government-issued ID such as National ID, Driver License, or Voter Card.',
    required: true,
    accept: '.pdf,.jpg,.jpeg,.png,.webp',
  },
  {
    type: 'passport_photo',
    label: 'Passport Photograph',
    description: 'Upload a clear recent passport-style photograph.',
    required: true,
    accept: '.jpg,.jpeg,.png,.webp',
  },
  {
    type: 'proof_of_address',
    label: 'Proof of Address',
    description:
      'Upload a document that helps confirm your residence or community location.',
    required: true,
    accept: '.pdf,.jpg,.jpeg,.png,.webp',
  },
  {
    type: 'supporting_document',
    label: 'Supporting Document',
    description:
      'Optional community letter, business document, recommendation, or other supporting evidence.',
    required: false,
    accept: '.pdf,.jpg,.jpeg,.png,.webp',
  },
];

export const ProducerProfile = () => {
  const { user, userProfile } = useAuth();

  const [form, setForm] = useState({
    full_name: '',
    phone_number: '',
    lga_location: '',
    farm_name: '',
    farm_location: '',
    farm_size: '',
    farm_type: '',
    business_name: '',
    business_address: '',
  });

  const [saving, setSaving] = useState(false);

  const [roleRequest, setRoleRequest] = useState(null);
  const [roleRequestReason, setRoleRequestReason] = useState('');
  const [requestLoading, setRequestLoading] = useState(true);
  const [requestSubmitting, setRequestSubmitting] = useState(false);

  const [documents, setDocuments] = useState({});
  const [documentLoading, setDocumentLoading] = useState(false);

  useEffect(() => {
    if (!userProfile) return;

    setForm({
      full_name: userProfile.full_name || '',
      phone_number: userProfile.phone_number || '',
      lga_location: userProfile.lga_location || '',
      farm_name: userProfile.farm_name || '',
      farm_location: userProfile.farm_location || '',
      farm_size: userProfile.farm_size || '',
      farm_type: userProfile.farm_type || '',
      business_name: userProfile.business_name || '',
      business_address: userProfile.business_address || '',
    });
  }, [userProfile]);

  useEffect(() => {
    if (!user?.id || userProfile?.role !== 'producer') {
      setRequestLoading(false);
      return;
    }

    fetchRoleRequest();
  }, [user?.id, userProfile?.role]);

  const fetchRoleRequest = async () => {
    try {
      setRequestLoading(true);

      const { data, error } = await supabase
        .from('role_requests')
        .select(`
          id,
          previous_role,
          requested_role,
          status,
          reason,
          reviewed_at,
          created_at
        `)
        .eq('user_id', user.id)
        .eq('requested_role', 'aggregator')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('Role request fetch error:', error);
        return;
      }

      setRoleRequest(data || null);

      if (data?.status === 'rejected') {
        setRoleRequestReason('');
        setDocuments({});
        return;
      }

      if (data?.id) {
        await fetchDocuments(data.id);
      }
    } catch (error) {
      console.error('Role request fetch exception:', error);
    } finally {
      setRequestLoading(false);
    }
  };

  const fetchDocuments = async (roleRequestId) => {
    try {
      setDocumentLoading(true);

      const { data, error } = await supabase
        .from('aggregator_documents')
        .select(`
          id,
          role_request_id,
          document_type,
          file_name,
          file_path,
          file_size,
          mime_type,
          uploaded_at
        `)
        .eq('role_request_id', roleRequestId)
        .eq('user_id', user.id);

      if (error) {
        console.error('Aggregator documents fetch error:', error);
        return;
      }

      const mappedDocuments = {};

      (data || []).forEach((document) => {
        mappedDocuments[document.document_type] = document;
      });

      setDocuments(mappedDocuments);
    } catch (error) {
      console.error('Aggregator documents fetch exception:', error);
    } finally {
      setDocumentLoading(false);
    }
  };

  const updateField = (field, value) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!user?.id) {
      toast.error('Your session could not be found.');
      return;
    }

    if (!form.full_name.trim()) {
      toast.error('Full name is required.');
      return;
    }

    setSaving(true);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: form.full_name.trim(),
          phone_number: form.phone_number.trim() || null,
          lga_location: form.lga_location.trim() || null,
          farm_name: form.farm_name.trim() || null,
          farm_location: form.farm_location.trim() || null,
          farm_size: form.farm_size.trim() || null,
          farm_type: form.farm_type.trim() || null,
          business_name: form.business_name.trim() || null,
          business_address: form.business_address.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (error) {
        console.error('Profile update error:', error);
        toast.error(error.message || 'Unable to update your profile.');
        return;
      }

      toast.success('Profile updated successfully.');
    } catch (error) {
      console.error('Profile update exception:', error);
      toast.error('Something went wrong while saving your profile.');
    } finally {
      setSaving(false);
    }
  };

  const handleFileChange = (documentType, file) => {
    if (!file) {
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      toast.error(
        `${file.name} is too large. Each document must be 5MB or less.`
      );
      return;
    }

    const config = DOCUMENT_CONFIG.find(
      (document) => document.type === documentType
    );

    if (!config) {
      return;
    }

    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/webp',
    ];

    if (!allowedTypes.includes(file.type)) {
      toast.error(
        `${config.label} must be a PDF, JPG, JPEG, PNG, or WEBP file.`
      );
      return;
    }

    setDocuments((current) => ({
      ...current,
      [documentType]: {
        file,
        local: true,
        document_type: documentType,
        file_name: file.name,
        file_size: file.size,
        mime_type: file.type,
      },
    }));
  };

  const removeSelectedFile = (documentType) => {
    setDocuments((current) => {
      const updated = { ...current };
      delete updated[documentType];
      return updated;
    });
  };

  const requiredDocumentsComplete = useMemo(() => {
    return DOCUMENT_CONFIG.filter((document) => document.required).every(
      (document) => Boolean(documents[document.type])
    );
  }, [documents]);

  const uploadDocument = async (roleRequestId, documentType, file) => {
    const extension =
      file.name.split('.').pop()?.toLowerCase() || 'file';

    const safeFileName = file.name
      .replace(/\s+/g, '-')
      .replace(/[^a-zA-Z0-9._-]/g, '');

    const filePath = `${user.id}/${roleRequestId}/${documentType}-${Date.now()}.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from('aggregator-verification')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type,
      });

    if (uploadError) {
      throw new Error(
        `${documentType}: ${uploadError.message || 'File upload failed.'}`
      );
    }

    const { data, error: documentError } = await supabase
      .from('aggregator_documents')
      .insert({
        role_request_id: roleRequestId,
        user_id: user.id,
        document_type: documentType,
        file_name: safeFileName || file.name,
        file_path: filePath,
        file_size: file.size,
        mime_type: file.type,
      })
      .select(`
        id,
        role_request_id,
        document_type,
        file_name,
        file_path,
        file_size,
        mime_type,
        uploaded_at
      `)
      .single();

    if (documentError) {
      throw new Error(
        `${documentType}: ${
          documentError.message || 'Unable to save document information.'
        }`
      );
    }

    return data;
  };

  const handleAggregatorRequest = async (event) => {
    event.preventDefault();

    if (!user?.id) {
      toast.error('Your session could not be found.');
      return;
    }

    if (userProfile?.role !== 'producer') {
      toast.error('Only producer accounts can submit this request.');
      return;
    }

    if (roleRequest?.status === 'pending') {
      if (!requiredDocumentsComplete) {
        toast.error(
          'Please upload all required verification documents before submitting.'
        );
      } else {
        toast.error('Your aggregator request is already pending.');
      }
      return;
    }

    if (!roleRequestReason.trim()) {
      toast.error('Please explain why you want to become an aggregator.');
      return;
    }

    if (!requiredDocumentsComplete) {
      toast.error(
        'Please upload your ID, passport photograph, and proof of address.'
      );
      return;
    }

    setRequestSubmitting(true);

    try {
      let request = roleRequest;

      /*
       * If there is no existing pending request, create one first.
       * Documents are then attached to that request.
       */
      if (!request || request.status === 'rejected') {
        const { data, error } = await supabase
          .from('role_requests')
          .insert({
            user_id: user.id,
            previous_role: 'producer',
            requested_role: 'aggregator',
            status: 'pending',
            reason: roleRequestReason.trim(),
          })
          .select(`
            id,
            previous_role,
            requested_role,
            status,
            reason,
            reviewed_at,
            created_at
          `)
          .single();

        if (error) {
          console.error('Aggregator request error:', error);

          if (error.code === '23505') {
            toast.error(
              'You already have a pending aggregator request.'
            );
          } else {
            toast.error(
              error.message || 'Unable to submit aggregator request.'
            );
          }

          return;
        }

        request = data;
        setRoleRequest(data);
      }

      /*
       * Upload only newly selected local files.
       * Existing uploaded documents are not uploaded again.
       */
      const documentsToUpload = DOCUMENT_CONFIG.filter((config) => {
        const selected = documents[config.type];

        return selected?.local && selected?.file;
      });

      if (documentsToUpload.length === 0) {
        await fetchDocuments(request.id);

        if (request.status === 'pending') {
          const { data: existingDocuments } = await supabase
            .from('aggregator_documents')
            .select('document_type')
            .eq('role_request_id', request.id)
            .eq('user_id', user.id);

          const existingTypes = new Set(
            (existingDocuments || []).map(
              (document) => document.document_type
            )
          );

          const missingRequired = DOCUMENT_CONFIG.some(
            (config) =>
              config.required && !existingTypes.has(config.type)
          );

          if (missingRequired) {
            toast.error(
              'Some required verification documents are still missing.'
            );
            return;
          }
        }

        toast.success('Your aggregator request is already submitted.');
        return;
      }

      for (const config of documentsToUpload) {
        const uploadedDocument = await uploadDocument(
          request.id,
          config.type,
          documents[config.type].file
        );

        setDocuments((current) => ({
          ...current,
          [config.type]: uploadedDocument,
        }));
      }

      await fetchDocuments(request.id);

      setRoleRequestReason('');

      toast.success(
        'Aggregator request and verification documents submitted successfully.'
      );
    } catch (error) {
      console.error('Aggregator request exception:', error);

      toast.error(
        error.message ||
          'Something went wrong while submitting your aggregator application.'
      );

      /*
       * We deliberately keep the request in the database if an upload
       * fails. The applicant can return and complete the missing documents
       * instead of creating another request.
       */
      await fetchRoleRequest();
    } finally {
      setRequestSubmitting(false);
    }
  };

  const verificationStatus =
    userProfile?.verification_status || 'pending';

  const verificationLabel = {
    approved: 'Verified Producer',
    pending: 'Verification Pending',
    rejected: 'Verification Requires Attention',
  }[verificationStatus] || 'Verification Pending';

  const verificationStyles = {
    approved:
      'bg-emerald-50 text-emerald-700 border-emerald-200',
    pending:
      'bg-amber-50 text-amber-700 border-amber-200',
    rejected:
      'bg-red-50 text-red-700 border-red-200',
  };

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
        <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-emerald-100/60 blur-3xl" />
        <div className="absolute -bottom-20 left-1/3 h-36 w-36 rounded-full bg-lime-100/40 blur-3xl" />

        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 shadow-sm">
              <User className="h-6 w-6" />
            </div>

            <div>
              <p className="text-sm font-bold text-emerald-600">
                Producer Workspace
              </p>

              <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                Profile Settings
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                Keep your personal, farm, and business information
                up to date so buyers can better understand your
                operation.
              </p>
            </div>
          </div>

          <div
            className={`inline-flex w-fit items-center gap-2 rounded-full border px-3.5 py-2 text-xs font-bold ${
              verificationStyles[verificationStatus] ||
              verificationStyles.pending
            }`}
          >
            {verificationStatus === 'approved' ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : (
              <ShieldCheck className="h-4 w-4" />
            )}

            {verificationLabel}
          </div>
        </div>
      </div>

      {/* Personal Information */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <SectionHeader
          icon={User}
          title="Personal Information"
          description="Basic information connected to your producer account."
        />

        <div className="grid grid-cols-1 gap-5 p-5 sm:grid-cols-2 lg:p-6">
          <Field
            label="Full name"
            icon={User}
            value={form.full_name}
            onChange={(value) => updateField('full_name', value)}
            required
          />

          <Field
            label="Phone number"
            icon={Phone}
            value={form.phone_number}
            onChange={(value) => updateField('phone_number', value)}
            placeholder="e.g. 08012345678"
          />

          <div className="sm:col-span-2">
            <LockedField
              label="Email address"
              icon={User}
              value={user?.email || ''}
              helper="Your login email is managed through your account security settings."
            />
          </div>

          <Field
            label="LGA"
            icon={MapPin}
            value={form.lga_location}
            onChange={(value) => updateField('lga_location', value)}
            placeholder="e.g. Kano Central"
          />
        </div>
      </section>

      {/* Farm Information */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <SectionHeader
          icon={Sprout}
          title="Farm Information"
          description="Tell buyers more about where and how you produce."
        />

        <div className="grid grid-cols-1 gap-5 p-5 sm:grid-cols-2 lg:p-6">
          <Field
            label="Farm name"
            icon={Sprout}
            value={form.farm_name}
            onChange={(value) => updateField('farm_name', value)}
            placeholder="e.g. Hassan Family Farm"
          />

          <Field
            label="Farm type"
            icon={Tractor}
            value={form.farm_type}
            onChange={(value) => updateField('farm_type', value)}
            placeholder="e.g. Crop farming"
          />

          <Field
            label="Farm location"
            icon={MapPin}
            value={form.farm_location}
            onChange={(value) => updateField('farm_location', value)}
            placeholder="e.g. Kura, Kano"
          />

          <Field
            label="Farm size"
            icon={Sprout}
            value={form.farm_size}
            onChange={(value) => updateField('farm_size', value)}
            placeholder="e.g. 5 hectares"
          />
        </div>
      </section>

      {/* Business Information */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <SectionHeader
          icon={Building2}
          title="Business Information"
          description="Optional information about your farming business."
        />

        <div className="grid grid-cols-1 gap-5 p-5 sm:grid-cols-2 lg:p-6">
          <Field
            label="Business name"
            icon={Building2}
            value={form.business_name}
            onChange={(value) => updateField('business_name', value)}
            placeholder="e.g. Hassan Agro Farms"
          />

          <div className="sm:col-span-2">
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              Business address
            </label>

            <div className="relative">
              <MapPin className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />

              <textarea
                value={form.business_address}
                onChange={(event) =>
                  updateField('business_address', event.target.value)
                }
                rows={3}
                placeholder="Enter your business address"
                className="w-full resize-none rounded-xl border border-slate-200 px-4 py-3 pl-10 text-sm text-slate-800 outline-none transition duration-200 placeholder:text-slate-400 hover:border-slate-300 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Aggregator Request */}
      <section className="overflow-hidden rounded-2xl border border-blue-200 bg-white shadow-sm">
        <div className="border-b border-blue-100 bg-blue-50/60 px-5 py-4 sm:px-6">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
              <Users className="h-5 w-5" />
            </div>

            <div>
              <h2 className="text-sm font-bold text-slate-900 sm:text-base">
                Become an Aggregator
              </h2>

              <p className="mt-1 text-xs leading-5 text-slate-500 sm:text-sm">
                If you coordinate or represent other producers in your
                community, you can apply to become an AgroLink aggregator.
                Your application will be reviewed by an administrator.
              </p>
            </div>
          </div>
        </div>

        <div className="p-5 sm:p-6">
          {requestLoading ? (
            <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-4">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-200 border-t-blue-600" />

              <p className="text-sm text-slate-500">
                Checking your aggregator application...
              </p>
            </div>
          ) : roleRequest?.status === 'pending' ? (
            <PendingAggregatorApplication
              roleRequest={roleRequest}
              documents={documents}
              documentLoading={documentLoading}
              onFileChange={handleFileChange}
              onRemove={removeSelectedFile}
              submitting={requestSubmitting}
              onSubmit={handleAggregatorRequest}
              complete={requiredDocumentsComplete}
            />
          ) : roleRequest?.status === 'approved' ? (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 sm:p-5">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
                  <CheckCircle2 className="h-5 w-5" />
                </div>

                <div>
                  <h3 className="text-sm font-bold text-emerald-900">
                    Aggregator Request Approved
                  </h3>

                  <p className="mt-1 text-sm leading-6 text-emerald-800">
                    Your aggregator application has been approved by an
                    administrator. Your account is being processed through
                    the AgroLink verification workflow.
                  </p>
                </div>
              </div>
            </div>
          ) : roleRequest?.status === 'rejected' ? (
            <div className="space-y-4">
              <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-600">
                    <XCircle className="h-5 w-5" />
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-red-900">
                      Previous Request Was Not Approved
                    </h3>

                    <p className="mt-1 text-sm leading-6 text-red-800">
                      You can submit a new application if you still want
                      to become an aggregator.
                    </p>

                    {roleRequest.reviewed_at && (
                      <p className="mt-2 text-xs font-medium text-red-700">
                        Reviewed on{' '}
                        {new Date(
                          roleRequest.reviewed_at
                        ).toLocaleDateString('en-NG', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <AggregatorRequestForm
                reason={roleRequestReason}
                setReason={setRoleRequestReason}
                documents={documents}
                documentLoading={documentLoading}
                onFileChange={handleFileChange}
                onRemove={removeSelectedFile}
                submitting={requestSubmitting}
                onSubmit={handleAggregatorRequest}
                complete={requiredDocumentsComplete}
              />
            </div>
          ) : (
            <AggregatorRequestForm
              reason={roleRequestReason}
              setReason={setRoleRequestReason}
              documents={documents}
              documentLoading={documentLoading}
              onFileChange={handleFileChange}
              onRemove={removeSelectedFile}
              submitting={requestSubmitting}
              onSubmit={handleAggregatorRequest}
              complete={requiredDocumentsComplete}
            />
          )}
        </div>
      </section>

      {/* Security / Protected Information */}
      <section className="rounded-2xl border border-slate-200 bg-slate-50 p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-200 text-slate-600">
            <Lock className="h-5 w-5" />
          </div>

          <div>
            <h2 className="text-sm font-bold text-slate-900">
              Protected Account Information
            </h2>

            <p className="mt-1 text-sm leading-6 text-slate-500">
              Your account role, verification status, and account
              identity are protected and cannot be changed from this
              page. These details are managed securely by AgroLink.
            </p>
          </div>
        </div>
      </section>

      {/* Save */}
      <div className="sticky bottom-3 z-10 flex justify-end">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-emerald-600/20 transition duration-200 hover:-translate-y-0.5 hover:bg-emerald-700 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
        >
          <Save className="h-4 w-4" />
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
};

const PendingAggregatorApplication = ({
  roleRequest,
  documents,
  documentLoading,
  onFileChange,
  onRemove,
  submitting,
  onSubmit,
  complete,
}) => {
  const uploadedRequiredCount = DOCUMENT_CONFIG.filter(
    (config) => config.required && documents[config.type]
  ).length;

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-600">
            <Clock3 className="h-5 w-5" />
          </div>

          <div>
            <h3 className="text-sm font-bold text-amber-900">
              Aggregator Request Pending
            </h3>

            <p className="mt-1 text-sm leading-6 text-amber-800">
              Your application has been created and is waiting for
              administrator review. You can complete any missing
              verification documents below.
            </p>

            <p className="mt-2 text-xs font-medium text-amber-700">
              Submitted on{' '}
              {new Date(roleRequest.created_at).toLocaleDateString(
                'en-NG',
                {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                }
              )}
            </p>
          </div>
        </div>
      </div>

      <DocumentUploadSection
        documents={documents}
        documentLoading={documentLoading}
        onFileChange={onFileChange}
        onRemove={onRemove}
      />

      <div className="flex flex-col gap-3 rounded-xl border border-slate-100 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-bold text-slate-700">
            Required documents
          </p>

          <p className="mt-1 text-xs text-slate-500">
            {uploadedRequiredCount} of 3 required documents uploaded.
          </p>
        </div>

        <button
          type="button"
          onClick={onSubmit}
          disabled={submitting || !complete}
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Send className="h-4 w-4" />
          {submitting ? 'Uploading...' : 'Complete Application'}
        </button>
      </div>
    </div>
  );
};

const AggregatorRequestForm = ({
  reason,
  setReason,
  documents,
  documentLoading,
  onFileChange,
  onRemove,
  submitting,
  onSubmit,
  complete,
}) => {
  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div>
        <label className="mb-2 block text-sm font-semibold text-slate-700">
          Why do you want to become an aggregator?
          <span className="ml-1 text-red-500">*</span>
        </label>

        <textarea
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          rows={4}
          maxLength={1000}
          placeholder="For example: I coordinate farmers in my community and help connect them with buyers..."
          className="w-full resize-none rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-800 outline-none transition duration-200 placeholder:text-slate-400 hover:border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
        />

        <div className="mt-1.5 flex items-center justify-between">
          <p className="text-xs text-slate-400">
            Explain your experience, community role, or how you
            currently coordinate producers.
          </p>

          <span className="shrink-0 text-xs text-slate-400">
            {reason.length}/1000
          </span>
        </div>
      </div>

      <DocumentUploadSection
        documents={documents}
        documentLoading={documentLoading}
        onFileChange={onFileChange}
        onRemove={onRemove}
      />

      <div className="flex flex-col gap-3 rounded-xl border border-slate-100 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-bold text-slate-700">
            Verification required
          </p>

          <p className="mt-1 text-xs leading-5 text-slate-500">
            Your current producer role remains active while the
            administrator reviews your aggregator application.
          </p>
        </div>

        <button
          type="submit"
          disabled={submitting || !reason.trim() || !complete}
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Send className="h-4 w-4" />
          {submitting ? 'Submitting...' : 'Submit Application'}
        </button>
      </div>
    </form>
  );
};

const DocumentUploadSection = ({
  documents,
  documentLoading,
  onFileChange,
  onRemove,
}) => {
  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-blue-600" />

          <h3 className="text-sm font-bold text-slate-800">
            Verification Documents
          </h3>
        </div>

        <p className="mt-1 text-xs leading-5 text-slate-500">
          Upload clear documents for administrator verification. Maximum
          file size is 5MB per document. PDF, JPG, JPEG, PNG, and WEBP
          files are supported.
        </p>
      </div>

      {documentLoading ? (
        <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-4">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-200 border-t-blue-600" />

          <p className="text-sm text-slate-500">
            Loading your submitted documents...
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {DOCUMENT_CONFIG.map((config) => (
            <DocumentUploadCard
              key={config.type}
              config={config}
              document={documents[config.type]}
              onFileChange={onFileChange}
              onRemove={onRemove}
            />
          ))}
        </div>
      )}

      <div className="flex items-start gap-2 rounded-xl border border-blue-100 bg-blue-50 p-3">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />

        <p className="text-xs leading-5 text-blue-800">
          Your verification documents are stored in a private AgroLink
          storage area and are only available to you and authorized
          administrators.
        </p>
      </div>
    </div>
  );
};

const DocumentUploadCard = ({
  config,
  document,
  onFileChange,
  onRemove,
}) => {
  const hasFile = Boolean(document);
  const isLocalFile = Boolean(document?.local);

  return (
    <div
      className={`rounded-2xl border p-4 transition ${
        hasFile
          ? 'border-emerald-200 bg-emerald-50/40'
          : 'border-slate-200 bg-white'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
              hasFile
                ? 'bg-emerald-100 text-emerald-600'
                : 'bg-slate-100 text-slate-500'
            }`}
          >
            {config.type === 'passport_photo' ? (
              <ImageIcon className="h-5 w-5" />
            ) : (
              <FileText className="h-5 w-5" />
            )}
          </div>

          <div>
            <p className="text-sm font-bold text-slate-800">
              {config.label}

              {config.required && (
                <span className="ml-1 text-red-500">*</span>
              )}
            </p>

            <p className="mt-1 text-xs leading-5 text-slate-500">
              {config.description}
            </p>
          </div>
        </div>

        {hasFile && (
          <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
        )}
      </div>

      {hasFile ? (
        <div className="mt-4 rounded-xl border border-emerald-100 bg-white p-3">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-xs font-bold text-slate-700">
                {document.file_name}
              </p>

              <p className="mt-1 text-[11px] text-slate-400">
                {isLocalFile
                  ? 'Ready to upload'
                  : 'Uploaded successfully'}
              </p>
            </div>

            {isLocalFile && (
              <button
                type="button"
                onClick={() => onRemove(config.type)}
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                title="Remove selected file"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      ) : (
        <label className="mt-4 flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-xs font-bold text-slate-600 transition hover:border-blue-400 hover:bg-blue-50 hover:text-blue-700">
          <Upload className="h-4 w-4" />
          Choose File

          <input
            type="file"
            accept={config.accept}
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];

              if (file) {
                onFileChange(config.type, file);
              }

              event.target.value = '';
            }}
          />
        </label>
      )}
    </div>
  );
};

const SectionHeader = ({ icon: Icon, title, description }) => {
  return (
    <div className="flex items-start gap-3 border-b border-slate-100 px-5 py-4 sm:px-6">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
        <Icon className="h-5 w-5" />
      </div>

      <div>
        <h2 className="text-sm font-bold text-slate-900 sm:text-base">
          {title}
        </h2>

        <p className="mt-1 text-xs leading-5 text-slate-500 sm:text-sm">
          {description}
        </p>
      </div>
    </div>
  );
};

const Field = ({
  label,
  icon: Icon,
  value,
  onChange,
  placeholder,
  required,
}) => {
  return (
    <div>
      <label className="mb-2 block text-sm font-semibold text-slate-700">
        {label}
        {required && <span className="ml-1 text-red-500">*</span>}
      </label>

      <div className="relative">
        <Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

        <input
          type="text"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder || label}
          required={required}
          className="w-full rounded-xl border border-slate-200 py-3 pl-10 pr-4 text-sm text-slate-800 outline-none transition duration-200 placeholder:text-slate-400 hover:border-slate-300 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
        />
      </div>
    </div>
  );
};

const LockedField = ({ label, icon: Icon, value, helper }) => {
  return (
    <div>
      <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
        {label}

        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">
          <Lock className="h-3 w-3" />
          Protected
        </span>
      </label>

      <div className="relative">
        <Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

        <input
          type="text"
          value={value}
          disabled
          readOnly
          className="w-full cursor-not-allowed rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-10 text-sm text-slate-500 outline-none"
        />

        <Lock className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      </div>

      {helper && (
        <p className="mt-1.5 text-xs text-slate-400">
          {helper}
        </p>
      )}
    </div>
  );
};
