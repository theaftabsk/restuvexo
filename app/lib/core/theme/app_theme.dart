import 'package:flutter/material.dart';

class AppTheme {
  // Brand colors
  static const Color orange = Color(0xFFFF5722);
  static const Color slate = Color(0xFF0F172A);
  static const Color blue = Color(0xFF2196F3);
  static const Color red = Color(0xFFE53935);

  static ThemeData getThemeByRole(String? role) {
    Color primaryColor = orange;
    Color secondaryColor = slate;

    return ThemeData(
      useMaterial3: true,
      colorScheme: ColorScheme.fromSeed(
        seedColor: primaryColor,
        primary: primaryColor,
        secondary: secondaryColor,
        background: const Color(0xFFF8FAFC),
      ),
      scaffoldBackgroundColor: const Color(0xFFF8FAFC),
      appBarTheme: AppBarTheme(
        backgroundColor: secondaryColor,
        foregroundColor: Colors.white,
        elevation: 0,
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: primaryColor,
          foregroundColor: Colors.white,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          padding: const EdgeInsets.symmetric(vertical: 16),
        ),
      ),
    );
  }
}
