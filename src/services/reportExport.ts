import RNFS from 'react-native-fs';
import Share from 'react-native-share';
import {generatePDF} from 'react-native-html-to-pdf';
import {StructuredReport} from '../types/report';
import i18n from '../i18n';

function csvCell(value: string | number | null | undefined) {
  const normalized = value == null ? '' : String(value);
  return `"${normalized.replaceAll('"', '""')}"`;
}

function csvRow(label: string, value: string | number | null | undefined) {
  return `${csvCell(label)},${csvCell(value)}`;
}

function listText(items: string[]) {
  return items.length ? items.join('; ') : '';
}

export async function shareReportCsv(report: StructuredReport) {
  const rows = [
    csvRow(i18n.t('export.site'), report.site),
    csvRow(i18n.t('export.date'), report.reportDate),
    csvRow(i18n.t('export.workers'), report.workersCount),
    csvRow(i18n.t('export.workHours'), report.workHours),
    csvRow(i18n.t('export.paymentType'), report.paymentType),
    csvRow(i18n.t('export.floors'), listText(report.floors)),
    csvRow(
      i18n.t('export.completedWork'),
      listText(
        report.completedWork.map(
          item =>
            `${item.description} | ${i18n.t('export.workers')}: ${item.workers ?? ''} | ${i18n.t('export.floors')}: ${listText(item.floors)}`,
        ),
      ),
    ),
    csvRow(
      i18n.t('export.usedMaterials'),
      listText(report.usedMaterials.map(item => `${item.name}: ${item.quantity}`)),
    ),
    csvRow(
      i18n.t('export.missingMaterials'),
      listText(report.missingMaterials.map(item => `${item.name}: ${item.quantity}`)),
    ),
    csvRow(i18n.t('export.delays'), listText(report.delays.map(item => `${item.reason}: ${item.impact}`))),
    csvRow(i18n.t('export.responsible'), listText(report.responsiblePeople)),
    csvRow(i18n.t('export.financialImpact'), report.financialImpact),
    csvRow(i18n.t('export.nextTasks'), listText(report.nextDayTasks)),
    csvRow(i18n.t('export.contradictions'), listText(report.contradictions)),
    csvRow(i18n.t('export.managerMessage'), report.managerMessageHebrew),
    csvRow(i18n.t('export.summary'), report.summary),
    csvRow(i18n.t('export.original'), report.originalText),
  ];

  const fileName = `siteops-report-${report.reportDate}-${report.id}.csv`;
  const path = `${RNFS.CachesDirectoryPath}/${fileName}`;
  await RNFS.writeFile(path, rows.join('\n'), 'utf8');

  await Share.open({
    title: i18n.t('export.title'),
    url: `file://${path}`,
    type: 'text/csv',
    filename: fileName,
    failOnCancel: false,
  });

  return path;
}

function escapeHtml(value: string | number | null | undefined) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function htmlList(items: string[]) {
  if (!items.length) {
    return `<p class="muted">${escapeHtml(i18n.t('common.none'))}</p>`;
  }
  return `<ul>${items.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`;
}

