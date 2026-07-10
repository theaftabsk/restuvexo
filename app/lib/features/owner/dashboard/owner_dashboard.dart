import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/api/dio_client.dart';
import '../../../core/api/api_endpoints.dart';
import '../../auth/auth_provider.dart';

class OwnerDashboard extends ConsumerStatefulWidget {
  const OwnerDashboard({super.key});

  @override
  ConsumerState<OwnerDashboard> createState() => _OwnerDashboardState();
}

class _OwnerDashboardState extends ConsumerState<OwnerDashboard> {
  bool _loading = true;
  String? _error;

  // Real-time telemetry stats
  double _todayRevenue = 0.0;
  double _todayProfit = 0.0;
  int _activeOrdersCount = 0;
  int _completedTodayCount = 0;
  int _outOfStockCount = 0;
  int _lowStockCount = 0;
  int _busyTables = 0;
  int _totalTables = 0;

  List<dynamic> _popularItems = [];
  List<dynamic> _kitchenFeed = [];

  @override
  void initState() {
    super.initState();
    _fetchStats();
  }

  Future<void> _fetchStats() async {
    if (!mounted) return;
    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final dio = DioClient().dio;
      final res = await dio.get(ApiEndpoints.dashboardStats);
      if (res.statusCode == 200) {
        final data = res.data;
        setState(() {
          _todayRevenue = (data['todayRevenue'] ?? 0.0).toDouble();
          _todayProfit = (data['todayProfit'] ?? 0.0).toDouble();
          _activeOrdersCount = data['activeOrdersCount'] ?? 0;
          _completedTodayCount = data['completedTodayCount'] ?? 0;
          _outOfStockCount = data['outOfStockCount'] ?? 0;
          _lowStockCount = data['lowStockCount'] ?? 0;
          _busyTables = data['busyTables']?['busy'] ?? 0;
          _totalTables = data['busyTables']?['total'] ?? 0;
          _popularItems = data['popularItems'] ?? [];
          _kitchenFeed = data['kitchenFeed'] ?? [];
          _loading = false;
        });
      } else {
        setState(() {
          _error = 'Failed to load dashboard metrics.';
          _loading = false;
        });
      }
    } catch (e) {
      print('❌ [Owner Stats Error] $e');
      setState(() {
        _error = 'Failed to connect to backend server.';
        _loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final authState = ref.watch(authProvider);

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        elevation: 0,
        backgroundColor: const Color(0xFF0F172A),
        foregroundColor: Colors.white,
        title: Row(
          children: [
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
              decoration: BoxDecoration(
                color: const Color(0xFFFF5722).withOpacity(0.2),
                borderRadius: BorderRadius.circular(8),
              ),
              child: const Text(
                'ROS PORTAL',
                style: TextStyle(fontSize: 10, fontWeight: FontWeight.w900, letterSpacing: 1.0, color: Color(0xFFFF5722)),
              ),
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_rounded),
            onPressed: _fetchStats,
          ),
          IconButton(
            icon: const Icon(Icons.logout_rounded),
            onPressed: () {
              ref.read(authProvider.notifier).logout();
              context.go('/login');
            },
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: _fetchStats,
        color: const Color(0xFFFF5722),
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // 1. WELCOME GREETING PANEL
              Container(
                color: const Color(0xFF0F172A),
                padding: const EdgeInsets.only(left: 24, right: 24, bottom: 32, top: 12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Welcome Back, ${authState.userName ?? 'Owner'}! 👑',
                      style: const TextStyle(
                        fontSize: 22,
                        fontWeight: FontWeight.w900,
                        color: Colors.white,
                        letterSpacing: -0.5,
                      ),
                    ),
                    const SizedBox(height: 6),
                    const Text(
                      'RESTUVEXO Restaurant Operating System Dashboard',
                      style: TextStyle(
                        fontSize: 11,
                        color: Color(0xFF94A3B8),
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ],
                ),
              ),

              // 2. MAIN SCROLLABLE CONTROLLER
              Padding(
                padding: const EdgeInsets.all(20.0),
                child: _loading
                    ? const Center(
                        child: Padding(
                          padding: EdgeInsets.symmetric(vertical: 48.0),
                          child: CircularProgressIndicator(color: Color(0xFFFF5722)),
                        ),
                      )
                    : Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          if (_error != null)
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
                                      _error!,
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

                          // 3. ENTERPRISE TELEMETRY GRID CARD
                          Row(
                            children: [
                              Expanded(
                                child: _MetricCard(
                                  title: "Today's Sales",
                                  value: "₹${_todayRevenue.toStringAsFixed(2)}",
                                  icon: Icons.monetization_on_rounded,
                                  color: const Color(0xFF10B981),
                                  subtitle: "Gross Income",
                                ),
                              ),
                              const SizedBox(width: 16),
                              Expanded(
                                child: _MetricCard(
                                  title: "Net Profit",
                                  value: "₹${_todayProfit.toStringAsFixed(2)}",
                                  icon: Icons.trending_up_rounded,
                                  color: const Color(0xFFFF5722),
                                  subtitle: "Margin Earnings",
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 16),
                          Row(
                            children: [
                              Expanded(
                                child: _MetricCard(
                                  title: "Active Orders",
                                  value: "$_activeOrdersCount Active",
                                  icon: Icons.outdoor_grill_rounded,
                                  color: const Color(0xFFF59E0B),
                                  subtitle: "Cooking in Kitchen",
                                ),
                              ),
                              const SizedBox(width: 16),
                              Expanded(
                                child: _MetricCard(
                                  title: "Busy Tables",
                                  value: "$_busyTables / $_totalTables",
                                  icon: Icons.table_bar_rounded,
                                  color: const Color(0xFF3B82F6),
                                  subtitle: "Occupied Seats",
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 24),

                          // 4. LOW STOCK WARNING BANNER (dynamic alerts)
                          if (_outOfStockCount > 0 || _lowStockCount > 0) ...[
                            Container(
                              padding: const EdgeInsets.all(16),
                              decoration: BoxDecoration(
                                color: const Color(0xFFF59E0B).withOpacity(0.08),
                                borderRadius: BorderRadius.circular(20),
                                border: Border.all(color: const Color(0xFFF59E0B).withOpacity(0.2)),
                              ),
                              child: Row(
                                children: [
                                  Container(
                                    padding: const EdgeInsets.all(8),
                                    decoration: const BoxDecoration(
                                      color: Color(0xFFF59E0B),
                                      shape: BoxShape.circle,
                                    ),
                                    child: const Icon(Icons.warning_amber_rounded, color: Colors.white, size: 18),
                                  ),
                                  const SizedBox(width: 16),
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        const Text(
                                          'INVENTORY ALERT',
                                          style: TextStyle(
                                            color: Color(0xFFB45309),
                                            fontSize: 9,
                                            fontWeight: FontWeight.w900,
                                            letterSpacing: 1.0,
                                          ),
                                        ),
                                        const SizedBox(height: 4),
                                        Text(
                                          '$_outOfStockCount items are OUT OF STOCK and $_lowStockCount are running low. Check catalog control.',
                                          style: const TextStyle(
                                            color: Color(0xFF78350F),
                                            fontSize: 11,
                                            fontWeight: FontWeight.bold,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            const SizedBox(height: 24),
                          ],

                          // 5. LIVE KITCHEN FEED KOTS
                          const Text(
                            '🔥 LIVE KITCHEN FEED (RECENT KOTS)',
                            style: TextStyle(
                              fontSize: 10,
                              fontWeight: FontWeight.w900,
                              letterSpacing: 1.2,
                              color: Color(0xFF64748B),
                            ),
                          ),
                          const SizedBox(height: 12),
                          if (_kitchenFeed.isEmpty)
                            Container(
                              padding: const EdgeInsets.all(24),
                              decoration: BoxDecoration(
                                color: Colors.white,
                                borderRadius: BorderRadius.circular(20),
                                border: Border.all(color: const Color(0xFFE2E8F0)),
                              ),
                              child: const Center(
                                child: Text(
                                  'No active KOTs in the kitchen queue.',
                                  style: TextStyle(color: Color(0xFF94A3B8), fontSize: 12, fontWeight: FontWeight.bold),
                                ),
                              ),
                            )
                          else
                            ListView.builder(
                              shrinkWrap: true,
                              physics: const NeverScrollableScrollPhysics(),
                              itemCount: _kitchenFeed.length,
                              itemBuilder: (context, index) {
                                final kot = _kitchenFeed[index];
                                final bool isPending = kot['status'] == 'pending';
                                return Container(
                                  margin: const EdgeInsets.only(bottom: 10),
                                  padding: const EdgeInsets.all(14),
                                  decoration: BoxDecoration(
                                    color: Colors.white,
                                    borderRadius: BorderRadius.circular(16),
                                    border: Border.all(color: const Color(0xFFE2E8F0)),
                                  ),
                                  child: Row(
                                    children: [
                                      Container(
                                        padding: const EdgeInsets.all(10),
                                        decoration: BoxDecoration(
                                          color: isPending ? const Color(0xFFFF5722).withOpacity(0.1) : Colors.amber.withOpacity(0.1),
                                          shape: BoxShape.circle,
                                        ),
                                        child: Icon(
                                          isPending ? Icons.outdoor_grill_rounded : Icons.cookie_outlined,
                                          color: isPending ? const Color(0xFFFF5722) : Colors.amber.shade700,
                                          size: 18,
                                        ),
                                      ),
                                      const SizedBox(width: 16),
                                      Expanded(
                                        child: Column(
                                          crossAxisAlignment: CrossAxisAlignment.start,
                                          children: [
                                            Text(
                                              '${kot['tableNo']} (${kot['kotId']})',
                                              style: const TextStyle(
                                                color: Color(0xFF0F172A),
                                                fontWeight: FontWeight.w900,
                                                fontSize: 13,
                                              ),
                                            ),
                                            const SizedBox(height: 4),
                                            Text(
                                              kot['itemsText'] ?? '',
                                              maxLines: 1,
                                              overflow: TextOverflow.ellipsis,
                                              style: const TextStyle(
                                                color: Color(0xFF64748B),
                                                fontSize: 11,
                                                fontWeight: FontWeight.bold,
                                              ),
                                            ),
                                          ],
                                        ),
                                      ),
                                      Container(
                                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                                        decoration: BoxDecoration(
                                          color: isPending ? const Color(0xFFFF5722).withOpacity(0.1) : Colors.amber.withOpacity(0.1),
                                          borderRadius: BorderRadius.circular(8),
                                        ),
                                        child: Text(
                                          (kot['status'] ?? '').toString().toUpperCase(),
                                          style: TextStyle(
                                            color: isPending ? const Color(0xFFFF5722) : Colors.amber.shade900,
                                            fontSize: 9,
                                            fontWeight: FontWeight.w900,
                                          ),
                                        ),
                                      ),
                                    ],
                                  ),
                                );
                              },
                            ),
                          const SizedBox(height: 28),

                          // 6. POPULAR DISHES TODAY
                          const Text(
                            '⭐ TOP POPULAR DISHES TODAY',
                            style: TextStyle(
                              fontSize: 10,
                              fontWeight: FontWeight.w900,
                              letterSpacing: 1.2,
                              color: Color(0xFF64748B),
                            ),
                          ),
                          const SizedBox(height: 12),
                          if (_popularItems.isEmpty)
                            Container(
                              padding: const EdgeInsets.all(24),
                              decoration: BoxDecoration(
                                color: Colors.white,
                                borderRadius: BorderRadius.circular(20),
                                border: Border.all(color: const Color(0xFFE2E8F0)),
                              ),
                              child: const Center(
                                child: Text(
                                  'No sales items recorded today yet.',
                                  style: TextStyle(color: Color(0xFF94A3B8), fontSize: 12, fontWeight: FontWeight.bold),
                                ),
                              ),
                            )
                          else
                            Container(
                              padding: const EdgeInsets.all(16),
                              decoration: BoxDecoration(
                                color: Colors.white,
                                borderRadius: BorderRadius.circular(20),
                                border: Border.all(color: const Color(0xFFE2E8F0)),
                              ),
                              child: ListView.separated(
                                shrinkWrap: true,
                                physics: const NeverScrollableScrollPhysics(),
                                itemCount: _popularItems.length,
                                separatorBuilder: (c, i) => const Divider(color: Color(0xFFF1F5F9)),
                                itemBuilder: (context, index) {
                                  final dish = _popularItems[index];
                                  final rank = dish['rank'] ?? (index + 1);
                                  return Row(
                                    children: [
                                      Container(
                                        width: 24,
                                        height: 24,
                                        decoration: BoxDecoration(
                                          color: rank == 1 ? const Color(0xFFFF5722).withOpacity(0.1) : const Color(0xFFF1F5F9),
                                          shape: BoxShape.circle,
                                        ),
                                        child: Center(
                                          child: Text(
                                            '$rank',
                                            style: TextStyle(
                                              color: rank == 1 ? const Color(0xFFFF5722) : const Color(0xFF64748B),
                                              fontSize: 11,
                                              fontWeight: FontWeight.w900,
                                            ),
                                          ),
                                        ),
                                      ),
                                      const SizedBox(width: 16),
                                      Expanded(
                                        child: Text(
                                          dish['name'] ?? '',
                                          style: const TextStyle(
                                            color: Color(0xFF0F172A),
                                            fontWeight: FontWeight.bold,
                                            fontSize: 13,
                                          ),
                                        ),
                                      ),
                                      Text(
                                        '${dish['soldCount']} Sold',
                                        style: const TextStyle(
                                          color: Color(0xFF10B981),
                                          fontWeight: FontWeight.w900,
                                          fontSize: 12,
                                        ),
                                      ),
                                    ],
                                  );
                                },
                              ),
                            ),
                          const SizedBox(height: 32),

                          // 7. ENTERPRISE MODULES
                          const Text(
                            '⚙️ ENTERPRISE MANAGEMENT MODULES',
                            style: TextStyle(
                              fontSize: 10,
                              fontWeight: FontWeight.w900,
                              letterSpacing: 1.2,
                              color: Color(0xFF64748B),
                            ),
                          ),
                          const SizedBox(height: 12),
                          _ModuleTile(
                            title: 'Reports & Analytics',
                            icon: Icons.bar_chart_rounded,
                            color: Colors.indigo,
                            description: 'View full charts, profit breakdowns, and margins.',
                          ),
                          _ModuleTile(
                            title: 'Menu Catalog Control',
                            icon: Icons.restaurant_menu_rounded,
                            color: Colors.teal,
                            description: 'Add categories, manage dishes, set active availability.',
                          ),
                          _ModuleTile(
                            title: 'Inventory & Stock Tracking',
                            icon: Icons.inventory_2_rounded,
                            color: const Color(0xFFB45309),
                            description: 'Track ingredient stock levels and alert low margins.',
                          ),
                          _ModuleTile(
                            title: 'Staff Security Console',
                            icon: Icons.people_alt_rounded,
                            color: Colors.deepPurple,
                            description: 'Register waiters, chefs, view activities logs.',
                          ),
                        ],
                      ),
              ),
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
  final String subtitle;

  const _MetricCard({
    required this.title,
    required this.value,
    required this.icon,
    required this.color,
    required this.subtitle,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16.0),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
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
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(color: color.withOpacity(0.08), shape: BoxShape.circle),
                child: Icon(icon, color: color, size: 20),
              ),
            ],
          ),
          const SizedBox(height: 16),
          Text(
            title,
            style: const TextStyle(fontSize: 10, color: Color(0xFF64748B), fontWeight: FontWeight.w900, letterSpacing: 0.5),
          ),
          const SizedBox(height: 4),
          Text(
            value,
            style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w900, color: Color(0xFF0F172A), letterSpacing: -0.2),
          ),
          const SizedBox(height: 4),
          Text(
            subtitle,
            style: const TextStyle(fontSize: 8, color: Color(0xFF94A3B8), fontWeight: FontWeight.bold),
          ),
        ],
      ),
    );
  }
}

class _ModuleTile extends StatelessWidget {
  final String title;
  final IconData icon;
  final Color color;
  final String description;

  const _ModuleTile({
    required this.title,
    required this.icon,
    required this.color,
    required this.description,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: const Color(0xFFE2E8F0)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.01),
            blurRadius: 4,
            offset: const Offset(0, 2),
          )
        ],
      ),
      child: ListTile(
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
        leading: Container(
          padding: const EdgeInsets.all(10),
          decoration: BoxDecoration(color: color.withOpacity(0.08), borderRadius: BorderRadius.circular(12)),
          child: Icon(icon, color: color, size: 20),
        ),
        title: Text(
          title,
          style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 13, color: Color(0xFF0F172A)),
        ),
        subtitle: Text(
          description,
          style: const TextStyle(fontSize: 10, color: Color(0xFF64748B), fontWeight: FontWeight.bold),
        ),
        trailing: const Icon(Icons.arrow_forward_ios_rounded, size: 12, color: Color(0xFF94A3B8)),
        onTap: () {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('$title dashboard is managed on the Web Console.'),
              behavior: SnackBarBehavior.floating,
              backgroundColor: const Color(0xFF0F172A),
            ),
          );
        },
      ),
    );
  }
}
