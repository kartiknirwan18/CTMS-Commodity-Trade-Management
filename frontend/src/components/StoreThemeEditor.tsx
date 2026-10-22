import { useState } from 'react';
import { assetUrl } from '../lib/api';
import { LAYOUT_OPTIONS, REVIEW_DISPLAY_OPTIONS, THEME_PRESETS } from '../lib/endpoints';
import { Alert, Button, Card, Field, Select, Toggle, cn } from './ui';
import { StoreBanner, StoreLogo } from './StoreCard';
import { StarRating } from './StarRating';
import type { StoreDetail, StoreTheme } from '../types';

const FONT_OPTIONS = [
  { value: 'Inter', label: 'Inter (platform default)' },
  { value: 'Georgia, serif', label: 'Georgia (classic serif)' },
  { value: "'Trebuchet MS', sans-serif", label: 'Trebuchet (friendly sans)' },
  { value: 'system-ui, sans-serif', label: 'System UI' },
];

type ColorKey = 'primaryColor' | 'accentColor' | 'backgroundColor' | 'surfaceColor' | 'textColor';

const COLOR_FIELDS: { key: ColorKey; label: string; hint: string }[] = [
  { key: 'primaryColor', label: 'Primary', hint: 'Links and accents inside your storefront' },
  { key: 'accentColor', label: 'Accent', hint: 'Category pills and highlights' },
  { key: 'backgroundColor', label: 'Background', hint: 'Behind your storefront content' },
  { key: 'surfaceColor', label: 'Surface', hint: 'Cards and information panels' },
  { key: 'textColor', label: 'Text', hint: 'Main body text colour' },
];

const FALLBACK_THEME: StoreTheme = {
  primaryColor: '#0891b2',
  accentColor: '#22d3ee',
  backgroundColor: '#f8fafc',
  surfaceColor: '#ffffff',
  textColor: '#0f172a',
  fontFamily: 'Inter',
  layout: 'GRID',
  reviewDisplay: 'CARDS',
  roundedCorners: true,
  showBanner: true,
};

function StorefrontPreview({ store, theme }: { store: StoreDetail; theme: StoreTheme }) {
  const radius = theme.roundedCorners ? '1rem' : '0.25rem';
  return (
    <div
      className="overflow-hidden border border-slate-200 shadow-card"
      style={{
        backgroundColor: theme.backgroundColor,
        color: theme.textColor,
        fontFamily: theme.fontFamily,
        borderRadius: radius,
      }}
    >
      {theme.showBanner ? (
        <div className="h-24 overflow-hidden" style={{ borderRadius: 0 }}>
          <StoreBanner name={store.name} bannerUrl={store.bannerUrl} />
        </div>
      ) : (
        <div className="h-3" style={{ backgroundColor: theme.primaryColor }} />
      )}

      <div className={cn('px-4 pb-5', theme.showBanner && '-mt-8')}>
        <div
          className="inline-block p-1"
          style={{ backgroundColor: theme.surfaceColor, borderRadius: radius }}
        >
          <StoreLogo name={store.name} logoUrl={store.logoUrl} size={56} rounded="" className="rounded-lg" />
        </div>
        <h3 className="mt-2 truncate text-lg font-bold">{store.name}</h3>
        {store.tagline && <p className="truncate text-xs opacity-70">{store.tagline}</p>}
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
          <span
            className="rounded-full px-2.5 py-1 font-medium"
            style={{ backgroundColor: theme.accentColor, color: '#0b1220' }}
          >
            {store.category?.name ?? 'Category'}
          </span>
          <StarRating value={store.avgRating} size="sm" />
          <span className="opacity-70">{store.reviewCount} reviews</span>
        </div>
        <div className="mt-4 grid gap-2" style={{ gridTemplateColumns: theme.layout === 'LIST' ? '1fr' : '1fr 1fr' }}>
          {[0, 1].map((index) => (
            <div
              key={index}
              className="p-3 text-xs"
              style={{ backgroundColor: theme.surfaceColor, borderRadius: radius }}
            >
              <p className="font-semibold">Info panel {index + 1}</p>
              <p className="mt-1 opacity-70">Opening hours, address and contact details render here.</p>
            </div>
          ))}
        </div>
        <div
          className="mt-3 p-3 text-xs"
          style={{ backgroundColor: theme.surfaceColor, borderRadius: radius }}
        >
          <p style={{ color: theme.primaryColor }} className="font-semibold">
            {theme.layout === 'MAGAZINE' ? 'Large hero imagery layout' : theme.layout === 'LIST' ? 'Wide row layout' : 'Even grid layout'}
          </p>
          <p className="mt-1 opacity-70">
            Reviews display as {theme.reviewDisplay === 'COMPACT' ? 'a compact list' : 'cards'}.
          </p>
        </div>
      </div>
    </div>
  );
}

