import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../auth/auth_provider.dart';

class OwnerDashboard extends ConsumerWidget {
  const OwnerDashboard({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final authState = ref.watch(authProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('OWNER DASHBOARD'),
        actions: [
          IconButton(
            icon: const Icon(Icons.logout_rounded),
            onPressed: () {
              ref.read(authProvider.notifier).logout();
              context.go('/login');
            },
          ),
        ],
      ),
      body: SingleChildScrollView(
        child: Padding(
          padding: const EdgeInsets.all(20.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Greeting Section
              Text(
                'Welcome Back, ${authState.userName ?? 'Owner'}! 👑',
                style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w900, color: Color(0xFF0F172A)),
              ),
              const SizedBox(height: 4),
              const Text(
                'RESTUVEXO Restaurant Operating System | ROS Portal',
                style: TextStyle(fontSize: 11, color: Colors.grey, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 28),

              // Enterprise Metrics Grid
              Row(
                children: [
                  Expanded(
                    child: _MetricCard(
                      title: "Today's Sales",
                      value: "₹24,530.00",
                      icon: Icons.monetization_on_rounded,
                      color: Colors.green.shade600,
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: _MetricCard(
                      title: "Active Orders",
                      value: "4 Orders",
                      icon: Icons.assignment_turned_in_rounded,
                      color: Colors.orange.shade600,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              Row(
                children: [
                  Expanded(
                    child: _MetricCard(
                      title: "Tables Occupied",
                      value: "3 / 6 Tables",
                      icon: Icons.table_restaurant_rounded,
                      color: Colors.blue.shade600,
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: _MetricCard(
                      title: "Total Expenses",
                      value: "₹4,120.00",
                      icon: Icons.account_balance_wallet_rounded,
                      color: Colors.red.shade600,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 32),

              // Modules List Title
              const Text(
                'ENTERPRISE MODULES',
                style: TextStyle(fontSize: 12, fontWeight: FontWeight.w900, letterSpacing: 1.2, color: Colors.grey),
              ),
              const SizedBox(height: 16),

              // Management list
              _ModuleTile(title: 'Reports & Analytics', icon: Icons.bar_chart_rounded, color: Colors.indigo, onTap: () {}),
              _ModuleTile(title: 'Menu Catalog Control', icon: Icons.restaurant_menu_rounded, color: Colors.teal, onTap: () {}),
              _ModuleTile(title: 'Inventory & Stock Tracking', icon: Icons.inventory_2_rounded, color: Colors.amber.shade800, onTap: () {}),
              _ModuleTile(title: 'Staff Security Console', icon: Icons.people_alt_rounded, color: Colors.deepPurple, onTap: () {}),
              _ModuleTile(title: 'System Settings', icon: Icons.settings_applications_rounded, color: Colors.blueGrey, onTap: () {}),
            ],
          ),
        ),
      ),
    );
  }
}

class _MetricCard extends StatelessWidget {
  final String title;
  final String value;
  final IconData icon;
  final Color color;

  const _MetricCard({
    required this.title,
    required this.value,
    required this.icon,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(20),
        side: BorderSide(color: Colors.grey.shade200),
      ),
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(color: color.withOpacity(0.1), shape: BoxShape.circle),
              child: Icon(icon, color: color, size: 24),
            ),
            const SizedBox(height: 16),
            Text(
              title,
              style: const TextStyle(fontSize: 12, color: Colors.grey, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 4),
            Text(
              value,
              style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w900, color: Color(0xFF0F172A)),
            ),
          ],
        ),
      ),
    );
  }
}

class _ModuleTile extends StatelessWidget {
  final String title;
  final IconData icon;
  final Color color;
  final VoidCallback onTap;

  const _ModuleTile({
    required this.title,
    required this.icon,
    required this.color,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.symmetric(vertical: 6),
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: BorderSide(color: Colors.grey.shade200),
      ),
      child: ListTile(
        leading: Container(
          padding: const EdgeInsets.all(8),
          decoration: BoxDecoration(color: color.withOpacity(0.1), borderRadius: BorderRadius.circular(12)),
          child: Icon(icon, color: color, size: 20),
        ),
        title: Text(
          title,
          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: Color(0xFF0F172A)),
        ),
        trailing: const Icon(Icons.arrow_forward_ios_rounded, size: 14, color: Colors.grey),
        onTap: onTap,
      ),
    );
  }
}
