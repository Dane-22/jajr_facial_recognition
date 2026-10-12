import { test, expect } from '@playwright/test';
const snapshot = {
  startDate: '2026-10-01', endDate: '2026-10-15', sourceHash: 'test-hash', generatedAt: '2026-10-16T00:00:00Z',
  summary: { employees: 1, payableDays: 1.5, base: '900.00', deduction: '40.00', salary: '860.00', needsReview: 0 },
  items: [{ employeeId: 7, name: 'Engineer Example', role: 'Engineer', active: true, rate: '600.00', payableDays: 1.5,
    base: '900.00', deduction: '40.00', salary: '860.00', status: 'READY', exceptions: [],
    details: [{ date: '2026-10-01', schedule: '07:00–16:00', workedMinutes: 460, graceMinutes: 0, lunchMinutes: 60,
      earlyMinutes: 0, afterMinutes: 0, lateMinutes: 20, fullLateDay: true, payableDays: 1, rate: '600.00',
      base: '600.00', deduction: '20.00', salary: '580.00', logs: [
        { id: 1, status: 'IN', timestamp: '2026-09-30T23:20:00Z', site_name: 'Main Office', source: 'scanner' },
        { id: 2, status: 'OUT', timestamp: '2026-10-01T08:00:00Z', site_name: 'Main Office', source: 'scanner' }] },
    { date: '2026-10-02', schedule: '07:00–16:00', workedMinutes: 280, graceMinutes: 0, lunchMinutes: 0,
      earlyMinutes: 0, afterMinutes: 0, lateMinutes: 20, fullLateDay: false, payableDays: 0.5, rate: '600.00',
      base: '300.00', deduction: '20.00', salary: '280.00', logs: [] }] }], transfers: []
};
async function prepare(page, role) {
  await page.addInitScript(position => { localStorage.setItem('admin_token', `header.${btoa(JSON.stringify({ type: 'admin', position }))}.signature`); }, role);
  await page.route('**/api/**', async route => {
    const path = new URL(route.request().url()).pathname;
    let body = {};
    if (path.endsWith('/rates')) body = { employees: [{ id: 7, name: 'Engineer Example', role: 'Engineer' }], rates: [] };
    else if (path.endsWith('/preview')) body = snapshot;
    else if (path.endsWith('/salary/runs')) body = route.request().method() === 'POST' ? { id: 3, status: 'DRAFT', snapshot } : { runs: [], total: 0 };
    else if (path.endsWith('/attendance-timing')) body = { days: [{ date: '2026-10-01', earlyMinutes: 30, afterMinutes: 60 }], employees: [{ employeeId: 7, name: 'Engineer Example', earlyMinutes: 30, afterMinutes: 60 }], excludedRecords: 0 };
    else if (path.endsWith('/stats')) body = { trends: [], employees: [], breakdown: {}, summary: {}, daily_summary: [] };
    else if (path.endsWith('/calendar')) body = { activity: [] };
    else if (path.endsWith('/summary')) body = {};
    await route.fulfill({ contentType: 'application/json', body: JSON.stringify(body) });
  });
  await page.goto('/admin/dashboard');
}
for (const width of [1440, 390, 320]) {
  test(`salary details and responsive layout at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 850 });
    await prepare(page, 'Superadmin');
    if (width < 768) await page.getByRole('button', { name: 'Open menu' }).click();
    await page.getByTestId('nav-salary').click();
    await expect(page.getByRole('heading', { name: 'Salary', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Calculate preview' }).click();
    await expect(page.getByText('Late deductions', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'View Engineer Example' }).filter({ visible: true }).click();
    await expect(page.getByText('Full-day base pay retained:', { exact: false })).toBeVisible();
    await expect(page.getByText(/₱300.00.*₱20.00.*₱280.00/)).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);
    expect(overflow).toBe(false);
    await page.screenshot({ path: `test-results/salary/salary-${width}.png`, fullPage: true });
  });
}
test('Admin can view salary but sees no rate/draft controls; dashboard charts show unpaid durations', async ({ page }) => {
  await prepare(page, 'Admin');
  await page.getByTestId('nav-salary').click();
  await expect(page.getByRole('button', { name: 'Save daily rate' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Save draft' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Calculate preview' }).click();
  await expect(page.getByRole('button', { name: 'Export CSV' })).toBeEnabled();
  await page.getByTestId('nav-dashboard').click();
  await expect(page.getByRole('heading', { name: 'Early-arrival and after-hours attendance' })).toBeVisible();
  await page.getByText('View minutes as a table').click();
  await expect(page.getByRole('cell', { name: '30.00 min' })).toBeVisible();
  await expect(page.getByRole('cell', { name: '60.00 min' })).toBeVisible();
});
