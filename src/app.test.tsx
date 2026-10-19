// @vitest-environment jsdom
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import App from './App';
import { AppProvider } from './state/store';
import { parseCsvText, detectMapping } from './lib/parse';
import { buildRecords, DEFAULT_LANGUAGES } from './lib/records';
import { emptyFieldRules } from './lib/normalize';
import { starterRules } from './lib/categories';

const csv = readFileSync('public/data/gsoc_2025_organizations.csv', 'utf8');
const parsed = parseCsvText(csv);
const mapping = detectMapping(parsed.headers, parsed.rows);
const expected = buildRecords(parsed.rows, mapping, { technologies: emptyFieldRules(), topics: emptyFieldRules() }, starterRules(), DEFAULT_LANGUAGES).records;

let blobs: Blob[] = [];

beforeAll(() => {
  (globalThis as any).ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
  (globalThis as any).fetch = vi.fn(async () => ({ ok: true, status: 200, text: async () => csv }));
  (URL as any).createObjectURL = (b: Blob) => (blobs.push(b), 'blob:test');
  (URL as any).revokeObjectURL = () => {};
  HTMLAnchorElement.prototype.click = () => {};
  (File.prototype as any).text = function () {
    return new Promise((res) => {
      const fr = new FileReader();
      fr.onload = () => res(String(fr.result));
      fr.readAsText(this);
    });
  };
  (Blob.prototype as any).text = (File.prototype as any).text;
});

afterEach(() => {
  cleanup();
  blobs = [];
  window.location.hash = '';
  localStorage.clear();
});

const boot = async () => {
  render(
    <AppProvider>
      <App />
    </AppProvider>,
  );
  await screen.findByText(/of 185 organizations/);
};
const count = () => Number(screen.getByText(/organizations$/, { selector: 'span[aria-live]' }).textContent!.match(/^(\d+)/)![1]);
const goto = (label: string) => fireEvent.click(within(screen.getByLabelText('Main navigation')).getByText(label));
const pickFilter = (group: string, option: RegExp | string) => {
  fireEvent.click(screen.getAllByRole('button', { name: new RegExp(`^${group}(?![a-z])`) })[0]);
  const list = screen.getByRole('listbox');
  const opt = within(list).getAllByRole('option').find((o) => (typeof option === 'string' ? o.textContent!.startsWith(option) : option.test(o.textContent!)))!;
  fireEvent.click(within(opt).getByRole('button'));
  fireEvent.keyDown(document, { key: 'Escape' });
};
const readBlob = (b: Blob) =>
  new Promise<string>((res) => {
    const fr = new FileReader();
    fr.onload = () => res(String(fr.result));
    fr.readAsText(b);
  });

