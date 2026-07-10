import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../auth/auth_provider.dart';

class SplashScreen extends ConsumerStatefulWidget {
  const SplashScreen({super.key});

  @override
  ConsumerState<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends ConsumerState<SplashScreen> {
  @override
  void initState() {
    super.initState();
    _initializeApp();
  }

  void _initializeApp() async {
    await Future.delayed(const Duration(milliseconds: 1500));
    final prefs = await SharedPreferences.getInstance();
    
    // Check if server URL configured
    String? serverUrl = prefs.getString('server_url');
    if (serverUrl != null && serverUrl.contains('restuvexo.shop')) {
      await prefs.setString('server_url', 'http://localhost:5000');
      serverUrl = 'http://localhost:5000';
    }

    if (serverUrl == null || serverUrl.isEmpty) {
      if (mounted) context.go('/server');
      return;
    }

    // Check Auth State redirect
    final auth = ref.read(authProvider);
    if (auth.isAuthenticated) {
      _redirectToDashboard(auth.role);
    } else {
      if (mounted) context.go('/login');
    }
  }

  void _redirectToDashboard(String? role) {
    if (!mounted) return;
    if (role == 'owner') {
      context.go('/owner');
    } else if (role == 'waiter') {
      context.go('/waiter');
    } else if (role == 'kitchen') {
      context.go('/kitchen');
    } else {
      context.go('/login');
    }
  }

  @override
  Widget build(BuildContext context) {
    return const Scaffold(
      backgroundColor: Color(0xFF0F172A),
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.restaurant_menu,
              color: Color(0xFFFF5722),
              size: 72,
            ),
            SizedBox(height: 24),
            Text(
              'RESTUVEXO ROS',
              style: TextStyle(
                color: Colors.white,
                fontSize: 24,
                fontWeight: FontWeight.w900,
                letterSpacing: 2,
              ),
            ),
            SizedBox(height: 8),
            CircularProgressIndicator(
              color: Color(0xFFFF5722),
            ),
          ],
        ),
      ),
    );
  }
}
