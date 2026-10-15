import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, it, vi } from 'vitest';
import App from '../App';
import { job } from './fixtures';

const analytics = {
  currency: 'USD',
  revenue: '37.00',
  orders: 1,
  average_order_value: '37.00',
  units: 2,
  revenue_over_time: [],
  top_products: [],
};

it('keeps the report usable when recent history fails', async () => {
  window.location.hash = `#/imports/${job.id}`;
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
    const path = String(input);
    if (path.includes('/analytics')) return new Response(JSON.stringify(analytics));
    if (path.includes(job.id)) return new Response(JSON.stringify(job));
    return new Response(JSON.stringify({ detail: { message: 'History unavailable.' } }), {
      status: 503,
    });
  });
  render(<App />);
  expect(await screen.findByRole('heading', { name: 'Processing report' })).toBeVisible();
  expect(await screen.findByRole('alert')).toHaveTextContent('History could not be loaded.');
  expect(screen.getByText('Mira Ellis')).toBeVisible();
  expect(screen.getByRole('button', { name: 'CSV' })).toBeEnabled();
});

it('opens a demo in one click using read-only requests', async () => {
  const fetch = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
    const path = String(input);
    if (path.includes('/analytics')) return new Response(JSON.stringify(analytics));
    if (path.includes('/demos/')) return new Response(JSON.stringify(job));
    return new Response(JSON.stringify({ items: [], total: 0, limit: 10, offset: 0 }));
  });
  render(<App />);
  await userEvent.setup().click(screen.getAllByRole('link', { name: 'Explore demo' })[0]);
  expect(await screen.findByRole('heading', { name: 'Processing report' })).toBeVisible();
  expect(fetch.mock.calls.some(([path]) => String(path).endsWith('/demos/clean'))).toBe(true);
  expect(fetch.mock.calls.every(([, init]) => !init?.method || init.method === 'GET')).toBe(true);
});

beforeEach(() => {
  window.location.hash = '#/';
});

it('opens an intentional empty dashboard and navigates to import data', async () => {
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(
    new Response(JSON.stringify({ items: [], total: 0, limit: 10, offset: 0 })),
  );
  const user = userEvent.setup();
  render(<App />);
  expect(await screen.findByRole('heading', { name: 'Good data. Clear decisions.' })).toBeVisible();
  expect(screen.queryByText('37.00')).not.toBeInTheDocument();
  await user.click(screen.getByRole('link', { name: 'Upload your first file' }));
  expect(await screen.findByRole('heading', { name: 'Import your sales data' })).toBeVisible();
  expect(screen.getByRole('button', { name: 'Import & process' })).toBeDisabled();
});

it('reopens stored imports from history', async () => {
  window.location.hash = '#/history';
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
    const path = String(input);
    if (path.includes('/analytics'))
      return new Response(
        JSON.stringify({
          revenue: '37.00',
          orders: 1,
          average_order_value: '37.00',
          units: 2,
          revenue_over_time: [],
          top_products: [],
        }),
      );
    if (path.includes(job.id)) return new Response(JSON.stringify(job));
    return new Response(JSON.stringify({ items: [job], total: 1, limit: 10, offset: 0 }));
  });
  const user = userEvent.setup();
  render(<App />);
  await user.click(await screen.findByRole('link', { name: 'Open september.csv' }));
  expect(await screen.findByRole('heading', { name: 'Processing report' })).toBeVisible();
  expect(screen.getByText('Mira Ellis')).toBeVisible();
  expect(screen.getByRole('heading', { name: 'Your sales overview' })).toBeVisible();
});

it('shows service errors while keeping import navigation available', async () => {
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(
    new Response(JSON.stringify({ detail: { message: 'The database is unavailable.' } }), {
      status: 503,
    }),
  );
  render(<App />);
  expect(await screen.findByRole('alert')).toHaveTextContent('The database is unavailable.');
  const navigation = screen.getByRole('navigation');
  expect(within(navigation).getByRole('link', { name: 'Import data' })).toHaveAttribute(
    'href',
    '#/import',
  );
  await act(async () => {
    window.location.hash = '#/import';
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  });
  expect(screen.getByRole('heading', { name: 'Import your sales data' })).toBeVisible();
});
