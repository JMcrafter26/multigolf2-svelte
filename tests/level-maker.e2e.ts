import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';

test('creates, exports, and previews a level', async ({ page }) => {
	await page.goto('/level-maker/');
	const canvas = page.locator('#level-canvas');
	await expect(canvas).toBeVisible();
	await expect(page.locator('.canvas-loading')).toHaveCount(0);

	const objectRows = page.locator('.object-list .object-row');
	await expect(objectRows).toHaveCount(2);

	await page.locator('.add-object-row select').selectOption('Lava');
	await page.getByRole('button', { name: 'Add Object' }).click();
	await expect(objectRows).toHaveCount(3);

	await page.locator('.file-name-label input').fill('e2e-level');
	const downloadPromise = page.waitForEvent('download');
	await page.getByRole('button', { name: 'Export .muglf' }).click();
	const download = await downloadPromise;
	expect(download.suggestedFilename()).toBe('e2e-level.muglf');

	const downloadPath = await download.path();
	if (!downloadPath) throw new Error('Download path missing');
	const content = await readFile(downloadPath, 'utf8');
	const parsed = JSON.parse(content) as { mode?: string; board?: { objects?: unknown[] } };
	expect(parsed.mode).toBe('sandbox');
	expect(parsed.board?.objects).toHaveLength(3);

	await page.evaluate((value) => localStorage.setItem('level-maker-temp', value), content);
	const preview = await page.context().newPage();
	await preview.goto('/level/?id=editor&pack=none');
	await expect(preview.locator('#level-canvas')).toBeVisible();
	await expect(preview.locator('.level-display output')).toHaveText('??');
	await preview.close();
});
