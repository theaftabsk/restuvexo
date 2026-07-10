import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/api/table_api.dart';
import '../../../../core/websocket/socket_service.dart';

class TableState {
  final List<dynamic> tables;
  final bool loading;
  final String? error;

  TableState({
    this.tables = const [],
    this.loading = true,
    this.error,
  });

  TableState copyWith({
    List<dynamic>? tables,
    bool? loading,
    String? error,
  }) {
    return TableState(
      tables: tables ?? this.tables,
      loading: loading ?? this.loading,
      error: error ?? this.error,
    );
  }
}

class TableNotifier extends StateNotifier<TableState> {
  final TableApi _tableApi = TableApi();

  TableNotifier() : super(TableState()) {
    fetchTables();
    
    // Listen for real-time WebSocket table updates!
    SocketService().onTableUpdated = () {
      print('⚡ [Socket] Tables updated event received! Refreshing tables list.');
      fetchTables();
    };
  }

  Future<void> fetchTables() async {
    try {
      final res = await _tableApi.getTables();
      if (res.statusCode == 200) {
        state = TableState(tables: res.data, loading: false);
      }
    } catch (e) {
      state = state.copyWith(loading: false, error: 'Failed to load tables.');
    }
  }
}

final tableProvider = StateNotifierProvider<TableNotifier, TableState>((ref) {
  return TableNotifier();
});
