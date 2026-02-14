import { test, expect } from '@playwright/test';
import path from 'path';

test.use({ storageState: path.resolve(import.meta.dirname, '../.auth/user.json') });

test.describe('Rule Creation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/rules');
    await expect(page.getByRole('heading', { name: 'Rules', level: 1 })).toBeVisible();
  });

  test('can create and delete a classic rule from template', async ({ page }) => {
    const ruleName = 'E2E Concurrent Stream Limit';

    // Open the Add Rule dropdown and select Classic Rule
    await page.getByRole('button', { name: 'Add Rule' }).first().click();
    await page.getByRole('menuitem', { name: 'Classic Rule' }).click();

    // Template picker dialog opens
    await expect(page.getByText('Choose a Rule Template')).toBeVisible();

    // Select Concurrent Streams template
    await page.getByText('Concurrent Streams').click();

    // Rule builder dialog opens pre-filled — rename to E2E prefix
    await expect(page.getByText('Edit Rule')).toBeVisible();
    const nameInput = page.locator('#rule-name');
    await nameInput.clear();
    await nameInput.fill(ruleName);

    // Submit the rule
    await page.getByRole('button', { name: 'Update Rule' }).click();

    // Wait for dialog to close, then verify rule appears in the list
    await expect(page.locator('#rule-name')).toBeHidden();
    await expect(page.getByText(ruleName)).toBeVisible();

    // Delete the rule — scope to the card containing this rule's h3
    const ruleCard = page.locator('div[class*="card"]', {
      has: page.locator('h3', { hasText: ruleName }),
    });
    await ruleCard.locator('button:has(svg.text-destructive)').click();

    // Confirm deletion and wait for dialog to close
    await expect(page.getByText('Delete Rule')).toBeVisible();
    await page.getByRole('button', { name: 'Delete' }).click();
    await expect(page.getByText('Delete Rule')).toBeHidden();

    // Rule is removed from the list
    await expect(page.getByText(ruleName)).toBeHidden();
  });

  test('can create and delete a custom rule', async ({ page }) => {
    const ruleName = 'E2E Test Custom Rule';

    // Open the Add Rule dropdown and select Custom Rule
    await page.getByRole('button', { name: 'Add Rule' }).first().click();
    await page.getByRole('menuitem', { name: 'Custom Rule' }).click();

    // Rule builder dialog opens
    await expect(page.getByText('Create Custom Rule')).toBeVisible();

    // Fill in basic info
    await page.locator('#rule-name').fill(ruleName);
    await page.locator('#rule-description').fill('Created by E2E test');

    // Change severity to high
    await page.locator('#rule-severity').click();
    await page.getByRole('option', { name: 'High' }).click();

    // The default condition (concurrent_streams) is already set — leave it as-is
    // Submit the rule
    await page.getByRole('button', { name: 'Create Rule' }).click();

    // Wait for dialog to close, then verify rule appears in the list
    await expect(page.locator('#rule-name')).toBeHidden();
    await expect(page.getByText(ruleName)).toBeVisible();

    // Delete the rule — scope to the card containing this rule's h3
    const ruleCard = page.locator('div[class*="card"]', {
      has: page.locator('h3', { hasText: ruleName }),
    });
    await ruleCard.locator('button:has(svg.text-destructive)').click();

    // Confirm deletion and wait for dialog to close
    await expect(page.getByText('Delete Rule')).toBeVisible();
    await page.getByRole('button', { name: 'Delete' }).click();
    await expect(page.getByText('Delete Rule')).toBeHidden();

    // Rule is removed from the list
    await expect(page.getByText(ruleName)).toBeHidden();
  });
});
