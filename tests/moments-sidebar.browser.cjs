// Run with NODE_PATH pointing to Playwright if it is installed outside this project.
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const http = require('node:http');
const path = require('node:path');
const { build } = require('esbuild');
const less = require('less');
const { chromium } = require('playwright');

async function main() {
  const root = path.resolve(__dirname, '..');
  const result = await build({
    absWorkingDir: root,
    stdin: {
      contents: `
        import React from 'react';
        import { createRoot } from 'react-dom/client';
        import Sidebar from './src/components/MomentsSidebar';
        createRoot(document.getElementById('root')).render(<Sidebar />);
      `,
      loader: 'tsx',
      resolveDir: root,
    },
    bundle: true,
    write: false,
    define: { 'process.env.NODE_ENV': '"test"' },
    plugins: [{
      name: 'sidebar-fixtures',
      setup(api) {
        api.onResolve({ filter: /^(@\/|@umijs\/max$)/ }, ({ path: id }) => ({
          path: id, namespace: 'fixture',
        }));
        api.onLoad({ filter: /.*/, namespace: 'fixture' }, ({ path: id }) => {
          if (id === '@/constants') return {
            contents: 'export const externalImageProps = { referrerPolicy: "no-referrer" };',
          };
          if (id === '@umijs/max') return {
            contents: 'export const useModel = () => ({ initialState: { currentUser: { userName: "Tester" } } });',
          };
          if (id.includes('momentsController')) return { contents: `
            export async function listMomentsUsingPost({ current, pageSize }) {
              window.pages = [...(window.pages || []), current];
              return { data: { total: 1000, records: Array.from({ length: pageSize }, (_, i) => {
                const id = (current - 1) * pageSize + i + 1;
                return { id, userId: id, userName: 'User ' + id, content: 'Moment ' + id,
                  createTime: '2026-09-22T12:00:00', likeNum: 1,
                  mediaJson: Array.from({ length: id === 2 ? 1 : 5 }, (_, j) => ({
                    type: 'image', url: '/media/' + id + '-' + j + '.png'
                  })) };
              }) } };
            }
            export async function toggleLikeUsingPost() { return { code: 0 }; }
          ` };
          return { contents: 'export default function Modal() { return null; }' };
        });
        api.onLoad({ filter: /\.less$/ }, async ({ path: filename }) => {
          const { css } = await less.render(await fs.readFile(filename, 'utf8'));
          return { contents: `
            const style = document.createElement('style');
            style.textContent = ${JSON.stringify(css.replaceAll(':global([data-theme="dark"])', '[data-theme="dark"]'))};
            document.head.appendChild(style);
            export default new Proxy({}, { get: (_, key) => key });
          ` };
        });
      },
    }],
  });
  const png = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=',
    'base64',
  );
  const server = http.createServer((req, res) => {
    if (req.url === '/app.js') {
      res.setHeader('Content-Type', 'application/javascript');
      res.end(result.outputFiles[0].contents);
    } else if (req.url.startsWith('/media/')) {
      res.setHeader('Content-Type', 'image/png');
      res.end(png);
    } else {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.end('<!doctype html><html><body style="margin:20px"><div id="root"></div><script src="/app.js"></script></body></html>');
    }
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  let browser;
  try {
    browser = await chromium.launch({
      headless: true,
      channel: process.env.PLAYWRIGHT_CHANNEL || undefined,
    });
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await page.addInitScript(() => localStorage.setItem('fish_circle_auto_load_images', 'false'));
    const errors = [];
    const mediaRequests = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('request', (request) => {
      if (request.url().includes('/media/')) mediaRequests.push(request.url());
    });
    await page.goto(`http://127.0.0.1:${server.address().port}`);
    await page.getByRole('button', { name: '查看第 1 张图片' }).first().waitFor();
    const singleImage = page.locator('.imageButton img[src="/media/2-0.png"]');
    await singleImage.waitFor();
    await page.waitForFunction(() => {
      const image = document.querySelector('.imageButton img[src="/media/2-0.png"]');
      return image?.complete && image.naturalWidth > 0;
    });
    assert.ok(mediaRequests.some((url) => url.endsWith('/media/2-0.png')));
    assert.ok(
      mediaRequests.every((url) => /\/media\/\d+-0\.png$/.test(url)),
      'Only the first image of each moment should load before opening the preview',
    );
    const firstItem = page.locator('.item').filter({ has: page.getByText('Moment 1', { exact: true }) });
    assert.equal(await firstItem.locator('.imageButton img').count(), 1);
    assert.equal(await firstItem.locator('.imageCount').innerText(), '5');
    assert.equal(await page.locator('.item').filter({ has: page.getByText('Moment 2', { exact: true }) }).locator('.imageCount').count(), 0);
    assert.ok(await page.locator('.item').evaluateAll((items) =>
      items.every((item) => item.querySelectorAll('.imageButton img').length === 1)));
    assert.ok(await page.locator('.imageButton img').evaluateAll((images) =>
      images.every((image) => image.loading === 'lazy' && image.decoding === 'async')));
    assert.ok(await page.locator('.item').count() < 10, 'Only viewport rows should mount');
    assert.ok(await page.getByText('点开瞅瞅', { exact: true }).count() > 0);
    await page.screenshot({ path: path.join(require('node:os').tmpdir(), 'moments-sidebar-default.png') });
    await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
    assert.equal(
      await page.locator('.imageButton').first().evaluate((el) => getComputedStyle(el).color),
      'rgb(216, 184, 156)',
    );
    await page.screenshot({
      path: path.join(require('node:os').tmpdir(), 'moments-sidebar-dark.png'),
      animations: 'disabled',
    });
    await page.evaluate(() => document.documentElement.removeAttribute('data-theme'));

    await singleImage.click();
    await page.locator('.ant-image-preview-img').waitFor();
    assert.match(await page.locator('.ant-image-preview-img').getAttribute('src'), /2-0\.png$/);
    await page.keyboard.press('Escape');
    await page.locator('.ant-image-preview-img').waitFor({ state: 'detached' });

    await firstItem.getByRole('button', { name: '查看第 1 张图片' }).click();
    await page.locator('.ant-image-preview-img').waitFor();
    assert.match(await page.locator('.ant-image-preview-img').getAttribute('src'), /1-0\.png$/);
    for (let index = 1; index < 5; index++) {
      await page.locator('.ant-image-preview-switch-right').click();
      await page.waitForFunction((expected) =>
        document.querySelector('.ant-image-preview-img')?.getAttribute('src') === expected,
      `/media/1-${index}.png`);
    }
    await page.keyboard.press('Escape');
    await page.locator('.ant-image-preview-img').waitFor({ state: 'detached' });

    const scrollToBottom = () => page.locator('[data-virtuoso-scroller]').evaluate((el) => {
      el.scrollTop = el.scrollHeight;
    });
    await scrollToBottom();
    await page.waitForFunction(() => window.pages.includes(2));
    // A polling tick must not reset page 2 and append it again on the next scroll.
    await page.waitForTimeout(10500);
    assert.deepEqual(await page.evaluate(() => window.pages), [1, 2]);
    await scrollToBottom();
    await page.waitForFunction(() => window.pages.includes(3));
    assert.deepEqual(await page.evaluate(() => window.pages), [1, 2, 3]);
    assert.ok(await page.locator('.item').count() < 10, 'Mounted rows must stay bounded');

    await page.locator('.imageButton img').first().waitFor();
    assert.ok(await page.locator('.imageButton img').count() < 10);
    await page.locator('button:has(.anticon-left)').click();
    assert.equal(await page.locator('.imageButton img').count(), 0, 'Collapse unmounts images');
    await page.locator('.toggleBtn').click();
    await page.locator('[data-virtuoso-scroller]').waitFor();
    // Reopening measures variable-height rows over several frames.
    await page.waitForFunction(() => {
      const scroller = document.querySelector('[data-virtuoso-scroller]');
      scroller.scrollTop = scroller.scrollHeight;
      return window.pages.includes(4);
    });
    assert.ok(await page.locator('.item').count() < 10);

    await page.locator('button:has(.anticon-reload)').click();
    await page.getByText('Moment 1', { exact: true }).waitFor();
    assert.equal((await page.evaluate(() => window.pages)).at(-1), 1);
    await page.screenshot({ path: path.join(require('node:os').tmpdir(), 'moments-sidebar-desktop.png') });
    await page.setViewportSize({ width: 390, height: 844 });
    assert.equal(await page.locator('.sidebar').isVisible(), false);
    await page.screenshot({ path: path.join(require('node:os').tmpdir(), 'moments-sidebar-mobile.png') });
    assert.deepEqual(errors, []);
    console.log('PASS: first-image-only loading, lazy/async images, count badge, complete preview, bounded virtual rows,');
    console.log('pagination across polling, legacy preference ignored, collapse/reopen, refresh, mobile hiding.');
  } finally {
    if (browser) await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
