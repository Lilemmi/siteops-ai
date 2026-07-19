import i18n from '../i18n';
import {StructuredReport} from '../types/report';
import {getLocalizedReport} from './contentLocalization';

export type ReviewSeverity = 'ok' | 'warning';

export interface ReviewField {
  key: string;
  label: string;
  value: string;
  severity: ReviewSeverity;
}

function listValue(items: string[]) {
  return items.length ? items.join(', ') : i18n.t('common.notSpecified');
}

function severity(hasValue: boolean): ReviewSeverity {
  return hasValue ? 'ok' : 'warning';
}

export function buildReportReview(report: StructuredReport): ReviewField[] {
  const localized = getLocalizedReport(report, i18n.language);
  return [
    {
      key: 'workers',
      label: i18n.t('report.workers'),
      value: report.workersCount == null ? i18n.t('common.notSpecified') : String(report.workersCount),
      severity: severity(report.workersCount != null),
    },
    {
      key: 'site',
      label: i18n.t('export.site'),
      value: localized.site || i18n.t('common.notSpecified'),
      severity: severity(Boolean(report.site)),
    },
    {
      key: 'location',
      label: i18n.t('report.location'),
      value: listValue(report.floors),
      severity: severity(report.floors.length > 0),
    },
    {
      key: 'workHours',
      label: i18n.t('export.workHours'),
      value: localized.workHours || i18n.t('common.notSpecified'),
      severity: severity(Boolean(report.workHours && !/not specified|не указан|לא צוין/i.test(report.workHours))),
    },
    {
      key: 'completedWork',
      label: i18n.t('report.tasksCompleted'),
      value: localized.completedWork.length
        ? localized.completedWork.map(item => item.description).join(', ')
        : i18n.t('common.notSpecified'),
      severity: severity(report.completedWork.length > 0),
    },
    {
      key: 'materials',
      label: i18n.t('report.materialsMissing'),
      value: report.missingMaterials.length
        ? i18n.t('report.reviewItemsCount', {count: report.missingMaterials.length})
        : i18n.t('common.none'),
      severity: 'ok',
    },
    {
      key: 'delays',
      label: i18n.t('report.delays'),
      value: report.delays.length ? i18n.t('report.reviewItemsCount', {count: report.delays.length}) : i18n.t('common.none'),
      severity: report.delays.length ? 'warning' : 'ok',
    },
  ];
}

export function hasReviewWarnings(report: StructuredReport) {
  return report.source === 'demo' || buildReportReview(report).some(field => field.severity === 'warning');
}
