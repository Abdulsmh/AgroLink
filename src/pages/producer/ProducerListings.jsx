
import React, { useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { supabase } from '../../config/supabaseClient';
import { useAuth } from '../../context/AuthContext';

const BUCKET_NAME = 'product-images';
const MAX_IMAGES = 5;
const MAX_FILE_SIZE = 5 * 1024 * 1024;

const emptyForm = {
  crop_name: '',
  quantity: '',
  unit: 'kg',
  price_per_unit: '',
  location: '',
  product_type: 'post_harvest',
  description: '',
};

const formatCurrency = (value) =>
  new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);

const parseImagePaths = (value) => {
  if (!value) return [];

  if (Array.isArray(value)) return value;

  try {
    const parsed = JSON.parse(value);

    if (Array.isArray(parsed)) {
      return parsed;
    }
  } catch {
    // Supports older single-image values.
  }

  return [value];
};

const getPublicImageUrl = (path) => {
  if (!path) return '';

  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }

  const { data } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(path);

  return data?.publicUrl || '';
};

const getFileExtension = (file) => {
  const extension = file.name.split('.').pop()?.toLowerCase();

  return extension || 'jpg';
};

const createImagePreview = (file) => ({
  id: `${file.name}-${file.size}-${file.lastModified}-${Math.random()}`,
  file,
  previewUrl: URL.createObjectURL(file),
});

