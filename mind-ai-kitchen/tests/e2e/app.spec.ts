import { test, expect, type Page } from '@playwright/test';

const profile = { bodyType: '', goal: 'health', allergies: '', preferences: '' };
const fixture = {
  id: 'e2e-recipe',
  name: 'Gà hấp bông cải',
  summary: 'Món hấp nhẹ vị cho bữa cơm nhà.',
  minutes: 25,
  difficulty: 'Dễ',
  servings: 2,
  createdAt: 1792100000000,
  model: 'e2e-fixture',
  profileSnapshot: profile,
  ingredients: [
    { id: 'a', name: 'Ức gà', grams: 200, confirmed: true, source: 'manual' },
    { id: 'b', name: 'Bông cải xanh', grams: 150, confirmed: true, source: 'manual' },
  ],
  steps: [
    { id: 1, text: 'Sơ chế bông cải và chuẩn bị ức gà trên dụng cụ riêng.', durationSeconds: 120 },
    { id: 2, text: 'Hấp gà đến nhiệt độ tâm 74°C, hấp bông cải chín và dọn ra đĩa.' },
  ],
  nutrition: {
    complete: true,
    calories: 291,
    macros: { protein: 49.2, carbs: 10, fat: 5.8 },
    items: [],
    missing: [],
    matched: 2,
    total: 2,
  },
  audit: { hasRisk: false, flags: [], checkedAt: 1 },
  checks: [],
  sources: [],
};
async function createRecipe(page: Page) {
  await page.route('**/api/recipe', (route) =>
    route.fulfill({ json: { data: fixture, error: null } }),
  );
  await page.goto('/scan');
  await page.getByText('Thêm nguyên liệu bằng tay', { exact: true }).click();
  await page.getByLabel('Tên nguyên liệu', { exact: true }).fill('Ức gà');
  await page.getByLabel('Khối lượng (g)', { exact: true }).fill('200');
  await page.getByRole('button', { name: 'Thêm nguyên liệu', exact: true }).click();
  await page.getByLabel('Tên nguyên liệu', { exact: true }).fill('Bông cải xanh');
  await page.getByLabel('Khối lượng (g)', { exact: true }).fill('150');
  await page.getByRole('button', { name: 'Thêm nguyên liệu', exact: true }).click();
  await page.getByRole('combobox', { name: /^Số phần ăn/ }).selectOption('2');
  await page.getByRole('checkbox', { name: /Tôi đã kiểm tra/ }).check();
  await page.getByRole('button', { name: 'Tạo công thức', exact: true }).click();
  await expect(page.getByRole('heading', { name: fixture.name, exact: true })).toBeVisible();
}
test('home, navigation and responsive layout', async ({ page }, info) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /Hôm nay/ })).toBeVisible();
  await page.screenshot({
    path: 'test-results/home-' + info.project.name + '.png',
    fullPage: true,
  });
  for (const path of ['/scan', '/onboarding', '/library', '/about']) {
    await page.goto(path);
    await expect(page.locator('h1')).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
  }
  expect(errors).toEqual([]);
});
test('recipe, feedback, persistence, cooking and meal log', async ({ page }, info) => {
  await createRecipe(page);
  await expect(page.getByText('146', { exact: false }).first()).toBeVisible();
  await page.getByRole('button', { name: '4 sao', exact: true }).click();
  await page.getByLabel('Ghi chú khẩu vị').fill('Lần sau ít cay hơn.');
  await page.getByRole('button', { name: 'Lưu phản hồi' }).click();
  await expect(
    page.getByText('Đã lưu. Phản hồi này sẽ được dùng khi gợi ý món tiếp theo.'),
  ).toBeVisible();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: 'test-results/recipe-' + info.project.name + '.png',
    fullPage: true,
  });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.reload();
  await expect(page.getByLabel('Ghi chú khẩu vị')).toHaveValue('Lần sau ít cay hơn.');
  await page.getByRole('link', { name: 'Vào bếp, từng bước một' }).click();
  await page.getByRole('button', { name: 'Bước tiếp', exact: true }).click();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: 'test-results/cooking-' + info.project.name + '.png',
    fullPage: true,
  });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await expect(page.getByRole('navigation')).toHaveCount(0);
  await expect(page.getByLabel('Số phần đã ăn')).toHaveCount(0);
  await page.getByRole('link', { name: 'Xong món' }).click();
  await page.getByRole('combobox', { name: /^Bữa ăn/ }).selectOption('Bữa Tối');
  await page.getByLabel('Số phần đã ăn').fill('1');
  await page.getByRole('button', { name: 'Hoàn thành & lưu bữa ăn' }).click();
  await expect(page).toHaveURL('/journal');
  await expect(page.getByText(fixture.name)).toBeVisible();
  await page.goto('/library');
  await expect(page.getByRole('heading', { name: fixture.name })).toBeVisible();
});
test('photo ingredients require explicit review', async ({ page }) => {
  await page.route('**/api/vision', (route) =>
    route.fulfill({
      json: {
        data: {
          ingredients: [{ id: 'photo', name: 'Cà chua', source: 'photo', confirmed: false }],
        },
        error: null,
      },
    }),
  );
  await page.goto('/scan');
  await page.getByLabel('Chọn ảnh nguyên liệu', { exact: true }).setInputFiles({
    name: 'tomato.png',
    mimeType: 'image/png',
    buffer: Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a3ioAAAAASUVORK5CYII=',
      'base64',
    ),
  });
  await page.getByRole('button', { name: 'Nhận diện ảnh' }).click();
  await expect(page.locator('.ingredient-name')).toHaveValue('Cà chua');
  await expect(page.getByRole('button', { name: 'Tạo công thức', exact: true })).toBeDisabled();
  await page.getByRole('checkbox', { name: /Tôi đã kiểm tra/ }).check();
  await expect(page.getByRole('button', { name: 'Tạo công thức', exact: true })).toBeEnabled();
});
test('corrupt saved session shows recovery notice instead of an endless loader', async ({
  page,
}) => {
  await page.addInitScript(() => localStorage.setItem('mind-ai-kitchen-storage', '{broken'));
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /Hôm nay/ })).toBeVisible();
  await expect(
    page.getByRole('alert').filter({ hasText: 'Chưa đọc được dữ liệu đã lưu' }),
  ).toBeVisible();
});
test('backup can be imported into a fresh browser context', async ({ page, browser }, info) => {
  await createRecipe(page);
  await page.goto('/library');
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Sao lưu', exact: true }).click();
  const download = await pending;
  const file = info.outputPath('backup.json');
  await download.saveAs(file);
  const fresh = await browser.newContext();
  try {
    const restored = await fresh.newPage();
    await restored.goto(new URL('/library', page.url()).href);
    await restored.getByLabel('Nhập bản sao lưu', { exact: true }).setInputFiles(file);
    await expect(restored.getByRole('heading', { name: fixture.name })).toBeVisible();
    await restored.getByRole('button', { name: /Mở món/ }).click();
    await expect(restored.getByRole('heading', { name: fixture.name })).toBeVisible();
  } finally {
    await fresh.close();
  }
});
test('profile change blocks saved recipe, including direct cooking URL', async ({ page }) => {
  await createRecipe(page);
  await page.goto('/onboarding');
  await page.getByLabel('Dị ứng và thành phần cần loại trừ').fill('gà');
  await page.getByRole('button', { name: 'Lưu khẩu vị' }).click();
  await expect(page.getByText(/Đã lưu hồ sơ/)).toBeVisible();
  await page.goto('/result');
  await expect(page.getByRole('button', { name: 'Cần xử lý dị ứng trước khi nấu' })).toBeDisabled();
  await page.goto('/cooking');
  await expect(page.getByRole('alert').filter({ hasText: 'Công thức chưa phù hợp' })).toBeVisible();
});
test('AI error gives an actionable error, never a pretend recipe', async ({ page }) => {
  await page.route('**/api/recipe', (route) =>
    route.fulfill({
      status: 503,
      json: { data: null, error: { message: 'AI chưa được kết nối.' } },
    }),
  );
  await page.goto('/scan');
  await page.getByText('Thêm nguyên liệu bằng tay', { exact: true }).click();
  await page.getByLabel('Tên nguyên liệu', { exact: true }).fill('Cà chua');
  await page.getByRole('button', { name: 'Thêm nguyên liệu', exact: true }).click();
  await page.getByRole('checkbox', { name: /Tôi đã kiểm tra/ }).check();
  await page.getByRole('button', { name: 'Tạo công thức', exact: true }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'AI chưa được kết nối.' })).toBeVisible();
  await expect(page).toHaveURL('/scan');
});
test('voice interruption preserves auto-read, negation and final-result gating', async ({
  page,
}) => {
  await page.addInitScript(() => {
    const state = window as unknown as {
      recognition: { onresult: (event: unknown) => void };
      spoken: string[];
      cancels: number;
    };
    state.spoken = [];
    state.cancels = 0;
    Object.defineProperty(window, 'speechSynthesis', {
      value: {
        getVoices: () => [],
        cancel: () => {
          state.cancels++;
        },
        speak: (u: SpeechSynthesisUtterance) => {
          state.spoken.push(u.text);
          u.onstart?.(new Event('start') as SpeechSynthesisEvent);
        },
      },
    });
    class Recognition {
      onresult: (event: unknown) => void = () => {};
      onerror = null;
      onend = null;
      start() {
        state.recognition = this;
      }
      abort() {}
    }
    Object.defineProperty(window, 'SpeechRecognition', { value: Recognition });
  });
  await createRecipe(page);
  await page.getByRole('link', { name: 'Vào bếp, từng bước một' }).click();
  await page.getByText('Giọng nói và đọc hướng dẫn', { exact: true }).click();
  await page.getByRole('button', { name: 'Bật tự đọc' }).click();
  await page.getByRole('button', { name: 'Bật micro rảnh tay' }).click();
  const emit = async (text: string, isFinal: boolean, index = 0) =>
    page.evaluate(
      ({ text, isFinal, index }) => {
        const state = window as unknown as { recognition: { onresult: (event: unknown) => void } };
        state.recognition.onresult({
          resultIndex: index,
          results: { length: index + 1, [index]: { isFinal, 0: { transcript: text } } },
        });
      },
      { text, isFinal, index },
    );
  await emit('đừng chuyển bước tiếp theo', true);
  await expect(page.getByText('Bước 1 / 2', { exact: true })).toBeVisible();
  await emit('tiếp theo', false);
  await expect(page.getByText('Bước 1 / 2', { exact: true })).toBeVisible();
  await emit('dừng lại', false);
  await emit('tiếp theo', true, 1);
  await expect(page.getByText('Bước 2 / 2', { exact: true })).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => (window as unknown as { spoken: string[] }).spoken.at(-1)))
    .toBe(fixture.steps[1].text);
  await expect(page.getByRole('button', { name: 'Tắt tự đọc' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
});

test('dock opens camera, waits for approval before recognition and stops the stream', async ({
  page,
}) => {
  await page.addInitScript(() => {
    const state = window as unknown as { cameraRequests: number; cameraStops: number };
    state.cameraRequests = 0;
    state.cameraStops = 0;
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: {
        getUserMedia: async () => {
          state.cameraRequests++;
          const canvas = document.createElement('canvas');
          canvas.width = 640;
          canvas.height = 480;
          const context = canvas.getContext('2d')!;
          context.fillStyle = '#416c3e';
          context.fillRect(0, 0, 640, 480);
          const stream = canvas.captureStream(5);
          const paint = setInterval(() => {
            context.fillRect(0, 0, 640, 480);
          }, 150);
          for (const track of stream.getTracks()) {
            const stop = track.stop.bind(track);
            track.stop = () => {
              clearInterval(paint);
              state.cameraStops++;
              stop();
            };
          }
          return stream;
        },
      },
    });
  });
  let recognized = 0;
  await page.route('**/api/vision', (route) => {
    recognized++;
    return route.fulfill({
      json: {
        data: {
          ingredients: [{ id: 'camera', name: 'Cà chua', source: 'photo', confirmed: false }],
        },
        error: null,
      },
    });
  });
  await page.goto('/');
  await page
    .getByRole('navigation', { name: 'Điều hướng chính' })
    .getByRole('button', { name: 'Chụp nguyên liệu' })
    .click();
  await expect(page.getByRole('dialog', { name: 'Chụp nguyên liệu' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Chụp ảnh', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'Chụp ảnh', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Kiểm tra ảnh' })).toBeVisible();
  expect(recognized).toBe(0);
  await expect
    .poll(() => page.evaluate(() => (window as unknown as { cameraStops: number }).cameraStops))
    .toBeGreaterThan(0);
  await page.getByRole('button', { name: 'Dùng ảnh', exact: true }).click();
  await expect(page).toHaveURL('/scan');
  await expect(page.locator('.ingredient-name')).toHaveValue('Cà chua');
  expect(recognized).toBe(1);
});

