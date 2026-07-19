import React, {useEffect, useState} from 'react';
import {Platform, Pressable, StatusBar, StyleSheet, Text, View} from 'react-native';
import {NavigationContainer} from '@react-navigation/native';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import {
  BarChart3,
  ClipboardCheck,
  Home,
  Menu,
  Plus,
} from 'lucide-react-native';

import {DashboardScreen} from './src/screens/DashboardScreen';
import {FinanceScreen} from './src/screens/FinanceScreen';
import {MoreScreen} from './src/screens/MoreScreen';
import {NewReportScreen} from './src/screens/NewReportScreen';
import {TasksScreen} from './src/screens/TasksScreen';
import {AuthScreen} from './src/screens/AuthScreen';
import {colors} from './src/theme';
import {initializeAppLanguage} from './src/i18n';
import {useTranslation} from 'react-i18next';
import {AppUser, getCurrentUser, logoutUser} from './src/services/authService';

const Tab = createBottomTabNavigator();

const icons = {
  Home,
  Sites: BarChart3,
  Report: Plus,
  Tasks: ClipboardCheck,
  More: Menu,
};

function CenterTabIcon({focused}: {focused: boolean}) {
  return (
    <LinearGradient
      colors={focused ? [colors.primary, colors.primary2] : ['#25314B', '#1A2337']}
      style={styles.centerButton}>
      <Plus size={28} color={colors.text} strokeWidth={2.6} />
    </LinearGradient>
  );
}

function TabIcon({
  name,
  color,
  focused,
}: {
  name: keyof typeof icons;
  color: string;
  focused: boolean;
}) {
  if (name === 'Report') {
    return <CenterTabIcon focused={focused} />;
  }
  const Icon = icons[name];
  return <Icon size={21} color={color} strokeWidth={focused ? 2.6 : 2} />;
}

function getScreenOptions({route}: {route: {name: string}}) {
  return {
    headerShown: false,
    tabBarActiveTintColor: colors.primary,
    tabBarInactiveTintColor: colors.faint,
    tabBarStyle: {
      height: Platform.OS === 'ios' ? 84 : 74,
      paddingTop: 9,
      paddingBottom: Platform.OS === 'ios' ? 22 : 12,
      borderTopColor: 'rgba(255,255,255,0.06)',
      backgroundColor: '#080D18',
      position: 'absolute' as const,
    },
    tabBarButton: (props: any) => (
      <Pressable {...props} android_ripple={{color: 'transparent'}} />
    ),
    tabBarLabel: ({focused, color}: {focused: boolean; color: string}) => (
      <TranslatedTabLabel routeName={route.name} focused={focused} color={color} />
    ),
    tabBarIcon: ({color, focused}: {color: string; focused: boolean}) => (
      <TabIcon name={route.name as keyof typeof icons} color={color} focused={focused} />
    ),
  };
}

function TranslatedTabLabel({routeName, focused, color}: {routeName: string; focused: boolean; color: string}) {
  const {t} = useTranslation();
  const keys: Record<string, string> = {Home: 'tabs.home', Sites: 'tabs.sites', Tasks: 'tabs.tasks', More: 'tabs.more'};
  return (
    <Text style={[styles.tabLabel, focused && styles.tabLabelActive, {color}]}> 
      {routeName === 'Report' ? '' : t(keys[routeName] ?? routeName)}
    </Text>
  );
}

export default function App() {
  const [ready, setReady] = useState(false);
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);

  useEffect(() => {
    Promise.all([initializeAppLanguage(), getCurrentUser()])
      .then(([, user]) => setCurrentUser(user))
      .finally(() => setReady(true));
  }, []);

  if (!ready) {
    return <View style={styles.loading}><StatusBar barStyle="light-content" backgroundColor={colors.background} /></View>;
  }

  if (!currentUser) {
    return (
      <SafeAreaProvider>
        <StatusBar barStyle="light-content" backgroundColor={colors.background} />
        <AuthScreen onAuthenticated={setCurrentUser} />
      </SafeAreaProvider>
    );
  }

  async function handleLogout() {
    await logoutUser();
    setCurrentUser(null);
  }

  return (
    <SafeAreaProvider>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      <NavigationContainer>
        <StatusBar barStyle="light-content" backgroundColor={colors.background} />
        <Tab.Navigator screenOptions={getScreenOptions} initialRouteName="Home">
          <Tab.Screen name="Home" component={DashboardScreen} />
          <Tab.Screen name="Sites">
            {props => <FinanceScreen {...props} currentUser={currentUser} />}
          </Tab.Screen>
          <Tab.Screen name="Report">
            {props => <NewReportScreen {...props} currentUser={currentUser} />}
          </Tab.Screen>
          <Tab.Screen name="Tasks" component={TasksScreen} />
          <Tab.Screen name="More">
            {props => <MoreScreen {...props} currentUser={currentUser} onLogout={handleLogout} />}
          </Tab.Screen>
        </Tab.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loading: {flex: 1, backgroundColor: colors.background},
  tabLabel: {fontSize: 10, marginTop: 1, fontWeight: '700'},
  tabLabelActive: {fontWeight: '900'},
  centerButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -22,
    shadowColor: colors.primary,
    shadowOpacity: 0.55,
    shadowRadius: 16,
    shadowOffset: {width: 0, height: 8},
    elevation: 8,
  },
});
