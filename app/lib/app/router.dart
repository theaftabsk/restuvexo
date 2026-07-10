import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../features/splash/splash_screen.dart';
import '../features/server/server_config.dart';
import '../features/auth/login_screen.dart';
import '../features/owner/dashboard/owner_dashboard.dart';
import '../features/waiter/tables/tables_screen.dart';
import '../features/kitchen/queue/kds_screen.dart';

final GoRouter appRouter = GoRouter(
  initialLocation: '/',
  routes: [
    GoRoute(
      path: '/',
      builder: (context, state) => const SplashScreen(),
    ),
    GoRoute(
      path: '/server',
      builder: (context, state) => const ServerConfigScreen(),
    ),
    GoRoute(
      path: '/login',
      builder: (context, state) => const LoginScreen(),
    ),
    GoRoute(
      path: '/owner',
      builder: (context, state) => const OwnerDashboard(),
    ),
    GoRoute(
      path: '/waiter',
      builder: (context, state) => const TablesScreen(),
    ),
    GoRoute(
      path: '/kitchen',
      builder: (context, state) => const KdsScreen(),
    ),
  ],
  redirect: (context, state) async {
    final prefs = await SharedPreferences.getInstance();
    
    // Check if server URL is configured
    final serverUrl = prefs.getString('server_url');
    if (serverUrl == null || serverUrl.isEmpty) {
      if (state.matchedLocation != '/server') {
        return '/server';
      }
      return null;
    }

    return null;
  },
);
