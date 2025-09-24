import { configureStore } from '@reduxjs/toolkit';
import authSlice from './slices/authSlice';
import leaguesSlice from './slices/leaguesSlice';
import playersSlice from './slices/playersSlice';
import matchupsSlice from './slices/matchupsSlice';
import tradesSlice from './slices/tradesSlice';
import notificationsSlice from './slices/notificationsSlice';
import themeSlice from './slices/themeSlice';

export const store = configureStore({
  reducer: {
    auth: authSlice,
    leagues: leaguesSlice,
    players: playersSlice,
    matchups: matchupsSlice,
    trades: tradesSlice,
    notifications: notificationsSlice,
    theme: themeSlice,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST'],
      },
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;