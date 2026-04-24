import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';
import '@fontsource/inter/800.css';
import '@fontsource/inter/900.css';
import { Routes, Route } from 'react-router-dom';
import useTwinStore from './store/useTwinStore';
import Navbar from './components/Navbar';
import HomePage from './pages/HomePage';
import FormStep from './pages/FormStep';
import GridStep from './pages/GridStep';
import ConnectionsStep from './pages/ConnectionsStep';
import KpiStep from './pages/KpiStep';
import TwinView from './pages/TwinView';
import DataSourceWizard from './pages/DataSourceWizard';
import PublishedView from './pages/PublishedView';
import ToastContainer from './components/ToastContainer';
import ErrorBoundary from './components/ErrorBoundary';

/* ── Admin app (step-based navigation) ── */
function AdminApp() {
  const { currentStep } = useTwinStore();

  const renderPage = () => {
    switch (currentStep) {
      case 0: return <HomePage />;
      case 1: return <FormStep />;
      case 2: return <GridStep />;
      case 3: return <ConnectionsStep />;
      case 4: return <KpiStep />;
      case 5: return <TwinView />;
      case 6: return <DataSourceWizard />;
      default: return <HomePage />;
    }
  };

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      height: '100vh', width: '100vw',
      overflow: 'hidden', background: 'var(--bg-0)',
    }}>
      <Navbar />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {renderPage()}
      </div>
    </div>
  );
}

/* ── Published viewer (standalone URL route) ── */
function PublishedApp() {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      height: '100vh', width: '100vw',
      overflow: 'hidden', background: 'var(--bg-0)',
    }}>
      <PublishedView />
    </div>
  );
}

/* ── Root Router ── */
export default function App() {
  return (
    <ErrorBoundary>
      <Routes>
        <Route path="/view/:pubId" element={<PublishedApp />} />
        <Route path="/*" element={<AdminApp />} />
      </Routes>
      <ToastContainer />
    </ErrorBoundary>
  );
}
