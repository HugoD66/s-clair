import { expect, test as base, type Page } from '@playwright/test';
import { createServer, request } from 'node:http';
import type { AddressInfo } from 'node:net';

// A loopback proxy exercises the compiled Docker site in a genuinely secure context.
// Production capture keeps the browser's normal HTTPS/localhost requirements.
const test = base.extend({
  baseURL: async ({ baseURL }, use) => {
    const upstream = new URL(baseURL ?? 'http://localhost:4200');
    const server = createServer((incoming, response) => {
      const proxy = request(
        new URL(incoming.url ?? '/', upstream),
        {
          method: incoming.method,
          headers: { ...incoming.headers, host: upstream.host },
        },
        (result) => {
          response.writeHead(result.statusCode ?? 502, result.headers);
          result.pipe(response);
        },
      );
      proxy.on('error', () => {
        if (!response.headersSent) response.writeHead(502);
        response.end();
      });
      incoming.pipe(proxy);
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    try {
      await use(`http://127.0.0.1:${(server.address() as AddressInfo).port}`);
    } finally {
      server.closeAllConnections();
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      );
    }
  },
});

type FixtureMode = 'ready' | 'delayed' | 'denied' | 'missing' | 'busy';
declare global {
  interface Window {
    microphoneFixture: {
      requests: number;
      streams: MediaStream[];
      release: () => void;
      hit: () => void;
      disconnect: () => void;
    };
  }
}

async function microphone(page: Page, mode: FixtureMode = 'ready') {
  await page.addInitScript((mode) => {
    const fixture = {
      requests: 0,
      streams: [] as MediaStream[],
      release: () => {},
      hit: () => {},
      disconnect: () => {},
    };
    window.microphoneFixture = fixture;
    Object.defineProperty(navigator.mediaDevices, 'getUserMedia', {
      value: async () => {
        fixture.requests++;
        if (mode === 'denied') throw new DOMException('Denied for test', 'NotAllowedError');
        if (mode === 'missing') throw new DOMException('Missing for test', 'NotFoundError');
        if (mode === 'busy') throw new DOMException('Busy for test', 'NotReadableError');
        const context = new AudioContext();
        await context.resume();
        const destination = context.createMediaStreamDestination();
        // Keep a silent input live, then inject finite synthetic transients on demand.
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        gain.gain.value = 0;
        oscillator.connect(gain).connect(destination);
        oscillator.start();
        const stream = destination.stream;
        fixture.streams.push(stream);
        const track = stream.getAudioTracks()[0]!;
        const stop = track.stop.bind(track);
        track.stop = () => {
          stop();
          void context.close();
        };
        fixture.disconnect = () => track.dispatchEvent(new Event('ended'));
        fixture.hit = () => {
          const buffer = context.createBuffer(1, 4800, 48000);
          const samples = buffer.getChannelData(0);
          for (let i = 0; i < samples.length; i++)
            samples[i] = Math.cos(i * 0.4) * Math.exp(-i / 500) * 0.7;
          const source = context.createBufferSource();
          source.buffer = buffer;
          source.connect(destination);
          source.start(context.currentTime + 0.03);
        };
        if (mode === 'delayed')
          await new Promise<void>((resolve) => {
            fixture.release = resolve;
          });
        return stream;
      },
    });
  }, mode);
  await page.goto('/?practice=1');
  await page.getByRole('button', { name: 'Tester le micro', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Test du microphone', exact: true }),
  ).toBeFocused();
}

async function released(page: Page) {
  await expect
    .poll(() =>
      page.evaluate(() =>
        window.microphoneFixture.streams.every((stream) =>
          stream.getTracks().every((track) => track.readyState === 'ended'),
        ),
      ),
    )
    .toBe(true);
}

test('detects synthetic audio through the real worklet, resets and releases capture', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await microphone(page);
  expect(await page.evaluate(() => window.microphoneFixture.requests)).toBe(0);
  await page.getByRole('button', { name: 'Activer le micro', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Micro actif' })).toBeVisible();
  await page.waitForTimeout(200);
  await expect(page.getByTestId('microphone-count')).toHaveText('0');
  for (let count = 1; count <= 3; count++) {
    await page.evaluate(() => window.microphoneFixture.hit());
    await expect(page.getByTestId('microphone-count')).toHaveText(String(count));
    await page.waitForTimeout(250);
  }
  await page.getByRole('button', { name: 'Tester le métronome · 60 s', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Arrêter le métronome', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Arrêter le métronome', exact: true }).click();
  await page.getByRole('button', { name: 'Remettre le compteur à zéro', exact: true }).click();
  await expect(page.getByTestId('microphone-count')).toHaveText('0');
  await page.getByRole('button', { name: 'English', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Microphone test', exact: true })).toBeVisible();
  await page.evaluate(() => window.microphoneFixture.hit());
  await expect(page.getByTestId('microphone-count')).toHaveText('1');
  await page.getByRole('button', { name: 'Close test', exact: true }).click();
  await released(page);
  await expect(page.getByRole('button', { name: 'Test microphone', exact: true })).toBeFocused();
  await expect(
    page.getByRole('button', { name: 'Listen to the model', exact: true }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});

test('releases a late permission result after closing without reopening capture', async ({
  page,
}) => {
  await microphone(page, 'delayed');
  await page.getByRole('button', { name: 'Activer le micro', exact: true }).click();
  await expect.poll(() => page.evaluate(() => window.microphoneFixture.streams.length)).toBe(1);
  await page.getByRole('button', { name: 'Fermer le test', exact: true }).click();
  await page.evaluate(() => window.microphoneFixture.release());
  await released(page);
  await expect(page.locator('sc-microphone-diagnostic')).toHaveCount(0);
});

for (const [mode, message] of [
  ['denied', 'L’accès au micro a été refusé'],
  ['missing', 'Aucun microphone trouvé'],
  ['busy', 'Le microphone est inaccessible'],
] as const) {
  test(`reports ${mode} capture and keeps keyboard practice accessible`, async ({ page }) => {
    await microphone(page, mode);
    await page.getByRole('button', { name: 'Activer le micro', exact: true }).click();
    await expect(page.getByRole('alert')).toContainText(message);
    await page.getByRole('button', { name: 'Fermer le test', exact: true }).click();
    await expect(
      page.getByRole('button', { name: 'Écouter le modèle', exact: true }),
    ).toBeVisible();
  });
}

test('stops on device loss or hidden tab and allows a fresh activation', async ({ page }) => {
  await microphone(page);
  await page.getByRole('button', { name: 'Activer le micro', exact: true }).click();
  await expect(page.locator('sc-microphone-diagnostic .status')).toHaveText('Micro actif');
  await page.getByRole('button', { name: 'Arrêter le micro', exact: true }).click();
  await released(page);
  await page.getByRole('button', { name: 'Activer le micro', exact: true }).click();
  await expect(page.locator('sc-microphone-diagnostic .status')).toHaveText('Micro actif');
  await page.evaluate(() => window.microphoneFixture.disconnect());
  await expect(page.getByRole('alert')).toContainText('interrompu');
  await released(page);
  await page.getByRole('button', { name: 'Activer le micro', exact: true }).click();
  await expect(page.locator('sc-microphone-diagnostic .status')).toHaveText('Micro actif');
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await expect(page.locator('sc-microphone-diagnostic .status')).toContainText('Micro arrêté');
  await released(page);
  expect(await page.evaluate(() => window.microphoneFixture.requests)).toBe(3);
});
