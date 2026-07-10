import 'package:dio/dio.dart';
import 'dio_client.dart';
import 'api_endpoints.dart';

class OrderApi {
  final Dio _dio = DioClient().dio;

  Future<Response> getOrders({int limit = 100}) async {
    return await _dio.get(
      ApiEndpoints.orders,
      queryParameters: {'limit': limit},
    );
  }

  Future<Response> createOrder({
    required int? tableId,
    required String orderType,
    required List<Map<String, dynamic>> items,
    String paymentStatus = 'unpaid',
  }) async {
    return await _dio.post(
      ApiEndpoints.orders,
      data: {
        if (tableId != null) 'tableId': tableId,
        'orderType': orderType,
        'paymentStatus': paymentStatus,
        'items': items,
      },
    );
  }
}
