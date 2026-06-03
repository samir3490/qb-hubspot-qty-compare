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
  const { user, config, configLoading } = useAuth();
  const searchParams = useSearchParams();
  const [result, setResult] = useState<CompareResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [filter, setFilter] = useState<Filter>('mismatch');

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
    if (!config.quickbase.userToken || !config.hubspot.accessToken) {
      setError('Configure API keys in Settings first.');
      return;
    }
    if (!config.quickbase.qtyFieldId) {
      setError('Set QuickBase Quantity field ID in Settings.');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch('/api/compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Compare failed');
      const compareResult = data as CompareResult;
      setResult(compareResult);
      setFilter('mismatch');
      if (user) {
        await saveCompareRunToFirestore(user.uid, compareResult);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Compare failed');
    } finally {
      setLoading(false);
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
      <h1 style={{ marginTop: 0 }}>Quantity compare</h1>
      <p style={{ color: 'var(--muted)', maxWidth: 720 }}>
        Pull all comparable items from QuickBase and HubSpot in a few API
        calls, then diff by SKU. QuickBase is the source of truth for quantity
        values shown here.
      </p>

      <div className="actions">
        <button
          type="button"
          className="btn btn-primary"
          onClick={runCompare}
          disabled={loading || configLoading}
        >
          {loading ? 'Running compare…' : 'Run compare now'}
        </button>
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
          Firebase), then run a compare. Typical usage: ~1–5 QuickBase calls + ~4
          HubSpot calls for ~300 products.
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
