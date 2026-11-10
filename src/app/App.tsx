import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { MotionConfig } from 'framer-motion';
import { AppProvider, useAppContext } from './AppContext';
import Navigation from './Navigation';
import Onboarding from './Onboarding';
import { LoadingScreen } from '../components/LoadingScreen';
import { PageSkeleton } from '../components/PageSkeleton';
import { RouteFocusManager } from './RouteFocusManager';
import { RecoveryScreen } from '../features/recovery/RecoveryScreen';
import { DataErrorBoundary } from '../components/DataErrorBoundary';

const TodayPage = lazy(() => import('../features/today/TodayPage').then((page) => ({ default: page.TodayPage })));
const ProgressPage = lazy(() => import('../features/progress/ProgressPage').then((page) => ({ default: page.ProgressPage })));
const CharmCollectionPage = lazy(() => import('../features/progress/CharmCollectionPage').then((page) => ({ default: page.CharmCollectionPage })));
const CurrentMilestoneTokenPage = lazy(() => import('../features/progress/CurrentMilestoneTokenPage').then((page) => ({ default: page.CurrentMilestoneTokenPage })));
const JournalPage = lazy(() => import('../features/journal/JournalPage').then((page) => ({ default: page.JournalPage })));
const MeditationPage = lazy(() => import('../features/meditation/MeditationPage').then((page) => ({ default: page.MeditationPage })));
const LibraryPage = lazy(() => import('../features/library/LibraryPage').then((page) => ({ default: page.LibraryPage })));
const MeetingsPage = lazy(() => import('../features/meetings/MeetingsPage').then((page) => ({ default: page.MeetingsPage })));
const CommunityNotesPage = lazy(() => import('../features/community/CommunityNotesPage').then((page) => ({ default: page.CommunityNotesPage })));
const SettingsPage = lazy(() => import('../features/settings/SettingsPage').then((page) => ({ default: page.SettingsPage })));
const ResetPage = lazy(() => import('../features/reset/ResetPage').then((page) => ({ default: page.ResetPage })));
const GardenPage = lazy(() => import('../features/garden/GardenPage').then((page) => ({ default: page.GardenPage })));
// Opt-in gate only: the guide text is a further lazy chunk that loads after the person turns the reader on.
const NaStepGuidesRoute = lazy(() => import('../features/na-step-guides/NaStepGuidesRoute').then((page) => ({ default: page.NaStepGuidesRoute })));
const FieldGuidePage = lazy(() => import('../features/field-guide/FieldGuidePage').then((page) => ({ default: page.FieldGuidePage })));

function AppRoutes() {
  const { ready, preferences, storageFailure, retryStorage } = useAppContext();
  const { pathname } = useLocation();
  if (storageFailure && retryStorage) return <RecoveryScreen failure={storageFailure} onRetry={retryStorage} />;
  if (!ready) {
    return <LoadingScreen />;
  }
  if (!preferences?.onboardingComplete) return <Onboarding />;
  return (
    <MotionConfig reducedMotion={preferences.reducedMotion ? 'always' : 'user'}>
    <div className="app-frame">
      <a className="skip-link" href="#main-content">Skip to main content</a>
      <Navigation communityNotesEnabled={preferences?.communityNotesEnabled === true} />
      <main className="page-content" id="main-content" tabIndex={-1}>
        <RouteFocusManager />
        <DataErrorBoundary resetKey={pathname}>
        <Suspense fallback={<PageSkeleton />}>
        <div className="route-transition" key={pathname}>
        <Routes>
          <Route path="/" element={<TodayPage />} />
          <Route path="/progress" element={<ProgressPage />} />
          <Route path="/charms" element={<CharmCollectionPage />} />
          <Route path="/tokens" element={<CurrentMilestoneTokenPage />} />
          <Route path="/journal" element={<JournalPage />} />
          <Route path="/meditation" element={<MeditationPage />} />
          <Route path="/library" element={<LibraryPage />} />
          <Route path="/library/na-step-guides" element={<NaStepGuidesRoute />} />
          <Route path="/library/na-step-guides/:chapterId" element={<NaStepGuidesRoute />} />
          <Route path="/meetings" element={<MeetingsPage />} />
          <Route path="/community" element={<CommunityNotesPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/reset" element={<ResetPage />} />
          <Route path="/garden" element={<GardenPage />} />
          <Route path="/field-guide" element={<FieldGuidePage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </div>
        </Suspense>
        </DataErrorBoundary>
      </main>
    </div>
    </MotionConfig>
  );
}

export default function App() {
  return <AppProvider><AppRoutes /></AppProvider>;
}
