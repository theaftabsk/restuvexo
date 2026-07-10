import 'dart:convert';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../../core/api/auth_api.dart';

class AuthState {
  final String? token;
  final String? role;
  final String? userName;
  final int? restaurantId;
  final bool isAuthenticated;
  final String? error;

  AuthState({
    this.token,
    this.role,
    this.userName,
    this.restaurantId,
    this.isAuthenticated = false,
    this.error,
  });

  AuthState copyWith({
    String? token,
    String? role,
    String? userName,
    int? restaurantId,
    bool? isAuthenticated,
    String? error,
  }) {
    return AuthState(
      token: token ?? this.token,
      role: role ?? this.role,
      userName: userName ?? this.userName,
      restaurantId: restaurantId ?? this.restaurantId,
      isAuthenticated: isAuthenticated ?? this.isAuthenticated,
      error: error ?? this.error,
    );
  }
}

class AuthNotifier extends StateNotifier<AuthState> {
  final AuthApi _authApi = AuthApi();

  AuthNotifier() : super(AuthState()) {
    _loadSession();
  }

  void _loadSession() async {
    final prefs = await SharedPreferences.getInstance();
    final token = prefs.getString('auth_token');
    final userProfileJson = prefs.getString('user_profile');

    if (token != null && userProfileJson != null) {
      final user = jsonDecode(userProfileJson);
      state = AuthState(
        token: token,
        role: user['role'],
        userName: user['name'],
        restaurantId: user['restaurantId'],
        isAuthenticated: true,
      );
    }
  }

  Future<bool> login(String phone, String pin) async {
    state = state.copyWith(error: null);
    try {
      final res = await _authApi.login(phoneOrEmail: phone, credential: pin);
      if (res.statusCode == 200 || res.statusCode == 201) {
        final data = res.data;
        final token = data['token'];
        final user = data['user'];
        
        final prefs = await SharedPreferences.getInstance();
        await prefs.setString('auth_token', token);
        await prefs.setString('user_profile', jsonEncode(user));
        if (user['restaurantId'] != null) {
          await prefs.setInt('restaurant_id', user['restaurantId']);
        }

        state = AuthState(
          token: token,
          role: user['role'],
          userName: user['name'],
          restaurantId: user['restaurantId'],
          isAuthenticated: true,
        );
        return true;
      }
    } catch (e) {
      state = state.copyWith(error: 'Invalid Credentials. Please retry.');
    }
    return false;
  }

  void logout() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('auth_token');
    await prefs.remove('user_profile');
    await prefs.remove('restaurant_id');
    state = AuthState();
  }
}

final authProvider = StateNotifierProvider<AuthNotifier, AuthState>((ref) {
  return AuthNotifier();
});
