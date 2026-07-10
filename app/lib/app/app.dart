import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'router.dart';
import '../core/theme/app_theme.dart';
import '../features/auth/auth_provider.dart';

class RestuvexoApp extends ConsumerWidget {
  const RestuvexoApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final authState = ref.watch(authProvider);

    return MaterialApp.router(
      title: 'RESTUVEXO ROS',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.getThemeByRole(authState.role),
      routerConfig: appRouter,
    );
  }
}
