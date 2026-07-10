import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/api/menu_api.dart';
import '../cart/cart_provider.dart';
import '../cart/cart_drawer.dart';

class OrderScreen extends ConsumerStatefulWidget {
  final int tableId;
  final String tableNo;

  const OrderScreen({super.key, required this.tableId, required this.tableNo});

  @override
  ConsumerState<OrderScreen> createState() => _OrderScreenState();
}

class _OrderScreenState extends ConsumerState<OrderScreen> {
  final MenuApi _menuApi = MenuApi();
  List<dynamic> _categories = [];
  bool _loading = true;
  int _selectedCategoryIndex = 0;
  String _searchQuery = '';

  @override
  void initState() {
    super.initState();
    // Initialize Cart state for current table
    Future.microtask(() {
      ref.read(cartProvider.notifier).initTable(widget.tableId, widget.tableNo);
    });
    _loadMenu();
  }

  void _loadMenu() async {
    try {
      final res = await _menuApi.getCategories();
      if (res.statusCode == 200) {
        setState(() {
          _categories = res.data;
          _loading = false;
        });
      }
    } catch (e) {
      setState(() {
        _loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final cartState = ref.watch(cartProvider);

    // Filter items based on search query
    List<dynamic> activeItems = [];
    if (_categories.isNotEmpty) {
      final category = _categories[_selectedCategoryIndex];
      final menuItems = category['menuItems'] as List<dynamic>;
      
      if (_searchQuery.isEmpty) {
        activeItems = menuItems;
      } else {
        activeItems = menuItems.where((item) {
          final name = (item['name'] as String).toLowerCase();
          return name.contains(_searchQuery.toLowerCase());
        }).toList();
      }
    }

    return Scaffold(
      appBar: AppBar(
        title: Text('NEW ORDER: ${widget.tableNo}'),
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _categories.isEmpty
              ? const Center(child: Text('Menu catalog is empty.'))
              : Column(
                  children: [
                    // Search bar at the top
                    Padding(
                      padding: const EdgeInsets.all(12.0),
                      child: TextField(
                        onChanged: (val) {
                          setState(() {
                            _searchQuery = val;
                          });
                        },
                        decoration: InputDecoration(
                          hintText: 'Search dishes...',
                          hintStyle: TextStyle(color: Colors.grey.shade400),
                          prefixIcon: const Icon(Icons.search, color: Colors.grey),
                          filled: true,
                          fillColor: Colors.white,
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(16),
                            borderSide: BorderSide(color: Colors.grey.shade200),
                          ),
                          enabledBorder: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(16),
                            borderSide: BorderSide(color: Colors.grey.shade200),
                          ),
                        ),
                      ),
                    ),

                    // Main split content
                    Expanded(
                      child: Row(
                        children: [
                          // Left Category Navigation Drawer Pane
                          Container(
                            width: 100,
                            color: Colors.grey.shade100,
                            child: ListView.builder(
                              itemCount: _categories.length,
                              itemBuilder: (context, index) {
                                final isSelected = index == _selectedCategoryIndex;
                                return GestureDetector(
                                  onTap: () {
                                    setState(() {
                                      _selectedCategoryIndex = index;
                                      _searchQuery = ''; // Reset search query on category switch
                                    });
                                  },
                                  child: Container(
                                    padding: const EdgeInsets.symmetric(vertical: 18, horizontal: 12),
                                    decoration: BoxDecoration(
                                      color: isSelected ? Colors.white : Colors.transparent,
                                      border: isSelected
                                          ? const Border(left: BorderSide(color: Color(0xFFFF5722), width: 4))
                                          : null,
                                    ),
                                    child: Text(
                                      _categories[index]['name'] ?? '',
                                      textAlign: TextAlign.center,
                                      style: TextStyle(
                                        fontSize: 12,
                                        fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                                        color: isSelected ? const Color(0xFFFF5722) : Colors.black87,
                                      ),
                                    ),
                                  ),
                                );
                              },
                            ),
                          ),

                          // Right Dishes Grid Pane
                          Expanded(
                            child: Container(
                              color: Colors.white,
                              padding: const EdgeInsets.all(12),
                              child: activeItems.isEmpty
                                  ? const Center(child: Text('No items match search'))
                                  : GridView.builder(
                                      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                                        crossAxisCount: 2,
                                        crossAxisSpacing: 12,
                                        mainAxisSpacing: 12,
                                        childAspectRatio: 0.82,
                                      ),
                                      itemCount: activeItems.length,
                                      itemBuilder: (context, index) {
                                        final item = activeItems[index];
                                        final itemId = item['id'];
                                        final name = item['name'] ?? 'Dish';
                                        final price = double.tryParse(item['price'].toString()) ?? 0.0;
                                        final inCartCount = cartState.items[itemId]?.qty ?? 0;

                                        return Card(
                                          elevation: 0,
                                          shape: RoundedRectangleBorder(
                                            borderRadius: BorderRadius.circular(16),
                                            side: BorderSide(color: Colors.grey.shade200),
                                          ),
                                          child: Padding(
                                            padding: const EdgeInsets.all(10.0),
                                            child: Column(
                                              crossAxisAlignment: CrossAxisAlignment.stretch,
                                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                              children: [
                                                Expanded(
                                                  child: Text(
                                                    name,
                                                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                                                    maxLines: 2,
                                                    overflow: TextOverflow.ellipsis,
                                                  ),
                                                ),
                                                Text(
                                                  '₹${price.toStringAsFixed(2)}',
                                                  style: const TextStyle(fontWeight: FontWeight.bold, color: Color(0xFFFF5722)),
                                                ),
                                                const SizedBox(height: 8),
                                                inCartCount > 0
                                                    ? Row(
                                                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                                        children: [
                                                          IconButton(
                                                            icon: const Icon(Icons.remove_circle, color: Colors.grey),
                                                            onPressed: () => ref.read(cartProvider.notifier).removeItem(itemId),
                                                          ),
                                                          Text('$inCartCount', style: const TextStyle(fontWeight: FontWeight.bold)),
                                                          IconButton(
                                                            icon: const Icon(Icons.add_circle, color: Color(0xFFFF5722)),
                                                            onPressed: () => ref.read(cartProvider.notifier).addItem(itemId, name, price),
                                                          ),
                                                        ],
                                                      )
                                                    : ElevatedButton(
                                                        onPressed: () {
                                                          ref.read(cartProvider.notifier).addItem(itemId, name, price);
                                                        },
                                                        style: ElevatedButton.styleFrom(
                                                          backgroundColor: const Color(0xFFFF5722).withOpacity(0.1),
                                                          foregroundColor: const Color(0xFFFF5722),
                                                          elevation: 0,
                                                          padding: const EdgeInsets.symmetric(vertical: 8),
                                                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                                                        ),
                                                        child: const Text('ADD TO KOT', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
                                                      ),
                                              ],
                                            ),
                                          ),
                                        );
                                      },
                                    ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
      
      // Floating Cart bottom trigger
      bottomNavigationBar: cartState.items.isNotEmpty
          ? Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.white,
                boxShadow: [BoxShadow(color: Colors.black12, blurRadius: 10, offset: Offset(0, -2))],
              ),
              child: ElevatedButton(
                onPressed: () {
                  showModalBottomSheet(
                    context: context,
                    isScrollControlled: true,
                    backgroundColor: Colors.transparent,
                    builder: (context) => const CartDrawer(),
                  );
                },
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFFFF5722),
                  padding: const EdgeInsets.symmetric(vertical: 18),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Padding(
                      padding: const EdgeInsets.only(left: 16.0),
                      child: Text(
                        '${cartState.totalCount} items in Cart',
                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: Colors.white),
                      ),
                    ),
                    Row(
                      children: [
                        Text(
                          'View Cart (₹${cartState.subtotal.toStringAsFixed(2)})',
                          style: const TextStyle(fontWeight: FontWeight.w900, color: Colors.white),
                        ),
                        const SizedBox(width: 8),
                        const Icon(Icons.arrow_forward_ios, size: 14, color: Colors.white),
                        const SizedBox(width: 16),
                      ],
                    ),
                  ],
                ),
              ),
            )
          : null,
    );
  }
}
