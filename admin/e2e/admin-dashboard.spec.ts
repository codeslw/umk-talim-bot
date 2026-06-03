import { expect, test, type Page } from '@playwright/test';

const meta = {
  questionTypes: ['text', 'select'],
  responseTypes: ['string', 'number'],
  applicationStatuses: ['NEW', 'IN_REVIEW', 'APPROVED', 'REJECTED'],
  applicationStatusLabels: {
    NEW: 'New',
    IN_REVIEW: 'In review',
    APPROVED: 'Approved',
    REJECTED: 'Rejected'
  },
  educationTypes: ['Bachelor', 'Master'],
  learningGoals: ['Career growth', 'New skills'],
  studyFormats: ['Online', 'Offline'],
  courseFormats: {
    ONLINE: 'Online',
    OFFLINE: 'Offline'
  }
};

function json(data: unknown) {
  return {
    contentType: 'application/json',
    body: JSON.stringify({ data })
  };
}

async function installAdminApi(page: Page) {
  let courses = [
    {
      id: 1,
      title: 'Frontend Bootcamp',
      educationType: 'Bachelor',
      duration: '3 months',
      format: 'ONLINE',
      hasPractice: true,
      cost: '$500',
      canPayInInstallments: true,
      ageMin: 18,
      ageMax: 45,
      additionalInfo: 'React intensive',
      imageFileId: null,
      isActive: true,
      createdAt: '2026-01-01T00:00:00.000Z',
      _count: { applications: 1 }
    }
  ];
  let users = [
    {
      id: 1,
      telegramId: '9001',
      username: 'automation_user',
      fullName: 'Automation User',
      phone: '+998901234567',
      gender: 'MALE',
      age: 28,
      birthDate: '1998-01-01T00:00:00.000Z',
      city: 'Tashkent',
      createdAt: '2026-01-01T00:00:00.000Z',
      _count: { applications: 1 }
    }
  ];
  let applications = [
    {
      id: 1,
      userId: 1,
      courseId: 1,
      experience: 'Junior',
      workplace: 'Clinic',
      educationType: 'Bachelor',
      specialization: 'Nursing',
      learningGoal: 'Career growth',
      studyFormat: 'Online',
      studyTime: 'Evening',
      source: 'bot',
      comment: 'Initial request',
      status: 'NEW',
      createdAt: '2026-01-02T00:00:00.000Z',
      updatedAt: '2026-01-02T00:00:00.000Z',
      user: users[0],
      course: courses[0]
    }
  ];
  let schemas = {
    course: {
      title: 'Course schema',
      description: 'Course bot questions',
      questions: [
        {
          key: 'courseName',
          label: 'Course name',
          questionType: 'text',
          responseType: 'string',
          required: true,
          helpText: null,
          placeholder: null,
          options: [],
          validation: {}
        }
      ]
    },
    application: {
      title: 'Application schema',
      description: 'Application bot questions',
      questions: []
    }
  };

  const withRelations = () =>
    applications.map((application) => ({
      ...application,
      user: users.find((user) => user.id === application.userId),
      course: courses.find((course) => course.id === application.courseId)
    }));

  const stats = () => ({
    total: applications.length,
    byStatus: meta.applicationStatuses.map((status) => ({
      status,
      _count: { _all: applications.filter((application) => application.status === status).length }
    })),
    byCourse: courses.map((course) => ({
      courseId: course.id,
      _count: { _all: applications.filter((application) => application.courseId === course.id).length }
    })),
    byGender: [{ gender: 'MALE', _count: { _all: users.filter((user) => user.gender === 'MALE').length } }],
    avgAge: users.reduce((total, user) => total + (user.age || 0), 0) / Math.max(users.length, 1)
  });

  await page.route('**/health', (route) => route.fulfill({ status: 200, body: 'ok' }));
  await page.route('**/api/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname;
    const method = request.method();
    let body: any = null;
    if (method !== 'GET') {
      try {
        body = request.postDataJSON();
      } catch {
        body = null;
      }
    }

    if (path === '/api/auth/me') {
      await route.fulfill(json({ user: { id: 1, username: 'admin', displayName: 'Admin', isActive: true }, needsBootstrap: false }));
      return;
    }
    if (path === '/api/auth/logout') {
      await route.fulfill(json(null));
      return;
    }
    if (path === '/api/settings/meta') {
      await route.fulfill(json(meta));
      return;
    }
    if (path === '/api/settings/schemas' && method === 'GET') {
      await route.fulfill(json(schemas));
      return;
    }
    if (path === '/api/settings/schemas' && method === 'PUT') {
      schemas = body;
      await route.fulfill(json(schemas));
      return;
    }
    if (path === '/api/courses' && method === 'GET') {
      await route.fulfill(json(courses));
      return;
    }
    if (path === '/api/courses' && method === 'POST') {
      const course = { id: courses.length + 1, createdAt: new Date().toISOString(), _count: { applications: 0 }, ...body };
      courses = [course, ...courses];
      await route.fulfill(json(course));
      return;
    }
    if (path.match(/^\/api\/courses\/\d+$/) && method === 'PATCH') {
      const id = Number(path.split('/').pop());
      courses = courses.map((course) => (course.id === id ? { ...course, ...body } : course));
      await route.fulfill(json(courses.find((course) => course.id === id)));
      return;
    }
    if (path.match(/^\/api\/courses\/\d+$/) && method === 'DELETE') {
      const id = Number(path.split('/').pop());
      courses = courses.filter((course) => course.id !== id);
      await route.fulfill({ status: 204 });
      return;
    }
    if (path === '/api/applications' && method === 'GET') {
      await route.fulfill(json(withRelations()));
      return;
    }
    if (path === '/api/applications' && method === 'POST') {
      const user = {
        id: users.length + 1,
        telegramId: String(body.telegramId),
        username: body.telegramUsername || null,
        fullName: body.fullName,
        phone: body.phone,
        gender: body.gender,
        age: 26,
        birthDate: '2000-01-01T00:00:00.000Z',
        city: body.city,
        createdAt: new Date().toISOString(),
        _count: { applications: 1 }
      };
      users = [user, ...users];
      const application = {
        id: applications.length + 1,
        userId: user.id,
        courseId: Number(body.courseId),
        status: 'NEW',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        ...body,
        courseId: Number(body.courseId),
        user,
        course: courses.find((course) => course.id === Number(body.courseId))
      };
      applications = [application, ...applications];
      await route.fulfill(json(application));
      return;
    }
    if (path.match(/^\/api\/applications\/\d+$/) && method === 'PATCH') {
      const id = Number(path.split('/').pop());
      applications = applications.map((application) => (application.id === id ? { ...application, ...body, courseId: Number(body.courseId) } : application));
      await route.fulfill(json(withRelations().find((application) => application.id === id)));
      return;
    }
    if (path.match(/^\/api\/applications\/\d+\/status$/) && method === 'PATCH') {
      const parts = path.split('/');
      const id = Number(parts[parts.length - 2]);
      applications = applications.map((application) => (application.id === id ? { ...application, status: body.status } : application));
      await route.fulfill(json(withRelations().find((application) => application.id === id)));
      return;
    }
    if (path.match(/^\/api\/applications\/\d+$/) && method === 'DELETE') {
      const id = Number(path.split('/').pop());
      applications = applications.filter((application) => application.id !== id);
      await route.fulfill({ status: 204 });
      return;
    }
    if (path === '/api/applications/stats') {
      await route.fulfill(json(stats()));
      return;
    }
    if (path === '/api/users' && method === 'GET') {
      const search = url.searchParams.get('search')?.toLowerCase();
      const filtered = search
        ? users.filter((user) => [user.fullName, user.phone, user.city, user.telegramId].some((value) => String(value || '').toLowerCase().includes(search)))
        : users;
      await route.fulfill(json(filtered));
      return;
    }
    if (path.match(/^\/api\/users\/\d+$/) && method === 'PATCH') {
      const id = Number(path.split('/').pop());
      users = users.map((user) => (user.id === id ? { ...user, ...body } : user));
      await route.fulfill(json(users.find((user) => user.id === id)));
      return;
    }
    if (path.match(/^\/api\/users\/\d+$/) && method === 'DELETE') {
      const id = Number(path.split('/').pop());
      users = users.filter((user) => user.id !== id);
      applications = applications.filter((application) => application.userId !== id);
      await route.fulfill({ status: 204 });
      return;
    }

    await route.fulfill({ status: 404, ...json({ error: `Unhandled ${method} ${path}` }) });
  });
}

