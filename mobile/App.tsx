import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { Provider } from 'react-redux';
import { PaperProvider } from 'react-native-paper';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import * as Font from 'expo-font';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import FlashMessage from 'react-native-flash-message';

import { store } from './src/store';
import { AuthProvider } from './src/contexts/AuthContext';
import { ThemeProvider } from './src/contexts/ThemeContext';
import MainNavigator from './src/navigation/MainNavigator';
import AuthNavigator from './src/navigation/AuthNavigator';
import LoadingScreen from './src/components/LoadingScreen';
import { useAuth } from './src/contexts/AuthContext';
import { setupNotifications } from './src/services/notificationService';
import { theme } from './src/theme';

const Stack = createStackNavigator();

SplashScreen.preventAutoHideAsync();

const AppContent: React.FC = () => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <NavigationContainer>
      {user ? <MainNavigator /> : <AuthNavigator />}
    </NavigationContainer>
  );
};

export default function App() {
  const [appIsReady, setAppIsReady] = useState(false);

  useEffect(() => {
    async function prepare() {
      try {
        // Pre-load fonts
        await Font.loadAsync({
          'Inter-Regular': require('./assets/fonts/Inter-Regular.ttf'),
          'Inter-Bold': require('./assets/fonts/Inter-Bold.ttf'),
          'Inter-SemiBold': require('./assets/fonts/Inter-SemiBold.ttf'),
        });

        // Setup push notifications
        await setupNotifications();

        // Artificially delay for demo purposes
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (e) {
        console.warn(e);
      } finally {
        setAppIsReady(true);
      }
    }

    prepare();
  }, []);

  useEffect(() => {
    if (appIsReady) {
      SplashScreen.hideAsync();
    }
  }, [appIsReady]);

  if (!appIsReady) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Provider store={store}>
        <ThemeProvider>
          <PaperProvider theme={theme}>
            <AuthProvider>
              <AppContent />
              <StatusBar style="auto" />
              <FlashMessage position="top" />
            </AuthProvider>
          </PaperProvider>
        </ThemeProvider>
      </Provider>
    </GestureHandlerRootView>
  );
}