describe('GSoC explorer UI', () => {
  it('loads 185 organizations and renders overview KPIs without crashing', async () => {
    await boot();
    expect(count()).toBe(185);
    expect(screen.getByText('Unique technologies')).toBeTruthy();
    expect(screen.getAllByText(/rule-based/).length).toBeGreaterThan(0);
  });

  it('every page renders', async () => {
    await boot();
    for (const [label, heading] of [
      ['Categories', 'Categories'],
      ['Technologies', 'Technology analysis'],
      ['Topics', 'Topic analysis'],
      ['Organizations', 'Organizations'],
      ['Projects', 'Projects'],
      ['Insights', 'Insights'],
      ['Data Quality', 'Data quality'],
      ['Overview', 'Overview'],
    ] as const) {
      goto(label);
      await screen.findByRole('heading', { level: 1, name: heading });
    }
  });

  it('category + technology + topic filters combine and counts match the library', async () => {
    await boot();
    pickFilter('Category', 'Web Development');
    const web = expected.filter((r) => r.categories.includes('Web Development'));
    await waitFor(() => expect(count()).toBe(web.length));

    pickFilter('Technology', /^python/i);
    const webPy = web.filter((r) => r.technologies.includes('python'));
    await waitFor(() => expect(count()).toBe(webPy.length));

    pickFilter('Topic', /^education/i);
    const all3 = webPy.filter((r) => r.topics.includes('education'));
    await waitFor(() => expect(count()).toBe(all3.length));

    fireEvent.click(screen.getByRole('button', { name: /Reset/ }));
    await waitFor(() => expect(count()).toBe(185));
  });

  it('exports reflect active filters', async () => {
    await boot();
    pickFilter('Technology', /^rust/i);
    const rust = expected.filter((r) => r.technologies.includes('rust'));
    await waitFor(() => expect(count()).toBe(rust.length));
    goto('Organizations');
    await screen.findByRole('heading', { level: 1, name: 'Organizations' });
    fireEvent.click(screen.getByRole('button', { name: /Export CSV/ }));
    const text = await readBlob(blobs[blobs.length - 1]);
    const lines = text.replace('﻿', '').trim().split(/\r?\n/);
    expect(lines[0]).toContain('Organization');
    expect(lines[0]).toContain('Technologies');
    expect(lines.length - 1).toBe(rust.length);
  });

  it('technology page: selecting a technology filters everything consistently', async () => {
    await boot();
    goto('Technologies');
    await screen.findByRole('heading', { level: 1, name: 'Technology analysis' });
    const table = screen.getByRole('table', { name: 'Technology statistics' });
    const pyBtn = within(table).getAllByRole('button').find((b) => b.textContent === 'Python' || b.textContent === 'python')!;
    fireEvent.click(pyBtn);
    const py = expected.filter((r) => r.technologies.includes('python'));
    await waitFor(() => expect(count()).toBe(py.length));
    await screen.findByText(/Compare selected technologies/);
    await screen.findByText(/Matching organizations/);
  });

  it('topics: AND vs OR', async () => {
    await boot();
    pickFilter('Topic', /^web\d/i);
    pickFilter('Topic', /^machine learning\d/i);
    const or = expected.filter((r) => r.topics.includes('web') || r.topics.includes('machine learning'));
    await waitFor(() => expect(count()).toBe(or.length));
    goto('Topics');
    fireEvent.click(await screen.findByRole('tab', { name: /All \(AND\)/ }));
    const and = expected.filter((r) => r.topics.includes('web') && r.topics.includes('machine learning'));
    await waitFor(() => expect(count()).toBe(and.length));
  });

  it('record detail panel opens with original values', async () => {
    await boot();
    goto('Organizations');
    const btn = await screen.findByRole('button', { name: '52°North Spatial Information Research GmbH' });
    fireEvent.click(btn);
    const dlg = await screen.findByRole('dialog');
    expect(within(dlg).getByText(/Project ideas/)).toBeTruthy();
    fireEvent.click(within(dlg).getByText(/Show original CSV values/));
    expect(within(dlg).getByText(/\['javascript', 'android'/)).toBeTruthy();
    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  it('uploading another CSV with a Category + metric column switches to CSV categories', async () => {
    await boot();
    const input = document.querySelector('input[type=file]') as HTMLInputElement;
    const mini = 'Name,Category,Tech,Stars\nAlpha,Web,"python; react",10\nBeta,"Web;Data",python,5\nGamma,,rust,\n';
    fireEvent.change(input, { target: { files: [new File([mini], 'mini.csv', { type: 'text/csv' })] } });
    await screen.findByText(/of 3 organizations/);
    goto('Data Quality');
    await screen.findByRole('heading', { level: 1, name: 'Data quality' });
    expect(screen.getByText(/Rows loaded/)).toBeTruthy();
    goto('Overview');
    await screen.findByText(/from CSV column/);
    expect(screen.getByText('Unique categories').parentElement!.textContent).toContain('2');
  });

  it('garbage upload shows an error instead of crashing', async () => {
    await boot();
    const input = document.querySelector('input[type=file]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [new File([''], 'empty.csv', { type: 'text/csv' })] } });
    await screen.findByText(/No data loaded/);
  });
});
