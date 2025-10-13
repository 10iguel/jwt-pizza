import { test, expect } from 'playwright-test-coverage';
import { Page } from '@playwright/test';
import { Role, User } from '../src/service/pizzaService';


async function basicInit(page: Page) {
  let loggedInUser: User | undefined;
  const validUsers: Record<string, User> = { 'd@jwt.com': { id: '3', name: 'Kai Chen', email: 'd@jwt.com', password: 'a', roles: [{ role: Role.Admin }] },
'f@jwt.com': { 
      id: '4', 
      name: 'pizza franchisee', 
      email: 'f@jwt.com', 
      password: 'franchisee', 
      roles: [{ role: Role.Franchisee, objectId: '1' }]
    } };

  await page.route('*/**/api/auth', async (route) => {
    const loginReq = route.request().postDataJSON();
    const user = validUsers[loginReq.email];
    if (!user || user.password !== loginReq.password) {
      await route.fulfill({ status: 401, json: { error: 'Unauthorized' } });
      return;
    }
    loggedInUser = validUsers[loginReq.email];
    const loginRes = {
      user: loggedInUser,
      token: 'abcdef',
    };
    expect(route.request().method()).toBe('PUT');
    await route.fulfill({ json: loginRes });
  });

  await page.route('*/**/api/user/me', async (route) => {
    expect(route.request().method()).toBe('GET');
    const userResponse = loggedInUser ? {
      ...loggedInUser,
      iat: 1759754996
    } : null;
    await route.fulfill({ json: userResponse });
  });

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

  await page.route('*/**/api/order', async (route) => {
    const orderReq = route.request().postDataJSON();
    const orderRes = {
      order: { ...orderReq, id: 23 },
      jwt: 'eyJpYXQ',
    };
    expect(route.request().method()).toBe('GET');
    await route.fulfill({ json: orderRes });
  });
}

test('delete a user', async ({ page }) => {
  await basicInit(page);

  let users: User[] = [
    { id: '1', name: 'Kai Chen', email: 'd@jwt.com', password: 'a', roles: [{ role: Role.Admin }] },
    { id: '2', name: 'UserToDelete', email: 'g@jwt.com', password: '123', roles: [{ role: Role.Diner }] }
  ];

  await page.route('*/**/api/user**', async (route) => {
    const method = route.request().method();
    if (method === 'GET') {
      await route.fulfill({ json: { users, more: false } });
    } else if (method === 'DELETE') {
      const userId = route.request().url().split('/').pop();
      users = users.filter(u => u.id !== userId);
      await route.fulfill({ status: 200, json: null });
    }
  });

  await page.goto('http://localhost:5173/');
  await page.getByRole('link', { name: 'Login' }).click();
  await page.getByRole('textbox', { name: 'Email address' }).fill('d@jwt.com');
  await page.getByRole('textbox', { name: 'Password' }).fill('a');
  await page.getByRole('button', { name: 'Login' }).click();
  await page.getByRole('link', { name: 'Admin' }).click();

  await expect(page.getByText('UserToDelete')).toBeVisible();

  await page.getByRole('row', { name: 'UserToDelete g@jwt.com diner' }).getByRole('button').click();
  await page.goto('http://localhost:5173/admin-dashboard');

  await expect(page.getByText('UserToDelete')).not.toBeVisible();
});
