import React, {useEffect} from 'react';
import {DefaultTheme, NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {ActivityIndicator, StatusBar, View} from 'react-native';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {LoginScreen} from '../screens/LoginScreen';
import {StokScreen} from '../screens/StokScreen';
import {StokDetailScreen} from '../screens/StokDetailScreen';
import {StokEditScreen} from '../screens/StokEditScreen';
import {PapanScreen} from '../screens/PapanScreen';
import {ScanTicketScreen} from '../screens/ScanTicketScreen';
import {ConfirmScreen} from '../screens/ConfirmScreen';
import {DispoScreen} from '../screens/DispoScreen';
import {DispoBaruScreen} from '../screens/DispoBaruScreen';
import {LabelPreviewScreen} from '../screens/LabelPreviewScreen';
import {PakaiScreen} from '../screens/PakaiScreen';
import {KamusScreen} from '../screens/KamusScreen';
import {useAuthStore} from '../stores/useAuthStore';
import {colors} from '../theme';
import type {
  DispoStackParamList,
  RootStackParamList,
  ScanStackParamList,
  StokStackParamList,
  TabParamList,
} from './types';

const Root = createNativeStackNavigator<RootStackParamList>();
const Tabs = createBottomTabNavigator<TabParamList>();
const Stok = createNativeStackNavigator<StokStackParamList>();
const Scan = createNativeStackNavigator<ScanStackParamList>();
const Dispo = createNativeStackNavigator<DispoStackParamList>();

const hiddenHeader = {headerShown: false};

function StokStack() {
  return (
    <Stok.Navigator screenOptions={hiddenHeader}>
      <Stok.Screen name="StokHome" component={StokScreen} />
      <Stok.Screen name="StokDetail" component={StokDetailScreen} />
      <Stok.Screen name="StokEdit" component={StokEditScreen} />
    </Stok.Navigator>
  );
}

function ScanStack() {
  return (
    <Scan.Navigator screenOptions={hiddenHeader}>
      <Scan.Screen name="ScanHome" component={ScanTicketScreen} />
      <Scan.Screen name="Confirm" component={ConfirmScreen} />
    </Scan.Navigator>
  );
}

function DispoStack() {
  return (
    <Dispo.Navigator screenOptions={hiddenHeader}>
      <Dispo.Screen name="DispoHome" component={DispoScreen} />
      <Dispo.Screen name="DispoBaru" component={DispoBaruScreen} />
      <Dispo.Screen name="LabelPreview" component={LabelPreviewScreen} />
    </Dispo.Navigator>
  );
}

const navTheme = {
  ...DefaultTheme,
  dark: false,
  colors: {
    ...DefaultTheme.colors,
    primary: colors.rack,
    background: colors.ticket,
    card: colors.ticket2,
    text: colors.ink,
    border: colors.rubber,
    notification: colors.rack,
  },
};

function MainTabs() {
  return (
    <Tabs.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.rack,
        tabBarInactiveTintColor: colors.inkMuted,
        tabBarIcon: () => null,
        tabBarIconStyle: {height: 0, width: 0},
        tabBarLabelStyle: {fontSize: 11, marginBottom: 10},
        tabBarItemStyle: {paddingTop: 6},
        tabBarStyle: {backgroundColor: colors.ticket2, borderTopColor: colors.rubber, height: 52},
      }}>
      <Tabs.Screen name="Stok" component={StokStack} />
      <Tabs.Screen name="Papan" component={PapanScreen} />
      <Tabs.Screen name="Daftar" component={ScanStack} />
      <Tabs.Screen name="Dispo" component={DispoStack} />
      <Tabs.Screen name="Pakai" component={PakaiScreen} />
      <Tabs.Screen name="Kamus" component={KamusScreen} />
    </Tabs.Navigator>
  );
}

export function RootNavigator() {
  const user = useAuthStore(s => s.user);
  const hydrating = useAuthStore(s => s.hydrating);

  useEffect(() => {
    const t = setTimeout(() => useAuthStore.setState({hydrating: false}), 1200);
    return () => clearTimeout(t);
  }, []);

  if (hydrating) {
    return (
      <View style={{flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.ticket}}>
        <ActivityIndicator color={colors.rubber} />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{flex: 1}}>
      <SafeAreaProvider>
        <StatusBar barStyle="light-content" backgroundColor={colors.rubber} />
        <NavigationContainer theme={navTheme}>
          <Root.Navigator screenOptions={{headerShown: false}}>
            {user ? (
              <Root.Screen name="Tabs" component={MainTabs} />
            ) : (
              <Root.Screen name="Login" component={LoginScreen} />
            )}
          </Root.Navigator>
        </NavigationContainer>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
