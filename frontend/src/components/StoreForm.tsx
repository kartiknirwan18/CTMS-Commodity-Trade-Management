import { useState } from 'react';
import { assetUrl } from '../lib/api';
import { uploadsApi, type StoreFormPayload } from '../lib/endpoints';
import { Alert, Button, Card, Input, Select, Textarea, cn } from './ui';
import type { Category, OpeningHour, StoreDetail } from '../types';

const DEFAULT_HOURS: OpeningHour[] = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
].map((day) => ({ day, open: '09:00', close: '18:00', closed: day === 'Sunday' }));

function hoursFrom(store: StoreDetail | null): OpeningHour[] {
  if (!store?.openingHours?.length) return DEFAULT_HOURS;
  // Merge so every weekday always has a row, even if the stored list is partial.
  return DEFAULT_HOURS.map((fallback) => store.openingHours.find((entry) => entry.day === fallback.day) ?? fallback);
}

export interface StoreFormProps {
  /** Existing store when editing; null when creating. */
  store: StoreDetail | null;
  categories: Category[];
  busy: boolean;
  serverError?: string | null;
  fieldErrors?: Record<string, string>;
  submitLabel: string;
  onSubmit: (payload: StoreFormPayload) => Promise<void>;
  onCancel?: () => void;
}