export const ProducerListings = () => {
  const { user } = useAuth();
  const fileInputRef = useRef(null);

  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [search, setSearch] = useState('');
  const [unitFilter, setUnitFilter] = useState('all');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);

  const [form, setForm] = useState(emptyForm);
  const [selectedImages, setSelectedImages] = useState([]);
  const [existingImagePaths, setExistingImagePaths] = useState([]);

  const loadProducts = async () => {
    if (!user?.id) return;

    setIsLoading(true);

    const { data, error } = await supabase
      .from('products')
      .select(
        'id, producer_id, crop_name, quantity, unit, price_per_unit, location, description, image_path, product_type, created_at'
      )
      .eq('producer_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error(error);
      toast.error('Could not load your listings.');
    } else {
      setProducts(data || []);
    }

    setIsLoading(false);
  };

  useEffect(() => {
    loadProducts();
  }, [user?.id]);

  useEffect(() => {
    return () => {
      selectedImages.forEach((image) => {
        URL.revokeObjectURL(image.previewUrl);
      });
    };
  }, [selectedImages]);

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase();

    return products.filter((product) => {
      const matchesSearch =
        !query ||
        product.crop_name?.toLowerCase().includes(query) ||
        product.location?.toLowerCase().includes(query);

      const matchesUnit =
        unitFilter === 'all' || product.unit === unitFilter;

      return matchesSearch && matchesUnit;
    });
  }, [products, search, unitFilter]);

  const totalStock = products.reduce(
    (total, product) => total + Number(product.quantity || 0),
    0
  );

  const totalInventoryValue = products.reduce(
    (total, product) =>
      total +
      Number(product.quantity || 0) *
        Number(product.price_per_unit || 0),
    0
  );

  const resetModal = () => {
    selectedImages.forEach((image) => {
      URL.revokeObjectURL(image.previewUrl);
    });

    setForm(emptyForm);
    setSelectedImages([]);
    setExistingImagePaths([]);
    setEditingProduct(null);
    setIsModalOpen(false);
  };

  const openCreateModal = () => {
    setEditingProduct(null);
    setForm(emptyForm);
    setExistingImagePaths([]);
    setSelectedImages([]);
    setIsModalOpen(true);
  };

  const openEditModal = (product) => {
    setEditingProduct(product);

    setForm({
      crop_name: product.crop_name || '',
      quantity: String(product.quantity ?? ''),
      unit: product.unit || 'kg',
      price_per_unit: String(product.price_per_unit ?? ''),
      location: product.location || '',
      product_type: product.product_type || 'post_harvest',
      description: product.description || '',
    });

    setExistingImagePaths(parseImagePaths(product.image_path));
    setSelectedImages([]);
    setIsModalOpen(true);
  };

  const handleInputChange = (event) => {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const handleImageSelection = (event) => {
    const files = Array.from(event.target.files || []);

    event.target.value = '';

    if (!files.length) return;

    const currentImageCount =
      existingImagePaths.length + selectedImages.length;

    if (currentImageCount + files.length > MAX_IMAGES) {
      toast.error(`You can upload a maximum of ${MAX_IMAGES} images.`);
      return;
    }

    const validFiles = [];

    for (const file of files) {
      if (!file.type.startsWith('image/')) {
        toast.error(`${file.name} is not a valid image.`);
        continue;
      }

      if (file.size > MAX_FILE_SIZE) {
        toast.error(`${file.name} is larger than 5 MB.`);
        continue;
      }

      validFiles.push(createImagePreview(file));
    }

    setSelectedImages((current) => [...current, ...validFiles]);
  };

  const removeSelectedImage = (imageId) => {
    setSelectedImages((current) => {
      const image = current.find((item) => item.id === imageId);

      if (image) {
        URL.revokeObjectURL(image.previewUrl);
      }

      return current.filter((item) => item.id !== imageId);
    });
  };

  const removeExistingImage = (path) => {
    setExistingImagePaths((current) =>
      current.filter((item) => item !== path)
    );
  };

  const uploadImages = async (productId, images) => {
    const uploadedPaths = [];

    for (const image of images) {
      const extension = getFileExtension(image.file);

      const uniqueFileName = `${Date.now()}-${Math.random()
        .toString(36)
        .slice(2)}`;

      const filePath = `${user.id}/${productId}/${uniqueFileName}.${extension}`;

      const { error } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(filePath, image.file, {
          cacheControl: '3600',
          upsert: false,
          contentType: image.file.type,
        });

      if (error) {
        throw error;
      }

      uploadedPaths.push(filePath);
    }

    return uploadedPaths;
  };

  const deleteStorageImages = async (paths) => {
    const cleanPaths = paths.filter(
      (path) =>
        path &&
        !path.startsWith('http://') &&
        !path.startsWith('https://')
    );

    if (!cleanPaths.length) return;

    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .remove(cleanPaths);

    if (error) {
      console.error('Image cleanup failed:', error);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!user?.id) {
      toast.error('Your session has expired. Please log in again.');
      return;
    }

    const quantity = Number(form.quantity);
    const pricePerUnit = Number(form.price_per_unit);

    if (!form.crop_name.trim()) {
      toast.error('Enter the crop or product name.');
      return;
    }

    if (!Number.isFinite(quantity) || quantity <= 0) {
      toast.error('How much do you have? must be greater than zero.');
      return;
    }

    if (!Number.isFinite(pricePerUnit) || pricePerUnit < 0) {
      toast.error('Enter a valid price per unit.');
      return;
    }

    const finalImageCount =
      existingImagePaths.length + selectedImages.length;

    if (finalImageCount < 1) {
      toast.error('Please upload at least one product image.');
      return;
    }

    if (finalImageCount > MAX_IMAGES) {
      toast.error(`You can upload a maximum of ${MAX_IMAGES} images.`);
      return;
    }

    setIsSaving(true);

    try {
      let productId = editingProduct?.id;
      let oldImagePaths = [];

      if (editingProduct) {
        oldImagePaths = parseImagePaths(editingProduct.image_path);
      }

      if (!editingProduct) {
        const { data, error } = await supabase
          .from('products')
          .insert({
            producer_id: user.id,
            crop_name: form.crop_name.trim(),
            quantity,
            unit: form.unit,
            price_per_unit: pricePerUnit,
            location: form.location.trim() || null,
            product_type: form.product_type,
            description: form.description.trim() || null,
            image_path: JSON.stringify([]),
          })
          .select('id')
          .single();

        if (error) throw error;

        productId = data.id;
      }

      const uploadedPaths = await uploadImages(
        productId,
        selectedImages
      );

      const finalImagePaths = [
        ...existingImagePaths,
        ...uploadedPaths,
      ];

      const { error: updateError } = await supabase
        .from('products')
        .update({
          crop_name: form.crop_name.trim(),
          quantity,
          unit: form.unit,
          price_per_unit: pricePerUnit,
          location: form.location.trim() || null,
          product_type: form.product_type,
          description: form.description.trim() || null,
          image_path: JSON.stringify(finalImagePaths),
        })
        .eq('id', productId)
        .eq('producer_id', user.id);

      if (updateError) throw updateError;

      const removedPaths = oldImagePaths.filter(
        (path) => !finalImagePaths.includes(path)
      );

      await deleteStorageImages(removedPaths);

      toast.success(
        editingProduct
          ? 'Listing updated successfully.'
          : 'Listing created successfully.'
      );

      resetModal();
      await loadProducts();
    } catch (error) {
      console.error(error);
      toast.error(error.message || 'Could not save listing.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (product) => {
    const confirmed = window.confirm(
      `Delete the listing for ${product.crop_name}? This action cannot be undone.`
    );

    if (!confirmed) return;

    const imagePaths = parseImagePaths(product.image_path);

    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', product.id)
      .eq('producer_id', user.id);

    if (error) {
      console.error(error);
      toast.error('Could not delete this listing.');
      return;
    }

    await deleteStorageImages(imagePaths);

    toast.success('Listing deleted successfully.');
    await loadProducts();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-600">
            Farm inventory
          </p>

          <h1 className="mt-1 text-2xl font-bold text-slate-900">
            My Farm Products
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Add your farm products, set your price, and manage what buyers can see.
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          className="rounded-xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700"
        >
          + Add Product
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Total listings</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">
            {products.length}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Total stock</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">
            {totalStock.toLocaleString()}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Inventory value</p>
          <p className="mt-2 text-2xl font-bold text-emerald-700">
            {formatCurrency(totalInventoryValue)}
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row">
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search crop or location..."
          className="min-w-0 flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
        />

        <select
          value={unitFilter}
          onChange={(event) => setUnitFilter(event.target.value)}
          className="rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-500"
        >
          <option value="all">All units</option>
          <option value="kg">Kilogram</option>
          <option value="tonne">Tonne</option>
          <option value="bag">Bag</option>
          <option value="crate">Crate</option>
          <option value="litre">Litre</option>
          <option value="piece">Piece</option>
        </select>

        <button
          type="button"
          onClick={loadProducts}
          className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          Refresh
        </button>
      </div>

      {isLoading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
          Loading your listings...
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <h2 className="text-lg font-bold text-slate-800">
            No listings found
          </h2>

          <p className="mt-2 text-sm text-slate-500">
            Add your first harvest listing with at least one clear image.
          </p>

          <button
            type="button"
            onClick={openCreateModal}
            className="mt-5 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white hover:bg-emerald-700"
          >
            Add your first product
          </button>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {filteredProducts.map((product) => {
            const imagePaths = parseImagePaths(product.image_path);
            const coverImage = getPublicImageUrl(imagePaths[0]);

            return (
              <article
                key={product.id}
                className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="relative aspect-[4/3] bg-slate-100">
                  {coverImage ? (
                    <img
                      src={coverImage}
                      alt={product.crop_name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-sm text-slate-400">
                      No image
                    </div>
                  )}

                  <span className="absolute right-3 top-3 rounded-full bg-slate-900/80 px-3 py-1 text-xs font-bold text-white">
                    {product.product_type === 'pre_harvest' ? 'Pre-harvest' : 'Ready harvest'}
                  </span>

                  <span className="absolute left-3 top-3 rounded-full bg-white/90 px-3 py-1 text-xs font-bold text-emerald-700">
                    {imagePaths.length} image{imagePaths.length === 1 ? '' : 's'}
                  </span>
                </div>

                <div className="space-y-4 p-5">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">
                      {product.crop_name}
                    </h2>

                    <p className="mt-1 text-sm text-slate-500">
                      {product.location || 'Where is it located? not specified'}
                    </p>

                    {product.description && (
                      <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-600">
                        {product.description}
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-xl bg-slate-50 p-3">
                      <p className="text-slate-500">How much do you have?</p>
                      <p className="mt-1 font-bold text-slate-900">
                        {Number(product.quantity).toLocaleString()} {product.unit}
                      </p>
                    </div>

                    <div className="rounded-xl bg-slate-50 p-3">
                      <p className="text-slate-500">Price</p>
                      <p className="mt-1 font-bold text-slate-900">
                        {formatCurrency(product.price_per_unit)}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => openEditModal(product)}
                      className="flex-1 rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50"
                    >
                      Edit
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDelete(product)}
                      className="rounded-xl border border-red-200 px-3 py-2.5 text-sm font-bold text-red-600 hover:bg-red-50"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/60 p-4">
          <div className="my-4 max-h-[calc(100vh-2rem)] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-5">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  {editingProduct ? 'Edit farm product' : 'Add a farm product'}
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Tell buyers what you are selling. Add clear pictures to build trust.
                </p>
              </div>

              <button
                type="button"
                onClick={resetModal}
                className="rounded-full px-3 py-2 text-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                aria-label="Close modal"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5 p-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-sm font-semibold text-slate-700">
                  What are you selling?

                  <input
                    name="crop_name"
                    value={form.crop_name}
                    onChange={handleInputChange}
                    placeholder="e.g. Maize, Rice, Tomatoes"
                    className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 font-normal outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                    required
                  />
                </label>

                <label className="block text-sm font-semibold text-slate-700">
                  Where is it located?

                  <input
                    name="location"
                    value={form.location}
                    onChange={handleInputChange}
                    placeholder="e.g. Dawanau, Kano"
                    className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 font-normal outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                  />
                </label>

                <label className="block text-sm font-semibold text-slate-700">
                  How much do you have?

                  <input
                    name="quantity"
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={form.quantity}
                    onChange={handleInputChange}
                    placeholder="e.g. 100"
                    className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 font-normal outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                    required
                  />
                </label>

                <label className="block text-sm font-semibold text-slate-700">
                  Product type

                  <select
                    name="product_type"
                    value={form.product_type}
                    onChange={handleInputChange}
                    className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 font-normal outline-none focus:border-emerald-500"
                  >
                    <option value="post_harvest">Ready harvest / already available</option>
                    <option value="pre_harvest">Pre-harvest / booking before harvest</option>
                  </select>
                  <span className="mt-1 block text-xs font-normal text-slate-500">Choose ready products or products buyers can book before harvest.</span>
                </label>

                <label className="block text-sm font-semibold text-slate-700">
                  Unit

                  <select
                    name="unit"
                    value={form.unit}
                    onChange={handleInputChange}
                    className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 font-normal outline-none focus:border-emerald-500"
                  >
                    <option value="kg">Kilogram</option>
                    <option value="tonne">Tonne</option>
                    <option value="bag">Bag</option>
                    <option value="crate">Crate</option>
                    <option value="litre">Litre</option>
                    <option value="piece">Piece</option>
                  </select>
                </label>

                <label className="block text-sm font-semibold text-slate-700 sm:col-span-2">
                  Price per unit (Naira)

                  <input
                    name="price_per_unit"
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.price_per_unit}
                    onChange={handleInputChange}
                    placeholder="e.g. 45000"
                    className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 font-normal outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                    required
                  />
                </label>

                <label className="block text-sm font-semibold text-slate-700 sm:col-span-2">
                  Product description

                  <textarea
                    name="description"
                    value={form.description}
                    onChange={handleInputChange}
                    maxLength={1000}
                    rows={4}
                    placeholder="Describe the quality, variety, freshness, packaging, or other useful details buyers should know..."
                    className="mt-2 w-full resize-y rounded-xl border border-slate-200 px-4 py-3 font-normal outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                  />

                  <span className="mt-1 block text-xs font-normal text-slate-500">
                    Optional. Maximum 1,000 characters.
                  </span>
                </label>
              </div>

              <div className="rounded-2xl border border-dashed border-emerald-300 bg-emerald-50/60 p-4">
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                  <div>
                    <p className="font-bold text-slate-900">
                      Product images
                    </p>

                    <p className="mt-1 text-xs text-slate-600">
                      Select images from your device or use your mobile camera.
                      Maximum 5 MB per image.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={
                      existingImagePaths.length + selectedImages.length >=
                      MAX_IMAGES
                    }
                    className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Choose images / camera
                  </button>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  capture="environment"
                  onChange={handleImageSelection}
                  className="hidden"
                />

                <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
                  {existingImagePaths.map((path) => {
                    const imageUrl = getPublicImageUrl(path);

                    return (
                      <div
                        key={path}
                        className="relative overflow-hidden rounded-xl border border-slate-200 bg-white"
                      >
                        <img
                          src={imageUrl}
                          alt="Existing product"
                          className="aspect-square w-full object-cover"
                        />

                        <button
                          type="button"
                          onClick={() => removeExistingImage(path)}
                          className="absolute right-1 top-1 rounded-full bg-white/90 px-2 py-1 text-xs font-bold text-red-600 shadow"
                          aria-label="Remove existing image"
                        >
                          ×
                        </button>
                      </div>
                    );
                  })}

                  {selectedImages.map((image) => (
                    <div
                      key={image.id}
                      className="relative overflow-hidden rounded-xl border border-slate-200 bg-white"
                    >
                      <img
                        src={image.previewUrl}
                        alt="Selected product preview"
                        className="aspect-square w-full object-cover"
                      />

                      <button
                        type="button"
                        onClick={() => removeSelectedImage(image.id)}
                        className="absolute right-1 top-1 rounded-full bg-white/90 px-2 py-1 text-xs font-bold text-red-600 shadow"
                        aria-label="Remove selected image"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>

                <p className="mt-3 text-xs font-semibold text-slate-600">
                  {existingImagePaths.length + selectedImages.length} / {MAX_IMAGES} images selected
                </p>
              </div>

              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={resetModal}
                  className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isSaving}
                  className="rounded-xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSaving
                    ? 'Uploading and saving...'
                    : editingProduct
                    ? 'Update listing'
                    : 'Create listing'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};