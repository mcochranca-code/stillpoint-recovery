import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { axeViolations } from '../../../tests/axe';
import { CURRENT_SCHEMA_VERSION, db } from '../../db/database';
import { defaultPreferences, ensureDefaults } from '../../db/repository';
import { saveStepAnswer } from '../../db/stepWork';
import { clearAllLocalData, createBackup } from '../../db/backup';
import { isNaStepGuidesEnabled, NA_STEP_GUIDES_SETTING_ANCHOR } from '../../data/na-step-guides/meta';
import { isLocalOnlyReadingKey, submitReadingComment } from '../../domain/communityClient';
import quickFindSource from '../../components/QuickFindDialog.tsx?raw';
import todayPageSource from '../today/TodayPage.tsx?raw';
import todayNudgeSource from '../today/TodayNudge.tsx?raw';
import navigationSource from '../../app/Navigation.tsx?raw';
import readerSource from './NaStepGuidesPage.tsx?raw';
import routesManifest from '../../../public/manus-routes.json';

const mocks = vi.hoisted(() => ({
  context: {} as never,
  readerModuleLoads: 0,
}));
vi.mock('../../app/AppContext', () => ({ useAppContext: () => mocks.context }));
vi.mock('../../platform/notificationPermissions', () => ({
  getNotificationPermission: vi.fn().mockResolvedValue('unsupported'),
  requestNotificationPermission: vi.fn().mockResolvedValue('unsupported'),
}));
// Stands in for the lazy chunk that holds the reader and the NA text, and counts when it is requested.
vi.mock('./NaStepGuidesPage', () => {
  mocks.readerModuleLoads += 1;
  return { NaStepGuidesPage: () => <h1>Reader with the guide text</h1> };
});

import { NaStepGuidesRoute, NaStepGuidesOffScreen } from './NaStepGuidesRoute';
import { LibraryPage } from '../library/LibraryPage';
import { SettingsPage } from '../settings/SettingsPage';

function setContext(naStepGuidesEnabled: boolean | undefined) {
  const preferences = { ...defaultPreferences(), onboardingComplete: true } as Record<string, unknown>;
  if (naStepGuidesEnabled === undefined) delete preferences.naStepGuidesEnabled;
  else preferences.naStepGuidesEnabled = naStepGuidesEnabled;
  mocks.context = { preferences, updatePreferences: vi.fn().mockResolvedValue(undefined), notify: vi.fn() } as never;
  return mocks.context as unknown as { updatePreferences: ReturnType<typeof vi.fn>; notify: ReturnType<typeof vi.fn> };
}

function renderRoute(path = '/library/na-step-guides') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <main id="main-content">
        <Routes>
          <Route path="/library/na-step-guides" element={<NaStepGuidesRoute />} />
          <Route path="/library/na-step-guides/:chapterId" element={<NaStepGuidesRoute />} />
        </Routes>
      </main>
    </MemoryRouter>,
  );
}

beforeEach(async () => {
  await db.delete();
  await db.open();
  setContext(false);
});

afterEach(async () => {
  cleanup();
  await new Promise((resolve) => setTimeout(resolve, 20));
  db.close();
});

