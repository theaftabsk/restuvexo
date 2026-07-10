import 'package:dio/dio.dart';
import 'dio_client.dart';
import 'api_endpoints.dart';

class MenuApi {
  final Dio _dio = DioClient().dio;

  Future<Response> getCategories() async {
    return await _dio.get(ApiEndpoints.categories);
  }
}