export function StoreThemeEditor({
  store,
  theme,
  busy,
  error,
  onSave,
}: {
  store: StoreDetail;
  theme: StoreTheme;
  busy: boolean;
  error?: string | null;
  onSave: (updates: Partial<StoreTheme>) => Promise<void>;
}) {
  const [draft, setDraft] = useState<StoreTheme>({ ...FALLBACK_THEME, ...theme });
  const [saved, setSaved] = useState(false);

  const update = <K extends keyof StoreTheme>(key: K, value: StoreTheme[K]) => {
    setDraft((current) => ({ ...current, [key]: value }));
    setSaved(false);
  };

  const applyPreset = (preset: (typeof THEME_PRESETS)[number]) => {
    setDraft((current) => ({
      ...current,
      primaryColor: preset.primaryColor,
      accentColor: preset.accentColor,
      backgroundColor: preset.backgroundColor,
      surfaceColor: preset.surfaceColor,
      textColor: preset.textColor,
    }));
    setSaved(false);
  };

  const save = async () => {
    await onSave({
      primaryColor: draft.primaryColor,
      accentColor: draft.accentColor,
      backgroundColor: draft.backgroundColor,
      surfaceColor: draft.surfaceColor,
      textColor: draft.textColor,
      fontFamily: draft.fontFamily,
      layout: draft.layout,
      reviewDisplay: draft.reviewDisplay,
      roundedCorners: draft.roundedCorners,
      showBanner: draft.showBanner,
    });
    setSaved(true);
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-5">
        {error && <Alert tone="error">{error}</Alert>}
        {saved && <Alert tone="success">Theme saved. Your public storefront now uses these settings.</Alert>}

        <Card className="space-y-5">
          <div>
            <h2 className="text-base font-semibold text-navy-900">Presets</h2>
            <p className="text-sm text-slate-600">Start from a preset, then fine-tune the colours.</p>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {THEME_PRESETS.map((preset) => (
              <button
                key={preset.name}
                type="button"
                onClick={() => applyPreset(preset)}
                className="rounded-xl border border-slate-200 p-2.5 text-left transition-colors hover:border-accent-400"
              >
                <span className="flex gap-1">
                  {[preset.primaryColor, preset.accentColor, preset.backgroundColor].map((color) => (
                    <span
                      key={color}
                      className="h-4 w-4 rounded-full ring-1 ring-inset ring-black/10"
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </span>
                <span className="mt-2 block text-xs font-medium text-navy-800">{preset.name}</span>
              </button>
            ))}
          </div>
        </Card>

        <Card className="space-y-4">
          <h2 className="text-base font-semibold text-navy-900">Colours</h2>
          {COLOR_FIELDS.map((field) => (
            <div key={String(field.key)} className="flex items-center gap-4">
              <input
                type="color"
                aria-label={field.label}
                value={draft[field.key]}
                onChange={(event) => update(field.key, event.target.value)}
                className="h-10 w-14 cursor-pointer rounded-lg border border-slate-300 bg-white p-1"
              />
              <div className="flex-1">
                <p className="text-sm font-medium text-navy-800">{field.label}</p>
                <p className="text-xs text-slate-500">{field.hint}</p>
              </div>
              <input
                value={draft[field.key]}
                onChange={(event) => update(field.key, event.target.value)}
                className="w-28 rounded-lg border border-slate-300 px-2 py-1.5 text-xs font-mono"
                maxLength={7}
              />
            </div>
          ))}
        </Card>

        <Card className="space-y-4">
          <h2 className="text-base font-semibold text-navy-900">Layout & typography</h2>
          <Select
            label="Font family"
            value={draft.fontFamily}
            onChange={(event) => update('fontFamily', event.target.value)}
            options={FONT_OPTIONS}
          />
          <Field label="Layout template" hint={LAYOUT_OPTIONS.find((option) => option.value === draft.layout)?.description}>
            <div className="grid gap-2 sm:grid-cols-3">
              {LAYOUT_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => update('layout', option.value)}
                  className={cn(
                    'rounded-xl border px-3 py-2 text-sm font-medium transition-colors',
                    draft.layout === option.value
                      ? 'border-accent-500 bg-accent-50 text-navy-900'
                      : 'border-slate-300 bg-white text-slate-600 hover:border-slate-400',
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </Field>
          <Select
            label="Review display style"
            value={draft.reviewDisplay}
            onChange={(event) => update('reviewDisplay', event.target.value as StoreTheme['reviewDisplay'])}
            options={REVIEW_DISPLAY_OPTIONS.map((option) => ({ value: option.value, label: option.label }))}
          />
          <Toggle
            label="Rounded corners"
            description="Softer cards and image frames."
            checked={draft.roundedCorners}
            onChange={(value) => update('roundedCorners', value)}
          />
          <Toggle
            label="Show banner"
            description="Hide the banner if you prefer a text-first storefront."
            checked={draft.showBanner}
            onChange={(value) => update('showBanner', value)}
          />
        </Card>

        <div className="flex flex-wrap gap-3">
          <Button size="lg" onClick={save} loading={busy}>
            Save theme
          </Button>
          <Button
            size="lg"
            variant="outline"
            onClick={() => {
              setDraft({ ...FALLBACK_THEME, ...theme });
              setSaved(false);
            }}
          >
            Reset changes
          </Button>
        </div>
      </div>

      <div className="lg:sticky lg:top-24 lg:self-start">
        <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Live preview</p>
        <StorefrontPreview store={store} theme={draft} />
        <p className="mt-3 text-xs text-slate-500">
          This preview uses your saved store content. Platform pages keep the standard MultiStore branding.
        </p>
      </div>
    </div>
  );
}

export default StoreThemeEditor;
