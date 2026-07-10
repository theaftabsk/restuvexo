import 'package:hive_flutter/hive_flutter.dart';

class DatabaseHelper {
  static const String cacheBoxName = 'restuvexo_cache';

  static Future<void> init() async {
    await Hive.initFlutter();
    await Hive.openBox(cacheBoxName);
  }

  static Box getCacheBox() {
    return Hive.box(cacheBoxName);
  }

  static Future<void> saveOfflineData(String key, dynamic value) async {
    final box = getCacheBox();
    await box.put(key, value);
  }

  static dynamic getOfflineData(String key) {
    final box = getCacheBox();
    return box.get(key);
  }

  static Future<void> clearAll() async {
    final box = getCacheBox();
    await box.clear();
  }
}
