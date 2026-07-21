import {AppLanguage} from '../i18n';
import {DelayItem, MaterialItem, ReportTranslation, StructuredReport, WorkItem} from '../types/report';

type ReportLocale = 'en' | 'ru' | 'he';

const phraseMap: Record<string, Record<ReportLocale, string>> = {
  'not specified': {en: 'Not specified', ru: 'Не указано', he: 'לא צוין'},
  'не указано': {en: 'Not specified', ru: 'Не указано', he: 'לא צוין'},
  'לא צוין': {en: 'Not specified', ru: 'Не указано', he: 'לא צוין'},
  '2 boxes': {en: '2 boxes', ru: '2 коробки', he: '2 קופסאות'},
  '2 коробки': {en: '2 boxes', ru: '2 коробки', he: '2 קופסאות'},
  '2 קופסאות': {en: '2 boxes', ru: '2 коробки', he: '2 קופסאות'},
  'metal profile installation': {en: 'Metal profile installation', ru: 'Монтаж металлических профилей', he: 'התקנת פרופילי מתכת'},
  'монтаж профилей': {en: 'Metal profile installation', ru: 'Монтаж металлических профилей', he: 'התקנת פרופילי מתכת'},
  'התקנת פרופילי מתכת': {en: 'Metal profile installation', ru: 'Монтаж металлических профилей', he: 'התקנת פרופילי מתכת'},
  'metal cutting': {en: 'Metal cutting', ru: 'Резка металла', he: 'חיתוך מתכת'},
  'резка металла': {en: 'Metal cutting', ru: 'Резка металла', he: 'חיתוך מתכת'},
  'חיתוך מתכת': {en: 'Metal cutting', ru: 'Резка металла', he: 'חיתוך מתכת'},
  'metal profile': {en: 'Metal profile', ru: 'Металлический профиль', he: 'פרופיל מתכת'},
  'металлический профиль': {en: 'Metal profile', ru: 'Металлический профиль', he: 'פרופיל מתכת'},
  'פרופיל מתכת': {en: 'Metal profile', ru: 'Металлический профиль', he: 'פרופיל מתכת'},
  nuts: {en: 'Nuts', ru: 'Гайки', he: 'אומים'},
  'гайки': {en: 'Nuts', ru: 'Гайки', he: 'אומים'},
  'אומים': {en: 'Nuts', ru: 'Гайки', he: 'אומים'},
  fasteners: {en: 'Fasteners', ru: 'Крепёж', he: 'מחברים'},
  'крепёж': {en: 'Fasteners', ru: 'Крепёж', he: 'מחברים'},
  'крепеж': {en: 'Fasteners', ru: 'Крепёж', he: 'מחברים'},
  'מחברים': {en: 'Fasteners', ru: 'Крепёж', he: 'מחברים'},
  'drywall screws': {en: 'Drywall screws', ru: 'Саморезы для ГКЛ', he: 'ברגים ללוחות גבס'},
  'саморезы для гкл': {en: 'Drywall screws', ru: 'Саморезы для ГКЛ', he: 'ברגים ללוחות גבס'},
  'ברגים ללוחות גבס': {en: 'Drywall screws', ru: 'Саморезы для ГКЛ', he: 'ברגים ללוחות גבס'},
  'dowel nails 6x40': {en: 'Dowel nails 6×40', ru: 'Дюбель-гвозди 6×40', he: 'דיבלים־מסמרים 6×40'},
  'dowel nails 6×40': {en: 'Dowel nails 6×40', ru: 'Дюбель-гвозди 6×40', he: 'דיבלים־מסמרים 6×40'},
  '6×40 dowel nails': {en: 'Dowel nails 6×40', ru: 'Дюбель-гвозди 6×40', he: 'דיבלים־מסמרים 6×40'},
  'дюбель-гвозди 6×40': {en: 'Dowel nails 6×40', ru: 'Дюбель-гвозди 6×40', he: 'דיבלים־מסמרים 6×40'},
  'דיבלים 6×40': {en: 'Dowel nails 6×40', ru: 'Дюбель-гвозди 6×40', he: 'דיבלים־מסמרים 6×40'},
  'elevator was unavailable': {en: 'Elevator was unavailable', ru: 'Лифт не работал', he: 'המעלית לא הייתה זמינה'},
  'лифт не работал': {en: 'Elevator was unavailable', ru: 'Лифт не работал', he: 'המעלית לא הייתה זמינה'},
  'המעלית לא הייתה זמינה': {en: 'Elevator was unavailable', ru: 'Лифт не работал', he: 'המעלית לא הייתה זמינה'},
  'material delivery was slowed down': {en: 'Material delivery was slowed down', ru: 'Доставка материалов замедлена', he: 'אספקת החומרים התעכבה'},
  'доставка материалов замедлена': {en: 'Material delivery was slowed down', ru: 'Доставка материалов замедлена', he: 'אספקת החומרים התעכבה'},
  'אספקת החומרים התעכבה': {en: 'Material delivery was slowed down', ru: 'Доставка материалов замедлена', he: 'אספקת החומרים התעכבה'},
  'possible extra labor costs and partial work rescheduling.': {
    en: 'Possible extra labor costs and partial work rescheduling.',
    ru: 'Возможны дополнительные трудозатраты и перенос части работ.',
    he: 'ייתכנו עלויות עבודה נוספות ודחייה של חלק מהעבודות.',
  },
  'возможны дополнительные трудозатраты и перенос части работ.': {
    en: 'Possible extra labor costs and partial work rescheduling.',
    ru: 'Возможны дополнительные трудозатраты и перенос части работ.',
    he: 'ייתכנו עלויות עבודה נוספות ודחייה של חלק מהעבודות.',
  },
  'ייתכנו עלויות עבודה נוספות ודחייה של חלק מהעבודות.': {
    en: 'Possible extra labor costs and partial work rescheduling.',
    ru: 'Возможны дополнительные трудозатраты и перенос части работ.',
    he: 'ייתכנו עלויות עבודה נוספות ודחייה של חלק מהעבודות.',
  },
  'additional labor costs and partial schedule slippage are possible.': {
    en: 'Additional labor costs and partial schedule slippage are possible.',
    ru: 'Возможны дополнительные трудозатраты и частичный сдвиг графика.',
    he: 'ייתכנו עלויות עבודה נוספות וסטייה חלקית מלוח הזמנים.',
  },
  'три работника выполняли монтаж профилей и резку металла. работы замедлены из-за отсутствия лифта и нехватки крепежа.': {
    en: 'Three workers installed profiles and cut metal. Work was slowed by the unavailable elevator and missing fasteners.',
    ru: 'Три работника выполняли монтаж профилей и резку металла. Работы замедлены из-за отсутствия лифта и нехватки крепежа.',
    he: 'שלושה עובדים התקינו פרופילים וחתכו מתכת. העבודה התעכבה בשל היעדר מעלית ומחסור במחברים.',
  },
  'three workers installed profiles and cut metal. work was slowed by the unavailable elevator and missing fasteners.': {
    en: 'Three workers installed profiles and cut metal. Work was slowed by the unavailable elevator and missing fasteners.',
    ru: 'Три работника выполняли монтаж профилей и резку металла. Работы замедлены из-за отсутствия лифта и нехватки крепежа.',
    he: 'שלושה עובדים התקינו פרופילים וחתכו מתכת. העבודה התעכבה בשל היעדר מעלית ומחסור במחברים.',
  },
  'обеспечить гайки и две коробки крепежа': {
    en: 'Supply nuts and two boxes of fasteners',
    ru: 'Обеспечить гайки и две коробки крепежа',
    he: 'לספק אומים ושתי קופסאות מחברים',
  },
  'supply nuts and two boxes of fasteners': {
    en: 'Supply nuts and two boxes of fasteners',
    ru: 'Обеспечить гайки и две коробки крепежа',
    he: 'לספק אומים ושתי קופסאות מחברים',
  },
  'проверить доступность лифта': {
    en: 'Confirm elevator availability',
    ru: 'Проверить доступность лифта',
    he: 'לוודא שהמעלית זמינה',
  },
  'confirm elevator availability': {
    en: 'Confirm elevator availability',
    ru: 'Проверить доступность лифта',
    he: 'לוודא שהמעלית זמינה',
  },
  'продолжить монтаж профилей на 20-м этаже': {
    en: 'Continue installing profiles on level 20',
    ru: 'Продолжить монтаж профилей на 20-м этаже',
    he: 'להמשיך בהתקנת הפרופילים בקומה 20',
  },
  'continue installing profiles on level 20': {
    en: 'Continue installing profiles on level 20',
    ru: 'Продолжить монтаж профилей на 20-м этаже',
    he: 'להמשיך בהתקנת הפרופילים בקומה 20',
  },
  'site manager': {en: 'Site Manager', ru: 'Менеджер объекта', he: 'מנהל אתר'},
  procurement: {en: 'Procurement', ru: 'Снабжение', he: 'רכש'},
  logistics: {en: 'Logistics', ru: 'Логистика', he: 'לוגיסטיקה'},
  'safety officer': {en: 'Safety Officer', ru: 'Инженер по безопасности', he: 'קצין בטיחות'},
};

