import 'package:dio/dio.dart';
import 'dio_client.dart';
import 'api_endpoints.dart';

class AuthApi {
  final Dio _dio = DioClient().dio;

  Future<Response> login({
    required String phoneOrEmail,
    required String credential,
  }) async {
    return await _dio.post(
      ApiEndpoints.login,
      data: {
        'phoneOrEmail': phoneOrEmail,
        'credential': credential,
      },
    );
  }
}
