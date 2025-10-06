import { test, expect} from 'playwright-test-coverage';
import { Page } from '@playwright/test';
import { User, Role } from '../src/service/pizzaService'; 
async function basicInit(page: Page) {
  let loggedInUser: User | undefined;
  const validUsers: Record<string, User> = { 'd@jwt.com': { id: '3', name: 'Kai Chen', email: 'd@jwt.com', password: 'a', roles: [{ role: Role.D }] } };

  // Route for PUT (Login)
  await page.route('*/**/api/auth', async (route) => {
    if (route.request().method() === 'PUT') {
      const loginReq = route.request().postDataJSON();
      const user = validUsers[loginReq.email];
      if (!user || user.password !== loginReq.password) {
        await route.fulfill({ status: 401, json: { error: 'Unauthorized' } });
        return;
      }
      loggedInUser = validUsers[loginReq.email];
      await route.fulfill({ json: { user: loggedInUser, token: 'abcdef' } });
    } else if (route.request().method() === 'DELETE') {
      // Route for DELETE (Logout) - This is what the test verifies
      loggedInUser = undefined;
      await route.fulfill({ status: 200, json: { message: 'Logged out successfully' } });
    } else {
      route.continue();
    }
  });

  // Return the currently logged in user
  await page.route('*/**/api/user/me', async (route) => {
    expect(route.request().method()).toBe('GET');
    await route.fulfill({ json: loggedInUser });
  });
  
  await page.goto('/');
}


test('service_logout_logic', async ({ page }) => {
  await basicInit(page);
    const initialToken = 'a-test-token-to-remove';
  await page.evaluate((token) => {
    localStorage.setItem('token', token);
  }, initialToken);
    expect(await page.evaluate(() => localStorage.getItem('token'))).toBe(initialToken);

  const [response] = await Promise.all([
    page.waitForResponse(response => 
      response.url().includes('/api/auth') && response.request().method() === 'DELETE'
    ),
    page.evaluate(async () => {
      const { default: httpPizzaService } = await import('../src/service/httpPizzaService'); 
      httpPizzaService.logout();
    }),
  ]);
  expect(response.status()).toBe(200);

  const tokenAfterLogout = await page.evaluate(() => localStorage.getItem('token'));
  expect(tokenAfterLogout).toBeNull();
});