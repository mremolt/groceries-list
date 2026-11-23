import { expect, test } from './fixtures';
import { APP, expectNoAxeViolations, newDevice, newUser, registerThroughUi } from './support';

// Acceptance of FR-LIST-01..05, FR-NAV-06 and BR-01 against the real BFF, database and identity provider. Tag: @real.
test.describe('@real lists', () => {
  test('create, rename, reload by URL and delete one list (FR-LIST-01/02/03/05, FR-NAV-06)', async ({
    page,
    shell,
    lists,
  }) => {
    await registerThroughUi(page, newUser('lists'));

    await lists.create('Wocheneinkauf');
    await expect(shell.heading('Wocheneinkauf')).toBeVisible();
    await expectNoAxeViolations(page, 'list page (real stack)');

    await lists.rename('Großeinkauf');
    await expect(shell.heading('Großeinkauf')).toBeVisible();

    await page.reload();
    await expect(shell.heading('Großeinkauf')).toBeVisible();

    await lists.delete();
    await expect(lists.emptyStateHeading).toBeVisible();
  });

  test('BR-01 / FR-NAV-06 AC2: another person gets the same "not found" as for a missing list', async ({
    page,
    browser,
    shell,
    lists,
  }) => {
    await registerThroughUi(page, newUser('owner'));
    await lists.create('Privat');
    await expect(shell.heading('Privat')).toBeVisible();
    const listUrl = page.url();
    const listId = listUrl.slice(listUrl.lastIndexOf('/') + 1);

    const stranger = await newDevice(browser);
    await registerThroughUi(stranger.page, newUser('stranger'));

    const foreign = await stranger.page.request.get(`${APP}/api/v1/lists/${listId}`);
    const missing = await stranger.page.request.get(`${APP}/api/v1/lists/00000000-0000-4000-8000-000000000000`);
    expect(foreign.status()).toBe(404);
    expect(missing.status()).toBe(404);

    await stranger.page.goto(listUrl);
    await expect(stranger.shell.heading('Privat')).toHaveCount(0);
    await expect(stranger.page.getByText('Privat')).toHaveCount(0);
    await stranger.context.close();
  });
});
