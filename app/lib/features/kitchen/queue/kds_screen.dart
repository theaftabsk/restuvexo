import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../kds_provider.dart';
import '../../auth/auth_provider.dart';

class KdsScreen extends ConsumerWidget {
  const KdsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final kdsState = ref.watch(kdsProvider);

    return DefaultTabController(
      length: 3,
      child: Scaffold(
        appBar: AppBar(
          backgroundColor: const Color(0xFFE53935),
          title: const Text('KITCHEN KDS DISPLAY'),
          actions: [
            IconButton(
              icon: const Icon(Icons.logout_rounded),
              onPressed: () {
                ref.read(authProvider.notifier).logout();
                context.go('/login');
              },
            ),
          ],
          bottom: const TabBar(
            tabs: [
              Tab(text: '🔥 QUEUE', icon: Icon(Icons.list_alt_rounded)),
              Tab(text: '🍳 COOKING', icon: Icon(Icons.cookie_outlined)),
              Tab(text: '✅ READY', icon: Icon(Icons.check_circle_outline_rounded)),
            ],
            indicatorColor: Colors.white,
            labelColor: Colors.white,
            unselectedLabelColor: Colors.white70,
          ),
        ),
        body: kdsState.loading
            ? const Center(child: CircularProgressIndicator())
            : TabBarView(
                children: [
                  _KdsOrderList(orders: kdsState.orders, filterStatus: 'pending'),
                  _KdsOrderList(orders: kdsState.orders, filterStatus: 'cooking'),
                  _KdsOrderList(orders: kdsState.orders, filterStatus: 'ready'),
                ],
              ),
      ),
    );
  }
}

class _KdsOrderList extends StatelessWidget {
  final List<dynamic> orders;
  final String filterStatus;

  const _KdsOrderList({required this.orders, required this.filterStatus});

  @override
  Widget build(BuildContext context) {
    final filtered = orders.where((order) => order['status'] == filterStatus).toList();

    if (filtered.isEmpty) {
      return Center(
        child: Text(
          'Queue is clean. No orders $filterStatus!',
          style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.grey),
        ),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: filtered.length,
      itemBuilder: (context, index) {
        final order = filtered[index];
        final orderId = order['id'];
        final tableNo = order['table']?['tableNo'] ?? 'Takeaway';
        final items = order['orderItems'] as List<dynamic>;

        return Card(
          margin: const EdgeInsets.symmetric(vertical: 8),
          elevation: 2,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          child: Padding(
            padding: const EdgeInsets.all(16.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      '$tableNo (KOT-$orderId)',
                      style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 16, color: Color(0xFF0F172A)),
                    ),
                    _StatusChip(status: filterStatus),
                  ],
                ),
                const Divider(height: 24),
                
                // Items details
                ListView.builder(
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  itemCount: items.length,
                  itemBuilder: (context, itemIdx) {
                    final item = items[itemIdx];
                    final name = item['menuItem']?['name'] ?? 'Item';
                    final qty = item['qty'] ?? 1;
                    final note = item['note'] ?? '';

                    return Padding(
                      padding: const EdgeInsets.symmetric(vertical: 4.0),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Text(
                                '${qty}x ',
                                style: const TextStyle(fontWeight: FontWeight.bold, color: Color(0xFFE53935)),
                              ),
                              Expanded(
                                child: Text(
                                  name,
                                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                                ),
                              ),
                            ],
                          ),
                          if (note.isNotEmpty)
                            Padding(
                              padding: const EdgeInsets.only(left: 20.0, top: 2.0),
                              child: Text(
                                '* Note: $note',
                                style: const TextStyle(fontSize: 12, color: Colors.blueGrey, fontStyle: FontStyle.italic),
                              ),
                            ),
                        ],
                      ),
                    );
                  },
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}

class _StatusChip extends StatelessWidget {
  final String status;

  const _StatusChip({required this.status});

  @override
  Widget build(BuildContext context) {
    Color chipColor = Colors.grey;
    if (status == 'pending') {
      chipColor = Colors.orange;
    } else if (status == 'cooking') {
      chipColor = Colors.blue;
    } else if (status == 'ready') {
      chipColor = Colors.green;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: chipColor.withOpacity(0.1),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: chipColor),
      ),
      child: Text(
        status.toUpperCase(),
        style: TextStyle(color: chipColor, fontSize: 10, fontWeight: FontWeight.bold),
      ),
    );
  }
}
