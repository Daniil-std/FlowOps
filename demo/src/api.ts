async function errorMessage(response: Response): Promise<string> {
  return `Could not load the demo file (${response.status}). Please try again.`;
}

export async function get<T>(path: string, signal?: AbortSignal): Promise<T> {
  const match = /^\/demos\/(clean|issues)(\/analytics)?$/.exec(path);
  if (!match) throw new Error('This demo only contains fictional examples.');
  const response = await fetch(`/demo/${match[1]}${match[2] ? '-analytics' : ''}.json`, { signal });
  if (!response.ok) throw new Error(await errorMessage(response));
  return response.json() as Promise<T>;
}

export async function downloadFile(path: string, filename: string): Promise<void> {
  const match = /^\/demos\/(clean|issues)\/(source|issues\.csv|export\/(csv|xlsx))$/.exec(path);
  if (!match) throw new Error('Downloads are available for demo examples only.');
  const suffix = match[2] === 'source' ? 'source.csv' : match[2] === 'issues.csv' ? 'issues.csv' : `cleaned.${match[3]}`;
  const response = await fetch(`/demo/${match[1]}-${suffix}`);
  if (!response.ok) throw new Error(await errorMessage(response));
  const url = URL.createObjectURL(await response.blob());
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
