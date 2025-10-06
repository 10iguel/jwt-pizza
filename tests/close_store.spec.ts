import { test, expect } from 'playwright-test-coverage';
import { User, Role } from '../src/service/pizzaService';
import { Page } from '@playwright/test';

async function basicInit(page: Page) {
    let loggedInUser: User | undefined;
    const validUsers: Record<string, User> = { 
        'd@jwt.com': { 
            id: '3',
            name: 'Kai Chen', 
            email: 'd@jwt.com', 
            password: 'a', 
            roles: [{ role: Role.Franchisee, objectId: 0 }] 
        },
        'f@jwt.com': { 
            id: '4', 
            name: 'pizza franchisee', 
            email: 'f@jwt.com', 
            password: 'franchisee', 
            roles: [{ objectId: 1, role: Role.Franchisee }] 
        } 
    };

    // Authorize login for the given user
  await page.route('*/**/api/auth', async (route) => {
    const loginReq = route.request().postDataJSON();
    const user = validUsers[loginReq.email];
    if (!user || user.password !== loginReq.password) {
      await route.fulfill({ status: 401, json: { error: 'Unauthorized' } });
      return;
    }

    const sanitizedUser = {
      id: parseInt(user.id),
      name: user.name,
      email: user.email,
      roles: user.roles.map((role: any) => ({ objectId: 1, role: role.role }))
    };
    loggedInUser = sanitizedUser;
    const loginRes = {
      user: sanitizedUser,
      token: 'abcdef',
    };

    // loggedInUser = validUsers[loginReq.email];
    // const loginRes = {
    //   user: loggedInUser,
    //   token: 'abcdef',
    // };
    expect(route.request().method()).toBe('PUT');
    await route.fulfill({ json: loginRes });
  });

  // Return the currently logged in user
  await page.route('*/**/api/user/me', async (route) => {
    expect(route.request().method()).toBe('GET');
    const userResponse = loggedInUser ? {
      ...loggedInUser,
      iat: 1759780100
    } : null;
    await route.fulfill({ json: userResponse });
  });

    // A standard menu
    await page.route('*/**/api/order/menu', async (route) => {
        const menuRes = [
            { id: 1, title: 'Veggie', image: 'pizza1.png', price: 0.0038, description: 'A garden of delight' },
            { id: 2, title: 'Pepperoni', image: 'pizza2.png', price: 0.0042, description: 'Spicy treat' },
        ];
        expect(route.request().method()).toBe('GET');
        await route.fulfill({ json: menuRes });
    });

    // Dynamic franchises based on logged in user (GET /api/franchise)
    await page.route(/\/api\/franchise(\?.*)?$/, async (route) => {
        expect(route.request().method()).toBe('GET');
        let franchises: any[] = [];
        // Compare with the ID stored in the mock, which we ensure is consistent
        if (loggedInUser?.id === '4') { 
            franchises = [
                {
                    id: 1,
                    name: 'pizzaPocket',
                    admins: [{ id: 4, name: 'pizza franchisee', email: 'f@jwt.com' }],
                    stores: [{ id: 4, name: 'SLC', totalRevenue: 0.0816 }]
                }
            ];
        }
        await route.fulfill({ json: franchises });
    });

    // Mock for specific franchise (GET /api/franchise/ID)
    // await page.route(/\/api\/franchise\/\d+(\?.*)?$/, async (route) => {
    //     expect(route.request().method()).toBe('GET');
    //     const franchiseId = route.request().url().match(/\/api\/franchise\/(\d+)/)?.[1]; 
    //     let franchise = null;
    //     // Compare the string ID from the URL with the mock ID
    //     if (franchiseId === '1' && loggedInUser?.id === '4') { 
    //         franchise = {
    //             id: 1,
    //             name: 'pizzaPocket',
    //             admins: [{ id: 4, name: 'pizza franchisee', email: 'f@jwt.com' }],
    //             stores: [{ id: 4, name: 'SLC', totalRevenue: 0.0816 }]
    //         };
    //     }
    //     await route.fulfill({ json: franchise || [] });
    // });

    await page.route(/\/api\/franchise\/\d+(\?.*)?$/, async (route) => {
    expect(route.request().method()).toBe('GET');
    const franchiseId = route.request().url().match(/\/api\/franchise\/(\d+)/)?.[1];
    let franchises: any[] = [];
    if (franchiseId === String(loggedInUser?.id) && loggedInUser?.id === 4) {
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
    await route.fulfill({ json: franchises });
  });




    // Order a pizza. (POST /api/order)
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
};

test('closeFranchise', async ({ page }) => {
  const franchiseIdToClose = 1;
  const franchiseNameToClose = 'pizzaPocket';
  let deleteRequestHandled = false;
  
  await page.route(`**/api/franchise/${franchiseIdToClose}`, async (route) => {
    if (route.request().method() === 'DELETE') {
      deleteRequestHandled = true;
      await route.fulfill({ status: 200, json: {} });
    } else {
      route.continue();
    }
  });

  await basicInit(page);
  
  
  await page.getByRole('link', { name: 'Login' }).click();
  await page.getByRole('textbox', { name: 'Email address' }).fill('f@jwt.com');
  await page.getByRole('textbox', { name: 'Password' }).fill('franchisee');
  await page.getByRole('button', { name: 'Login' }).click();
  
  await page.getByLabel('Global').getByRole('link', { name: 'Franchise' }).click();
  await expect(page.getByRole('heading', { name: franchiseNameToClose })).toBeVisible();
  
  await expect(page.getByText('Everything you need to run an JWT Pizza franchise. Your gateway to success.')).toBeVisible();
  await page.getByRole('button', { name: 'Close', exact: true }).click();
    await expect(page.getByText('Sorry to see you go')).toBeVisible();
});