function targetLanguage(language: string): ReportLocale {
  return language === 'ru' || language === 'he' ? language : 'en';
}

function hasCyrillic(value: string) {
  return /[а-яё]/i.test(value);
}

function hasHebrew(value: string) {
  return /[\u0590-\u05ff]/.test(value);
}

function looksWrongForTarget(value: string, target: ReportLocale) {
  if (!value.trim()) {
    return false;
  }
  if (target === 'en') {
    return hasCyrillic(value) || hasHebrew(value);
  }
  if (target === 'ru') {
    return hasHebrew(value);
  }
  return hasCyrillic(value);
}

function safeText(value: string | undefined, fallback: string, target: ReportLocale) {
  if (!value || looksWrongForTarget(value, target)) {
    return localizeText(fallback, target);
  }
  return localizeText(value, target);
}

export function localizeText(value: string, language: AppLanguage | string): string {
  const target = targetLanguage(language);
  const trimmed = value.trim();
  if (!trimmed) {
    return value;
  }

  const exact = phraseMap[trimmed.toLowerCase()];
  if (exact) {
    return exact[target];
  }

  return trimmed
    .replace(/\bSection B\b/g, target === 'ru' ? 'Секция B' : target === 'he' ? 'אזור B' : 'Section B')
    .replace(/\bSite logistics\b/g, target === 'ru' ? 'Логистика объекта' : target === 'he' ? 'לוגיסטיקת האתר' : 'Site logistics')
    .replace(/\bSite Manager\b/g, phraseMap['site manager'][target])
    .replace(/\bProcurement\b/g, phraseMap.procurement[target])
    .replace(/\bLogistics\b/g, phraseMap.logistics[target]);
}

