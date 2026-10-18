import { useEffect } from 'react';
import { HashRouter, MemoryRouter, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { useStore } from './lib/store';
import { Layout } from './components/Layout';
import { ConfirmHost, ToastHost } from './components/ui';
import { ConfettiHost } from './components/Confetti';
import Dashboard from './pages/Dashboard';
import Clients from './pages/Clients';
import ClientForm from './pages/ClientForm';
import ClientDetail from './pages/client/ClientDetail';
import CheckInForm from './pages/CheckInForm';
import WorkoutLogger from './pages/WorkoutLogger';
import SessionSummary from './pages/SessionSummary';
import Schedule from './pages/Schedule';
import Library from './pages/Library';
import ExerciseDetail from './pages/ExerciseDetail';
import TemplateEditor from './pages/TemplateEditor';
import More from './pages/More';
import Tools from './pages/Tools';
import Business from './pages/Business';
import SettingsPage from './pages/Settings';
import ClientMode, { useClientLock } from './pages/ClientMode';
import Welcome from './pages/Welcome';
import ClassesHub from './pages/classes/ClassesHub';
import LessonDetail from './pages/classes/LessonDetail';
import LessonEditor from './pages/classes/LessonEditor';
import ClassSession from './pages/classes/ClassSession';
import ClassTimer from './pages/classes/ClassTimer';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

/** Keeps a locked client view in place if someone swipes or presses back. */
function ClientLockGuard() {
  const { pathname } = useLocation();
  const nav = useNavigate();
  const locked = useClientLock((s) => s.path);
  useEffect(() => {
    if (locked && pathname !== locked) nav(locked, { replace: true });
  }, [locked, pathname, nav]);
  return null;
}

// The single-file preview runs inside a sandboxed frame, so it keeps routes in memory.
const Router = __SINGLE_FILE__ ? MemoryRouter : HashRouter;

export default function App() {
  const ready = useStore((s) => s.ready);
  const onboarded = useStore((s) => s.data.settings.onboarded);
  const init = useStore((s) => s.init);

  useEffect(() => {
    void init();
  }, [init]);

  if (!ready) return <div className="welcome" />;

  return (
    <Router>
      <ScrollToTop />
      <ClientLockGuard />
      {!onboarded ? (
        <Welcome />
      ) : (
        <Routes>
          <Route path="/workout/:id" element={<WorkoutLogger />} />
          <Route path="/client-mode/:id" element={<ClientMode />} />
          <Route path="/classes/timer/:id" element={<ClassTimer />} />
          <Route element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="clients" element={<Clients />} />
            <Route path="clients/new" element={<ClientForm />} />
            <Route path="clients/:id" element={<ClientDetail />} />
            <Route path="clients/:id/edit" element={<ClientForm />} />
            <Route path="clients/:id/check-in" element={<CheckInForm />} />
            <Route path="sessions/:id" element={<SessionSummary />} />
            <Route path="schedule" element={<Schedule />} />
            <Route path="library" element={<Library />} />
            <Route path="library/exercise/:id" element={<ExerciseDetail />} />
            <Route path="library/template/:id" element={<TemplateEditor />} />
            <Route path="classes" element={<ClassesHub />} />
            <Route path="classes/lesson/:id" element={<LessonDetail />} />
            <Route path="classes/lesson/:id/edit" element={<LessonEditor />} />
            <Route path="classes/session/:id" element={<ClassSession />} />
            <Route path="more" element={<More />} />
            <Route path="tools" element={<Tools />} />
            <Route path="business" element={<Business />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      )}
      <ToastHost />
      <ConfirmHost />
      <ConfettiHost />
    </Router>
  );
}
