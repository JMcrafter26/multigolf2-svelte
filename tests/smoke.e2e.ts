import { expect, test } from '@playwright/test';

const staticRoutes = [
	'/',
	'/about/',
	'/contact/',
	'/impressum/',
	'/data-privacy/',
	'/annoy/',
	'/dev/',
	'/promo/esko/'
];

for (const path of staticRoutes) {
	test(`renders ${path}`, async ({ page }) => {
		const errors: string[] = [];
		page.on('pageerror', (error) => errors.push(error.message));

		await page.goto(path);
		await expect(page.locator('main')).toBeVisible();
		await expect(page.locator('html')).toHaveAttribute('lang', /en|de/);
		expect(errors).toEqual([]);
	});
}

test('renders the host setup screen', async ({ page }) => {
	const errors: string[] = [];
	page.on('pageerror', (error) => errors.push(error.message));

	await page.goto('/host/');
	await expect(page.locator('main')).toBeVisible();
	expect(errors).toEqual([]);
});

test('renders the client invalid-code screen without crashing', async ({ page }) => {
	const errors: string[] = [];
	page.on('pageerror', (error) => errors.push(error.message));

	await page.goto('/client/');
	await expect(page.locator('main')).toBeVisible();
	expect(errors).toEqual([]);
});

test('switches language and persists the choice', async ({ page }) => {
	await page.goto('/');
	const html = page.locator('html');
	await expect(html).toHaveAttribute('lang', 'en');

	await page.locator('.header-content .change-lang-button').click();
	await expect(html).toHaveAttribute('lang', 'de');
	expect(await page.evaluate(() => localStorage.getItem('multigolf-lang'))).toBe('de');
});
