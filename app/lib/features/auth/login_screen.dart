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
  bool _obscureText = true;
  String? _errorMessage;

  @override
  void dispose() {
    _phoneController.dispose();
    _pinController.dispose();
    super.dispose();
  }

  void _handleLogin() async {
    final phone = _phoneController.text.trim();
    final pin = _pinController.text.trim();
    if (phone.isEmpty || pin.isEmpty) {
      setState(() {
        _errorMessage = 'Please enter both credentials.';
      });
      return;
    }

    setState(() {
      _loading = true;
      _errorMessage = null;
    });

    final success = await ref.read(authProvider.notifier).login(phone, pin);
    if (!mounted) return;

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
    final size = MediaQuery.of(context).size;
    final isTablet = size.width > 600;

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      body: SingleChildScrollView(
        child: Column(
          children: [
            // TOP BRAND HEADER PANEL (Mimicking the web banner)
            Container(
              width: double.infinity,
              padding: EdgeInsets.only(
                top: MediaQuery.of(context).padding.top + 32,
                bottom: 32,
                left: 24,
                right: 24,
              ),
              decoration: const BoxDecoration(
                gradient: LinearGradient(
                  colors: [Color(0xFF1E293B), Color(0xFF0F172A)],
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                ),
                borderRadius: BorderRadius.only(
                  bottomLeft: Radius.circular(32),
                  bottomRight: Radius.circular(32),
                ),
              ),
              child: Column(
                children: [
                  // Secure Pill badge
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, py: 4),
                    decoration: BoxDecoration(
                      color: const Color(0xFFFF5722).withOpacity(0.1),
                      border: Border.all(color: const Color(0xFFFF5722).withOpacity(0.2)),
                      borderRadius: BorderRadius.circular(100),
                    ),
                    child: const Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(Icons.shield_outlined, color: Color(0xFFFF5722), size: 12),
                        SizedBox(width: 6),
                        Text(
                          'SECURE TERMINAL 256-BIT',
                          style: TextStyle(
                            color: Color(0xFFFF5722),
                            fontSize: 9,
                            fontWeight: FontWeight.black,
                            letterSpacing: 1.0,
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 24),
                  // Logo + Title block
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Container(
                        padding: const EdgeInsets.all(6),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(12),
                          boxShadow: [
                            BoxShadow(
                              color: Colors.black.withOpacity(0.1),
                              blurRadius: 8,
                              offset: const Offset(0, 4),
                            )
                          ],
                        ),
                        child: Image.network(
                          'https://api.restuvexo.shop/public/temp.webp',
                          width: 28,
                          height: 28,
                          fit: BoxFit.contain,
                          errorBuilder: (context, error, stackTrace) => const Icon(
                            Icons.restaurant_menu_rounded,
                            color: Color(0xFFFF5722),
                            size: 28,
                          ),
                        ),
                      ),
                      const SizedBox(width: 12),
                      const Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Text(
                                'RESTUVEXO',
                                style: TextStyle(
                                  color: Colors.white,
                                  fontSize: 22,
                                  fontWeight: FontWeight.w900,
                                  letterSpacing: 1.2,
                                ),
                              ),
                              Text(
                                ' •',
                                style: TextStyle(
                                  color: Color(0xFFFF5722),
                                  fontSize: 22,
                                  fontWeight: FontWeight.w900,
                                ),
                              ),
                            ],
                          ),
                          Text(
                            'RESTAURANT OPERATING SYSTEM',
                            style: TextStyle(
                              color: Color(0xFF94A3B8),
                              fontSize: 8,
                              fontWeight: FontWeight.w900,
                              letterSpacing: 1.5,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                ],
              ),
            ),

            // FORM BODY CANVAS
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 24.0, vertical: 32.0),
              child: ConstrainedBox(
                constraints: BoxConstraints(maxWidth: isTablet ? 480 : double.infinity),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    // Heading Texts
                    const Text(
                      'Welcome to RESTUVEXO!',
                      style: TextStyle(
                        color: Color(0xFF0F172A),
                        fontSize: 24,
                        fontWeight: FontWeight.w900,
                        letterSpacing: -0.5,
                      ),
                    ),
                    const SizedBox(height: 8),
                    const Text(
                      'Log in to access your custom restaurant dashboard, waiter panel, or kitchen monitor.',
                      style: TextStyle(
                        color: Color(0xFF64748B),
                        fontSize: 12,
                        fontWeight: FontWeight.bold,
                        height: 1.4,
                      ),
                    ),
                    const SizedBox(height: 32),

                    // Error Box
                    if (_errorMessage != null)
                      Container(
                        padding: const EdgeInsets.all(14),
                        margin: const EdgeInsets.only(bottom: 24),
                        decoration: BoxDecoration(
                          color: const Color(0xFFEF4444).withOpacity(0.06),
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(color: const Color(0xFFEF4444).withOpacity(0.15)),
                        ),
                        child: Row(
                          children: [
                            const Icon(Icons.error_outline_rounded, color: Color(0xFFEF4444), size: 18),
                            const SizedBox(width: 10),
                            Expanded(
                              child: Text(
                                _errorMessage!,
                                style: const TextStyle(
                                  color: Color(0xFFEF4444),
                                  fontSize: 12,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),

                    // Form Fields
                    const Text(
                      'EMAIL OR PHONE NUMBER',
                      style: TextStyle(
                        color: Color(0xFF475569),
                        fontSize: 9,
                        fontWeight: FontWeight.w955,
                        letterSpacing: 1.0,
                      ),
                    ),
                    const SizedBox(height: 8),
                    TextField(
                      controller: _phoneController,
                      keyboardType: TextInputType.emailAddress,
                      style: const TextStyle(color: Color(0xFF0F172A), fontWeight: FontWeight.bold),
                      decoration: InputDecoration(
                        hintText: 'Enter login ID or email...',
                        hintStyle: const TextStyle(color: Color(0xFF94A3B8), fontSize: 13),
                        filled: true,
                        fillColor: Colors.white,
                        prefixIcon: const Icon(Icons.phone_iphone_rounded, color: Color(0xFFFF5722), size: 20),
                        contentPadding: const EdgeInsets.symmetric(vertical: 18, horizontal: 16),
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(16),
                          borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
                        ),
                        enabledBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(16),
                          borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
                        ),
                        focusedBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(16),
                          borderSide: const BorderSide(color: Color(0xFFFF5722), width: 1.5),
                        ),
                      ),
                    ),
                    const SizedBox(height: 20),

                    const Text(
                      'PASSWORD OR PIN',
                      style: TextStyle(
                        color: Color(0xFF475569),
                        fontSize: 9,
                        fontWeight: FontWeight.w955,
                        letterSpacing: 1.0,
                      ),
                    ),
                    const SizedBox(height: 8),
                    TextField(
                      controller: _pinController,
                      obscureText: _obscureText,
                      style: const TextStyle(color: Color(0xFF0F172A), fontWeight: FontWeight.bold),
                      decoration: InputDecoration(
                        hintText: 'Enter 4-digit PIN or password...',
                        hintStyle: const TextStyle(color: Color(0xFF94A3B8), fontSize: 13),
                        filled: true,
                        fillColor: Colors.white,
                        prefixIcon: const Icon(Icons.lock_outline_rounded, color: Color(0xFFFF5722), size: 20),
                        suffixIcon: IconButton(
                          icon: Icon(
                            _obscureText ? Icons.visibility_off_outlined : Icons.visibility_outlined,
                            color: const Color(0xFF64748B),
                            size: 20,
                          ),
                          onPressed: () {
                            setState(() {
                              _obscureText = !_obscureText;
                            });
                          },
                        ),
                        contentPadding: const EdgeInsets.symmetric(vertical: 18, horizontal: 16),
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(16),
                          borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
                        ),
                        enabledBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(16),
                          borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
                        ),
                        focusedBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(16),
                          borderSide: const BorderSide(color: Color(0xFFFF5722), width: 1.5),
                        ),
                      ),
                    ),
                    const SizedBox(height: 32),

                    // Sign In Button
                    ElevatedButton(
                      onPressed: _loading ? null : _handleLogin,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFFFF5722),
                        foregroundColor: Colors.white,
                        disabledBackgroundColor: const Color(0xFFFF5722).withOpacity(0.6),
                        padding: const EdgeInsets.symmetric(vertical: 18),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                        elevation: 2,
                        shadowColor: const Color(0xFFFF5722).withOpacity(0.4),
                      ),
                      child: _loading
                          ? const SizedBox(
                              height: 20,
                              width: 20,
                              child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2.5),
                            )
                          : const Text(
                              'SIGN IN TO WORKSPACE',
                              style: TextStyle(fontSize: 13, fontWeight: FontWeight.black, letterSpacing: 1.0),
                            ),
                    ),

                    const SizedBox(height: 48),

                    // Demo Shortcuts Layout (Matching Web Cards)
                    Row(
                      children: [
                        Expanded(child: Divider(color: const Color(0xFFE2E8F0), thickness: 1)),
                        const Padding(
                          padding: EdgeInsets.symmetric(horizontal: 12.0),
                          child: Text(
                            'QUICK DEMO LOGINS',
                            style: TextStyle(
                              color: Color(0xFF94A3B8),
                              fontSize: 9,
                              fontWeight: FontWeight.black,
                              letterSpacing: 1.2,
                            ),
                          ),
                        ),
                        Expanded(child: Divider(color: const Color(0xFFE2E8F0), thickness: 1)),
                      ],
                    ),
                    const SizedBox(height: 16),

                    // Three Grid Demo Buttons
                    GridView.count(
                      crossAxisCount: 3,
                      shrinkWrap: true,
                      physics: const NeverScrollableScrollPhysics(),
                      crossAxisSpacing: 12,
                      mainAxisSpacing: 12,
                      childAspectRatio: 1.1,
                      children: [
                        _buildQuickLoginCard(
                          roleName: 'Owner',
                          badgeColor: const Color(0xFF0F172A),
                          onTap: () => _quickLogin('demo@restuvexo.shop', 'password123'),
                        ),
                        _buildQuickLoginCard(
                          roleName: 'Waiter',
                          badgeColor: const Color(0xFFFF5722),
                          onTap: () => _quickLogin('01700000000', '0000'),
                        ),
                        _buildQuickLoginCard(
                          roleName: 'Chef',
                          badgeColor: const Color(0xFF10B981),
                          onTap: () => _quickLogin('01800000000', '0000'),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildQuickLoginCard({
    required String roleName,
    required Color badgeColor,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(16),
      child: Container(
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: const Color(0xFFE2E8F0)),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.02),
              blurRadius: 4,
              offset: const Offset(0, 2),
            )
          ],
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              width: 8,
              height: 8,
              decoration: BoxDecoration(
                color: badgeColor,
                shape: BoxShape.circle,
              ),
            ),
            const SizedBox(height: 10),
            Text(
              roleName,
              style: const TextStyle(
                color: Color(0xFF0F172A),
                fontSize: 12,
                fontWeight: FontWeight.w900,
              ),
            ),
            const SizedBox(height: 4),
            const Text(
              'Quick Tap',
              style: TextStyle(
                color: Color(0xFF94A3B8),
                fontSize: 8,
                fontWeight: FontWeight.bold,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
