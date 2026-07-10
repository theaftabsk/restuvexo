import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'cart_provider.dart';

class CartDrawer extends ConsumerWidget {
  const CartDrawer({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final cartState = ref.watch(cartProvider);

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.only(
          topLeft: Radius.circular(32),
          topRight: Radius.circular(32),
        ),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Grab handle
          Center(
            child: Container(
              width: 48,
              height: 4,
              decoration: BoxDecoration(color: Colors.grey.shade300, borderRadius: BorderRadius.circular(2)),
            ),
          ),
          const SizedBox(height: 16),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Cart Details (${cartState.tableNo})',
                style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Color(0xFF0F172A)),
              ),
              IconButton(
                icon: const Icon(Icons.close),
                onPressed: () => Navigator.pop(context),
              ),
            ],
          ),
          const SizedBox(height: 12),
          
          // Cart Items List
          ConstrainedBox(
            constraints: BoxConstraints(maxHeight: MediaQuery.of(context).size.height * 0.4),
            child: cartState.items.isEmpty
                ? const Center(
                    child: Padding(
                      padding: EdgeInsets.symmetric(vertical: 24.0),
                      child: Text('Your cart is empty', style: TextStyle(color: Colors.grey, fontWeight: FontWeight.bold)),
                    ),
                  )
                : ListView.builder(
                    shrinkWrap: true,
                    itemCount: cartState.items.length,
                    itemBuilder: (context, index) {
                      final item = cartState.items.values.toList()[index];
                      return Dismissible(
                        key: Key(item.menuItemId.toString()),
                        direction: DismissDirection.endToStart,
                        background: Container(
                          alignment: Alignment.centerRight,
                          padding: const EdgeInsets.only(right: 20),
                          color: Colors.red,
                          child: const Icon(Icons.delete_sweep, color: Colors.white),
                        ),
                        onDismissed: (_) {
                          ref.read(cartProvider.notifier).deleteItem(item.menuItemId);
                        },
                        child: Card(
                          margin: const EdgeInsets.symmetric(vertical: 6),
                          elevation: 0,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(16),
                            side: BorderSide(color: Colors.grey.shade200),
                          ),
                          child: Padding(
                            padding: const EdgeInsets.all(12.0),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.stretch,
                              children: [
                                Row(
                                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                  children: [
                                    Expanded(
                                      child: Text(
                                        item.name,
                                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                                      ),
                                    ),
                                    Text(
                                      '₹${(item.price * item.qty).toStringAsFixed(2)}',
                                      style: const TextStyle(fontWeight: FontWeight.bold, color: Color(0xFFFF5722)),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 12),
                                Row(
                                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                  children: [
                                    // Custom item kitchen notes input
                                    Expanded(
                                      child: TextField(
                                        onChanged: (val) {
                                          ref.read(cartProvider.notifier).updateItemNote(item.menuItemId, val);
                                        },
                                        decoration: const InputDecoration(
                                          hintText: 'Add instruction...',
                                          hintStyle: TextStyle(fontSize: 11),
                                          isDense: true,
                                          border: InputBorder.none,
                                        ),
                                        style: const TextStyle(fontSize: 12),
                                      ),
                                    ),
                                    
                                    // Item qty controls
                                    Row(
                                      children: [
                                        IconButton(
                                          icon: const Icon(Icons.remove_circle_outline, size: 22, color: Colors.grey),
                                          onPressed: () => ref.read(cartProvider.notifier).removeItem(item.menuItemId),
                                        ),
                                        Text('${item.qty}', style: const TextStyle(fontWeight: FontWeight.bold)),
                                        IconButton(
                                          icon: const Icon(Icons.add_circle_outline, size: 22, color: Color(0xFFFF5722)),
                                          onPressed: () => ref.read(cartProvider.notifier).addItem(item.menuItemId, item.name, item.price),
                                        ),
                                      ],
                                    ),
                                  ],
                                ),
                              ],
                            ),
                          ),
                        ),
                      );
                    },
                  ),
          ),
          const SizedBox(height: 16),
          
          // Cart Total & Dispatch KOT Button
          if (cartState.items.isNotEmpty) ...[
            const Divider(),
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 12.0),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text('Total Subtotal', style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold)),
                  Text('₹${cartState.subtotal.toStringAsFixed(2)}', style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Color(0xFFFF5722))),
                ],
              ),
            ),
            ElevatedButton(
              onPressed: () async {
                final success = await ref.read(cartProvider.notifier).dispatchKOT();
                if (context.mounted) {
                  Navigator.pop(context); // Close Cart Drawer
                  if (success) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('⚡ KOT ticket dispatched to Kitchen!')),
                    );
                    Navigator.pop(context); // Go back to Table Map screen
                  } else {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('❌ KOT dispatch failed. Please check server.')),
                    );
                  }
                }
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFFFF5722),
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                padding: const EdgeInsets.symmetric(vertical: 18),
              ),
              child: const Text('DISPATCH KOT ORDER', style: TextStyle(fontWeight: FontWeight.w900, letterSpacing: 1.2)),
            ),
          ],
        ],
      ),
    );
  }
}
