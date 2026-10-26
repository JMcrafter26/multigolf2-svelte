import { expect, test } from '@playwright/test';

test('lists all level packs with one unlocked level each', async ({ page }) => {
	await page.goto('/mono/');
	const packs = page.locator('#level-packs .level-pack');
	await expect(packs).toHaveCount(3);
	await expect(packs.nth(0)).toContainText('Fun Arena');
	await expect(packs.nth(1)).toContainText('Starter Hills');
	await expect(packs.nth(2)).toContainText('Stacking');

	for (let index = 0; index < 3; index++) {
		await expect(packs.nth(index).locator('.levels-container .level')).toHaveCount(
			index === 0 ? 8 : index === 1 ? 16 : 10
		);
		await expect(packs.nth(index).locator('.levels-container a.level')).toHaveCount(1);
	}
});

test('starts a challenge for a pack', async ({ page }) => {
	await page.goto('/mono/');
	const challengeLink = page.locator('#level-packs .level-pack').first().locator('a.linkbutton');
	await expect(challengeLink).toHaveAttribute('href', '/level/?pack=fun&challenge=true&id=1');
	await challengeLink.click();

	await expect(page).toHaveURL(/\/level\/\?pack=fun&challenge=true&id=1/);
	await expect(page.locator('#level-canvas')).toBeVisible();
	await expect(page.locator('.level-display output')).toHaveText('01');
	await expect(page.locator('.challenge-indicator')).toBeVisible();

	await page.locator('.level-header .menu-link').click();
	await expect(page).toHaveURL(/\/mono\/$/);
});

test('redirects locked levels back to the pack overview', async ({ page }) => {
	await page.goto('/level/?pack=fun&id=5');
	await expect(page).toHaveURL(/\/mono\/$/);
});

test('loads a level that uses the legacy long-form object keys', async ({ page }) => {
	// The "grass" pack stores objects with long key names (type/pos/size/...)
	// instead of the compact ones (t/p/s/...).
	await page.goto('/level/?pack=grass&id=1');
	await expect(page.locator('#level-canvas')).toBeVisible();
	await expect(page.locator('.level-display output')).toHaveText('01');
	await expect(page).toHaveURL(/\/level\/\?pack=grass&id=1/);
});
