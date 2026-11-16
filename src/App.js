import React, { useState, useEffect } from 'react';
import MainPage from './pages/MainPage';
import RecommendationPage from './pages/RecommendationPage';

import PlayCraft from './pages/PlayCraft';

// Simple routing based on the URL: /recommend shows the recommend page, /play shows PlayCraft
// (the video game list), and anything else the watchlist.
const getCurrentPage = () => {
  const path = window.location.pathname;
  if (path === '/recommend') return 'recommend';
  if (path === '/play') return 'play';
  return 'main';
};

const App = () => {
  const [currentPage, setCurrentPage] = useState(getCurrentPage);

  // Keep up with the browser's back/forward buttons.
  useEffect(() => {
    const handlePopState = () => setCurrentPage(getCurrentPage());
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  if (currentPage === 'recommend') return <RecommendationPage />;
  if (currentPage === 'play') return <PlayCraft />;
  return <MainPage />;
};

export default App;
