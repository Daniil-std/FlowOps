import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, vi } from 'vitest';
import { HistorySection } from '../components/HistorySection';
import { job } from './fixtures';

it('removes old rows while a new history page is loading and allows retry', async () => {
  let resolvePage!: (response: Response) => void;
  const fetch = vi
    .spyOn(globalThis, 'fetch')
    .mockResolvedValueOnce(
      new Response(JSON.stringify({ items: [job], total: 11, limit: 10, offset: 0 })),
    )
    .mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolvePage = resolve;
        }),
    )
    .mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          items: [{ ...job, filename: 'page-two.csv' }],
          total: 11,
          limit: 10,
          offset: 10,
        }),
      ),
    );
  const user = userEvent.setup();
  render(<HistorySection />);
  await user.click(await screen.findByRole('button', { name: 'Next imports' }));
  expect(screen.queryByText(job.filename)).not.toBeInTheDocument();
  expect(screen.getByText('Loading imports…')).toBeVisible();
  await act(async () =>
    resolvePage(
      new Response(JSON.stringify({ detail: { message: 'Try again.' } }), { status: 503 }),
    ),
  );
  expect(await screen.findByRole('alert')).toHaveTextContent('Try again.');
  await user.click(screen.getByRole('button', { name: 'Try again' }));
  expect(await screen.findByText('page-two.csv')).toBeVisible();
  expect(String(fetch.mock.calls[2][0])).toContain('offset=10');
});
