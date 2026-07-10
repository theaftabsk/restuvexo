import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/api/order_api.dart';
import '../../../core/websocket/socket_service.dart';

class KdsState {
  final List<dynamic> orders;
  final bool loading;
  final String? error;

  KdsState({
    this.orders = const [],
    this.loading = true,
    this.error,
  });

  KdsState copyWith({
    List<dynamic>? orders,
    bool? loading,
    String? error,
  }) {
    return KdsState(
      orders: orders ?? this.orders,
      loading: loading ?? this.loading,
      error: error ?? this.error,
    );
  }
}

class KdsNotifier extends StateNotifier<KdsState> {
  final OrderApi _orderApi = OrderApi();

  KdsNotifier() : super(KdsState()) {
    fetchKdsOrders();

    // Listen to real-time WebSockets KDS updates!
    SocketService().onOrderStatusUpdated = () {
      print('⚡ [Socket] KDS order status updated! Refreshing.');
      fetchKdsOrders();
    };
  }

  Future<void> fetchKdsOrders() async {
    try {
      final res = await _orderApi.getOrders();
      if (res.statusCode == 200) {
        state = KdsState(orders: res.data, loading: false);
      }
    } catch (e) {
      state = state.copyWith(loading: false, error: 'Failed to load KDS queue.');
    }
  }
}

final kdsProvider = StateNotifierProvider<KdsNotifier, KdsState>((ref) {
  return KdsNotifier();
});