function reportHtml(report: StructuredReport) {
  const missing = report.missingMaterials.map(item => `${item.name} ${item.quantity}`.trim());
  const used = report.usedMaterials.map(item => `${item.name} ${item.quantity}`.trim());
  const delays = report.delays.map(item => `${item.reason}: ${item.impact}`);
  const work = report.completedWork.map(item => item.description);
  const photos = report.photos ?? [];
  return `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Helvetica Neue", Arial, sans-serif; color: #111827; padding: 28px; }
          .brand { color: #3B82FF; font-weight: 800; font-size: 14px; letter-spacing: 0.08em; text-transform: uppercase; }
          h1 { font-size: 28px; margin: 6px 0 4px; }
          .meta { color: #6B7280; font-size: 12px; margin-bottom: 22px; }
          .summary { background: #EEF4FF; border-left: 4px solid #3B82FF; border-radius: 10px; padding: 14px; font-size: 14px; line-height: 1.45; }
          .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin: 18px 0; }
          .card { border: 1px solid #E5E7EB; border-radius: 12px; padding: 12px; }
          .label { color: #6B7280; font-size: 11px; font-weight: 700; text-transform: uppercase; }
          .value { font-size: 18px; font-weight: 800; margin-top: 4px; }
          h2 { font-size: 17px; margin: 18px 0 8px; }
          ul { margin: 0; padding-left: 18px; }
          li { margin: 5px 0; line-height: 1.4; }
          .muted { color: #6B7280; }
          .hebrew { direction: rtl; text-align: right; font-size: 15px; line-height: 1.55; border: 1px solid #E5E7EB; border-radius: 12px; padding: 12px; }
          .warning { background: #FFF7ED; border: 1px solid #FDBA74; border-radius: 12px; padding: 12px; color: #9A3412; }
          .photos { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
          .photo { width: 100%; border-radius: 10px; border: 1px solid #E5E7EB; }
        </style>
      </head>
      <body>
        <div class="brand">SiteOps AI</div>
        <h1>${escapeHtml(i18n.t('export.title'))}</h1>
        <div class="meta">${escapeHtml(report.site)} • ${escapeHtml(report.reportDate)} • ${escapeHtml(report.source.toUpperCase())}</div>
        ${report.source === 'demo' ? `<div class="warning">${escapeHtml(i18n.t('report.demoWarning'))}</div>` : ''}
        <p class="summary">${escapeHtml(report.summary)}</p>
        <div class="grid">
          <div class="card"><div class="label">${escapeHtml(i18n.t('export.workers'))}</div><div class="value">${escapeHtml(report.workersCount ?? i18n.t('common.notSpecified'))}</div></div>
          <div class="card"><div class="label">${escapeHtml(i18n.t('export.floors'))}</div><div class="value">${escapeHtml(report.floors.join(', ') || i18n.t('common.notSpecified'))}</div></div>
          <div class="card"><div class="label">${escapeHtml(i18n.t('export.workHours'))}</div><div class="value">${escapeHtml(report.workHours || i18n.t('common.notSpecified'))}</div></div>
          <div class="card"><div class="label">${escapeHtml(i18n.t('export.paymentType'))}</div><div class="value">${escapeHtml(report.paymentType || i18n.t('common.notSpecified'))}</div></div>
        </div>
        <h2>${escapeHtml(i18n.t('export.completedWork'))}</h2>${htmlList(work)}
        <h2>${escapeHtml(i18n.t('export.usedMaterials'))}</h2>${htmlList(used)}
        <h2>${escapeHtml(i18n.t('export.missingMaterials'))}</h2>${htmlList(missing)}
        <h2>${escapeHtml(i18n.t('export.delays'))}</h2>${htmlList(delays)}
        <h2>${escapeHtml(i18n.t('export.nextTasks'))}</h2>${htmlList(report.nextDayTasks)}
        <h2>${escapeHtml(i18n.t('export.financialImpact'))}</h2><p>${escapeHtml(report.financialImpact || i18n.t('common.none'))}</p>
        ${photos.length ? `<h2>${escapeHtml(i18n.t('report.photosInReport'))}</h2><div class="photos">${photos.map(photo => `<img class="photo" src="${escapeHtml(photo.uri)}" />`).join('')}</div>` : ''}
        <h2>${escapeHtml(i18n.t('export.managerMessage'))}</h2><div class="hebrew">${escapeHtml(report.managerMessageHebrew || i18n.t('common.none'))}</div>
      </body>
    </html>
  `;
}

export async function shareReportPdf(report: StructuredReport) {
  const fileName = `siteops-report-${report.reportDate}-${report.id}`;
  const result = await generatePDF({
    html: reportHtml(report),
    fileName,
    padding: 0,
    shouldPrintBackgrounds: true,
  });
  await Share.open({
    title: i18n.t('export.title'),
    url: `file://${result.filePath}`,
    type: 'application/pdf',
    filename: `${fileName}.pdf`,
    failOnCancel: false,
  });
  return result.filePath;
}
