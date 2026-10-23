import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { AppProvider, useAppContext } from './AppContext';
import Navigation from './Navigation';
import Onboarding from './Onboarding';
import { Leaf } from 'lucide-react';

const TodayPage = lazy(() => import('../features/today/TodayPage').then((page) => ({ default: page.TodayPage })));
const ProgressPage = lazy(() => import('../features/progress/ProgressPage').then((page) => ({ default: page.ProgressPage })));
const JournalPage = lazy(() => import('../features/journal/JournalPage').then((page) => ({ default: page.JournalPage })));
const MeditationPage = lazy(() => import('../features/meditation/MeditationPage').then((page) => ({ default: page.MeditationPage })));
const LibraryPage = lazy(() => import('../features/library/LibraryPage').then((page) => ({ default: page.LibraryPage })));
const MeetingsPage = lazy(() => import('../features/meetings/MeetingsPage').then((page) => ({ default: page.MeetingsPage })));
const SettingsPage = lazy(() => import('../features/settings/SettingsPage').then((page) => ({ default: page.SettingsPage })));
const ResetPage = lazy(() => import('../features/reset/ResetPage').then((page) => ({ default: page.ResetPage })));
const GardenPage = lazy(() => import('../features/garden/GardenPage').then((page) => ({ default: page.GardenPage })));
const FieldGuidePage = lazy(() => import('../features/field-guide/FieldGuidePage').then((page) => ({ default: page.FieldGuidePage })));

function AppRoutes() {
  const { ready, preferences, storageError } = useAppContext();
  if (storageError) {
    return <main className="storage-error"><Leaf size={34} aria-hidden="true" /><h1>Your local space is unavailable</h1><p>{storageError}</p><p>Try freeing browser storage or using a browser that allows local site data. Stillpoint does not send recovery data to a server.</p></main>;
  }
  if (!ready) {
    return <main className="loading-screen"><img src="/assets/branding/stillpoint-logo.svg" alt="Stillpoint Recovery" /><p>Making a little room for today…</p></main>;
  }
  if (!preferences?.onboardingComplete) return <Onboarding />;
  return (
    <div className="app-frame">
      <Navigation />
      <main className="page-content" id="main-content" tabIndex={-1}>
        <Suspense fallback={<div className="page-skeleton" role="status">Opening your local space…</div>}>
        <Routes>
          <Route path="/" element={<TodayPage />} />
          <Route path="/progress" element={<ProgressPage />} />
          <Route path="/journal" element={<JournalPage />} />
          <Route path="/meditation" element={<MeditationPage />} />
          <Route path="/library" element={<LibraryPage />} />
          <Route path="/meetings" element={<MeetingsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/reset" element={<ResetPage />} />
          <Route path="/garden" element={<GardenPage />} />
          <Route path="/field-guide" element={<FieldGuidePage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </Suspense>
      </main>
    </div>
  );
}

export default function App() {
  return <AppProvider><AppRoutes /></AppProvider>;
}