function localizeMaterial(item: MaterialItem, language: AppLanguage | string): MaterialItem {
  return {...item, name: localizeText(item.name, language), quantity: localizeText(item.quantity, language)};
}

function localizeWork(item: WorkItem, language: AppLanguage | string): WorkItem {
  return {...item, description: localizeText(item.description, language)};
}

function localizeDelay(item: DelayItem, language: AppLanguage | string): DelayItem {
  return {
    reason: localizeText(item.reason, language),
    impact: localizeText(item.impact, language),
  };
}

export function getLocalizedReport(report: StructuredReport, language: AppLanguage | string): ReportTranslation {
  const target = targetLanguage(language);
  const fallback: ReportTranslation = {
    site: localizeText(report.site, target),
    workHours: localizeText(report.workHours, target),
    paymentType: localizeText(report.paymentType, target),
    completedWork: report.completedWork.map(item => localizeWork(item, target)),
    usedMaterials: report.usedMaterials.map(item => localizeMaterial(item, target)),
    missingMaterials: report.missingMaterials.map(item => localizeMaterial(item, target)),
    delays: report.delays.map(item => localizeDelay(item, target)),
    responsiblePeople: report.responsiblePeople.map(item => localizeText(item, target)),
    financialImpact: localizeText(report.financialImpact, target),
    nextDayTasks: report.nextDayTasks.map(item => localizeText(item, target)),
    contradictions: report.contradictions.map(item => localizeText(item, target)),
    managerMessage: target === 'he' ? report.managerMessageHebrew : localizeText(report.managerMessageHebrew, target),
    summary: localizeText(report.summary, target),
  };
  const translated = report.translations?.[target];
  if (!translated) {
    return fallback;
  }

  return {
    site: safeText(translated.site, fallback.site, target),
    workHours: safeText(translated.workHours, fallback.workHours, target),
    paymentType: safeText(translated.paymentType, fallback.paymentType, target),
    completedWork: translated.completedWork.map((item, index) => ({
      ...item,
      description: safeText(item.description, fallback.completedWork[index]?.description ?? '', target),
    })),
    usedMaterials: translated.usedMaterials.map((item, index) => ({
      name: safeText(item.name, fallback.usedMaterials[index]?.name ?? '', target),
      quantity: safeText(item.quantity, fallback.usedMaterials[index]?.quantity ?? '', target),
    })),
    missingMaterials: translated.missingMaterials.map((item, index) => ({
      name: safeText(item.name, fallback.missingMaterials[index]?.name ?? '', target),
      quantity: safeText(item.quantity, fallback.missingMaterials[index]?.quantity ?? '', target),
    })),
    delays: translated.delays.map((item, index) => ({
      reason: safeText(item.reason, fallback.delays[index]?.reason ?? '', target),
      impact: safeText(item.impact, fallback.delays[index]?.impact ?? '', target),
    })),
    responsiblePeople: translated.responsiblePeople.map((item, index) => safeText(item, fallback.responsiblePeople[index] ?? '', target)),
    financialImpact: safeText(translated.financialImpact, fallback.financialImpact, target),
    nextDayTasks: translated.nextDayTasks.map((item, index) => safeText(item, fallback.nextDayTasks[index] ?? '', target)),
    contradictions: translated.contradictions.map((item, index) => safeText(item, fallback.contradictions[index] ?? '', target)),
    managerMessage: target === 'he'
      ? safeText(translated.managerMessage, fallback.managerMessage, target)
      : safeText(translated.managerMessage, fallback.managerMessage, target),
    summary: safeText(translated.summary, fallback.summary, target),
  };
}