async function openAdmin(page: Page) {
  await page.addInitScript(() => window.localStorage.setItem('umkAdminLang', 'en'));
  await installAdminApi(page);
  await page.goto('/admin/');
  await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible();
}

test('course catalog supports create, update, and delete', async ({ page }) => {
  await openAdmin(page);

  await page.getByRole('button', { name: 'Courses' }).click();
  await page.getByRole('button', { name: 'New course' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.locator('input[name="title"]').fill('Automation QA Course');
  await dialog.locator('select[name="format"]').selectOption('OFFLINE');
  await dialog.locator('input[name="duration"]').fill('8 weeks');
  await dialog.locator('input[name="cost"]').fill('$700');
  await dialog.locator('textarea[name="additionalInfo"]').fill('Created from e2e automation');
  await dialog.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByRole('cell', { name: 'Automation QA Course' })).toBeVisible();

  const createdRow = page.getByRole('row', { name: /Automation QA Course/ });
  await createdRow.getByRole('button', { name: 'Edit' }).click();
  await dialog.locator('input[name="title"]').fill('Automation QA Course Updated');
  await dialog.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByRole('cell', { name: 'Automation QA Course Updated' })).toBeVisible();

  page.on('dialog', (confirm) => confirm.accept());
  await page.getByRole('row', { name: /Automation QA Course Updated/ }).getByRole('button', { name: 'Remove' }).click();
  await expect(page.getByRole('cell', { name: 'Automation QA Course Updated' })).toHaveCount(0);
});

