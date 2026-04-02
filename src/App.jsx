import './index.css';
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';
import '@fontsource/inter/800.css';
import '@fontsource/inter/900.css';
import useTwinStore from './store/useTwinStore';
import Navbar from './components/Navbar';
import ProjectsPage from './pages/ProjectsPage';
import NewProjectPage from './pages/NewProjectPage';
import SitePlanPage from './pages/SitePlanPage';
import FloorEditorPage from './pages/FloorEditorPage';
import TwinView from './pages/TwinView';
// Legacy steps (kept for demo flow)
import FormStep from './pages/FormStep';
import GridStep from './pages/GridStep';
import ConnectionsStep from './pages/ConnectionsStep';
import KpiStep from './pages/KpiStep';

export default function App() {
  const { currentStep } = useTwinStore();

  const renderPage = () => {
    switch (currentStep) {
      case 0: return <ProjectsPage />;   // Projects list
      case 1: return <NewProjectPage />; // Create new project wizard
      case 2: return <SitePlanPage />;   // Site plan (place buildings)
      case 3: return <ConnectionsStep />; // Legacy connections (kept)
      case 4: return <FloorEditorPage />; // Floor editor (new)
      case 5: return <TwinView />;        // Live analytics view
      // Legacy wizard still accessible
      case 11: return <FormStep />;
      case 12: return <GridStep />;
      case 13: return <KpiStep />;
      default: return <ProjectsPage />;
    }
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      width: '100vw',
      overflow: 'hidden',
      background: 'var(--bg-0)',
    }}>
      <Navbar />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {renderPage()}
      </div>
    </div>
  );
}