describe('NA Step Working Guides opt-in', () => {
  it('is off unless explicitly turned on', () => {
    expect(defaultPreferences().naStepGuidesEnabled).toBe(false);
    expect(isNaStepGuidesEnabled(undefined)).toBe(false);
    expect(isNaStepGuidesEnabled({})).toBe(false);
    expect(isNaStepGuidesEnabled({ naStepGuidesEnabled: 'true' })).toBe(false);
    expect(isNaStepGuidesEnabled({ naStepGuidesEnabled: 1 })).toBe(false);
    expect(isNaStepGuidesEnabled({ naStepGuidesEnabled: true })).toBe(true);
  });

  it('starts new installs with the reader off', async () => {
    await ensureDefaults();
    expect((await db.preferences.get('preferences'))?.naStepGuidesEnabled).toBe(false);
  });

  it('migrates existing settings without the switch to off, and keeps an explicit opt-in', async () => {
    const legacy = { ...defaultPreferences(), onboardingComplete: true } as Record<string, unknown>;
    delete legacy.naStepGuidesEnabled;
    await db.preferences.put(legacy as never);
    await ensureDefaults();
    const migrated = await db.preferences.get('preferences');
    expect(migrated?.naStepGuidesEnabled).toBe(false);
    expect(migrated?.onboardingComplete).toBe(true);
    expect(migrated?.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);

    await db.preferences.put({ ...migrated!, naStepGuidesEnabled: true });
    await ensureDefaults();
    expect((await db.preferences.get('preferences'))?.naStepGuidesEnabled).toBe(true);
  });

  it('repairs a malformed stored value to off', async () => {
    await db.preferences.put({ ...defaultPreferences(), naStepGuidesEnabled: 'yes' as never });
    await ensureDefaults();
    expect((await db.preferences.get('preferences'))?.naStepGuidesEnabled).toBe(false);
  });

  it('Library hides the reader entry while off and shows it once opted in', async () => {
    const { unmount } = render(<MemoryRouter><LibraryPage /></MemoryRouter>);
    expect(screen.queryByRole('heading', { name: 'NA Step Working Guides' })).toBeNull();
    expect(screen.queryByRole('link', { name: /Open the guides|Continue:/ })).toBeNull();
    expect(document.querySelector('a[href^="/library/na-step-guides"]')).toBeNull();
    unmount();

    setContext(true);
    render(<MemoryRouter><LibraryPage /></MemoryRouter>);
    expect(await screen.findByRole('heading', { name: 'NA Step Working Guides' })).toBeInTheDocument();
  });

  it('the route shows a gentle off screen with a link to Settings, and never loads the reader chunk', async () => {
    const before = mocks.readerModuleLoads;
    const { container } = renderRoute('/library/na-step-guides/step-4');
    expect(screen.getByRole('heading', { level: 1, name: 'NA Step Working Guides' })).toBeInTheDocument();
    expect(screen.getByText('This reader is turned off. Turn it on in Settings.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Go to Settings/ })).toHaveAttribute('href', `/settings#${NA_STEP_GUIDES_SETTING_ANCHOR}`);
    expect(screen.getByText(/answers you saved earlier are kept on this device/)).toBeInTheDocument();
    expect(screen.queryByText('Reader with the guide text')).toBeNull();
    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(mocks.readerModuleLoads).toBe(before);
    expect(mocks.readerModuleLoads).toBe(0);
    expect(await axeViolations(container)).toEqual([]);
  });

  it('loads the reader chunk only after the reader is turned on', async () => {
    setContext(true);
    renderRoute();
    expect(await screen.findByRole('heading', { name: 'Reader with the guide text' })).toBeInTheDocument();
    expect(mocks.readerModuleLoads).toBe(1);
  });

  it('the off screen passes axe on its own', async () => {
    const { container } = render(<MemoryRouter><main><NaStepGuidesOffScreen /></main></MemoryRouter>);
    expect(await axeViolations(container)).toEqual([]);
  });

  it('Settings offers the switch off by default, explains it, and saves an explicit opt-in', async () => {
    const context = setContext(undefined);
    const { container } = render(<MemoryRouter><SettingsPage /></MemoryRouter>);
    const section = screen.getByRole('region', { name: 'NA Step Working Guides' });
    const toggle = within(section).getByRole('checkbox', { name: /^Show NA Step Working Guides \(personal use on this device\)/ });
    expect(toggle).not.toBeChecked();
    expect(section).toHaveTextContent('© NA World Services');
    expect(section).toHaveTextContent('personal use only');
    expect(section).toHaveTextContent('stays on this device');
    expect(section).toHaveTextContent('never uploaded or shared');
    expect(section).toHaveTextContent('keeps any answers you saved');
    expect(section.id).toBe(NA_STEP_GUIDES_SETTING_ANCHOR);
    expect(screen.queryByRole('link', { name: 'Open NA Step Working Guides' })).toBeNull();
    expect(await axeViolations(section)).toEqual([]);
    expect(await axeViolations(container)).toEqual([]);

    fireEvent.click(toggle);
    expect(context.updatePreferences).toHaveBeenCalledWith({ naStepGuidesEnabled: true });
    await waitFor(() => expect(context.notify).toHaveBeenCalledWith('The NA Step Working Guides reader is on for this device.'));
  });

  it('turning the switch off keeps saved answers, in the database, the backup and the UI copy', async () => {
    await saveStepAnswer('step-1-q1', 1, 'A private answer');
    await saveStepAnswer('step-4-q2', 4, 'Another private answer');
    const context = setContext(true);
    render(<MemoryRouter><SettingsPage /></MemoryRouter>);
    const toggle = screen.getByRole('checkbox', { name: /^Show NA Step Working Guides \(personal use on this device\)/ });
    expect(toggle).toBeChecked();
    expect(screen.getByRole('link', { name: 'Open NA Step Working Guides' })).toHaveAttribute('href', '/library/na-step-guides');

    fireEvent.click(toggle);
    expect(context.updatePreferences).toHaveBeenCalledTimes(1);
    expect(context.updatePreferences).toHaveBeenCalledWith({ naStepGuidesEnabled: false });
    await waitFor(() => expect(context.notify).toHaveBeenCalledWith('The NA Step Working Guides reader is hidden. Your saved answers are kept on this device.'));

    // Simulate the stored preference flipping off, as AppContext would.
    await db.preferences.put({ ...defaultPreferences(), naStepGuidesEnabled: false });
    expect(await db.stepWorkAnswers.count()).toBe(2);
    expect((await db.stepWorkAnswers.get('step-1-q1'))?.text).toBe('A private answer');
    const backup = await createBackup();
    expect(backup.tables.stepWorkAnswers).toHaveLength(2);

    // Delete all still removes them.
    await clearAllLocalData();
    expect(await db.stepWorkAnswers.count()).toBe(0);
  });

  it('is never mentioned on Today, in navigation, in Quick Find or in the route manifest', () => {
    for (const source of [todayPageSource, todayNudgeSource, navigationSource, quickFindSource]) {
      expect(source).not.toMatch(/na-step-guides|NaStepGuides|Step Working/);
    }
    expect(routesManifest.routes.some(({ path }) => path.startsWith('/library/na-step-guides'))).toBe(false);
  });

  it('the reader has no share, copy-link or export-to-social control', () => {
    expect(readerSource).not.toMatch(/navigator\.share|clipboard|copy link|share/i);
  });

  it('refuses to send anything keyed to the NA reader to the hosted community board', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    expect(isLocalOnlyReadingKey('na-step-guides:step-4')).toBe(true);
    expect(isLocalOnlyReadingKey('stillpoint:2026-11-10:serenity')).toBe(false);
    await expect(submitReadingComment({ commentId: 'c1', readingKey: 'na-step-guides:step-1', text: 'x', browserToken: 't', deletionToken: 'd' }))
      .rejects.toThrow(/stay on this device/);
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
