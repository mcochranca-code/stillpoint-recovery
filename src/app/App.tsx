import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { MotionConfig } from 'framer-motion';
import { AppProvider, useAppContext } from './AppContext';
import Navigation from './Navigation';
import Onboarding from './Onboarding';
import { Leaf } from 'lucide-react';
import { LoadingScreen } from '../components/LoadingScreen';
import { PageSkeleton } from '../components/PageSkeleton';
import { RouteFocusManager } from './RouteFocusManager';

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
const NaStepGuidesPage = lazy(() => import('../features/na-step-guides/NaStepGuidesPage').then((page) => ({ default: page.NaStepGuidesPage })));
const FieldGuidePage = lazy(() => import('../features/field-guide/FieldGuidePage').then((page) => ({ default: page.FieldGuidePage })));

function AppRoutes() {
  const { ready, preferences, storageError } = useAppContext();
  const { pathname } = useLocation();
  if (storageError) {
    return <main className="storage-error"><Leaf size={34} aria-hidden="true" /><h1>Your local space is unavailable</h1><p>{storageError}</p><p>Do not clear site data or reinstall while trying to recover. Close other Stillpoint tabs, reload once, and check available browser storage. If you have a backup, keep it unchanged and restore it from a working browser profile. Stillpoint cannot retrieve local records from a server; do not send journal text or backup files to support.</p><p>See the Data and Privacy guide in the Stillpoint source repository for general recovery steps.</p></main>;
  }
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
          <Route path="/library/na-step-guides" element={<NaStepGuidesPage />} />
          <Route path="/library/na-step-guides/:chapterId" element={<NaStepGuidesPage />} />
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
      </main>
    </div>
    </MotionConfig>
  );
}

export default function App() {
  return <AppProvider><AppRoutes /></AppProvider>;
}
