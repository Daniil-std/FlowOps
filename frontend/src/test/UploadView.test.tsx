import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { UploadView } from '../components/UploadView';
import { job } from './fixtures';

describe('Import workflow', () => {
  it('rejects unsupported and oversized files before upload', async () => {
    render(<UploadView onComplete={vi.fn()} useExample={false} />);
    const input = screen.getByLabelText('Sales spreadsheet');
    fireEvent.change(input, { target: { files: [new File(['no'], 'orders.pdf')] } });
    expect(screen.getByRole('alert')).toHaveTextContent('Choose a CSV or XLSX');
    expect(screen.getByRole('button', { name: 'Import & process' })).toBeDisabled();
    const oversized = new File([new Uint8Array(5 * 1024 * 1024 + 1)], 'orders.csv');
    fireEvent.change(input, { target: { files: [oversized] } });
    expect(screen.getByRole('alert')).toHaveTextContent('5 MB or smaller');
    fireEvent.change(input, { target: { files: [new File([], 'empty.csv')] } });
    expect(screen.getByRole('alert')).toHaveTextContent('This file is empty');
  });

  it('shows a selected file and lets the user remove it', async () => {
    const user = userEvent.setup();
    render(<UploadView onComplete={vi.fn()} useExample={false} />);
    await user.upload(
      screen.getByLabelText('Sales spreadsheet'),
      new File(['orders'], 'orders.csv'),
    );
    expect(screen.getByText('orders.csv')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Import & process' })).toBeDisabled();
    await user.selectOptions(screen.getByLabelText('File currency'), 'USD');
    expect(screen.getByRole('button', { name: 'Import & process' })).toBeEnabled();
    await user.click(screen.getByRole('button', { name: 'Remove selected file' }));
    expect(screen.queryByText('orders.csv')).not.toBeInTheDocument();
  });

  it('sends multipart data, shows progress, and opens the completed report', async () => {
    const user = userEvent.setup();
    const complete = vi.fn();
    const requests: XMLHttpRequest[] = [];
    vi.spyOn(XMLHttpRequest.prototype, 'send').mockImplementation(function (
      this: XMLHttpRequest,
      body,
    ) {
      requests.push(this);
      expect(body).toBeInstanceOf(FormData);
      expect((body as FormData).get('file')).toBeInstanceOf(File);
      expect((body as FormData).get('currency')).toBe('USD');
    });
    render(<UploadView onComplete={complete} useExample={false} />);
    await user.upload(
      screen.getByLabelText('Sales spreadsheet'),
      new File(['orders'], 'orders.csv'),
    );
    await user.selectOptions(screen.getByLabelText('File currency'), 'USD');
    await user.click(screen.getByRole('button', { name: 'Import & process' }));
    expect(screen.getByRole('button', { name: 'Processing…' })).toBeDisabled();
    Object.defineProperties(requests[0], { status: { value: 201 }, response: { value: job } });
    await act(async () => {
      requests[0].dispatchEvent(new ProgressEvent('load'));
    });
    expect(complete).toHaveBeenCalledWith(job);
  });

  it('displays server validation errors and permits retrying', async () => {
    const user = userEvent.setup();
    vi.spyOn(XMLHttpRequest.prototype, 'send').mockImplementation(function (this: XMLHttpRequest) {
      Object.defineProperties(this, {
        status: { value: 422 },
        response: { value: { detail: { message: 'Missing columns: date.' } } },
      });
      this.dispatchEvent(new ProgressEvent('load'));
    });
    render(<UploadView onComplete={vi.fn()} useExample={false} />);
    await user.upload(
      screen.getByLabelText('Sales spreadsheet'),
      new File(['orders'], 'orders.csv'),
    );
    await user.selectOptions(screen.getByLabelText('File currency'), 'USD');
    await user.click(screen.getByRole('button', { name: 'Import & process' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Missing columns: date.');
    expect(screen.getByRole('button', { name: 'Import & process' })).toBeEnabled();
  });
});
