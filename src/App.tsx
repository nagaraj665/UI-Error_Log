import { useState, useEffect, useMemo } from 'react';
import { Download } from 'lucide-react';
import Sidebar from './components/Sidebar';
import FileUpload from './components/FileUpload';
import FilterPanel from './components/FilterPanel';
import StatisticsCards from './components/StatisticsCards';
import ErrorDistribution from './components/ErrorDistribution';
import ErrorsByCategory from './components/ErrorsByCategory';
import { supabase, LogEntry, LogUpload } from './lib/supabase';
import { getDisplayCategory } from './lib/errorCategory';

function App() {
  const VALID_USERNAME = 'schemalog@kriyadocs.com';
  const VALID_PASSWORD = 'PassW0r@';

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loginUsername, setLoginUsername] = useState(VALID_USERNAME);
  const [loginPassword, setLoginPassword] = useState(VALID_PASSWORD);
  const [loginError, setLoginError] = useState('');

  const [activeTab, setActiveTab] = useState('analyse');
  const [currentUpload, setCurrentUpload] = useState<LogUpload | null>(null);
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [previousEntries, setPreviousEntries] = useState<LogEntry[]>([]);
  const [compareMode, setCompareMode] = useState(false);
  const [previousLoading, setPreviousLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [historyUploads, setHistoryUploads] = useState<LogUpload[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState('');
  const [selectedHistoryUploadId, setSelectedHistoryUploadId] = useState<string | null>(null);
  const [selectedCustomers, setSelectedCustomers] = useState<string[]>([]);
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
  const [selectedStages, setSelectedStages] = useState<string[]>([]);
  const [selectedDOI, setSelectedDOI] = useState('');

  const fetchEntriesByUploadId = async (uploadId: string): Promise<LogEntry[]> => {
    const pageSize = 1000;
    let from = 0;
    const allEntries: LogEntry[] = [];

    while (true) {
      const { data: entriesData, error: entriesError } = await supabase
        .from('log_entries')
        .select('*')
        .eq('upload_id', uploadId)
        .order('id', { ascending: true })
        .range(from, from + pageSize - 1);

      if (entriesError) throw entriesError;
      if (!entriesData || entriesData.length === 0) break;

      allEntries.push(...entriesData);

      if (entriesData.length < pageSize) break;
      from += pageSize;
    }

    return allEntries;
  };

  const loadUploadData = async (uploadId: string) => {
    setLoading(true);
    try {
      const { data: upload, error: uploadError } = await supabase
        .from('log_uploads')
        .select('*')
        .eq('id', uploadId)
        .maybeSingle();

      if (uploadError) throw uploadError;
      if (upload) setCurrentUpload(upload);

      const allEntries = await fetchEntriesByUploadId(uploadId);
      setEntries(allEntries);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUploadComplete = (uploadId: string) => {
    loadUploadData(uploadId);
    loadHistoryUploads();
  };

  const handleLogin = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (loginUsername === VALID_USERNAME && loginPassword === VALID_PASSWORD) {
      setIsAuthenticated(true);
      setLoginError('');
      return;
    }
    setLoginError('Invalid username or password.');
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setActiveTab('analyse');
    setSelectedHistoryUploadId(null);
    setCurrentUpload(null);
    setEntries([]);
    setPreviousEntries([]);
    setCompareMode(false);
  };

  const escapeHtml = (value: string) => {
    return value
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  };

  const handleExportDashboardPDF = async () => {
    if (!currentUpload) return;

    const isCompareEnabled = compareMode && !!previousUpload;
    const currentVisibleErrors = filteredEntries.length;
    const previousVisibleErrors = previousFilteredEntries.length;
    const currentMaxIssueCount = Math.max(...topIssues.map((item) => item.count), 1);
    const currentMaxStageCount = Math.max(...stageDistribution.map((item) => item.count), 1);
    const severityTotal = Math.max(severityDistribution.reduce((sum, item) => sum + item.count, 0), 1);

    const formatDelta = (current: number, previous: number) => {
      const diff = current - previous;
      const pct = Math.round((diff / Math.max(previous, 1)) * 100);
      return `${diff > 0 ? '+' : ''}${diff.toLocaleString()} (${pct > 0 ? '+' : ''}${pct}%)`;
    };

    const filterSummary = [
      selectedCustomers.length > 0 ? `Customer: ${selectedCustomers.join(', ')}` : 'Customer: All',
      selectedProjects.length > 0 ? `Project: ${selectedProjects.join(', ')}` : 'Project: All',
      selectedStages.length > 0 ? `Stage: ${selectedStages.join(', ')}` : 'Stage: All',
      selectedDOI ? `DOI: ${selectedDOI}` : 'DOI: All',
    ].join(' | ');

    const topIssueBars = topIssues
      .slice(0, 8)
      .map((item) => {
        const width = Math.max(4, Math.round((item.count / currentMaxIssueCount) * 100));
        const share = Math.round((item.count / Math.max(currentVisibleErrors, 1)) * 100);
        return `
          <div class="bar-row">
            <div class="bar-label">${escapeHtml(item.category)}</div>
            <div class="bar-track"><div class="bar-fill issue" style="width:${width}%"></div></div>
            <div class="bar-value">${item.count} (${share}%)</div>
          </div>
        `;
      })
      .join('');

    const topIssuesRows = topIssues
      .slice(0, 10)
      .map(
        (item, index) =>
          `<tr>
            <td>${index + 1}</td>
            <td>${escapeHtml(item.category)}</td>
            <td>${item.count}</td>
            <td>${Math.round((item.count / Math.max(filteredEntries.length, 1)) * 100)}%</td>
          </tr>`
      )
      .join('');

    const stageBars = stageDistribution
      .slice(0, 8)
      .map((item) => {
        const width = Math.max(4, Math.round((item.count / currentMaxStageCount) * 100));
        const share = Math.round((item.count / Math.max(currentVisibleErrors, 1)) * 100);
        return `
          <div class="bar-row">
            <div class="bar-label">${escapeHtml(item.stage)}</div>
            <div class="bar-track"><div class="bar-fill stage" style="width:${width}%"></div></div>
            <div class="bar-value">${item.count} (${share}%)</div>
          </div>
        `;
      })
      .join('');

    const stageRows = stageDistribution
      .slice(0, 10)
      .map(
        (item) =>
          `<tr>
            <td>${escapeHtml(item.stage)}</td>
            <td>${item.count}</td>
          </tr>`
      )
      .join('');

    const severityColor = (severity: string) => {
      const key = severity.toLowerCase();
      if (key.includes('error')) return '#dc2626';
      if (key.includes('warning')) return '#d97706';
      if (key.includes('info')) return '#2563eb';
      return '#6b7280';
    };

    const severityStack = severityDistribution
      .map((item) => {
        const width = Math.max(4, Math.round((item.count / severityTotal) * 100));
        return `<div class="severity-segment" style="width:${width}%; background:${severityColor(item.severity)}" title="${escapeHtml(item.severity)}: ${item.count}"></div>`;
      })
      .join('');

    const severityLegend = severityDistribution
      .map((item) => {
        const share = Math.round((item.count / severityTotal) * 100);
        return `
          <div class="legend-item">
            <span class="legend-dot" style="background:${severityColor(item.severity)}"></span>
            <span>${escapeHtml(item.severity)}: <strong>${item.count}</strong> (${share}%)</span>
          </div>
        `;
      })
      .join('');

    const severityRows = severityDistribution
      .map(
        (item) =>
          `<tr>
            <td>${escapeHtml(item.severity)}</td>
            <td>${item.count}</td>
          </tr>`
      )
      .join('');

    const customerSummaryRows = customerSummary
      .slice(0, 12)
      .map(
        (item) => `<tr>
          <td>${escapeHtml(item.customer)}</td>
          <td>${item.uniqueDoiCount}</td>
          <td>${item.errorCount}</td>
        </tr>`
      )
      .join('');

    const compareDiffRows = isCompareEnabled
      ? (() => {
          const currentMap = new Map(topIssues.map((item) => [item.category, item.count]));
          const previousMap = new Map(previousTopIssues.map((item) => [item.category, item.count]));
          const allCategories = new Set([...currentMap.keys(), ...previousMap.keys()]);
          const rows = Array.from(allCategories)
            .map((category) => {
              const currentCount = currentMap.get(category) ?? 0;
              const previousCount = previousMap.get(category) ?? 0;
              const delta = currentCount - previousCount;
              return { category, currentCount, previousCount, delta };
            })
            .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
            .slice(0, 10)
            .map(
              (row) => `<tr>
                <td>${escapeHtml(row.category)}</td>
                <td>${row.currentCount}</td>
                <td>${row.previousCount}</td>
                <td style="color:${row.delta > 0 ? '#dc2626' : row.delta < 0 ? '#16a34a' : '#374151'}; font-weight:600;">${row.delta > 0 ? '+' : ''}${row.delta}</td>
              </tr>`
            )
            .join('');
          return rows;
        })()
      : '';

    const biggestIncrease = isCompareEnabled
      ? (() => {
          const currentMap = new Map(topIssues.map((item) => [item.category, item.count]));
          const previousMap = new Map(previousTopIssues.map((item) => [item.category, item.count]));
          const all = Array.from(new Set([...currentMap.keys(), ...previousMap.keys()]));
          return all
            .map((category) => ({
              category,
              delta: (currentMap.get(category) ?? 0) - (previousMap.get(category) ?? 0),
            }))
            .sort((a, b) => b.delta - a.delta)[0];
        })()
      : null;

    const biggestReduction = isCompareEnabled
      ? (() => {
          const currentMap = new Map(topIssues.map((item) => [item.category, item.count]));
          const previousMap = new Map(previousTopIssues.map((item) => [item.category, item.count]));
          const all = Array.from(new Set([...currentMap.keys(), ...previousMap.keys()]));
          return all
            .map((category) => ({
              category,
              delta: (currentMap.get(category) ?? 0) - (previousMap.get(category) ?? 0),
            }))
            .sort((a, b) => a.delta - b.delta)[0];
        })()
      : null;

    const reportHtml = `
      <html>
        <head>
          <title>Quality Dashboard Report</title>
          <style>
            :root { color-scheme: light; }
            html, body {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            body { font-family: 'Segoe UI', Arial, sans-serif; margin: 28px; color: #111827; background: #f8fafc; }
            h1 { margin: 0; font-size: 28px; color: #0f172a; }
            h2 { margin: 0 0 12px; font-size: 18px; color: #0f172a; }
            h3 { margin: 0 0 10px; font-size: 15px; color: #1f2937; }
            .muted { color: #4b5563; font-size: 12px; }
            .section { margin-top: 20px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; }
            .kpi-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; margin-top: 16px; }
            .kpi { border: 1px solid #dbeafe; border-radius: 10px; padding: 14px; background: linear-gradient(180deg, #eff6ff 0%, #ffffff 100%); }
            .kpi .label { font-size: 12px; color: #6b7280; }
            .kpi .value { font-size: 28px; font-weight: 700; margin-top: 6px; color: #0f172a; }
            .kpi .sub { font-size: 11px; color: #6b7280; margin-top: 4px; }
            .hero { background: linear-gradient(135deg, #0f172a 0%, #1d4ed8 100%); color: #ffffff; border-radius: 14px; padding: 18px; }
            .hero h1 { color: #ffffff; }
            .hero .muted { color: #dbeafe; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 13px; }
            th, td { border: 1px solid #e5e7eb; padding: 8px 10px; text-align: left; vertical-align: top; }
            th { background: #f3f4f6; }
            .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
            .pill { display: inline-block; padding: 5px 10px; border-radius: 999px; background: #fff7ed; color: #c2410c; border: 1px solid #fdba74; font-size: 11px; margin-right: 6px; margin-top: 4px; }
            .bar-row { display: grid; grid-template-columns: minmax(180px, 260px) 1fr 110px; gap: 8px; align-items: center; margin-top: 8px; }
            .bar-label { font-size: 12px; color: #334155; white-space: normal; word-break: break-word; line-height: 1.2; }
            .bar-track { height: 12px; background: #e2e8f0; border-radius: 999px; overflow: hidden; }
            .bar-fill { height: 100%; border-radius: 999px; }
            .bar-fill.issue { background: linear-gradient(90deg, #fb7185, #ef4444); }
            .bar-fill.stage { background: linear-gradient(90deg, #22c55e, #16a34a); }
            .bar-value { font-size: 12px; text-align: right; color: #334155; }
            .severity-stack { display: flex; height: 14px; border-radius: 999px; overflow: hidden; background: #e2e8f0; margin: 8px 0 10px; }
            .severity-segment { height: 100%; }
            .legend-item { font-size: 12px; color: #334155; margin-top: 6px; display: flex; align-items: center; gap: 8px; }
            .legend-dot { display: inline-block; width: 10px; height: 10px; border-radius: 999px; }
            .timeline-wrap { display: flex; align-items: flex-end; height: 190px; gap: 6px; margin-top: 8px; padding: 8px; border: 1px solid #e2e8f0; border-radius: 10px; background: #f8fafc; }
            .timeline-bar-wrap { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: flex-end; min-width: 0; }
            .timeline-value { font-size: 10px; color: #475569; margin-bottom: 4px; }
            .timeline-bar { width: 100%; background: linear-gradient(180deg, #60a5fa, #2563eb); border-radius: 6px 6px 0 0; min-height: 8px; max-height: 120px; }
            .timeline-label { font-size: 10px; color: #64748b; margin-top: 4px; text-align: center; width: 100%; line-height: 1.1; white-space: normal; word-break: break-word; }
            .insight { margin-top: 8px; padding: 10px 12px; border-radius: 8px; border-left: 4px solid #2563eb; background: #eff6ff; color: #1e3a8a; font-size: 12px; }
            .compare-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 10px; }
            .compare-card { border: 1px solid #e5e7eb; border-radius: 10px; padding: 12px; background: #ffffff; }
            .compare-title { font-size: 14px; font-weight: 700; margin-bottom: 8px; }
            .delta-up { color: #dc2626; font-weight: 600; }
            .delta-down { color: #16a34a; font-weight: 600; }
            .delta-flat { color: #334155; font-weight: 600; }
            @page { size: A4; margin: 12mm; }
            @media print {
              body { margin: 0; }
              .two-col { grid-template-columns: 1fr; }
              .bar-row { grid-template-columns: minmax(180px, 300px) 1fr 96px; }
            }
          </style>
        </head>
        <body>
          <div class="hero">
            <h1>Error Quality Dashboard Report</h1>
            <div class="muted">Generated: ${new Date().toLocaleString('en-GB')}</div>
            <div class="muted">Upload: ${escapeHtml(currentUpload.filename)} | Uploaded: ${new Date(currentUpload.uploaded_at).toLocaleString('en-GB')}</div>
          </div>

          <div class="section">
            <h2>Filter Scope</h2>
            <div class="muted">${escapeHtml(filterSummary)}</div>
          </div>

          <div class="section">
            <h2>Executive Summary</h2>
            <div class="kpi-grid">
              <div class="kpi">
                <div class="label">Visible Errors</div>
                <div class="value">${filteredEntries.length.toLocaleString()}</div>
                <div class="sub">Within current filter scope</div>
              </div>
              <div class="kpi">
                <div class="label">Affected DOI</div>
                <div class="value">${affectedDoiCount.toLocaleString()}</div>
                <div class="sub">Unique documents impacted</div>
              </div>
              <div class="kpi">
                <div class="label">Unique Issue Types</div>
                <div class="value">${displayCategoryCount.toLocaleString()}</div>
                <div class="sub">Element and attribute combinations</div>
              </div>
              <div class="kpi">
                <div class="label">Trend vs Previous</div>
                <div class="value">${trendDelta === null ? 'N/A' : `${trendDelta > 0 ? '+' : ''}${trendDelta}%`}</div>
                <div class="sub">${previousUpload ? `Previous upload: ${previousUpload.total_entries.toLocaleString()} records` : 'No previous upload available'}</div>
              </div>
            </div>
          </div>

          <div class="section">
            <h2>Visual Highlights</h2>
            <div class="two-col">
              <div>
                <h3>Top Issues (Chart)</h3>
                ${topIssueBars || '<div class="muted">No issues found in current scope.</div>'}
              </div>
              <div>
                <h3>Errors by Stage (Chart)</h3>
                ${stageBars || '<div class="muted">No stage data available.</div>'}
              </div>
            </div>
            <div class="two-col" style="margin-top:12px;">
              <div>
                <h3>Severity Mix</h3>
                <div class="severity-stack">${severityStack || '<div class="severity-segment" style="width:100%; background:#9ca3af;"></div>'}</div>
                ${severityLegend || '<div class="muted">No severity data available.</div>'}
              </div>
              <div>
                <h3>Customer Summary</h3>
                <table>
                  <thead>
                    <tr>
                      <th>Customer</th>
                      <th>Unique DOI</th>
                      <th>Error Count</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${customerSummaryRows || '<tr><td colspan="3">No customer data available.</td></tr>'}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div class="section">
            <h2>Top Issues</h2>
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Issue</th>
                  <th>Count</th>
                  <th>Share</th>
                </tr>
              </thead>
              <tbody>
                ${topIssuesRows || '<tr><td colspan="4">No issues found in current scope.</td></tr>'}
              </tbody>
            </table>
          </div>

          <div class="section two-col">
            <div>
              <h2>Stage Distribution</h2>
              <table>
                <thead>
                  <tr><th>Stage</th><th>Errors</th></tr>
                </thead>
                <tbody>
                  ${stageRows || '<tr><td colspan="2">No stage data available.</td></tr>'}
                </tbody>
              </table>
            </div>
            <div>
              <h2>Severity Distribution</h2>
              <table>
                <thead>
                  <tr><th>Severity</th><th>Errors</th></tr>
                </thead>
                <tbody>
                  ${severityRows || '<tr><td colspan="2">No severity data available.</td></tr>'}
                </tbody>
              </table>
            </div>
          </div>

          ${
            isCompareEnabled
              ? `
          <div class="section">
            <h2>Compare Report: Current vs Previous</h2>
            <div class="compare-grid">
              <div class="compare-card">
                <div class="compare-title">Current Upload</div>
                <div class="muted">${escapeHtml(currentUpload.filename)} • ${new Date(currentUpload.uploaded_at).toLocaleString('en-GB')}</div>
                <p><strong>Visible Errors:</strong> ${currentVisibleErrors.toLocaleString()}</p>
                <p><strong>Affected DOI:</strong> ${affectedDoiCount.toLocaleString()}</p>
                <p><strong>Unique Issue Types:</strong> ${displayCategoryCount.toLocaleString()}</p>
              </div>
              <div class="compare-card">
                <div class="compare-title">Previous Upload</div>
                <div class="muted">${previousUpload ? `${escapeHtml(previousUpload.filename)} • ${new Date(previousUpload.uploaded_at).toLocaleString('en-GB')}` : 'N/A'}</div>
                <p><strong>Visible Errors:</strong> ${previousVisibleErrors.toLocaleString()}</p>
                <p><strong>Affected DOI:</strong> ${previousAffectedDoiCount.toLocaleString()}</p>
                <p><strong>Unique Issue Types:</strong> ${previousDisplayCategoryCount.toLocaleString()}</p>
              </div>
            </div>
            <div class="insight">
              Total visible errors changed by <span class="${currentVisibleErrors - previousVisibleErrors > 0 ? 'delta-up' : currentVisibleErrors - previousVisibleErrors < 0 ? 'delta-down' : 'delta-flat'}">${formatDelta(currentVisibleErrors, previousVisibleErrors)}</span>.
              Affected DOI changed by <span class="${affectedDoiCount - previousAffectedDoiCount > 0 ? 'delta-up' : affectedDoiCount - previousAffectedDoiCount < 0 ? 'delta-down' : 'delta-flat'}">${formatDelta(affectedDoiCount, previousAffectedDoiCount)}</span>.
            </div>
            <table>
              <thead>
                <tr>
                  <th>Issue Category</th>
                  <th>Current</th>
                  <th>Previous</th>
                  <th>Delta</th>
                </tr>
              </thead>
              <tbody>
                ${compareDiffRows || '<tr><td colspan="4">No comparable issue differences available.</td></tr>'}
              </tbody>
            </table>
          </div>
              `
              : ''
          }

          <div class="section">
            <h2>Recommended Actions</h2>
            <div class="pill">Immediate Triage</div>
            <p class="muted">
              Focus the engineering team on <strong>${escapeHtml(topIssues[0]?.category ?? 'the highest-volume issue')}</strong>.
              It currently contributes <strong>${topIssues[0]?.count ?? 0}</strong> errors (${Math.round(((topIssues[0]?.count ?? 0) / Math.max(currentVisibleErrors, 1)) * 100)}% of visible issues),
              so resolving this first gives the largest immediate reduction in error volume.
            </p>
            <div class="pill">Process Stabilization</div>
            <p class="muted">
              The stage with highest concentration is <strong>${escapeHtml(stageDistribution[0]?.stage ?? 'N/A')}</strong> (${stageDistribution[0]?.count ?? 0} errors).
              Assign a focused root-cause session for this stage and enforce pre-release validation gates targeting the top 3 issue types.
            </p>
            <div class="pill">Quality Governance</div>
            <p class="muted">
              Track a weekly KPI bundle: total visible errors, affected DOI, and unique issue types.
              ${trendDelta === null
                ? 'No previous baseline is available; capture the next upload as your first benchmark and set a 2-week reduction target.'
                : `Current trend is ${trendDelta > 0 ? 'worsening' : trendDelta < 0 ? 'improving' : 'flat'} (${trendDelta > 0 ? '+' : ''}${trendDelta}% vs previous upload). Set management threshold alerts at +/-10%.`}
            </p>
            ${
              isCompareEnabled
                ? `<div class="pill">Compare Insights</div>
            <p class="muted">
              Largest increase: <strong>${escapeHtml(biggestIncrease?.category ?? 'N/A')}</strong> (${biggestIncrease?.delta !== undefined ? `${biggestIncrease.delta > 0 ? '+' : ''}${biggestIncrease.delta}` : 'N/A'}).
              Largest reduction: <strong>${escapeHtml(biggestReduction?.category ?? 'N/A')}</strong> (${biggestReduction?.delta !== undefined ? `${biggestReduction.delta > 0 ? '+' : ''}${biggestReduction.delta}` : 'N/A'}).
              Use this delta list to validate whether recent fixes are effective and to prioritize next sprint backlog items.
            </p>`
                : ''
            }
          </div>
        </body>
      </html>
    `;

    try {
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
        import('html2canvas'),
        import('jspdf'),
      ]);

      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.left = '-10000px';
      iframe.style.top = '0';
      iframe.style.width = '1200px';
      iframe.style.height = '1600px';
      iframe.style.opacity = '0';
      iframe.style.pointerEvents = 'none';
      document.body.appendChild(iframe);

      const iframeDoc = iframe.contentDocument;
      if (!iframeDoc) {
        document.body.removeChild(iframe);
        throw new Error('Unable to initialize report render frame.');
      }

      iframeDoc.open();
      iframeDoc.write(reportHtml);
      iframeDoc.close();

      await new Promise<void>((resolve) => {
        iframe.onload = () => resolve();
        setTimeout(() => resolve(), 350);
      });

      await iframeDoc.fonts?.ready;

      const body = iframeDoc.body;
      const html = iframeDoc.documentElement;
      const contentWidth = Math.max(body.scrollWidth, html.scrollWidth, 1200);
      const contentHeight = Math.max(body.scrollHeight, html.scrollHeight, 1600);

      iframe.style.width = `${contentWidth}px`;
      iframe.style.height = `${contentHeight}px`;

      const reportBlocks = Array.from(iframeDoc.querySelectorAll('.hero, .section')) as HTMLElement[];
      if (reportBlocks.length === 0) {
        document.body.removeChild(iframe);
        throw new Error('No report sections found for export.');
      }

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: true,
      });

      const pageWidth = 210;
      const pageHeight = 297;
      const margin = 8;
      const printableWidth = pageWidth - margin * 2;
      const printableHeight = pageHeight - margin * 2;

      let cursorY = margin;
      let isFirstBlock = true;

      for (const block of reportBlocks) {
        const blockCanvas = await html2canvas(block, {
          scale: 2,
          useCORS: true,
          backgroundColor: '#ffffff',
          width: block.scrollWidth,
          height: block.scrollHeight,
          windowWidth: contentWidth,
          windowHeight: contentHeight,
        });

        const imageData = blockCanvas.toDataURL('image/png');
        const naturalHeight = (blockCanvas.height * printableWidth) / blockCanvas.width;
        const fitScale = naturalHeight > printableHeight ? printableHeight / naturalHeight : 1;
        const renderWidth = printableWidth * fitScale;
        const renderHeight = naturalHeight * fitScale;
        const x = margin + (printableWidth - renderWidth) / 2;

        if (!isFirstBlock && cursorY + renderHeight > pageHeight - margin) {
          pdf.addPage();
          cursorY = margin;
        }

        pdf.addImage(imageData, 'PNG', x, cursorY, renderWidth, renderHeight, undefined, 'FAST');
        cursorY += renderHeight + 4;
        isFirstBlock = false;
      }

      document.body.removeChild(iframe);

      const exportDate = new Date().toISOString().slice(0, 10);
      pdf.save(`error_quality_report_${exportDate}.pdf`);
    } catch (error) {
      console.error('WYSIWYG export failed, falling back to print export:', error);

      const reportWindow = window.open('', '_blank');
      if (!reportWindow) return;
      reportWindow.document.open();
      reportWindow.document.write(reportHtml);
      reportWindow.document.close();

      const printReport = () => {
        reportWindow.focus();
        reportWindow.setTimeout(() => {
          reportWindow.print();
        }, 400);
      };

      if (reportWindow.document.readyState === 'complete') {
        printReport();
      } else {
        reportWindow.onload = () => {
          printReport();
        };
      }
    }
  };

  const loadHistoryUploads = async () => {
    setHistoryLoading(true);
    setHistoryError('');
    try {
      const { data, error } = await supabase
        .from('log_uploads')
        .select('*')
        .order('uploaded_at', { ascending: false });

      if (error) throw error;
      setHistoryUploads(data ?? []);
    } catch (error) {
      console.error('Error loading history uploads:', error);
      setHistoryError('Failed to load upload history.');
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleSelectHistoryUpload = async (uploadId: string) => {
    setSelectedHistoryUploadId(uploadId);
    setSelectedCustomers([]);
    setSelectedProjects([]);
    setSelectedStages([]);
    setSelectedDOI('');
    await loadUploadData(uploadId);
  };

  useEffect(() => {
    if (activeTab === 'history' || activeTab === 'dashboard') {
      void loadHistoryUploads();
    }
  }, [activeTab]);

  useEffect(() => {
    if ((activeTab !== 'history' && activeTab !== 'dashboard') || historyUploads.length === 0) return;
    if (selectedHistoryUploadId && historyUploads.some((upload) => upload.id === selectedHistoryUploadId)) {
      return;
    }
    void handleSelectHistoryUpload(historyUploads[0].id);
  }, [activeTab, historyUploads, selectedHistoryUploadId]);

  const getFilteredEntriesForOptions = (
    customers: string[],
    projects: string[],
    stages: string[]
  ) => {
    return entries.filter((entry) => {
      if (customers.length > 0 && !customers.includes(entry.customer)) {
        return false;
      }
      if (projects.length > 0 && !projects.includes(entry.project)) {
        return false;
      }
      if (stages.length > 0 && !stages.includes(entry.stage)) {
        return false;
      }
      return true;
    });
  };

  const customerOptions = useMemo(() => {
    const constrained = getFilteredEntriesForOptions([], selectedProjects, selectedStages);
    return Array.from(new Set(constrained.map((entry) => entry.customer).filter(Boolean))).sort();
  }, [entries, selectedProjects, selectedStages]);

  const projectOptions = useMemo(() => {
    const constrained = getFilteredEntriesForOptions(selectedCustomers, [], selectedStages);
    return Array.from(new Set(constrained.map((entry) => entry.project).filter(Boolean))).sort();
  }, [entries, selectedCustomers, selectedStages]);

  const stageOptions = useMemo(() => {
    const constrained = getFilteredEntriesForOptions(selectedCustomers, selectedProjects, []);
    return Array.from(new Set(constrained.map((entry) => entry.stage).filter(Boolean))).sort();
  }, [entries, selectedCustomers, selectedProjects]);

  useEffect(() => {
    setSelectedCustomers((prev) => prev.filter((customer) => customerOptions.includes(customer)));
  }, [customerOptions]);

  useEffect(() => {
    setSelectedProjects((prev) => prev.filter((project) => projectOptions.includes(project)));
  }, [projectOptions]);

  useEffect(() => {
    setSelectedStages((prev) => prev.filter((stage) => stageOptions.includes(stage)));
  }, [stageOptions]);

  const applyActiveFilters = (sourceEntries: LogEntry[]) => {
    return sourceEntries.filter((entry) => {
      if (selectedCustomers.length > 0 && !selectedCustomers.includes(entry.customer)) {
        return false;
      }
      if (selectedProjects.length > 0 && !selectedProjects.includes(entry.project)) {
        return false;
      }
      if (selectedStages.length > 0 && !selectedStages.includes(entry.stage)) {
        return false;
      }
      if (selectedDOI && !entry.doi.toLowerCase().includes(selectedDOI.toLowerCase())) {
        return false;
      }
      return true;
    });
  };

  const filteredEntries = useMemo(() => {
    return applyActiveFilters(entries);
  }, [entries, selectedCustomers, selectedProjects, selectedStages, selectedDOI]);

  const previousFilteredEntries = useMemo(() => {
    return applyActiveFilters(previousEntries);
  }, [previousEntries, selectedCustomers, selectedProjects, selectedStages, selectedDOI]);

  const categoryDistribution = filteredEntries.reduce((acc, entry) => {
    const category = getDisplayCategory(entry);
    const existing = acc.find(c => c.category === category);
    if (existing) {
      existing.count++;
    } else {
      acc.push({ category, count: 1 });
    }
    return acc;
  }, [] as { category: string; count: number }[]);

  const displayCategoryCount = new Set(filteredEntries.map((entry) => getDisplayCategory(entry))).size;
  const affectedDoiCount = new Set(filteredEntries.map((entry) => entry.doi).filter(Boolean)).size;

  const previousUpload = useMemo(() => {
    if (!currentUpload) return null;
    const currentIndex = historyUploads.findIndex((upload) => upload.id === currentUpload.id);
    if (currentIndex < 0) return null;
    return historyUploads[currentIndex + 1] ?? null;
  }, [currentUpload, historyUploads]);

  useEffect(() => {
    if (!previousUpload && compareMode) {
      setCompareMode(false);
    }
  }, [previousUpload, compareMode]);

  useEffect(() => {
    const loadPreviousForCompare = async () => {
      if (activeTab !== 'dashboard' || !compareMode || !previousUpload) {
        setPreviousEntries([]);
        setPreviousLoading(false);
        return;
      }

      setPreviousLoading(true);
      try {
        const data = await fetchEntriesByUploadId(previousUpload.id);
        setPreviousEntries(data);
      } catch (error) {
        console.error('Error loading previous upload data:', error);
        setPreviousEntries([]);
      } finally {
        setPreviousLoading(false);
      }
    };

    void loadPreviousForCompare();
  }, [activeTab, compareMode, previousUpload]);

  const stageDistribution = useMemo(() => {
    const map = new Map<string, number>();
    for (const entry of filteredEntries) {
      const key = entry.stage || 'Unknown';
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return Array.from(map.entries())
      .map(([stage, count]) => ({ stage, count }))
      .sort((a, b) => b.count - a.count);
  }, [filteredEntries]);

  const severityDistribution = useMemo(() => {
    const map = new Map<string, number>();
    for (const entry of filteredEntries) {
      const key = (entry.type || 'unknown').toLowerCase();
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return Array.from(map.entries())
      .map(([severity, count]) => ({ severity, count }))
      .sort((a, b) => b.count - a.count);
  }, [filteredEntries]);

  const customerSummary = useMemo(() => {
    const map = new Map<string, { doiSet: Set<string>; errorCount: number }>();
    for (const entry of filteredEntries) {
      const key = entry.customer || 'Unknown';
      const existing = map.get(key) ?? { doiSet: new Set<string>(), errorCount: 0 };
      if (entry.doi) {
        existing.doiSet.add(entry.doi);
      }
      existing.errorCount += 1;
      map.set(key, existing);
    }

    return Array.from(map.entries())
      .map(([customer, data]) => ({
        customer,
        uniqueDoiCount: data.doiSet.size,
        errorCount: data.errorCount,
      }))
      .sort((a, b) => b.errorCount - a.errorCount);
  }, [filteredEntries]);

  const topIssues = useMemo(() => {
    return [...categoryDistribution].sort((a, b) => b.count - a.count).slice(0, 8);
  }, [categoryDistribution]);

  const trendDelta = previousUpload
    ? Math.round(((entries.length - previousUpload.total_entries) / Math.max(previousUpload.total_entries, 1)) * 100)
    : null;

  const previousDisplayCategoryCount = new Set(previousFilteredEntries.map((entry) => getDisplayCategory(entry))).size;
  const previousAffectedDoiCount = new Set(previousFilteredEntries.map((entry) => entry.doi).filter(Boolean)).size;

  const previousCategoryDistribution = useMemo(() => {
    return previousFilteredEntries.reduce((acc, entry) => {
      const category = getDisplayCategory(entry);
      const existing = acc.find((c) => c.category === category);
      if (existing) {
        existing.count++;
      } else {
        acc.push({ category, count: 1 });
      }
      return acc;
    }, [] as { category: string; count: number }[]);
  }, [previousFilteredEntries]);

  const previousTopIssues = useMemo(() => {
    return [...previousCategoryDistribution].sort((a, b) => b.count - a.count).slice(0, 8);
  }, [previousCategoryDistribution]);

  const compareIssueDiff = useMemo(() => {
    const currentMap = new Map(topIssues.map((item) => [item.category, item.count]));
    const previousMap = new Map(previousTopIssues.map((item) => [item.category, item.count]));
    const allCategories = new Set([...currentMap.keys(), ...previousMap.keys()]);

    return Array.from(allCategories)
      .map((category) => {
        const currentCount = currentMap.get(category) ?? 0;
        const previousCount = previousMap.get(category) ?? 0;
        return {
          category,
          currentCount,
          previousCount,
          delta: currentCount - previousCount,
        };
      })
      .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
      .slice(0, 10);
  }, [topIssues, previousTopIssues]);

  const biggestIssueIncrease = useMemo(() => {
    if (compareIssueDiff.length === 0) return null;
    return [...compareIssueDiff].sort((a, b) => b.delta - a.delta)[0];
  }, [compareIssueDiff]);

  const biggestIssueReduction = useMemo(() => {
    if (compareIssueDiff.length === 0) return null;
    return [...compareIssueDiff].sort((a, b) => a.delta - b.delta)[0];
  }, [compareIssueDiff]);

  const compareDelta = (current: number, previous: number) => {
    const diff = current - previous;
    const pct = Math.round((diff / Math.max(previous, 1)) * 100);
    return {
      diff,
      pct,
      label: `${diff > 0 ? '+' : ''}${diff.toLocaleString()} (${pct > 0 ? '+' : ''}${pct}%)`,
    };
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-white border border-gray-200 rounded-xl shadow-sm p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Schema Log Manager</h1>
          <p className="text-sm text-gray-600 mb-6">Login to access the error logger dashboard</p>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
              <input
                type="email"
                value={loginUsername}
                onChange={(e) => setLoginUsername(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-orange-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input
                type="password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-orange-500"
                required
              />
            </div>

            {loginError && (
              <p className="text-sm text-red-600">{loginError}</p>
            )}

            <button
              type="submit"
              className="w-full py-2.5 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-medium"
            >
              Login
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        historyItems={historyUploads}
        historyLoading={historyLoading}
        selectedHistoryUploadId={selectedHistoryUploadId}
        onHistorySelect={(uploadId) => {
          void handleSelectHistoryUpload(uploadId);
        }}
        onLogout={handleLogout}
        userEmail={loginUsername}
      />

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto p-8">
          {activeTab === 'analyse' && (
            <>
              <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Log File Analysis</h1>
                <p className="text-gray-600">Upload your JSON log file to analyze errors by category</p>
              </div>

              <FileUpload onUploadComplete={handleUploadComplete} />

              {loading && (
                <div className="text-center py-12">
                  <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-orange-500 border-t-transparent"></div>
                  <p className="mt-4 text-gray-600">Loading data...</p>
                </div>
              )}

              {currentUpload && !loading && (
                <>
                  <FilterPanel
                    customers={customerOptions}
                    projects={projectOptions}
                    stages={stageOptions}
                    selectedCustomers={selectedCustomers}
                    selectedProjects={selectedProjects}
                    selectedStages={selectedStages}
                    selectedDOI={selectedDOI}
                    onCustomersChange={setSelectedCustomers}
                    onProjectsChange={setSelectedProjects}
                    onStagesChange={setSelectedStages}
                    onDOIChange={setSelectedDOI}
                  />

                  <StatisticsCards
                    totalEntries={filteredEntries.length}
                    totalErrors={filteredEntries.length}
                    categoriesFound={new Set(filteredEntries.map((e) => getDisplayCategory(e))).size}
                  />

                  <ErrorDistribution data={categoryDistribution} />

                  <ErrorsByCategory entries={filteredEntries} />
                </>
              )}
            </>
          )}

          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard</h1>
                <p className="text-gray-600">Operational quality view for triage and decision making</p>
              </div>

              {historyError && (
                <div className="text-sm text-red-600">{historyError}</div>
              )}

              {loading && (
                <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
                  <div className="inline-block animate-spin rounded-full h-10 w-10 border-4 border-orange-500 border-t-transparent"></div>
                  <p className="mt-3 text-gray-600">Loading dashboard data...</p>
                </div>
              )}

              {!loading && !currentUpload && (
                <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-600">
                  Upload a file in Analyse or select one from History to populate the dashboard.
                </div>
              )}

              {!loading && currentUpload && (
                <>
                  <div className="bg-white rounded-lg border border-gray-200 p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                    <div>
                      <p className="text-sm text-gray-700">
                        Viewing upload: <span className="font-semibold">{currentUpload.filename}</span> • {new Date(currentUpload.uploaded_at).toLocaleString('en-GB')} • {entries.length.toLocaleString()} records
                      </p>
                      <label className="inline-flex items-center gap-2 text-sm text-gray-700 mt-2">
                        <input
                          type="checkbox"
                          checked={compareMode}
                          onChange={(e) => setCompareMode(e.target.checked)}
                          disabled={!previousUpload}
                          className="rounded border-gray-300"
                        />
                        Compare mode (Current vs Previous)
                      </label>
                    </div>
                    <button
                      onClick={handleExportDashboardPDF}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
                    >
                      <Download className="w-4 h-4" />
                      Export Dashboard PDF
                    </button>
                  </div>

                  <FilterPanel
                    customers={customerOptions}
                    projects={projectOptions}
                    stages={stageOptions}
                    selectedCustomers={selectedCustomers}
                    selectedProjects={selectedProjects}
                    selectedStages={selectedStages}
                    selectedDOI={selectedDOI}
                    onCustomersChange={setSelectedCustomers}
                    onProjectsChange={setSelectedProjects}
                    onStagesChange={setSelectedStages}
                    onDOIChange={setSelectedDOI}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                    <div className="bg-white rounded-lg border border-gray-200 p-5">
                      <p className="text-sm text-gray-500">Visible Errors</p>
                      <p className="text-3xl font-bold text-gray-900 mt-2">{filteredEntries.length.toLocaleString()}</p>
                      <p className="text-xs text-gray-500 mt-1">of {entries.length.toLocaleString()} in selected upload</p>
                    </div>
                    <div className="bg-white rounded-lg border border-gray-200 p-5">
                      <p className="text-sm text-gray-500">Affected DOI</p>
                      <p className="text-3xl font-bold text-gray-900 mt-2">{affectedDoiCount.toLocaleString()}</p>
                      <p className="text-xs text-gray-500 mt-1">unique DOI in current view</p>
                    </div>
                    <div className="bg-white rounded-lg border border-gray-200 p-5">
                      <p className="text-sm text-gray-500">Unique Issue Types</p>
                      <p className="text-3xl font-bold text-gray-900 mt-2">{displayCategoryCount.toLocaleString()}</p>
                      <p className="text-xs text-gray-500 mt-1">element/attribute combinations</p>
                    </div>
                    <div className="bg-white rounded-lg border border-gray-200 p-5">
                      <p className="text-sm text-gray-500">Trend vs Previous Upload</p>
                      <p className={`text-3xl font-bold mt-2 ${trendDelta !== null && trendDelta > 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {trendDelta === null ? 'N/A' : `${trendDelta > 0 ? '+' : ''}${trendDelta}%`}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {previousUpload ? `previous size: ${previousUpload.total_entries.toLocaleString()}` : 'no previous upload'}
                      </p>
                    </div>
                  </div>

                  {compareMode && (
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                        <div className="bg-white rounded-lg border border-gray-200 p-6">
                          <h2 className="text-lg font-semibold text-gray-900 mb-4">Current Upload</h2>
                          <div className="space-y-2 text-sm text-gray-700 mb-4">
                            <p>Visible errors: <span className="font-semibold text-gray-900">{filteredEntries.length.toLocaleString()}</span></p>
                            <p>Affected DOI: <span className="font-semibold text-gray-900">{affectedDoiCount.toLocaleString()}</span></p>
                            <p>Unique issue types: <span className="font-semibold text-gray-900">{displayCategoryCount.toLocaleString()}</span></p>
                          </div>
                          <div className="space-y-2">
                            {topIssues.slice(0, 5).map((item) => (
                              <div key={`current-${item.category}`} className="text-sm flex justify-between gap-3">
                                <span className="text-gray-700 truncate">{item.category}</span>
                                <span className="font-semibold text-gray-900">{item.count}</span>
                              </div>
                            ))}
                            {topIssues.length === 0 && <p className="text-sm text-gray-500">No issues for current filters.</p>}
                          </div>
                        </div>

                        <div className="bg-white rounded-lg border border-gray-200 p-6">
                          <h2 className="text-lg font-semibold text-gray-900 mb-4">Previous Upload</h2>
                          {!previousUpload && (
                            <p className="text-sm text-gray-500">No previous upload available for comparison.</p>
                          )}
                          {previousUpload && previousLoading && (
                            <p className="text-sm text-gray-500">Loading previous upload data...</p>
                          )}
                          {previousUpload && !previousLoading && (
                            <>
                              <div className="space-y-2 text-sm text-gray-700 mb-4">
                                <p>Visible errors: <span className="font-semibold text-gray-900">{previousFilteredEntries.length.toLocaleString()}</span></p>
                                <p>Affected DOI: <span className="font-semibold text-gray-900">{previousAffectedDoiCount.toLocaleString()}</span></p>
                                <p>Unique issue types: <span className="font-semibold text-gray-900">{previousDisplayCategoryCount.toLocaleString()}</span></p>
                              </div>
                              <div className="space-y-2">
                                {previousTopIssues.slice(0, 5).map((item) => (
                                  <div key={`previous-${item.category}`} className="text-sm flex justify-between gap-3">
                                    <span className="text-gray-700 truncate">{item.category}</span>
                                    <span className="font-semibold text-gray-900">{item.count}</span>
                                  </div>
                                ))}
                                {previousTopIssues.length === 0 && <p className="text-sm text-gray-500">No issues for current filters.</p>}
                              </div>
                            </>
                          )}
                        </div>
                      </div>

                      {previousUpload && !previousLoading && (
                        <>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="bg-white rounded-lg border border-gray-200 p-4">
                              <p className="text-xs text-gray-500 uppercase tracking-wide">Visible Errors Delta</p>
                              <p className={`text-2xl font-bold mt-2 ${compareDelta(filteredEntries.length, previousFilteredEntries.length).diff > 0 ? 'text-red-600' : compareDelta(filteredEntries.length, previousFilteredEntries.length).diff < 0 ? 'text-green-600' : 'text-gray-800'}`}>
                                {compareDelta(filteredEntries.length, previousFilteredEntries.length).label}
                              </p>
                            </div>
                            <div className="bg-white rounded-lg border border-gray-200 p-4">
                              <p className="text-xs text-gray-500 uppercase tracking-wide">Affected DOI Delta</p>
                              <p className={`text-2xl font-bold mt-2 ${compareDelta(affectedDoiCount, previousAffectedDoiCount).diff > 0 ? 'text-red-600' : compareDelta(affectedDoiCount, previousAffectedDoiCount).diff < 0 ? 'text-green-600' : 'text-gray-800'}`}>
                                {compareDelta(affectedDoiCount, previousAffectedDoiCount).label}
                              </p>
                            </div>
                            <div className="bg-white rounded-lg border border-gray-200 p-4">
                              <p className="text-xs text-gray-500 uppercase tracking-wide">Issue Types Delta</p>
                              <p className={`text-2xl font-bold mt-2 ${compareDelta(displayCategoryCount, previousDisplayCategoryCount).diff > 0 ? 'text-red-600' : compareDelta(displayCategoryCount, previousDisplayCategoryCount).diff < 0 ? 'text-green-600' : 'text-gray-800'}`}>
                                {compareDelta(displayCategoryCount, previousDisplayCategoryCount).label}
                              </p>
                            </div>
                          </div>

                          <div className="bg-white rounded-lg border border-gray-200 p-6">
                            <h2 className="text-lg font-semibold text-gray-900 mb-4">Key Category Differences (Current vs Previous)</h2>
                            <div className="overflow-x-auto">
                              <table className="min-w-full text-sm">
                                <thead>
                                  <tr className="text-left border-b border-gray-200">
                                    <th className="py-2 pr-4 font-semibold text-gray-600">Issue Category</th>
                                    <th className="py-2 pr-4 font-semibold text-gray-600">Current</th>
                                    <th className="py-2 pr-4 font-semibold text-gray-600">Previous</th>
                                    <th className="py-2 pr-4 font-semibold text-gray-600">Delta</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {compareIssueDiff.map((row) => (
                                    <tr key={row.category} className="border-b border-gray-100">
                                      <td className="py-2 pr-4 text-gray-700">{row.category}</td>
                                      <td className="py-2 pr-4 text-gray-700">{row.currentCount}</td>
                                      <td className="py-2 pr-4 text-gray-700">{row.previousCount}</td>
                                      <td className={`py-2 pr-4 font-semibold ${row.delta > 0 ? 'text-red-600' : row.delta < 0 ? 'text-green-600' : 'text-gray-700'}`}>
                                        {row.delta > 0 ? '+' : ''}{row.delta}
                                      </td>
                                    </tr>
                                  ))}
                                  {compareIssueDiff.length === 0 && (
                                    <tr>
                                      <td colSpan={4} className="py-3 text-gray-500">No comparable issue differences available.</td>
                                    </tr>
                                  )}
                                </tbody>
                              </table>
                            </div>
                          </div>

                          <div className="bg-white rounded-lg border border-gray-200 p-4 text-sm text-gray-700">
                            <p>
                              Largest increase: <span className="font-semibold">{biggestIssueIncrease?.category ?? 'N/A'}</span>
                              {' '}({biggestIssueIncrease ? `${biggestIssueIncrease.delta > 0 ? '+' : ''}${biggestIssueIncrease.delta}` : 'N/A'}).
                              Largest reduction: <span className="font-semibold">{biggestIssueReduction?.category ?? 'N/A'}</span>
                              {' '}({biggestIssueReduction ? `${biggestIssueReduction.delta > 0 ? '+' : ''}${biggestIssueReduction.delta}` : 'N/A'}).
                            </p>
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                    <div className="xl:col-span-2 bg-white rounded-lg border border-gray-200 p-6">
                      <h2 className="text-lg font-semibold text-gray-900 mb-4">Top Issue Types</h2>
                      <div className="space-y-3">
                        {topIssues.length === 0 && <p className="text-sm text-gray-500">No issues found for current filters.</p>}
                        {topIssues.map((item) => {
                          const percent = Math.round((item.count / Math.max(filteredEntries.length, 1)) * 100);
                          return (
                            <div key={item.category} className="flex items-center gap-3">
                              <div className="w-56 text-sm text-gray-700 truncate" title={item.category}>{item.category}</div>
                              <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
                                <div className="h-full bg-orange-500" style={{ width: `${percent}%` }} />
                              </div>
                              <div className="w-20 text-right text-sm text-gray-700">{item.count} ({percent}%)</div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="bg-white rounded-lg border border-gray-200 p-6">
                      <h2 className="text-lg font-semibold text-gray-900 mb-4">Severity Split</h2>
                      <div className="space-y-3">
                        {severityDistribution.length === 0 && <p className="text-sm text-gray-500">No severity data</p>}
                        {severityDistribution.map((item) => (
                          <div key={item.severity} className="flex items-center justify-between text-sm">
                            <span className="capitalize text-gray-700">{item.severity}</span>
                            <span className="font-semibold text-gray-900">{item.count}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                    <div className="bg-white rounded-lg border border-gray-200 p-6">
                      <h2 className="text-lg font-semibold text-gray-900 mb-4">Errors by Stage</h2>
                      <div className="space-y-3">
                        {stageDistribution.length === 0 && <p className="text-sm text-gray-500">No stage data</p>}
                        {stageDistribution.slice(0, 8).map((item) => {
                          const percent = Math.round((item.count / Math.max(filteredEntries.length, 1)) * 100);
                          return (
                            <div key={item.stage} className="flex items-center gap-3">
                              <div className="w-36 text-sm text-gray-700 truncate" title={item.stage}>{item.stage}</div>
                              <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden">
                                <div className="h-full bg-green-500" style={{ width: `${percent}%` }} />
                              </div>
                              <div className="w-16 text-right text-sm text-gray-700">{item.count}</div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="bg-white rounded-lg border border-gray-200 p-6">
                      <h2 className="text-lg font-semibold text-gray-900 mb-4">Customer Summary</h2>
                      <div className="overflow-x-auto">
                        <table className="min-w-full text-sm">
                          <thead>
                            <tr className="text-left border-b border-gray-200">
                              <th className="py-2 pr-4 font-semibold text-gray-600">Customer</th>
                              <th className="py-2 pr-4 font-semibold text-gray-600">Unique DOI Count</th>
                              <th className="py-2 pr-4 font-semibold text-gray-600">Error Count</th>
                            </tr>
                          </thead>
                          <tbody>
                            {customerSummary.slice(0, 12).map((row) => (
                              <tr key={row.customer} className="border-b border-gray-100">
                                <td className="py-2 pr-4 text-gray-700">{row.customer}</td>
                                <td className="py-2 pr-4 text-gray-700">{row.uniqueDoiCount}</td>
                                <td className="py-2 pr-4 text-gray-700 font-semibold">{row.errorCount}</td>
                              </tr>
                            ))}
                            {customerSummary.length === 0 && (
                              <tr>
                                <td colSpan={3} className="py-3 text-gray-500">No customer data</td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Recommended Actions</h2>
                    <div className="space-y-2 text-sm text-gray-700">
                      <p>1. Prioritize fixing <span className="font-semibold">{topIssues[0]?.category ?? 'top issue'}</span>, it contributes the highest volume in current filters.</p>
                      <p>2. Review stage <span className="font-semibold">{stageDistribution[0]?.stage ?? 'N/A'}</span>, which currently has the highest concentration of errors.</p>
                      <p>3. Monitor trend change {trendDelta === null ? 'after next upload.' : `(${trendDelta > 0 ? '+' : ''}${trendDelta}%)`} to validate quality improvement.</p>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {activeTab === 'history' && (
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Upload History</h1>
                <p className="text-gray-600">Select an upload to open full analysis details</p>
              </div>

              {historyError && (
                <div className="mb-4 text-sm text-red-600">{historyError}</div>
              )}

              {loading && (
                <div className="text-center py-12">
                  <div className="inline-block animate-spin rounded-full h-10 w-10 border-4 border-orange-500 border-t-transparent"></div>
                  <p className="mt-3 text-gray-600">Loading selected upload...</p>
                </div>
              )}

              {!loading && !selectedHistoryUploadId && (
                <p className="text-gray-600">Select an upload from the left sidebar to view details.</p>
              )}

              {!loading && selectedHistoryUploadId && (
                <>
                  <FilterPanel
                    customers={customerOptions}
                    projects={projectOptions}
                    stages={stageOptions}
                    selectedCustomers={selectedCustomers}
                    selectedProjects={selectedProjects}
                    selectedStages={selectedStages}
                    selectedDOI={selectedDOI}
                    onCustomersChange={setSelectedCustomers}
                    onProjectsChange={setSelectedProjects}
                    onStagesChange={setSelectedStages}
                    onDOIChange={setSelectedDOI}
                  />

                  <StatisticsCards
                    totalEntries={filteredEntries.length}
                    totalErrors={filteredEntries.length}
                    categoriesFound={new Set(filteredEntries.map((e) => getDisplayCategory(e))).size}
                  />

                  <ErrorDistribution data={categoryDistribution} />
                  <ErrorsByCategory entries={filteredEntries} />
                </>
              )}
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="text-center py-12">
              <h1 className="text-3xl font-bold text-gray-900 mb-4">Settings</h1>
              <p className="text-gray-600">Settings features coming soon</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
