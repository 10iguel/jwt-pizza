import { test, expect } from 'playwright-test-coverage';
import { Page } from '@playwright/test';
import { Role, User } from '../src/service/pizzaService';

async function basicInit(page: Page) {
  let loggedInUser: User | undefined;
  const validUsers: Record<string, User> = {
    'd@jwt.com': {
      id: '3',
      name: 'Kai Chen',
      email: 'd@jwt.com',
      password: 'a',
      roles: [{ role: Role.Admin }],
    },
    'f@jwt.com': {
      id: '4',
      name: 'pizza franchisee',
      email: 'f@jwt.com',
      password: 'franchisee',
      roles: [{ role: Role.Franchisee, objectId: '1' }],
    },
  };

  await page.route('*/**/api/auth', async (route) => {
    const loginReq = route.request().postDataJSON();
    const user = validUsers[loginReq.email];
    if (!user || user.password !== loginReq.password) {
      await route.fulfill({ status: 401, json: { error: 'Unauthorized' } });
      return;
    }
    loggedInUser = validUsers[loginReq.email];
    const loginRes = { user: loggedInUser, token: 'abcdef' };
    expect(route.request().method()).toBe('PUT');
    await route.fulfill({ json: loginRes });
  });

  // 🟢 Current user info
  await page.route('*/**/api/user/me', async (route) => {
    expect(route.request().method()).toBe('GET');
    const userResponse = loggedInUser
      ? { ...loggedInUser, iat: 1759754996 }
      : null;
    await route.fulfill({ json: userResponse });
  });

  await page.route(/\/api\/user\/\d+$/, async (route) => {
    const method = route.request().method();
    if (method === 'PUT') {
      const body = route.request().postDataJSON();
      const userId = Number(route.request().url().split('/').pop());

      if (!loggedInUser) {
        await route.fulfill({ status: 401, json: { message: 'unauthorized' } });
        return;
      }

      // only self or admin can edit
      // @ts-ignore
        if (loggedInUser.id !== String(userId) && !loggedInUser.roles.some(r => r.role === Role.Admin)) {
        await route.fulfill({ status: 403, json: { message: 'unauthorized' } });
        return;
      }

      loggedInUser = { ...loggedInUser, ...body }; // update name/email/password
      const response = { user: loggedInUser, token: 'newtoken123' };

      await route.fulfill({ status: 200, json: response });
    }
  });

  await page.route('*/**/api/order/menu', async (route) => {
    await route.fulfill({
      json: [
        { id: 1, title: 'Veggie', image: 'pizza1.png', price: 0.0038 },
        { id: 2, title: 'Pepperoni', image: 'pizza2.png', price: 0.0042 },
      ],
    });
  });

  await page.route(/\/api\/franchise(\?.*)?$/, async (route) => {
    const franchiseRes = {
      franchises: [
        {
          id: 2,
          name: 'LotaPizza',
          stores: [
            { id: 4, name: 'Lehi' },
            { id: 5, name: 'Springville' },
            { id: 6, name: 'American Fork' },
          ],
        },
        { id: 3, name: 'PizzaCorp', stores: [{ id: 7, name: 'Spanish Fork' }] },
      ],
    };
    await route.fulfill({ json: franchiseRes });
  });

  await page.route('*/**/api/order', async (route) => {
    await route.fulfill({ json: { order: { id: 23 }, jwt: 'eyJpYXQ' } });
  });
}

test('updateUser', async ({ page }) => {
  await basicInit(page);
  await page.goto('http://localhost:5173/');
  await page.getByRole('link', { name: 'Login' }).click();
  await page.getByRole('textbox', { name: 'Email address' }).fill('d@jwt.com');
  await page.getByRole('textbox', { name: 'Password' }).fill('a');
  await page.getByRole('button', { name: 'Login' }).click();

  await expect(page.getByText('KC')).toBeVisible();

  await page.getByRole('link', { name: 'KC' }).click();
  await page.getByRole('button', { name: 'Edit' }).click();

  await expect(page.locator('h3')).toContainText('Edit user');

  await page.getByRole('textbox').first().fill('pizza dinerx');
  await page.getByRole('button', { name: 'Update' }).click();

  await page.waitForSelector('[role="dialog"].hidden', { state: 'attached' });

  await expect(page.getByRole('main')).toContainText('pizza dinerx');
});
