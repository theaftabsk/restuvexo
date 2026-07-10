import '../core/database/database_helper.dart';
import '../core/websocket/socket_service.dart';

class Bootstrap {
  static Future<void> init() async {
    // 1. Initialize Hive database cache helper
    await DatabaseHelper.init();

    // 2. Connect Socket.io client to listen for background updates
    SocketService().connect();
  }
}