test('applications support create, edit, status transition, and delete', async ({ page }) => {
  await openAdmin(page);

  await page.getByRole('button', { name: 'Applications' }).click();
  await page.getByRole('button', { name: 'New application' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.locator('input[name="telegramId"]').fill('991122');
  await dialog.locator('input[name="telegramUsername"]').fill('flow_user');
  await dialog.locator('input[name="fullName"]').fill('Flow User');
  await dialog.locator('input[name="birthDate"]').fill('01.01.2000');
  await dialog.locator('input[name="phone"]').fill('+998991112233');
  await dialog.locator('input[name="city"]').fill('Samarkand');
  await dialog.locator('input[name="studyTime"]').fill('Morning');
  await dialog.locator('input[name="source"]').fill('admin');
  await dialog.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByRole('cell', { name: 'Flow User' })).toBeVisible();

  const row = page.getByRole('row', { name: /Flow User/ });
  await row.locator('select').selectOption('APPROVED');
  await expect(row.getByRole('combobox')).toHaveValue('APPROVED');

  await row.getByRole('button', { name: 'Edit' }).click();
  await dialog.locator('input[name="workplace"]').fill('Automation Clinic');
  await dialog.locator('textarea[name="comment"]').fill('Updated by e2e flow');
  await dialog.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByText('Application saved')).toBeVisible();

  page.on('dialog', (confirm) => confirm.accept());
  await page.getByRole('row', { name: /Flow User/ }).getByRole('button', { name: 'Remove' }).click();
  await expect(page.getByRole('cell', { name: 'Flow User' })).toHaveCount(0);
});

test('client records support search, update, and delete', async ({ page }) => {
  await openAdmin(page);

  await page.getByRole('button', { name: 'Clients' }).click();
  await page.getByPlaceholder('Name, phone, city, Telegram ID').fill('Automation');
  await page.getByRole('button', { name: 'Search' }).click();
  await expect(page.getByRole('cell', { name: 'Automation User' })).toBeVisible();

  await page.getByRole('row', { name: /Automation User/ }).getByRole('button', { name: 'Edit' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.locator('input[name="fullName"]').fill('Automation User Updated');
  await dialog.locator('input[name="city"]').fill('Bukhara');
  await dialog.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByRole('cell', { name: 'Automation User Updated' })).toBeVisible();
  await expect(page.getByRole('cell', { name: 'Bukhara' })).toBeVisible();

  page.on('dialog', (confirm) => confirm.accept());
  await page.getByRole('row', { name: /Automation User Updated/ }).getByRole('button', { name: 'Remove' }).click();
  await expect(page.getByRole('cell', { name: 'Automation User Updated' })).toHaveCount(0);
});

test('schema settings can add and save questions', async ({ page }) => {
  await openAdmin(page);

  await page.getByRole('button', { name: 'Schema settings' }).click();
  await page.getByRole('button', { name: 'Add' }).first().click();
  const newQuestionLabel = page.locator('input').nth(6);
  await newQuestionLabel.fill('Automation schema question');
  await page.getByRole('button', { name: 'Save schema settings' }).click();
  await expect(page.getByText('Schema settings saved')).toBeVisible();
  await expect(newQuestionLabel).toHaveValue('Automation schema question');
});

test('sidebar can collapse while preserving navigation', async ({ page }) => {
  await openAdmin(page);

  await page.getByRole('button', { name: 'Collapse sidebar' }).click();
  await page.getByRole('button', { name: 'Courses' }).click();
  await expect(page.getByRole('heading', { name: 'Courses' })).toBeVisible();
  await page.getByRole('button', { name: 'Expand sidebar' }).click();
  await expect(page.getByText('UMK Talim')).toBeVisible();
});
