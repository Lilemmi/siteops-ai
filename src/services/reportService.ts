import {API_BASE_URL} from '../config';
import {InputLanguage, ReportTranslation, StructuredReport} from '../types/report';

const today = () => new Date().toISOString().slice(0, 10);

export async function analyzeReport(
  text: string,
  language: InputLanguage,
): Promise<StructuredReport> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/reports/analyze`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({text, language, date: today()}),
    });

    if (!response.ok) {
      throw new Error(`API returned ${response.status}`);
    }

    return (await response.json()) as StructuredReport;
  } catch {
    return createDemoReport(text, language);
  }
}

export function createDemoReport(
  originalText: string,
  language: InputLanguage,
): StructuredReport {
  const lower = originalText.toLowerCase();
  const isRussian = /[а-яё]/i.test(originalText);
  const isHebrew = /[\u0590-\u05ff]/.test(originalText);
  const hasLiftDelay =
    lower.includes('лифт') || lower.includes('lift') || originalText.includes('מעלית');
  const detectedLanguage: 'ru' | 'he' | 'en' =
    language === 'auto' ? (isHebrew ? 'he' : isRussian ? 'ru' : 'en') : language;
  const copies = {
    en: {
      missing: 'Not specified', profile: 'Metal profile installation', cutting: 'Metal cutting', metal: 'Metal profile', nuts: 'Nuts', fasteners: 'Fasteners', boxes: '2 boxes',
      liftReason: 'Elevator was unavailable', liftImpact: 'Material delivery was slowed down', risk: 'Additional labor costs and partial schedule slippage are possible.', noRisk: 'Insufficient data for an assessment.',
      tasks: ['Supply nuts and two boxes of fasteners', 'Confirm elevator availability', 'Continue installing profiles on level 20'],
      summary: 'Three workers installed profiles and cut metal. Work was slowed by the unavailable elevator and missing fasteners.',
      managerMessage: 'Today 3 workers were on site. Two installed profiles on level 20 and one cut metal. The elevator was unavailable and nuts plus two boxes of fasteners are missing. Materials must be completed and elevator availability confirmed for tomorrow.',
    },
    ru: {
      missing: 'Не указано', profile: 'Монтаж профилей', cutting: 'Резка металла', metal: 'Металлический профиль', nuts: 'Гайки', fasteners: 'Крепёж', boxes: '2 коробки',
      liftReason: 'Лифт не работал', liftImpact: 'Доставка материалов замедлена', risk: 'Возможны дополнительные трудозатраты и перенос части работ.', noRisk: 'Недостаточно данных для оценки.',
      tasks: ['Обеспечить гайки и две коробки крепежа', 'Проверить доступность лифта', 'Продолжить монтаж профилей на 20-м этаже'],
      summary: 'Три работника выполняли монтаж профилей и резку металла. Работы замедлены из-за отсутствия лифта и нехватки крепежа.',
      managerMessage: 'Сегодня на объекте работали 3 человека. Двое монтировали профили на 20-м этаже, один резал металл. Лифт не работал, не хватает гаек и двух коробок крепежа. Нужно закрыть материалы и подтвердить доступность лифта на завтра.',
    },
    he: {
      missing: 'לא צוין', profile: 'התקנת פרופילי מתכת', cutting: 'חיתוך מתכת', metal: 'פרופיל מתכת', nuts: 'אומים', fasteners: 'מחברים', boxes: '2 קופסאות',
      liftReason: 'המעלית לא הייתה זמינה', liftImpact: 'אספקת החומרים התעכבה', risk: 'ייתכנו שעות עבודה נוספות ודחייה חלקית בלוח הזמנים.', noRisk: 'אין מספיק מידע להערכה.',
      tasks: ['לספק אומים ושתי קופסאות מחברים', 'לוודא שהמעלית זמינה', 'להמשיך בהתקנת הפרופילים בקומה 20'],
      summary: 'שלושה עובדים התקינו פרופילים וחתכו מתכת. העבודה התעכבה בשל היעדר מעלית ומחסור במחברים.',
      managerMessage: 'שלום, היום עבדו באתר 3 עובדים. שניים התקינו פרופילים בקומה 20 ועובד אחד חתך מתכת. המעלית לא עבדה וחסרים אומים ושתי קופסאות מחברים. נדרש להשלים את החומרים ולוודא שהמעלית זמינה למחר.',
    },
  };
  const numericWorkers = originalText.match(/\b(\d{1,3})\s*(workers?|рабоч|עובד)/i)?.[1] ?? originalText.match(/\b(\d{1,3})\b/)?.[1];
  const workersCount = numericWorkers
    ? Number(numericWorkers)
    : lower.includes('двенадцать') || lower.includes('twelve') || originalText.includes('שנים עשר') || originalText.includes('12')
      ? 12
      : lower.includes('три') || lower.includes('three') || originalText.includes('שלושה')
      ? 3
      : null;
  const floors = Array.from(
    new Set(
      [
        ...Array.from(originalText.matchAll(/(?:этаж|этаже|level|floor|уровне|קומה)\s*[-:]?\s*(\d{1,3})/gi)).map(match => match[1]),
        ...Array.from(originalText.matchAll(/\b(\d{1,3})(?:-м|-й|st|nd|rd|th)?\s*(?:этаж|этаже|level|floor|קומה)/gi)).map(match => match[1]),
      ].filter(Boolean),
    ),
  );
  const sections = Array.from(
    new Set(
      Array.from(originalText.matchAll(/(?:секци[ия]|section|אזור)\s*([A-ZА-Яא-ת])/gi)).map(match => match[1].toUpperCase()),
    ),
  );
  const locations = floors.length ? floors : sections.length ? sections.map(section => `Section ${section}`) : ['20'];
  const hasDrywall = lower.includes('гкл') || lower.includes('drywall') || originalText.includes('גבס');
  const hasDowel = lower.includes('дюб') || lower.includes('dowel') || originalText.includes('דיבל');
  const hasScrews = lower.includes('саморез') || lower.includes('screw') || originalText.includes('ברג');
  const buildTranslation = (target: 'en' | 'ru' | 'he'): ReportTranslation => {
    const targetCopy = copies[target];
    const targetMissingMaterials = [
      hasDowel ? {name: target === 'ru' ? 'Дюбель-гвозди 6×40' : target === 'he' ? 'דיבלים־מסמרים 6×40' : 'Dowel nails 6×40', quantity: targetCopy.missing} : {name: targetCopy.nuts, quantity: targetCopy.missing},
      hasScrews || hasDrywall ? {name: target === 'ru' ? 'Саморезы для ГКЛ' : target === 'he' ? 'ברגים ללוחות גבס' : 'Drywall screws', quantity: targetCopy.missing} : {name: targetCopy.fasteners, quantity: targetCopy.boxes},
    ];

    return {
      site: lower.includes('skyline') || lower.includes('скайлайн') ? 'Skyline Tower' : 'Tower A',
      workHours: targetCopy.missing,
      paymentType: targetCopy.missing,
      completedWork: [
        {description: targetCopy.profile, workers: workersCount && workersCount > 3 ? workersCount : 2, floors: locations},
        {description: targetCopy.cutting, workers: workersCount && workersCount > 3 ? null : 1, floors: []},
      ],
      usedMaterials: [{name: targetCopy.metal, quantity: targetCopy.missing}],
      missingMaterials: targetMissingMaterials,
      delays: hasLiftDelay
        ? [{reason: targetCopy.liftReason, impact: targetCopy.liftImpact}]
        : [],
      responsiblePeople: [],
      financialImpact: hasLiftDelay ? targetCopy.risk : targetCopy.noRisk,
      nextDayTasks: targetCopy.tasks,
      contradictions: [],
      managerMessage: targetCopy.managerMessage,
      summary: targetCopy.summary,
    };
  };
  const translations = {
    en: buildTranslation('en'),
    ru: buildTranslation('ru'),
    he: buildTranslation('he'),
  };
  const current = translations[detectedLanguage];

  return {
    id: `${Date.now()}`,
    createdAt: new Date().toISOString(),
    source: 'demo',
    originalText,
    inputLanguage: detectedLanguage,
    site: current.site,
    reportDate: today(),
    workersCount,
    workHours: current.workHours,
    paymentType: current.paymentType,
    completedWork: current.completedWork,
    floors: locations,
    usedMaterials: current.usedMaterials,
    missingMaterials: current.missingMaterials,
    delays: current.delays,
    responsiblePeople: current.responsiblePeople,
    financialImpact: current.financialImpact,
    nextDayTasks: current.nextDayTasks,
    contradictions: current.contradictions,
    managerMessageHebrew: translations.he.managerMessage,
    summary: current.summary,
    translations,
  };
}
