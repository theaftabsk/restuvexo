import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'auth_provider.dart';

class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  final _phoneController = TextEditingController();
  final _pinController = TextEditingController();
  bool _loading = false;
  String? _errorMessage;

  void _handleLogin() async {
    final phone = _phoneController.text.trim();
    final pin = _pinController.text.trim();
    if (phone.isEmpty || pin.isEmpty) return;

    setState(() {
      _loading = true;
      _errorMessage = null;
    });

    final success = await ref.read(authProvider.notifier).login(phone, pin);
    setState(() {
      _loading = false;
    });

    if (success) {
      final role = ref.read(authProvider).role;
      _redirectToDashboard(role);
    } else {
      setState(() {
        _errorMessage = ref.read(authProvider).error ?? 'Authentication failed.';
      });
    }
  }

  void _redirectToDashboard(String? role) {
    if (role == 'owner') {
      context.go('/owner');
    } else if (role == 'waiter') {
      context.go('/waiter');
    } else if (role == 'kitchen') {
      context.go('/kitchen');
    } else {
      setState(() {
        _errorMessage = 'Unauthorized role: $role';
      });
    }
  }

  void _quickLogin(String phone, String pin) {
    _phoneController.text = phone;
    _pinController.text = pin;
    _handleLogin();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0F172A),
      body: Center(
        child: SingleChildScrollView(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 28.0),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const Icon(
                  Icons.restaurant_menu,
                  color: Color(0xFFFF5722),
                  size: 64,
                ),
                const SizedBox(height: 16),
                const Text(
                  'RESTUVEXO ROS',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 22,
                    fontWeight: FontWeight.w900,
                    letterSpacing: 1.5,
                  ),
                ),
                const SizedBox(height: 32),
                if (_errorMessage != null)
                  Container(
                    padding: const EdgeInsets.all(12),
                    margin: const EdgeInsets.only(bottom: 16),
                    decoration: BoxDecoration(
                      color: Colors.red.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: Colors.red.withOpacity(0.3)),
                    ),
                    child: Text(
                      _errorMessage!,
                      textAlign: TextAlign.center,
                      style: const TextStyle(color: Colors.red, fontSize: 12, fontWeight: FontWeight.bold),
                    ),
                  ),
                TextField(
                  controller: _phoneController,
                  keyboardType: TextInputType.phone,
                  style: const TextStyle(color: Colors.white),
                  decoration: InputDecoration(
                    labelText: 'Phone Number',
                    labelStyle: TextStyle(color: Colors.white.withOpacity(0.5)),
                    filled: true,
                    fillColor: Colors.white.withOpacity(0.05),
                    prefixIcon: const Icon(Icons.phone, color: Color(0xFFFF5722)),
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: BorderSide.none),
                  ),
                ),
                const SizedBox(height: 16),
                TextField(
                  controller: _pinController,
                  obscureText: true,
                  keyboardType: TextInputType.number,
                  style: const TextStyle(color: Colors.white),
                  decoration: InputDecoration(
                    labelText: '4-Digit PIN',
                    labelStyle: TextStyle(color: Colors.white.withOpacity(0.5)),
                    filled: true,
                    fillColor: Colors.white.withOpacity(0.05),
                    prefixIcon: const Icon(Icons.lock, color: Color(0xFFFF5722)),
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: BorderSide.none),
                  ),
                ),
                const SizedBox(height: 24),
                ElevatedButton(
                  onPressed: _loading ? null : _handleLogin,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFFFF5722),
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 18),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                  ),
                  child: _loading
                      ? const SizedBox(
                          height: 20,
                          width: 20,
                          child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                        )
                      : const Text('SIGN IN', style: TextStyle(fontWeight: FontWeight.w900, letterSpacing: 1.2)),
                ),
                const SizedBox(height: 32),
                // Demo Shortcuts Section
                Row(
                  children: [
                    Expanded(child: Divider(color: Colors.white.withOpacity(0.1))),
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 12.0),
                      child: Text(
                        'DEMO WORKSPACE LOGIN',
                        style: TextStyle(color: Colors.white.withOpacity(0.3), fontSize: 10, fontWeight: FontWeight.bold),
                      ),
                    ),
                    Expanded(child: Divider(color: Colors.white.withOpacity(0.1))),
                  ],
                ),
                const SizedBox(height: 16),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                  children: [
                    ElevatedButton(
                      onPressed: () => _quickLogin('demo@restuvexo.shop', 'password123'),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.white.withOpacity(0.05),
                        foregroundColor: Colors.white70,
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                      child: const Text('Owner', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
                    ),
                    ElevatedButton(
                      onPressed: () => _quickLogin('01700000000', '0000'),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.white.withOpacity(0.05),
                        foregroundColor: Colors.white70,
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                      child: const Text('Waiter', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
                    ),
                    ElevatedButton(
                      onPressed: () => _quickLogin('01800000000', '0000'),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.white.withOpacity(0.05),
                        foregroundColor: Colors.white70,
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                      child: const Text('Chef', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
