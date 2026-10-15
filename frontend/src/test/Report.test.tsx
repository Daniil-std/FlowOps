import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, vi } from 'vitest';
import { Report } from '../components/Report';
import { job } from './fixtures';

it('displays actual cleaned records, source rows, and normalization details', async () => {
  const user = userEvent.setup();
  render(<Report job={job} />);
  expect(screen.getByText('Mira Ellis')).toBeVisible();
  expect(screen.getByText('37.00 USD')).toBeVisible();
  await user.click(screen.getByRole('tab', { name: /Issues/ }));
  expect(screen.getByText('Row 4')).toBeVisible();
  expect(screen.getByText(/Use YYYY-MM-DD/)).toBeVisible();
  expect(screen.queryByText('Mira Ellis')).not.toBeInTheDocument();
  await user.click(screen.getByRole('tab', { name: /Changes/ }));
  expect(screen.getByText('Trimmed surrounding whitespace.')).toBeVisible();
});

it('filters cleaned rows without changing the stored report', async () => {
  const user = userEvent.setup();
  render(<Report job={job} />);
  await user.type(screen.getByRole('textbox', { name: 'Search cleaned data' }), 'missing');
  expect(screen.getByText('No matching order lines')).toBeVisible();
  await user.clear(screen.getByRole('textbox', { name: 'Search cleaned data' }));
  expect(screen.getByText('Notebook')).toBeVisible();
});

it('disables exports when no validated rows exist', () => {
  render(<Report job={{ ...job, valid_rows: 0, records: [], status: 'no_valid_rows' }} />);
  expect(screen.getByRole('button', { name: 'CSV' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'XLSX' })).toBeDisabled();
  expect(screen.getByText('No valid rows to show')).toBeVisible();
  expect(screen.getByRole('button', { name: 'Issues CSV' })).toBeEnabled();
  expect(screen.getByRole('link', { name: /Fix file & import again/ })).toHaveAttribute(
    'href',
    '#/import',
  );
});

it('supports arrow-key navigation between report tabs', async () => {
  const user = userEvent.setup();
  render(<Report job={job} />);
  screen.getByRole('tab', { name: /Cleaned data/ }).focus();
  await user.keyboard('{ArrowRight}');
  expect(screen.getByRole('tab', { name: /Issues/ })).toHaveFocus();
  expect(screen.getByText('Row 4')).toBeVisible();
  await user.keyboard('{End}');
  expect(screen.getByRole('tab', { name: /Changes/ })).toHaveFocus();
});

it('surfaces failed downloads instead of saving an error response', async () => {
  const user = userEvent.setup();
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(
    new Response(JSON.stringify({ detail: { message: 'The database is unavailable.' } }), {
      status: 503,
    }),
  );
  render(<Report job={job} />);
  await user.click(screen.getByRole('button', { name: 'CSV' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('The database is unavailable.');
});
