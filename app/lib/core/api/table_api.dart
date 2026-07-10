import 'package:dio/dio.dart';
import 'dio_client.dart';
import 'api_endpoints.dart';

class TableApi {
  final Dio _dio = DioClient().dio;

  Future<Response> getTables() async {
    return await _dio.get(ApiEndpoints.tables);
  }
}
