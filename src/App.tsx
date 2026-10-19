import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useApp } from './state/store';
import { FilterBar, Header, Sidebar } from './components/Layout';
import { RecordModal } from './components/RecordModal';
import { Notice } from './components/ui';
import Overview from './pages/Overview';
import Categories from './pages/Categories';
import Technologies from './pages/Technologies';
import Topics from './pages/Topics';
import Organizations from './pages/Organizations';
import Projects from './pages/Projects';
import Insights from './pages/Insights';
import DataQuality from './pages/DataQuality';

export default function App() {
  const { page, loading, loadError, dataset, allRecords } = useApp();
  const [menu, setMenu] = useState(false);

  let body;
  if (loading && !dataset) {
    body = (
      <div className="flex h-64 items-center justify-center gap-2 text-slate-500" role="status">
        <Loader2 className="animate-spin" size={18} /> Loading CSV…
      </div>
    );
  } else if (!dataset || (loadError && !allRecords.length)) {
    body = (
      <div className="mx-auto max-w-xl pt-10">
        <Notice kind="warn" title="No data loaded">
          {loadError ?? 'Upload a CSV file with the button in the header.'}
        </Notice>
      </div>
    );
  } else {
    body = {
      overview: <Overview />,
      categories: <Categories />,
      technologies: <Technologies />,
      topics: <Topics />,
      organizations: <Organizations />,
      projects: <Projects />,
      insights: <Insights />,
      quality: <DataQuality />,
    }[page];
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar open={menu} onClose={() => setMenu(false)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header onMenu={() => setMenu(true)} />
        {dataset && allRecords.length > 0 && page !== 'quality' && <FilterBar />}
        <main className="min-w-0 flex-1 p-4" id="main">
          {loading && dataset && (
            <div className="mb-2 flex items-center gap-2 text-xs text-slate-500" role="status">
              <Loader2 className="animate-spin" size={13} /> Loading…
            </div>
          )}
          {body}
        </main>
      </div>
      <RecordModal />
    </div>
  );
}
