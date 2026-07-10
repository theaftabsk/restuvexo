import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../auth/auth_provider.dart';
import 'table_provider.dart';
import '../menu/order_screen.dart';

class TablesScreen extends ConsumerWidget {
  const TablesScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final tableState = ref.watch(tableProvider);
    final authState = ref.watch(authProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('RESTUVEXO TABLES'),
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
      body: tableState.loading
          ? const Center(child: CircularProgressIndicator())
          : Padding(
              padding: const EdgeInsets.all(16.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  // Header Greeting
                  Text(
                    'Welcome, ${authState.userName ?? 'Captain'} 👋',
                    style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: Color(0xFF0F172A)),
                  ),
                  const SizedBox(height: 4),
                  const Text(
                    'Select a dining table to begin or edit order',
                    style: TextStyle(fontSize: 12, color: Colors.grey, fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 24),
                  
                  // Visual Indicators Legend
                  const Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      _LegendItem(color: Colors.green, label: 'Free'),
                      _LegendItem(color: Colors.red, label: 'Occupied'),
                      _LegendItem(color: Colors.amber, label: 'Billed'),
                      _LegendItem(color: Colors.blue, label: 'Reserved'),
                    ],
                  ),
                  const SizedBox(height: 24),

                  // Tables grid
                  Expanded(
                    child: tableState.tables.isEmpty
                        ? const Center(
                            child: Text(
                              'No tables registered.',
                              style: TextStyle(fontWeight: FontWeight.bold, color: Colors.grey),
                            ),
                          )
                        : GridView.builder(
                            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                              crossAxisCount: 3,
                              crossAxisSpacing: 16,
                              mainAxisSpacing: 16,
                              childAspectRatio: 1.0,
                            ),
                            itemCount: tableState.tables.length,
                            itemBuilder: (context, index) {
                              final table = tableState.tables[index];
                              final tableId = table['id'];
                              final tableNo = table['tableNo'] ?? 'Table';
                              final status = table['status'] ?? 'free';

                              Color boxColor = Colors.green.shade50;
                              Color borderColor = Colors.green.shade300;
                              Color textColor = Colors.green.shade800;

                              if (status == 'occupied') {
                                boxColor = Colors.red.shade50;
                                borderColor = Colors.red.shade300;
                                textColor = Colors.red.shade800;
                              } else if (status == 'billed') {
                                boxColor = Colors.amber.shade50;
                                borderColor = Colors.amber.shade300;
                                textColor = Colors.amber.shade800;
                              } else if (status == 'reserved') {
                                boxColor = Colors.blue.shade50;
                                borderColor = Colors.blue.shade300;
                                textColor = Colors.blue.shade800;
                              }

                              return GestureDetector(
                                onTap: () {
                                  Navigator.push(
                                    context,
                                    MaterialPageRoute(
                                      builder: (context) => OrderScreen(
                                        tableId: tableId,
                                        tableNo: tableNo,
                                      ),
                                    ),
                                  );
                                },
                                child: Container(
                                  decoration: BoxDecoration(
                                    color: boxColor,
                                    borderRadius: BorderRadius.circular(20),
                                    border: Border.all(color: borderColor, width: 2),
                                  ),
                                  child: Column(
                                    mainAxisAlignment: MainAxisAlignment.center,
                                    children: [
                                      Text(
                                        tableNo,
                                        style: TextStyle(
                                          fontSize: 16,
                                          fontWeight: FontWeight.w900,
                                          color: textColor,
                                        ),
                                      ),
                                      const SizedBox(height: 8),
                                      Container(
                                        width: 8,
                                        height: 8,
                                        decoration: BoxDecoration(
                                          color: borderColor,
                                          shape: BoxShape.circle,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              );
                            },
                          ),
                  ),
                ],
              ),
            ),
    );
  }
}

class _LegendItem extends StatelessWidget {
  final Color color;
  final String label;

  const _LegendItem({required this.color, required this.label});

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Container(
          width: 12,
          height: 12,
          decoration: BoxDecoration(
            color: color.withOpacity(0.1),
            shape: BoxShape.circle,
            border: Border.all(color: color, width: 1.5),
          ),
        ),
        const SizedBox(width: 6),
        Text(
          label,
          style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFF0F172A)),
        ),
      ],
    );
  }
}
