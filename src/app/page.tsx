'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { saveCompareRunToFirestore, loadCompareRun } from '@/lib/firebase/firestore';
import type { CompareResult, CompareRow, CompareStatus } from '@/lib/types';

type Filter = 'all' | CompareStatus;

export default function HomePage() {
  return (
    <Suspense fallback={<div className="container loading">Loading…</div>}>
      <ComparePage />
    </Suspense>
  );
}

function ComparePage() {
  const { user, config, configLoading, refreshConfig } = useAuth();
  const searchParams = useSearchParams();
  const [result, setResult] = useState<CompareResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [filter, setFilter] = useState<Filter>('mismatch');
  const [emailNotice, setEmailNotice] = useState<string | null>(null);
  const [syncNotice, setSyncNotice] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    const runId = searchParams.get('run');
    if (!runId || !user) return;
    loadCompareRun(user.uid, runId)
      .then((stored) => {
        if (stored) {
          setResult({
            summary: stored.summary,
            rows: stored.rows,
            excluded: [],
          });
          setFilter('mismatch');
        }
      })
      .catch(() => {});
  }, [searchParams, user]);

  async function runCompare() {
    const activeConfig = user ? await refreshConfig() : config;

    if (!activeConfig.quickbase.userToken || !activeConfig.hubspot.accessToken) {
      setError(
        'Configure and save API keys in Settings first (Save settings to cloud).'
      );
      return;
    }
    if (!activeConfig.quickbase.qtyFieldId) {
      setError('Set QuickBase Quantity field ID in Settings and save.');
      return;
    }

    setLoading(true);
    setError(null);
    setEmailNotice(null);
    setSyncNotice(null);
    setResult(null);

    try {
      const res = await fetch('/api/compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config: activeConfig }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Compare failed');
      const compareResult = data as CompareResult & {
        emailSent?: boolean;
        emailError?: string | null;
      };
      setResult(compareResult);
      setFilter('mismatch');
      if (compareResult.summary.mismatches > 0) {
        if (compareResult.emailSent) {
          setEmailNotice(
            `Alert email sent (${compareResult.summary.mismatches} mismatches). Check samir3490@gmail.com (and spam).`
          );
        } else if (compareResult.emailError) {
          setEmailNotice(`Email not sent: ${compareResult.emailError}`);
        }
      }
      if (user) {
        await saveCompareRunToFirestore(user.uid, compareResult);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Compare failed');
    } finally {
      setLoading(false);
    }
  }

  async function syncHubspotFromQuickbase() {
    if (!result || result.summary.mismatches === 0) return;

    const activeConfig = user ? await refreshConfig() : config;
    const mismatches = result.rows.filter((r) => r.status === 'mismatch');
    const count = mismatches.filter(
      (r) => r.qbQty !== null && Number.isFinite(r.qbQty)
    ).length;

    if (count === 0) {
      setSyncNotice('No mismatches with a QuickBase quantity to sync.');
      return;
    }

    const ok = window.confirm(
      `Update HubSpot quantity for ${count} product(s) using QuickBase as source of truth? This writes to HubSpot (crm.objects.products.write scope required).`
    );
    if (!ok) return;

    setSyncing(true);
    setSyncNotice(null);
    setError(null);

    try {
      const res = await fetch('/api/sync/hubspot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          config: activeConfig,
          mismatches,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Sync failed');

      if (data.failed?.length) {
        setSyncNotice(
          `Updated ${data.updated} product(s). ${data.failed.length} failed — check HubSpot write scope and SKUs.`
        );
      } else {
        setSyncNotice(
          `HubSpot updated: ${data.updated} product(s) set to QuickBase quantities.`
        );
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'HubSpot sync failed');
    } finally {
      setSyncing(false);
    }
  }

  async function downloadExcel() {
    if (!result) return;
    setExporting(true);
    try {
      const res = await fetch('/api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(result),
      });
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `qty-compare-${new Date().toISOString().slice(0, 10)}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Export failed');
    } finally {
      setExporting(false);
    }
  }

  const filteredRows = useMemo(() => {
    if (!result) return [];
    if (filter === 'all') return result.rows;
    return result.rows.filter((r) => r.status === filter);
  }, [result, filter]);

  const counts = useMemo(() => {
    if (!result) return null;
    return {
      mismatch: result.rows.filter((r) => r.status === 'mismatch').length,
      match: result.rows.filter((r) => r.status === 'match').length,
      qb_only: result.rows.filter((r) => r.status === 'qb_only').length,
      hs_only: result.rows.filter((r) => r.status === 'hs_only').length,
      all: result.rows.length,
    };
  }, [result]);

  return (
    <main className="container">
      <header className="page-header">
        <h1>Quantity compare</h1>
        <p>
          Pull all comparable items from QuickBase and HubSpot in a few API
          calls, then diff by SKU. QuickBase is the source of truth for quantity
          values shown here.
        </p>
      </header>

      <div className="actions">
        <button
          type="button"
          className="btn btn-primary"
          onClick={runCompare}
          disabled={loading || configLoading}
        >
          {loading ? 'Running compare…' : 'Run compare now'}
        </button>
        {result && result.summary.mismatches > 0 && (
          <button
            type="button"
            className="btn btn-secondary"
            onClick={syncHubspotFromQuickbase}
            disabled={syncing || loading}
          >
            {syncing ? 'Updating HubSpot…' : 'Update HubSpot from QuickBase'}
          </button>
        )}
        {result && (
          <button
            type="button"
            className="btn btn-secondary"
            onClick={downloadExcel}
            disabled={exporting}
          >
            {exporting ? 'Exporting…' : 'Download Excel report'}
          </button>
        )}
        <Link href="/settings" className="btn btn-secondary">
          Settings
        </Link>
        <Link href="/history" className="btn btn-secondary">
          History
        </Link>
      </div>

      {syncNotice && (
        <div
          className={`alert ${syncNotice.includes('failed') ? 'alert-error' : 'alert-success'}`}
        >
          {syncNotice}
        </div>
      )}

      {emailNotice && (
        <div
          className={`alert ${emailNotice.startsWith('Email not sent') ? 'alert-error' : 'alert-success'}`}
        >
          {emailNotice}
        </div>
      )}

      {error && <div className="alert alert-error">{error}</div>}

      {loading && (
        <div className="card loading">
          Fetching QuickBase + HubSpot data (batched, low API usage)…
        </div>
      )}

      {result && (
        <>
          <div className="card">
            <h2>Summary — {new Date(result.summary.runAt).toLocaleString()}</h2>
            <div className="grid-stats">
              <div className="stat mismatch">
                <div className="label">Mismatches</div>
                <div className="value">{result.summary.mismatches}</div>
              </div>
              <div className="stat match">
                <div className="label">Matches</div>
                <div className="value">{result.summary.matches}</div>
              </div>
              <div className="stat">
                <div className="label">QB compared</div>
                <div className="value">{result.summary.qbCompared}</div>
              </div>
              <div className="stat">
                <div className="label">HubSpot products</div>
                <div className="value">{result.summary.hsTotal}</div>
              </div>
              <div className="stat">
                <div className="label">QB API calls</div>
                <div className="value">
                  {result.summary.apiCallsEstimate.quickbase}
                </div>
              </div>
              <div className="stat">
                <div className="label">HubSpot API calls</div>
                <div className="value">
                  {result.summary.apiCallsEstimate.hubspot}
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <h2>Results</h2>
            {counts && (
              <div className="filter-tabs">
                {(
                  [
                    ['mismatch', 'Mismatches'],
                    ['match', 'Matches'],
                    ['qb_only', 'QB only'],
                    ['hs_only', 'HubSpot only'],
                    ['all', 'All'],
                  ] as const
                ).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    className={filter === key ? 'active' : ''}
                    onClick={() => setFilter(key)}
                  >
                    {label} ({counts[key]})
                  </button>
                ))}
              </div>
            )}
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Status</th>
                    <th>SKU</th>
                    <th>Product family</th>
                    <th>QB qty</th>
                    <th>HS qty</th>
                    <th>Diff</th>
                    <th>Item name</th>
                    <th>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.length === 0 ? (
                    <tr>
                      <td colSpan={8} style={{ color: 'var(--muted)' }}>
                        No rows for this filter.
                      </td>
                    </tr>
                  ) : (
                    filteredRows.map((row) => (
                      <CompareTableRow key={`${row.status}-${row.sku}`} row={row} />
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {!result && !loading && !error && (
        <div className="alert alert-info">
          Save connections in <Link href="/settings">Settings</Link> (stored in
          Firebase), then run a compare. If mismatches are found, an alert email
          is sent automatically.
        </div>
      )}
    </main>
  );
}

function CompareTableRow({ row }: { row: CompareRow }) {
  return (
    <tr>
      <td>
        <span className={`badge badge-${row.status}`}>{row.status}</span>
      </td>
      <td>
        <code>{row.sku}</code>
      </td>
      <td>{row.productFamily}</td>
      <td>{row.qbQty ?? '—'}</td>
      <td>{row.hsQty ?? '—'}</td>
      <td>
        {row.difference !== null ? (
          <span
            style={{
              color: row.difference !== 0 ? 'var(--danger)' : 'var(--success)',
            }}
          >
            {row.difference > 0 ? '+' : ''}
            {row.difference}
          </span>
        ) : (
          '—'
        )}
      </td>
      <td>{row.itemName || row.hsName}</td>
      <td style={{ color: 'var(--muted)', maxWidth: 200 }}>{row.notes}</td>
    </tr>
  );
}
