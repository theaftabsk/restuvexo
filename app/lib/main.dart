import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'app/app.dart';
import 'app/bootstrap.dart';

void main() async {
  // Ensure widget bindings are initialized
  WidgetsFlutterBinding.ensureInitialized();

  // Bootstrap cache database & websocket streams
  await Bootstrap.init();

  // Boot Restuvexo application within ProviderScope
  runApp(
    const ProviderScope(
      child: RestuvexoApp(),
    ),
  );
}
