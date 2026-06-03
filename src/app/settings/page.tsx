'use client';

import { useEffect, useState } from 'react';
import {
  DEFAULT_CONFIG,
  loadConfig,
  saveConfig,
  maskToken,
} from '@/lib/storage';
import type { ConnectionConfig } from '@/lib/types';
import { EXCLUDED_PRODUCT_FAMILIES } from '@/lib/types';

export default function SettingsPage() {
  const [config, setConfig] = useState<ConnectionConfig>(DEFAULT_CONFIG);
  const [qbTest, setQbTest] = useState<string | null>(null);
  const [hsTest, setHsTest] = useState<string | null>(null);
  const [testing, setTesting] = useState<'qb' | 'hs' | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setConfig(loadConfig());
  }, []);

  function updateQb<K extends keyof ConnectionConfig['quickbase']>(
    key: K,
    value: ConnectionConfig['quickbase'][K]
  ) {
    setConfig((c) => ({
      ...c,
      quickbase: { ...c.quickbase, [key]: value },
    }));
    setSaved(false);
  }

  function updateHs<K extends keyof ConnectionConfig['hubspot']>(
    key: K,
    value: ConnectionConfig['hubspot'][K]
  ) {
    setConfig((c) => ({
      ...c,
      hubspot: { ...c.hubspot, [key]: value },
    }));
    setSaved(false);
  }

  function handleSave() {
    saveConfig(config);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
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
        API keys are stored in your browser (localStorage) and sent to this
        app&apos;s server only when you run a compare or test. For scheduled
        daily runs on Vercel, set environment variables instead (see README).
      </p>

      {saved && (
        <div className="alert alert-success">Settings saved locally.</div>
      )}

      <div className="card">
        <h2>QuickBase</h2>
        <div className="form-row">
          <div>
            <label>Realm hostname</label>
            <input
              value={config.quickbase.realmHostname}
              onChange={(e) => updateQb('realmHostname', e.target.value)}
              placeholder="yourcompany.quickbase.com"
            />
          </div>
          <div>
            <label>User token</label>
            <input
              type="password"
              value={config.quickbase.userToken}
              onChange={(e) => updateQb('userToken', e.target.value)}
              placeholder="QB-USER-TOKEN"
              autoComplete="off"
            />
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

      <div className="actions">
        <button type="button" className="btn btn-primary" onClick={handleSave}>
          Save settings
        </button>
      </div>
    </main>
  );
}
