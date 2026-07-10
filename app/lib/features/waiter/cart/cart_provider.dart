import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/api/order_api.dart';

class CartItem {
  final int menuItemId;
  final String name;
  final double price;
  final int qty;
  final String note;

  CartItem({
    required this.menuItemId,
    required this.name,
    required this.price,
    required this.qty,
    this.note = '',
  });

  CartItem copyWith({
    int? qty,
    String? note,
  }) {
    return CartItem(
      menuItemId: menuItemId,
      name: name,
      price: price,
      qty: qty ?? this.qty,
      note: note ?? this.note,
    );
  }
}

class CartState {
  final Map<int, CartItem> items;
  final int? tableId;
  final String? tableNo;

  CartState({
    this.items = const {},
    this.tableId,
    this.tableNo,
  });

  double get subtotal => items.values.fold(0.0, (sum, item) => sum + (item.price * item.qty));
  int get totalCount => items.values.fold(0, (sum, item) => sum + item.qty);

  CartState copyWith({
    Map<int, CartItem>? items,
    int? tableId,
    String? tableNo,
  }) {
    return CartState(
      items: items ?? this.items,
      tableId: tableId ?? this.tableId,
      tableNo: tableNo ?? this.tableNo,
    );
  }
}

class CartNotifier extends StateNotifier<CartState> {
  final OrderApi _orderApi = OrderApi();

  CartNotifier() : super(CartState());

  void initTable(int tableId, String tableNo) {
    state = CartState(tableId: tableId, tableNo: tableNo);
  }

  void addItem(int menuItemId, String name, double price) {
    final items = Map<int, CartItem>.from(state.items);
    if (items.containsKey(menuItemId)) {
      items[menuItemId] = items[menuItemId]!.copyWith(qty: items[menuItemId]!.qty + 1);
    } else {
      items[menuItemId] = CartItem(menuItemId: menuItemId, name: name, price: price, qty: 1);
    }
    state = state.copyWith(items: items);
  }

  void removeItem(int menuItemId) {
    final items = Map<int, CartItem>.from(state.items);
    if (!items.containsKey(menuItemId)) return;
    
    if (items[menuItemId]!.qty > 1) {
      items[menuItemId] = items[menuItemId]!.copyWith(qty: items[menuItemId]!.qty - 1);
    } else {
      items.remove(menuItemId);
    }
    state = state.copyWith(items: items);
  }

  void deleteItem(int menuItemId) {
    final items = Map<int, CartItem>.from(state.items);
    items.remove(menuItemId);
    state = state.copyWith(items: items);
  }

  void updateItemNote(int menuItemId, String note) {
    final items = Map<int, CartItem>.from(state.items);
    if (items.containsKey(menuItemId)) {
      items[menuItemId] = items[menuItemId]!.copyWith(note: note);
      state = state.copyWith(items: items);
    }
  }

  Future<bool> dispatchKOT() async {
    if (state.items.isEmpty) return false;

    final List<Map<String, dynamic>> orderItems = state.items.values.map((item) {
      return {
        'menuItemId': item.menuItemId,
        'qty': item.qty,
        'note': item.note,
      };
    }).toList();

    try {
      final res = await _orderApi.createOrder(
        tableId: state.tableId,
        orderType: 'dine_in',
        items: orderItems,
      );

      if (res.statusCode == 200 || res.statusCode == 201) {
        state = CartState(); // Reset cart state
        return true;
      }
    } catch (e) {
      print('❌ [CartNotifier] Failed to place order: $e');
    }
    return false;
  }
}

final cartProvider = StateNotifierProvider<CartNotifier, CartState>((ref) {
  return CartNotifier();
});
