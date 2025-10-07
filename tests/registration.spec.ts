import { Page } from '@playwright/test';
import { test, expect } from 'playwright-test-coverage';
import { User, Role } from '../src/service/pizzaService';

async function basicInit(page: Page) {
  let loggedInUser: User | undefined;
  const validUsers: Record<string, User> = { 'd@jwt.com': { id: '3', name: 'Kai Chen', email: 'd@jwt.com', password: 'a', roles: [{ role: Role.Diner }] } };

  // Handle both registration (POST) and login (PUT) for /api/auth
  await page.route('*/**/api/auth', async (route) => {
    const method = route.request().method();
    const reqBody = route.request().postDataJSON();

    if (method === 'POST') {
      const email = reqBody.email;
      if (validUsers[email]) {
        await route.fulfill({ status: 401, json: { error: 'User already exists' } });
        return;
      }
      const newUser: User = {
        id: `new-${Date.now()}`,
        name: reqBody.name,
        email: reqBody.email,
        roles: [{ role: Role.Diner }]
      };
      const regRes = {
        user: newUser,
        token: 'new-registration-token',
      };
      await route.fulfill({ json: regRes });
      return;
    }

    if (method === 'PUT') {
      // Existing login logic
      const user = validUsers[reqBody.email];
      if (!user || user.password !== reqBody.password) {
        await route.fulfill({ status: 401, json: { error: 'Unauthorized' } });
        return;
      }
      loggedInUser = validUsers[reqBody.email];
      const loginRes = {
        user: loggedInUser,
        token: 'abcdef',
      };
      await route.fulfill({ json: loginRes });
      return;
    }

    // Fallback for unexpected methods
    await route.fulfill({ status: 405, json: { error: 'Method not allowed' } });
  });

  // Return the currently logged in user
  await page.route('*/**/api/user/me', async (route) => {
    expect(route.request().method()).toBe('GET');
    await route.fulfill({ json: loggedInUser });
  });

  // A standard menu
  await page.route('*/**/api/order/menu', async (route) => {
    const menuRes = [
      {
        id: 1,
        title: 'Veggie',
        image: 'pizza1.png',
        price: 0.0038,
        description: 'A garden of delight',
      },
      {
        id: 2,
        title: 'Pepperoni',
        image: 'pizza2.png',
        price: 0.0042,
        description: 'Spicy treat',
      },
    ];
    expect(route.request().method()).toBe('GET');
    await route.fulfill({ json: menuRes });
  });

  // Standard franchises and stores
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
        { id: 4, name: 'topSpot', stores: [] },
      ],
    };
    expect(route.request().method()).toBe('GET');
    await route.fulfill({ json: franchiseRes });
  });

  // Order a pizza.
  await page.route('*/**/api/order', async (route) => {
    const orderReq = route.request().postDataJSON();
    const orderRes = {
      order: { ...orderReq, id: 23 },
      jwt: 'eyJpYXQ',
    };
    expect(route.request().method()).toBe('POST');
    await route.fulfill({ json: orderRes });
  });

  await page.goto('/');
}

test('test successful registration', async ({ page }) => {
  await basicInit(page);
  await page.getByRole('link', { name: 'Register' }).click();

  await expect(page.getByPlaceholder('Full name')).toBeVisible();
  await page.getByPlaceholder('Full name').fill('guest');

  await expect(page.getByPlaceholder('Email address')).toBeVisible();
  await page.getByPlaceholder('Email address').fill('guest@gmail.com');

  await expect(page.getByPlaceholder('Password')).toBeVisible();
  await page.getByPlaceholder('Password').fill('1234567');

  await page.getByRole('button', { name: 'Register' }).click();

  await expect(page.getByText("brings joy to people")).toBeVisible();
});