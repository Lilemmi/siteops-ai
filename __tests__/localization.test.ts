import i18n from '../src/i18n';
import {createDemoReport} from '../src/services/reportService';

describe('localization', () => {
  it.each([
    ['en', 'dashboard.greeting', 'Good morning, Alex'],
    ['ru', 'dashboard.greeting', 'Доброе утро, Алекс'],
    ['he', 'dashboard.greeting', 'בוקר טוב, אלכס'],
  ] as const)('loads the %s interface dictionary', async (language, key, expected) => {
    await i18n.changeLanguage(language);
    expect(i18n.t(key)).toBe(expected);
  });

  it('keeps local analysis output in the detected report language', () => {
    const english = createDemoReport('Three workers installed profiles. The lift was unavailable.', 'auto');
    const hebrew = createDemoReport('שלושה עובדים התקינו פרופילים. המעלית לא הייתה זמינה.', 'auto');

    expect(english.inputLanguage).toBe('en');
    expect(english.summary).toMatch(/Three workers/);
    expect(hebrew.inputLanguage).toBe('he');
    expect(hebrew.summary).toMatch(/שלושה עובדים/);
  });
});
