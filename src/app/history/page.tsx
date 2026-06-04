'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import {
  loadCompareHistory,
  type StoredCompareRun,
} from '@/lib/firebase/firestore';

export default function HistoryPage() {
  const { user } = useAuth();
  const [runs, setRuns] = useState<StoredCompareRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    loadCompareHistory(user.uid)
      .then(setRuns)
      .catch((e) =>
        setError(e instanceof Error ? e.message : 'Failed to load history')
      )
      .finally(() => setLoading(false));
  }, [user]);

  return (
    <main className="container">
      <header className="page-header">
        <h1>Compare history</h1>
        <p>Past compare runs saved to your Firebase account.</p>
      </header>

      {loading && <div className="loading">Loading history…</div>}
      {error && <div className="alert alert-error">{error}</div>}

      {!loading && runs.length === 0 && (
        <div className="alert alert-info">No saved runs yet.</div>
      )}

      <div className="card">
        <table>
          <thead>
            <tr>
              <th>Run date</th>
              <th>Mismatches</th>
              <th>Matches</th>
              <th>QB compared</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {runs.map((run) => (
              <tr key={run.id}>
                <td>{new Date(run.runAt).toLocaleString()}</td>
                <td>{run.summary.mismatches}</td>
                <td>{run.summary.matches}</td>
                <td>{run.summary.qbCompared}</td>
                <td>
                  <Link href={`/?run=${run.id}`}>View</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