export function StoreForm({
  store,
  categories,
  busy,
  serverError,
  fieldErrors = {},
  submitLabel,
  onSubmit,
  onCancel,
}: StoreFormProps) {
  const [name, setName] = useState(store?.name ?? '');
  const [tagline, setTagline] = useState(store?.tagline ?? '');
  const [description, setDescription] = useState(store?.description ?? '');
  const [categoryId, setCategoryId] = useState(store?.category?.id ?? '');
  const [newCategory, setNewCategory] = useState('');
  const [phone, setPhone] = useState(store?.phone ?? '');
  const [email, setEmail] = useState(store?.email ?? '');
  const [website, setWebsite] = useState(store?.website ?? '');
  const [addressLine, setAddressLine] = useState(store?.addressLine ?? '');
  const [city, setCity] = useState(store?.city ?? '');
  const [state, setState] = useState(store?.state ?? '');
  const [country, setCountry] = useState(store?.country ?? 'India');
  const [postalCode, setPostalCode] = useState(store?.postalCode ?? '');
  const [logoUrl, setLogoUrl] = useState(store?.logoUrl ?? '');
  const [bannerUrl, setBannerUrl] = useState(store?.bannerUrl ?? '');
  const [hours, setHours] = useState<OpeningHour[]>(() => hoursFrom(store));
  const [gallery, setGallery] = useState<string[]>(store?.images.map((image) => image.url) ?? []);
  const [galleryUrl, setGalleryUrl] = useState('');
  const [uploading, setUploading] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const upload = async (files: FileList | null, target: 'logo' | 'banner' | 'gallery') => {
    if (!files?.length) return;
    setUploading(target);
    setUploadError(null);
    try {
      if (target === 'gallery') {
        const { files: uploaded } = await uploadsApi.images(Array.from(files));
        setGallery((current) => [...current, ...uploaded.map((file) => file.url)]);
      } else {
        const { url } = await uploadsApi.image(files[0]);
        if (target === 'logo') setLogoUrl(url);
        else setBannerUrl(url);
      }
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : 'Upload failed');
    } finally {
      setUploading(null);
    }
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    await onSubmit({
      name: name.trim(),
      tagline: tagline.trim() || undefined,
      description: description.trim(),
      categoryId: categoryId || undefined,
      categoryName: !categoryId && newCategory.trim() ? newCategory.trim() : undefined,
      phone: phone.trim() || undefined,
      email: email.trim() || undefined,
      website: website.trim() || undefined,
      addressLine: addressLine.trim(),
      city: city.trim(),
      state: state.trim() || undefined,
      country: country.trim() || undefined,
      postalCode: postalCode.trim() || undefined,
      logoUrl: logoUrl || undefined,
      bannerUrl: bannerUrl || undefined,
      openingHours: hours,
      gallery,
    });
  };

  return (
    <form onSubmit={submit} className="space-y-6">
      {serverError && <Alert tone="error">{serverError}</Alert>}
      {uploadError && <Alert tone="error">{uploadError}</Alert>}

      <Card className="space-y-5">
        <h2 className="text-base font-semibold text-navy-900">Store identity</h2>
        <Input
          label="Store name"
          required
          value={name}
          error={fieldErrors.name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Bright Bean Coffee"
          maxLength={80}
        />
        <Input
          label="Tagline"
          value={tagline}
          error={fieldErrors.tagline}
          onChange={(event) => setTagline(event.target.value)}
          placeholder="Single-origin coffee, roasted daily"
          maxLength={140}
        />
        <Textarea
          label="Description"
          required
          value={description}
          error={fieldErrors.description}
          onChange={(event) => setDescription(event.target.value)}
          rows={5}
          placeholder="Tell customers what makes your store special, what you sell and why they should visit."
          hint="At least 20 characters."
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Select
            label="Category"
            value={categoryId}
            error={fieldErrors.categoryId}
            onChange={(event) => setCategoryId(event.target.value)}
            options={[
              { value: '', label: 'Select a category' },
              ...categories.map((category) => ({ value: category.id, label: category.name })),
            ]}
          />
          {!categoryId && (
            <Input
              label="Or create a new category"
              value={newCategory}
              error={fieldErrors.categoryName}
              onChange={(event) => setNewCategory(event.target.value)}
              placeholder="Pet supplies"
              hint="Admins can rename categories later."
            />
          )}
        </div>
      </Card>

      <Card className="space-y-5">
        <h2 className="text-base font-semibold text-navy-900">Contact & location</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Phone"
            value={phone}
            error={fieldErrors.phone}
            onChange={(event) => setPhone(event.target.value)}
            placeholder="+91 98765 43210"
          />
          <Input
            label="Email"
            type="email"
            value={email}
            error={fieldErrors.email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="hello@store.com"
          />
        </div>
        <Input
          label="Website"
          value={website}
          error={fieldErrors.website}
          onChange={(event) => setWebsite(event.target.value)}
          placeholder="https://store.com"
        />
        <Input
          label="Street address"
          required
          value={addressLine}
          error={fieldErrors.addressLine}
          onChange={(event) => setAddressLine(event.target.value)}
          placeholder="12 MG Road, 3rd floor"
        />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Input
            label="City"
            required
            value={city}
            error={fieldErrors.city}
            onChange={(event) => setCity(event.target.value)}
            placeholder="Bengaluru"
          />
          <Input
            label="State"
            value={state}
            error={fieldErrors.state}
            onChange={(event) => setState(event.target.value)}
            placeholder="Karnataka"
          />
          <Input
            label="Postal code"
            value={postalCode}
            error={fieldErrors.postalCode}
            onChange={(event) => setPostalCode(event.target.value)}
            placeholder="560001"
          />
          <Input
            label="Country"
            value={country}
            error={fieldErrors.country}
            onChange={(event) => setCountry(event.target.value)}
          />
        </div>
      </Card>

      <Card className="space-y-5">
        <h2 className="text-base font-semibold text-navy-900">Branding</h2>
        <div className="grid gap-5 sm:grid-cols-2">
          {(
            [
              { key: 'logo' as const, label: 'Logo', url: logoUrl, setUrl: setLogoUrl, className: 'h-24 w-24 rounded-xl' },
              { key: 'banner' as const, label: 'Banner', url: bannerUrl, setUrl: setBannerUrl, className: 'h-24 w-full rounded-xl' },
            ]
          ).map((item) => (
            <div key={item.key}>
              <p className="field-label">{item.label}</p>
              <div className={cn('mb-2 overflow-hidden border border-dashed border-slate-300 bg-slate-50', item.className)}>
                {item.url ? (
                  <img src={assetUrl(item.url)} alt={`${item.label} preview`} className="h-full w-full object-cover" />
                ) : (
                  <span className="flex h-full w-full items-center justify-center text-xs text-slate-400">
                    No {item.label.toLowerCase()} yet
                  </span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <label className="cursor-pointer rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-navy-800 hover:bg-slate-50">
                  {uploading === item.key ? 'Uploading...' : `Upload ${item.label.toLowerCase()}`}
                  <input
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    disabled={Boolean(uploading)}
                    onChange={(event) => upload(event.target.files, item.key)}
                  />
                </label>
                {item.url && (
                  <Button type="button" size="sm" variant="ghost" onClick={() => item.setUrl('')}>
                    Remove
                  </Button>
                )}
              </div>
              <Input
                containerClassName="mt-2"
                value={item.url}
                onChange={(event) => item.setUrl(event.target.value)}
                placeholder="...or paste an image URL"
              />
            </div>
          ))}
        </div>
      </Card>

      <Card className="space-y-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-navy-900">Gallery</h2>
            <p className="text-sm text-slate-600">Up to 12 photos. The first few show on your storefront.</p>
          </div>
          <label className="cursor-pointer rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-navy-800 hover:bg-slate-50">
            {uploading === 'gallery' ? 'Uploading...' : 'Upload photos'}
            <input
              type="file"
              accept="image/*"
              multiple
              className="sr-only"
              disabled={Boolean(uploading)}
              onChange={(event) => upload(event.target.files, 'gallery')}
            />
          </label>
        </div>

        <div className="flex gap-2">
          <Input
            containerClassName="flex-1"
            value={galleryUrl}
            onChange={(event) => setGalleryUrl(event.target.value)}
            placeholder="Paste an image URL"
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              if (!galleryUrl.trim()) return;
              setGallery((current) => [...current, galleryUrl.trim()]);
              setGalleryUrl('');
            }}
          >
            Add
          </Button>
        </div>

        {gallery.length ? (
          <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4">
            {gallery.map((url, index) => (
              <li key={`${url}-${index}`} className="group relative overflow-hidden rounded-xl border border-slate-200">
                <img src={assetUrl(url)} alt={`Gallery ${index + 1}`} className="h-24 w-full object-cover" />
                <button
                  type="button"
                  onClick={() => setGallery((current) => current.filter((_, position) => position !== index))}
                  className="absolute right-1.5 top-1.5 rounded-full bg-navy-950/70 px-2 py-0.5 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100"
                  aria-label={`Remove image ${index + 1}`}
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-slate-500">No photos added yet.</p>
        )}
      </Card>

      <Card className="space-y-4">
        <h2 className="text-base font-semibold text-navy-900">Opening hours</h2>
        <div className="space-y-3">
          {hours.map((entry, index) => (
            <div key={entry.day} className="flex flex-wrap items-center gap-3">
              <span className="w-24 text-sm font-medium text-navy-800">{entry.day.slice(0, 3)}</span>
              <label className="flex items-center gap-2 text-sm text-slate-600">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-slate-300"
                  checked={!entry.closed}
                  onChange={(event) =>
                    setHours((current) =>
                      current.map((item, position) =>
                        position === index ? { ...item, closed: !event.target.checked } : item,
                      ),
                    )
                  }
                />
                Open
              </label>
              {!entry.closed && (
                <>
                  <input
                    type="time"
                    value={entry.open ?? '09:00'}
                    onChange={(event) =>
                      setHours((current) =>
                        current.map((item, position) =>
                          position === index ? { ...item, open: event.target.value } : item,
                        ),
                      )
                    }
                    className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm"
                  />
                  <span className="text-slate-400">to</span>
                  <input
                    type="time"
                    value={entry.close ?? '18:00'}
                    onChange={(event) =>
                      setHours((current) =>
                        current.map((item, position) =>
                          position === index ? { ...item, close: event.target.value } : item,
                        ),
                      )
                    }
                    className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm"
                  />
                </>
              )}
              {entry.closed && <span className="text-sm text-slate-400">Closed all day</span>}
            </div>
          ))}
        </div>
        <p className="text-xs text-slate-500">
          Hours are shown on your public storefront exactly as entered here.
        </p>
      </Card>

      <div className="flex flex-wrap gap-3">
        <Button type="submit" size="lg" loading={busy}>
          {submitLabel}
        </Button>
        {onCancel && (
          <Button type="button" variant="outline" size="lg" onClick={onCancel} disabled={busy}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}

export default StoreForm;
