import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.min.css';
import 'admin-lte/dist/css/adminlte.min.css';
import './index.css';
import './styles/adminlte-shell.css';

function startDraftConfigAutoSync() {
  if (typeof window === 'undefined') return;

  let lastSyncedConfig = '';
  let syncTimer: number | undefined;

  const sanitizeBotConfig = (bot: any) => {
    if (!bot || typeof bot !== 'object') return null;
    return {
      ...bot,
      token: '',
      externalApis: {
        ...(bot.externalApis || {}),
        apiAuthToken: '',
        geminiApiKey: '',
        openaiApiKey: ''
      }
    };
  };

  const getCurrentUserBotConfig = () => {
    try {
      const rawUser = window.localStorage.getItem('jimmy_bot_logged_in_user');
      if (!rawUser) return null;

      const currentUser = JSON.parse(rawUser);
      if (!currentUser?.username) return null;

      const rawBots = window.localStorage.getItem(`telegram_bots_list_${currentUser.username}`);
      if (!rawBots) return null;

      const bots = JSON.parse(rawBots);
      if (!Array.isArray(bots) || bots.length === 0) return null;

      return bots.map(sanitizeBotConfig).filter(Boolean);
    } catch (error) {
      console.warn('Real bot config auto-sync read failed:', error);
      return null;
    }
  };

  const syncNow = async () => {
    const configs = getCurrentUserBotConfig();
    if (!configs?.length) return;

    const serialized = JSON.stringify(configs);
    if (serialized === lastSyncedConfig) return;

    try {
      const responses = await Promise.all(configs.map((config: any) => fetch('/api/bot-config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ instanceId: config.instanceId, config })
        })));

      if (responses.every((response) => response.ok)) {
        lastSyncedConfig = serialized;
        window.localStorage.setItem('jimmy_bot_last_draft_sync_at', new Date().toISOString());
        window.localStorage.setItem('jimmy_bot_last_draft_sync_name', configs.map((config: any) => config.name || 'บอทไม่มีชื่อ').join(', '));
      }
    } catch (error) {
      console.warn('Real bot config auto-sync failed:', error);
    }
  };

  const scheduleSync = () => {
    if (syncTimer) window.clearTimeout(syncTimer);
    syncTimer = window.setTimeout(syncNow, 700);
  };

  // Initial sync after login data/bot list is available.
  window.setTimeout(syncNow, 1200);

  // Keep syncing while the dashboard is open to maintain backend draft state.
  window.setInterval(syncNow, 2500);

  // Also sync quickly after common edit events.
  window.addEventListener('input', scheduleSync, true);
  window.addEventListener('change', scheduleSync, true);
  window.addEventListener('click', scheduleSync, true);
  window.addEventListener('storage', scheduleSync);
}

startDraftConfigAutoSync();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
