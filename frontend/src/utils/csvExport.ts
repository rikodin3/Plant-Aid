import api from '../services/api';
import { HistoryLog, Remedy } from '../types';

/**
 * Escapes a cell value for standard RFC-4180 CSV compliance.
 */
function escapeCsv(val: unknown): string {
  if (val === null || val === undefined) return '';
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Extracts a human-readable image identifier from storage URI or URL.
 */
export function extractImageIdentifier(uri?: string | null): string {
  if (!uri) return 'unspecified-frame.jpg';
  const clean = uri.replace(/[?#].*$/, '').trim();
  const parts = clean.split('/');
  return parts[parts.length - 1] || clean;
}

/**
 * Parses bounding box JSON into a clean coordinates string.
 */
function formatBoundingBox(bboxJson?: string | null): string {
  if (!bboxJson) return 'Full Leaf / Unspecified';
  try {
    const parsed = typeof bboxJson === 'string' ? JSON.parse(bboxJson) : bboxJson;
    if (parsed && typeof parsed.x_min === 'number') {
      return `x_min=${parsed.x_min.toFixed(2)}, y_min=${parsed.y_min.toFixed(2)}, x_max=${parsed.x_max.toFixed(2)}, y_max=${parsed.y_max.toFixed(2)}`;
    }
    return String(bboxJson);
  } catch {
    return String(bboxJson);
  }
}

/**
 * Formats remedies into categorized treatment text.
 */
function categorizeRemedies(remedies: Remedy[] | undefined, isHealthy: boolean): {
  organic: string;
  chemical: string;
  cultural: string;
  summary: string;
} {
  if (isHealthy) {
    return {
      organic: 'Rhizobium Bio-Fertilizer (Seed/soil inoculation to sustain vigor)',
      chemical: 'None required (Foliage is healthy)',
      cultural: 'Maintain optimal irrigation, balanced NPK nutrition, and routine crop scouting.',
      summary: 'Healthy foliage baseline. No curative chemical intervention needed. Maintain preventive nutrition and crop scouting.',
    };
  }

  if (!remedies || remedies.length === 0) {
    return {
      organic: 'Consult local agricultural extension for bio-protective sprays.',
      chemical: 'Apply recommended curative fungicide upon confirmed pathogen spread.',
      cultural: 'Sanitize equipment; eliminate volunteer host weeds within field perimeter.',
      summary: 'Pathogen detected. Initiate field sanitation and inspect surrounding foliage.',
    };
  }

  const organicList: string[] = [];
  const chemicalList: string[] = [];
  const culturalList: string[] = [];
  const summaryList: string[] = [];

  for (const r of remedies) {
    const title = r.title || '';
    const desc = r.description || '';
    const cat = (r.category || '').toLowerCase();
    const formatted = desc ? `${title} — ${desc}` : title;

    if (cat.includes('organic') || cat.includes('biological')) {
      organicList.push(formatted);
    } else if (cat.includes('chemical') || cat.includes('fungicide')) {
      chemicalList.push(formatted);
    } else {
      culturalList.push(formatted);
    }

    summaryList.push(`[${r.remedy_type || 'Care'}] ${title}: ${desc}`);
  }

  return {
    organic: organicList.length > 0 ? organicList.join(' | ') : 'None specified',
    chemical: chemicalList.length > 0 ? chemicalList.join(' | ') : 'None specified',
    cultural: culturalList.length > 0 ? culturalList.join(' | ') : 'None specified',
    summary: summaryList.length > 0 ? summaryList.join(' | ') : 'Follow integrated pest management (IPM) guidelines.',
  };
}

/**
 * Generates an RFC-4180 compliant CSV string from an array of HistoryLog records.
 */
export function generateHistoryCsv(logs: HistoryLog[]): string {
  const headers = [
    'Log ID',
    'Diagnosis Timestamp (UTC)',
    'Diagnosis Date',
    'Crop / Plant Species',
    'Leaf Status',
    'Condition Name',
    'Scientific Name',
    'Disease ID / Code',
    'Severity Level',
    'Confidence (%)',
    'Image Identifier',
    'Detection Bounding Box',
    'Treatment Required',
    'Organic / Biological Treatments',
    'Chemical / Fungicide Treatments',
    'Preventive Cultural Practices',
    'Consolidated Treatment Summary',
  ];

  const rows = logs.map((log) => {
    const isHealthy =
      log.leaf_status === 'Healthy' ||
      log.disease_id === 'healthy_leaf' ||
      (log.disease_name || '').toLowerCase().includes('healthy');

    const leafStatus = isHealthy ? 'Healthy' : 'Diseased';
    const treatmentReq = isHealthy ? 'No (Healthy Foliage)' : 'Yes';

    const plantSpecies = log.plant_species || 'Groundnut (Arachis hypogaea)';
    const sciName = log.scientific_name || (isHealthy ? 'Arachis hypogaea L.' : 'Passalora arachidicola / Puccinia arachidis');
    const severity = log.severity_level || (isHealthy ? 'NONE' : 'MEDIUM');

    const remediesData = categorizeRemedies(log.remedies, isHealthy);

    const rawDate = log.diagnosis_timestamp ? new Date(log.diagnosis_timestamp) : null;
    const dateStr = rawDate && !Number.isNaN(rawDate.getTime()) ? rawDate.toISOString().slice(0, 10) : '';
    const timeStr = log.diagnosis_timestamp || '';

    const confScore = typeof log.confidence_score === 'number'
      ? `${(log.confidence_score * 100).toFixed(1)}%`
      : 'N/A';

    const imgId = log.image_identifier || extractImageIdentifier(log.s3_storage_uri);
    const bboxStr = formatBoundingBox(log.bounding_box_json);

    return [
      log.id,
      timeStr,
      dateStr,
      plantSpecies,
      leafStatus,
      log.disease_name,
      sciName,
      log.disease_id,
      severity,
      confScore,
      imgId,
      bboxStr,
      treatmentReq,
      remediesData.organic,
      remediesData.chemical,
      remediesData.cultural,
      remediesData.summary,
    ];
  });

  // Prepend UTF-8 Byte Order Mark (BOM) for accurate Excel display of unicode characters
  const csvBody = [
    headers.map(escapeCsv).join(','),
    ...rows.map((r) => r.map(escapeCsv).join(',')),
  ].join('\r\n');

  return `\ufeff${csvBody}`;
}

/**
 * Downloads CSV content as a client-side file.
 */
export function downloadCsvFile(csvContent: string, filename: string): void {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Client-side fallback export for provided in-memory history logs.
 */
export function exportLogsToCsvClientSide(logs: HistoryLog[], filenamePrefix = 'groundnut-aid-history'): void {
  if (!logs || logs.length === 0) return;
  const csvContent = generateHistoryCsv(logs);
  const dateStamp = new Date().toISOString().slice(0, 10);
  downloadCsvFile(csvContent, `${filenamePrefix}-${dateStamp}.csv`);
}

/**
 * Downloads complete history export from the backend /api/history/export endpoint.
 * Seamlessly falls back to client-side generation if the network request fails.
 */
export async function downloadHistoryCsv(options?: {
  disease_id?: string;
  date_from?: string;
  date_to?: string;
  fallbackLogs?: HistoryLog[];
}): Promise<void> {
  const dateStamp = new Date().toISOString().slice(0, 10);
  const defaultFilename = `groundnut-aid-history-${dateStamp}.csv`;

  try {
    const params: Record<string, string> = {};
    if (options?.disease_id && options.disease_id !== 'all') {
      params.disease_id = options.disease_id;
    }
    if (options?.date_from) params.date_from = options.date_from;
    if (options?.date_to) params.date_to = options.date_to;

    const res = await api.get('/api/history/export', {
      params,
      responseType: 'blob',
    });

    // Try extracting filename from Content-Disposition header
    let filename = defaultFilename;
    const disposition = res.headers?.['content-disposition'];
    if (disposition && disposition.includes('filename=')) {
      const match = disposition.match(/filename=["']?([^"';]+)["']?/);
      if (match && match[1]) {
        filename = match[1];
      }
    }

    const blob = new Blob([res.data], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (err) {
    console.warn('Backend CSV export failed, falling back to client-side generation', err);
    if (options?.fallbackLogs && options.fallbackLogs.length > 0) {
      exportLogsToCsvClientSide(options.fallbackLogs);
    } else {
      throw err;
    }
  }
}
