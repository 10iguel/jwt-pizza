import { test, expect } from 'playwright-test-coverage';
    import { User, Role } from '../src/service/pizzaService';
    import { Page } from '@playwright/test';

    async function basicInit(page: Page) {
  let loggedInUser: User | undefined;
  const validUsers: Record<string, User> = { 'd@jwt.com': { id: '3', name: 'Kai Chen', email: 'd@jwt.com', password: 'a', roles: [{ role: Role.Franchisee }] },
'f@jwt.com': { 
      id: '4', 
      name: 'pizza franchisee', 
      email: 'f@jwt.com', 
      password: 'franchisee', 
      roles: [{ role: Role.Franchisee }]
    } };

  // Authorize login for the given user
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

  // Return the currently logged in user
  await page.route('*/**/api/user/me', async (route) => {
    expect(route.request().method()).toBe('GET');
    const userResponse = loggedInUser ? {
      ...loggedInUser,
      iat: 1759754996
    } : null;
    await route.fulfill({ json: userResponse });
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

  // Dynamic franchises based on logged in user
  await page.route(/\/api\/franchise(\?.*)?$/, async (route) => {
    expect(route.request().method()).toBe('GET');
    let franchises: { id: number; name: string; admins: { id: number; name: string; email: string; }[]; stores: { id: number; name: string; totalRevenue: number; }[]; }[] = [];
    if (loggedInUser?.id === '4') {
      franchises = [
        {
          id: 1,
          name: 'pizzaPocket',
          admins: [
            {
              id: 4,
              name: 'pizza franchisee',
              email: 'f@jwt.com'
            }
          ],
          stores: [
            {
              id: 4,
              name: 'SLC',
              totalRevenue: 0.0816
            }
          ]
        }
      ];
    }
    // For other users like id '3', return empty array
    await route.fulfill({ json: franchises });
  });

  // Mock for specific franchise if needed (e.g., /api/franchise/4)
  await page.route(/\/api\/franchise\/\d+(\?.*)?$/, async (route) => {
    expect(route.request().method()).toBe('GET');
    const franchiseId = route.request().url().match(/\/api\/franchise\/(\d+)/)?.[1];
    let franchise = null;
    if (franchiseId === '1' && loggedInUser?.id === '4') {
      franchise = {
        id: 1,
        name: 'pizzaPocket',
        admins: [
          {
            id: 4,
            name: 'pizza franchisee',
            email: 'f@jwt.com'
          }
        ],
        stores: [
          {
            id: 4,
            name: 'SLC',
            totalRevenue: 0.0816
          }
        ]
      };
    }
    await route.fulfill({ json: franchise || [] });
  });

  // Order a pizza.
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


    test('trying franchise creation but fails', async ({ page }) => {
    
    await basicInit(page);
    await page.goto('http://localhost:5173/');
    await page.getByRole('link', { name: 'Login' }).click();
    await page.getByRole('textbox', { name: 'Email address' }).click();
    await page.getByRole('textbox', { name: 'Email address' }).fill('d@jwt.com');
    await page.getByRole('textbox', { name: 'Password' }).click();
    await page.getByRole('textbox', { name: 'Password' }).fill('a');
    await page.getByRole('button', { name: 'Login' }).click();
    await page.getByLabel('Global').getByRole('link', { name: 'Franchise' }).click();
    await expect(page.getByText('So you want a piece of the pie?')).toBeVisible();
    });