test('camera permission failure keeps image and manual alternatives available', async ({
  page,
}, info) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: {
        getUserMedia: async () => {
          throw new DOMException('denied', 'NotAllowedError');
        },
      },
    });
  });
  await page.goto('/scan');
  await page.getByRole('button', { name: 'Mở camera', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('Chưa được cấp quyền camera');
  await page.screenshot({
    path: 'test-results/camera-fallback-' + info.project.name + '.png',
    fullPage: true,
  });
  await expect(page.getByLabel('Chọn ảnh trong camera')).toBeAttached();
  await page.getByRole('link', { name: 'Nhập nguyên liệu bằng tay' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByLabel('Tên nguyên liệu', { exact: true })).toBeVisible();
});

test('closing camera releases the active stream and restores keyboard focus', async ({ page }) => {
  await page.addInitScript(() => {
    const state = window as unknown as { stopped: number };
    state.stopped = 0;
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: {
        getUserMedia: async () => {
          const canvas = document.createElement('canvas');
          canvas.width = 40;
          canvas.height = 40;
          canvas.getContext('2d')!.fillRect(0, 0, 40, 40);
          const stream = canvas.captureStream();
          for (const track of stream.getTracks()) {
            const stop = track.stop.bind(track);
            track.stop = () => {
              state.stopped++;
              stop();
            };
          }
          return stream;
        },
      },
    });
  });
  await page.goto('/scan');
  const opener = page.getByRole('button', { name: 'Mở camera', exact: true });
  await opener.click();
  await expect(page.getByRole('button', { name: 'Chụp ảnh', exact: true })).toBeEnabled();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(opener).toBeFocused();
  await expect
    .poll(() => page.evaluate(() => (window as unknown as { stopped: number }).stopped))
    .toBeGreaterThan(0);
});

