import { useState, useEffect } from 'react';
import { AdminView } from './views/AdminView';
import { SpectatorView } from './views/SpectatorView';

export function App() {
  const [currentPath, setCurrentPath] = useState(window.location.pathname);
  const [currentHash, setCurrentHash] = useState(window.location.hash);

  useEffect(() => {
    const handleLocationChange = () => {
      setCurrentPath(window.location.pathname);
      setCurrentHash(window.location.hash);
    };

    window.addEventListener('popstate', handleLocationChange);
    window.addEventListener('hashchange', handleLocationChange);

    return () => {
      window.removeEventListener('popstate', handleLocationChange);
      window.removeEventListener('hashchange', handleLocationChange);
    };
  }, []);

  // Check if live spectator view
  // Matches /live/:meetupId or #/live/:meetupId
  let liveMeetupId: string | null = null;

  if (currentPath.startsWith('/live/')) {
    liveMeetupId = currentPath.substring('/live/'.length).split('/')[0] || null;
  } else if (currentHash.startsWith('#/live/')) {
    liveMeetupId = currentHash.substring('#/live/'.length).split('/')[0] || null;
  }

  if (liveMeetupId) {
    return <SpectatorView meetupId={liveMeetupId} />;
  }

  return <AdminView />;
}

export default App;
