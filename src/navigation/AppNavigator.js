import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { View, Text } from 'react-native';

// Placeholders — replace with real screens as they're built
const HomeScreen    = () => <View style={{ flex:1, backgroundColor:'#080810' }}><Text style={{color:'#fff',marginTop:100,textAlign:'center'}}>Home</Text></View>;
const SearchScreen  = () => <View style={{ flex:1, backgroundColor:'#080810' }}><Text style={{color:'#fff',marginTop:100,textAlign:'center'}}>Search</Text></View>;
const LibraryScreen = () => <View style={{ flex:1, backgroundColor:'#080810' }}><Text style={{color:'#fff',marginTop:100,textAlign:'center'}}>Library</Text></View>;
const AIScreen      = () => <View style={{ flex:1, backgroundColor:'#080810' }}><Text style={{color:'#fff',marginTop:100,textAlign:'center'}}>AI Music</Text></View>;

const Tab   = createBottomTabNavigator();
const Stack = createStackNavigator();

function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: '#080810', borderTopColor: 'rgba(255,255,255,0.08)' },
        tabBarActiveTintColor: '#a78bfa',
        tabBarInactiveTintColor: '#475569',
      }}
    >
      <Tab.Screen name="Home"    component={HomeScreen}    options={{ tabBarLabel: 'Home' }} />
      <Tab.Screen name="Search"  component={SearchScreen}  options={{ tabBarLabel: 'Search' }} />
      <Tab.Screen name="Library" component={LibraryScreen} options={{ tabBarLabel: 'Library' }} />
      <Tab.Screen name="AI"      component={AIScreen}      options={{ tabBarLabel: 'AI' }} />
    </Tab.Navigator>
  );
}

export function AppNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Main" component={TabNavigator} />
    </Stack.Navigator>
  );
}