test('cooking restores step and timer after navigation and refresh', async ({ page }) => {
  await page.clock.install();
  await createRecipe(page);
  await page.getByRole('link', { name: 'Vào bếp, từng bước một' }).click();
  await page.getByRole('button', { name: 'Bắt đầu hẹn giờ' }).click();
  await page.clock.fastForward(2000);
  await expect(page.getByLabel('Thời gian còn lại')).toHaveText('1:58');
  await page.getByRole('button', { name: 'Bước tiếp', exact: true }).click();
  await page.reload();
  await expect(page.getByText('Bước 2 / 2', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Bước trước', exact: true }).click();
  await expect(page.getByLabel('Thời gian còn lại')).toHaveText('1:58');
  expect(
    await page
      .getByRole('button', { name: 'Bước tiếp', exact: true })
      .evaluate((element) => element.getBoundingClientRect().height),
  ).toBeGreaterThanOrEqual(64);
});

test('mobile capture dock stays within a narrow screen and camera comes before manual entry', async ({
  page,
}, info) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto('/scan');
  await expect(page.getByRole('button', { name: 'Mở camera', exact: true })).toBeVisible();
  await expect(page.getByLabel('Tên nguyên liệu', { exact: true })).not.toBeVisible();
  const cameraButton = page
    .getByRole('navigation')
    .getByRole('button', { name: 'Chụp nguyên liệu' });
  const rectangle = await cameraButton.boundingBox();
  expect(rectangle).not.toBeNull();
  expect(Math.abs(rectangle!.x + rectangle!.width / 2 - 160)).toBeLessThan(3);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(320);
  await page.screenshot({
    path: 'test-results/scan-narrow-' + info.project.name + '.png',
    fullPage: true,
  });
});
