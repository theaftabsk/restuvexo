import 'package:socket_io_client/socket_io_client.dart' as io;
import 'package:shared_preferences/shared_preferences.dart';

class SocketService {
  static final SocketService _instance = SocketService._internal();
  io.Socket? _socket;
  bool _isConnected = false;
  Function? _onTableUpdated;
  Function? _onOrderStatusUpdated;

  factory SocketService() => _instance;

  SocketService._internal();

  void connect() async {
    if (_socket != null) return;

    final prefs = await SharedPreferences.getInstance();
    final baseUrl = prefs.getString('server_url') ?? 'https://app.restuvexo.shop';

    _socket = io.io(baseUrl, io.OptionBuilder()
      .setTransports(['websocket'])
      .enableReconnection()
      .build());

    _socket!.onConnect((_) {
      _isConnected = true;
      print('⚡ [Socket.io] Connected successfully: ${_socket!.id}');
      
      // Auto-join restaurant room if profile exists
      final restaurantId = prefs.getInt('restaurant_id');
      if (restaurantId != null) {
        _socket!.emit('join_restaurant', restaurantId);
      }
    });

    _socket!.onDisconnect((_) {
      _isConnected = false;
      print('⚡ [Socket.io] Disconnected.');
    });

    _socket!.on('table_updated', (_) {
      if (_onTableUpdated != null) _onTableUpdated!();
    });

    _socket!.on('order_status_updated', (_) {
      if (_onOrderStatusUpdated != null) _onOrderStatusUpdated!();
    });

    _socket!.on('order_updated', (_) {
      if (_onOrderStatusUpdated != null) _onOrderStatusUpdated!();
      if (_onTableUpdated != null) _onTableUpdated!();
    });

    _socket!.connect();
  }

  void disconnect() {
    _socket?.disconnect();
    _socket = null;
    _isConnected = false;
  }

  bool get isConnected => _isConnected;

  set onTableUpdated(Function callback) => _onTableUpdated = callback;
  set onOrderStatusUpdated(Function callback) => _onOrderStatusUpdated = callback;
}
