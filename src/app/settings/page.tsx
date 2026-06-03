'use client';

import { useEffect, useMemo, useState } from 'react';
import { DEFAULT_CONFIG, maskToken } from '@/lib/storage';
import type { ConnectionConfig } from '@/lib/types';
import { EXCLUDED_PRODUCT_FAMILIES } from '@/lib/types';
import {
  HUBSPOT_REQUIRED_SCOPES,
  HUBSPOT_SYNC_SCOPES,
  HUBSPOT_OPTIONAL_SCOPES,
} from '@/lib/hubspot-scopes';
import { useAuth } from '@/contexts/AuthContext';

function configsEqual(a: ConnectionConfig, b: ConnectionConfig): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

export default function SettingsPage() {
  const {
    user,
    config: savedConfig,
    configLoading,
    lastSavedAt,
    saveConfig: persistConfig,
  } = useAuth();
  const [config, setConfig] = useState<ConnectionConfig>(DEFAULT_CONFIG);
  const [qbTest, setQbTest] = useState<string | null>(null);
  const [hsTest, setHsTest] = useState<string | null>(null);
  const [testing, setTesting] = useState<'qb' | 'hs' | null>(null);
  const [saveStatus, setSaveStatus] = useState<
    'idle' | 'saving' | 'saved' | 'error'
  >('idle');
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedAtLabel, setSavedAtLabel] = useState<string | null>(null);

  const isDirty = useMemo(
    () => !configsEqual(config, savedConfig),
    [config, savedConfig]
  );

  useEffect(() => {
    if (!configLoading) setConfig(savedConfig);
  }, [savedConfig, configLoading]);

  useEffect(() => {
    if (lastSavedAt) {
      setSavedAtLabel(lastSavedAt.toLocaleString());
    }
  }, [lastSavedAt]);

  function updateQb<K extends keyof ConnectionConfig['quickbase']>(
    key: K,
    value: ConnectionConfig['quickbase'][K]
  ) {
    setConfig((c) => ({
      ...c,
      quickbase: { ...c.quickbase, [key]: value },
    }));
    setSaveStatus('idle');
  }

  function updateHs<K extends keyof ConnectionConfig['hubspot']>(
    key: K,
    value: ConnectionConfig['hubspot'][K]
  ) {
    setConfig((c) => ({
      ...c,
      hubspot: { ...c.hubspot, [key]: value },
    }));
    setSaveStatus('idle');
  }

  function updatePref<K extends keyof NonNullable<ConnectionConfig['preferences']>>(
    key: K,
    value: NonNullable<ConnectionConfig['preferences']>[K]
  ) {
    setConfig((c) => ({
      ...c,
      preferences: { ...DEFAULT_CONFIG.preferences, ...c.preferences, [key]: value },
    }));
    setSaveStatus('idle');
  }

  async function handleSave() {
    if (!user) {
      setSaveError('Sign in to save settings to the cloud.');
      setSaveStatus('error');
      return;
    }
    setSaveError(null);
    setSaveStatus('saving');
    try {
      const savedAt = await persistConfig(config);
      setSavedAtLabel(savedAt.toLocaleString());
      setSaveStatus('saved');
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Save failed');
      setSaveStatus('error');
    }
  }

  async function testQuickbase() {
    setTesting('qb');
    setQbTest(null);
    try {
      const res = await fetch('/api/test/quickbase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config: config.quickbase }),
      });
      const data = await res.json();
      setQbTest(data.message);
    } catch (e) {
      setQbTest(e instanceof Error ? e.message : 'Request failed');
    } finally {
      setTesting(null);
    }
  }

  async function testHubspot() {
    setTesting('hs');
    setHsTest(null);
    try {
      const res = await fetch('/api/test/hubspot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config: config.hubspot }),
      });
      const data = await res.json();
      setHsTest(data.message);
    } catch (e) {
      setHsTest(e instanceof Error ? e.message : 'Request failed');
    } finally {
      setTesting(null);
    }
  }

  return (
    <main className="container">
      <h1 style={{ marginTop: 0 }}>Connection settings</h1>
      <p style={{ color: 'var(--muted)', maxWidth: 640 }}>
        Settings are saved to <strong>Firebase</strong> under your account (
        {user?.email}). Sign in with the <strong>same email</strong> on phone,
        laptop, or any device to load your API keys. Click{' '}
        <strong>Save settings</strong> after changes — connection tests do not
        save automatically.
      </p>

      {configLoading && (
        <div className="alert alert-info">Loading settings from Firebase…</div>
      )}

      {saveStatus === 'saved' && (
        <div className="alert alert-success toast-persist">
          Settings saved to the cloud. Available on all devices when signed in
          as {user?.email}.
          {savedAtLabel && (
            <>
              {' '}
              Last saved: {savedAtLabel}
            </>
          )}
        </div>
      )}

      {saveStatus === 'saving' && (
        <div className="alert alert-info">Saving to Firebase…</div>
      )}

      {isDirty && saveStatus !== 'saved' && (
        <div className="alert alert-info">
          You have unsaved changes. Save before running a compare on another
          page.
        </div>
      )}

      {saveError && <div className="alert alert-error">{saveError}</div>}

      {savedAtLabel && saveStatus !== 'saved' && !isDirty && (
        <div className="alert alert-info">
          Last saved to cloud: {savedAtLabel}
        </div>
      )}

      <div className="card">
        <h2>QuickBase</h2>
        <div className="form-row">
          <div>
            <label>Realm hostname</label>
            <input
              value={config.quickbase.realmHostname}
              onChange={(e) => updateQb('realmHostname', e.target.value)}
              placeholder="isee.quickbase.com"
            />
            <p className="hint">
              Required API header. Use only the realm host (not api.quickbase.com).
            </p>
          </div>
          <div>
            <label>User token</label>
            <input
              type="password"
              value={config.quickbase.userToken}
              onChange={(e) => updateQb('userToken', e.target.value)}
              placeholder="Paste token only (prefix added automatically)"
              autoComplete="off"
            />
            <p className="hint">
              Paste the token value only, or the full{' '}
              <code>QB-USER-TOKEN …</code> string from QuickBase.
            </p>
            {config.quickbase.userToken && (
              <p className="hint">Saved: {maskToken(config.quickbase.userToken)}</p>
            )}
          </div>
        </div>
        <div className="form-row">
          <div>
            <label>Items table ID</label>
            <input
              value={config.quickbase.tableId}
              onChange={(e) => updateQb('tableId', e.target.value)}
              placeholder="bkma4n8tr"
            />
          </div>
          <div>
            <label>SKU field ID</label>
            <input
              type="number"
              value={config.quickbase.skuFieldId || ''}
              onChange={(e) =>
                updateQb('skuFieldId', parseInt(e.target.value, 10) || 0)
              }
            />
          </div>
        </div>
        <div className="form-row">
          <div>
            <label>Quantity field ID (summary field)</label>
            <input
              type="number"
              value={config.quickbase.qtyFieldId || ''}
              onChange={(e) =>
                updateQb('qtyFieldId', parseInt(e.target.value, 10) || 0)
              }
            />
            <p className="hint">
              Find in table settings → field list (FID). Required for compare.
            </p>
          </div>
          <div>
            <label>Product Family field ID</label>
            <input
              type="number"
              value={config.quickbase.productFamilyFieldId || ''}
              onChange={(e) =>
                updateQb(
                  'productFamilyFieldId',
                  parseInt(e.target.value, 10) || 0
                )
              }
            />
          </div>
        </div>
        <div className="form-row">
          <div>
            <label>Item Name field ID (optional)</label>
            <input
              type="number"
              value={config.quickbase.itemNameFieldId || ''}
              onChange={(e) =>
                updateQb(
                  'itemNameFieldId',
                  parseInt(e.target.value, 10) || undefined
                )
              }
            />
          </div>
          <div>
            <label>Record ID# field ID (optional)</label>
            <input
              type="number"
              value={config.quickbase.recordIdFieldId || ''}
              onChange={(e) =>
                updateQb(
                  'recordIdFieldId',
                  parseInt(e.target.value, 10) || undefined
                )
              }
            />
          </div>
        </div>
        <div className="actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={testQuickbase}
            disabled={testing === 'qb'}
          >
            {testing === 'qb' ? 'Testing…' : 'Test QuickBase'}
          </button>
        </div>
        {qbTest && (
          <div
            className={`alert ${qbTest.includes('Connected') ? 'alert-success' : 'alert-error'}`}
          >
            {qbTest}
          </div>
        )}
      </div>

      <div className="card">
        <h2>HubSpot</h2>
        <label>Private app access token</label>
        <input
          type="password"
          value={config.hubspot.accessToken}
          onChange={(e) => updateHs('accessToken', e.target.value)}
          placeholder="pat-..."
          autoComplete="off"
        />
        <div className="form-row">
          <div>
            <label>Object type</label>
            <input
              value={config.hubspot.objectType}
              onChange={(e) => updateHs('objectType', e.target.value)}
              placeholder="products"
            />
          </div>
          <div>
            <label>SKU property (internal name)</label>
            <input
              value={config.hubspot.skuProperty}
              onChange={(e) => updateHs('skuProperty', e.target.value)}
            />
          </div>
        </div>
        <div className="form-row">
          <div>
            <label>Quantity property</label>
            <input
              value={config.hubspot.qtyProperty}
              onChange={(e) => updateHs('qtyProperty', e.target.value)}
              placeholder="qty_available"
            />
          </div>
          <div>
            <label>Product family property</label>
            <input
              value={config.hubspot.productFamilyProperty}
              onChange={(e) =>
                updateHs('productFamilyProperty', e.target.value)
              }
            />
          </div>
        </div>
        <div className="actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={testHubspot}
            disabled={testing === 'hs'}
          >
            {testing === 'hs' ? 'Testing…' : 'Test HubSpot'}
          </button>
        </div>
        {hsTest && (
          <div
            className={`alert ${hsTest.includes('Connected') ? 'alert-success' : 'alert-error'}`}
          >
            {hsTest}
          </div>
        )}

        <div className="section-title">Required HubSpot Private App scopes</div>
        <p style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>
          HubSpot → Settings → Integrations → Private Apps → your app →{' '}
          <strong>Scopes</strong>. After adding scopes,{' '}
          <strong>regenerate the access token</strong> and paste it here.
        </p>
        <ul style={{ fontSize: '0.9rem', color: 'var(--muted)' }}>
          {HUBSPOT_REQUIRED_SCOPES.map((s) => (
            <li key={s.scope}>
              <code>{s.scope}</code> — {s.why}
            </li>
          ))}
        </ul>
        <div className="section-title">For HubSpot quantity sync</div>
        <ul style={{ fontSize: '0.9rem', color: 'var(--muted)' }}>
          {HUBSPOT_SYNC_SCOPES.map((s) => (
            <li key={s.scope}>
              <code>{s.scope}</code> — {s.why}
            </li>
          ))}
        </ul>
        <p style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>
          Optional:{' '}
          {HUBSPOT_OPTIONAL_SCOPES.map((s) => s.scope).join(', ')} if not
          using standard Products object.
        </p>
      </div>

      <div className="card">
        <h2>Sync preferences</h2>
        <p style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>
          QuickBase is always the source of truth. Use manual sync on the compare
          page, or enable automatic sync after the daily job finds mismatches.
        </p>
        <label className="checkbox-row">
          <input
            type="checkbox"
            checked={config.preferences?.autoSyncHubSpotOnDaily === true}
            onChange={(e) =>
              updatePref('autoSyncHubSpotOnDaily', e.target.checked)
            }
          />
          Auto-update HubSpot quantities on daily compare (when mismatches exist)
        </label>
        <p className="hint">
          Daily job runs at 6:00 AM US Central (12:00 UTC). Requires{' '}
          <code>crm.objects.products.write</code> on your HubSpot Private App.
        </p>
      </div>

      <div className="card">
        <h2>Excluded Product Families</h2>
        <p style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>
          Items with these families are skipped (not compared):
        </p>
        <ul style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>
          {EXCLUDED_PRODUCT_FAMILIES.map((f) => (
            <li key={f}>{f}</li>
          ))}
        </ul>
      </div>

      <div className="actions sticky-save">
        <button
          type="button"
          className="btn btn-primary"
          onClick={handleSave}
          disabled={saveStatus === 'saving' || !isDirty}
        >
          {saveStatus === 'saving' ? 'Saving…' : 'Save settings to cloud'}
        </button>
        {isDirty && (
          <span style={{ color: 'var(--warning)', fontSize: '0.9rem' }}>
            Unsaved changes
          </span>
        )}
      </div>
    </main>
  );
}
