import {expenseTotals, paymentTotal, SiteExpense, SitePayment} from '../src/services/financeService';

describe('finance calculations', () => {
  const payments: SitePayment[] = [
    {id: '1', siteId: 'a', vendor: 'A', invoice: '1', amount: 100, status: 'paid', date: '2026-01-01', note: ''},
    {id: '2', siteId: 'a', vendor: 'B', invoice: '2', amount: 40, status: 'pending', date: '2026-01-02', note: ''},
  ];

  const expenses: SiteExpense[] = [
    {id: '1', siteId: 'a', category: 'labor', amount: 70, description: 'Labor', date: '2026-01-01'},
    {id: '2', siteId: 'a', category: 'materials', amount: 30, description: 'Materials', date: '2026-01-01'},
  ];

  it('separates paid and pending payment totals', () => {
    expect(paymentTotal(payments, 'paid')).toBe(100);
    expect(paymentTotal(payments, 'pending')).toBe(40);
    expect(paymentTotal(payments)).toBe(140);
  });

  it('calculates cost totals by category', () => {
    expect(expenseTotals(expenses)).toEqual({labor: 70, materials: 30, equipment: 0, other: 0});
  });
});
