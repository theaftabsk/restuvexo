import 'package:dio/dio.dart';
import 'package:shared_preferences/shared_preferences.dart';

class DioClient {
  static final DioClient _instance = DioClient._internal();
  late final Dio _dio;

  factory DioClient() => _instance;

  DioClient._internal() {
    _dio = Dio(
      BaseOptions(
        connectTimeout: const Duration(seconds: 15),
        receiveTimeout: const Duration(seconds: 15),
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      ),
    );

    // Request & Response Interceptors
    _dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) async {
          final prefs = await SharedPreferences.getInstance();
          
          // Dynamically adjust Base URL based on Server Config
          final savedBaseUrl = prefs.getString('server_url');
          if (savedBaseUrl != null && savedBaseUrl.isNotEmpty) {
            options.baseUrl = savedBaseUrl;
          } else {
            options.baseUrl = 'https://api.restuvexo.shop';
          }

          // Inject Auth Token
          final token = prefs.getString('auth_token');
          if (token != null && token.isNotEmpty) {
            options.headers['Authorization'] = 'Bearer $token';
          }

          return handler.next(options);
        },
        onError: (DioException e, handler) {
          // Log errors or handle global redirects
          if (e.response?.statusCode == 401) {
            // Expired token session cleanup
            SharedPreferences.getInstance().then((prefs) {
              prefs.remove('auth_token');
              prefs.remove('user_profile');
            });
          }
          return handler.next(e);
        },
      ),
    );
  }

  Dio get dio => _dio;
}
