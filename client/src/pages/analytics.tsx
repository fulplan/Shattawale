import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { MetricsCards } from "@/components/charts/metrics-cards";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TrendingUp, TrendingDown, BarChart3 } from "lucide-react";

export default function Analytics() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [timeRange, setTimeRange] = useState("7d");

  const { data: metrics, isLoading: metricsLoading } = useQuery({
    queryKey: ["/api/dashboard/metrics"],
  });

  const { data: orders = [] } = useQuery({
    queryKey: ["/api/orders"],
  });

  const { data: payments = [] } = useQuery({
    queryKey: ["/api/payments"],
  });

  // Calculate analytics data
  const getAnalyticsData = () => {
    const now = new Date();
    const timeRanges = {
      "7d": 7,
      "30d": 30,
      "90d": 90,
      "1y": 365
    };
    
    const days = timeRanges[timeRange as keyof typeof timeRanges] || 7;
    const cutoffDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    
    const recentOrders = orders.filter((order: any) => 
      new Date(order.createdAt) >= cutoffDate
    );
    
    const recentPayments = payments.filter((payment: any) => 
      new Date(payment.createdAt) >= cutoffDate
    );

    return {
      totalRevenue: recentOrders
        .filter((order: any) => order.status === 'PAID')
        .reduce((sum: number, order: any) => sum + parseFloat(order.totalGhs || "0"), 0),
      totalOrders: recentOrders.length,
      paidOrders: recentOrders.filter((order: any) => order.status === 'PAID').length,
      conversionRate: recentOrders.length > 0 
        ? (recentOrders.filter((order: any) => order.status === 'PAID').length / recentOrders.length * 100)
        : 0,
      avgOrderValue: recentOrders.length > 0
        ? recentOrders
            .filter((order: any) => order.status === 'PAID')
            .reduce((sum: number, order: any) => sum + parseFloat(order.totalGhs || "0"), 0) / 
          recentOrders.filter((order: any) => order.status === 'PAID').length
        : 0,
      paymentSuccessRate: recentPayments.length > 0
        ? (recentPayments.filter((payment: any) => payment.status === 'SUCCESS').length / recentPayments.length * 100)
        : 0
    };
  };

  const analyticsData = getAnalyticsData();

  const orderStatusBreakdown = [
    { status: 'PAID', count: orders.filter((o: any) => o.status === 'PAID').length, color: 'bg-green-100 text-green-800' },
    { status: 'PENDING', count: orders.filter((o: any) => o.status === 'PENDING').length, color: 'bg-yellow-100 text-yellow-800' },
    { status: 'SHIPPED', count: orders.filter((o: any) => o.status === 'SHIPPED').length, color: 'bg-blue-100 text-blue-800' },
    { status: 'DELIVERED', count: orders.filter((o: any) => o.status === 'DELIVERED').length, color: 'bg-purple-100 text-purple-800' },
    { status: 'CANCELLED', count: orders.filter((o: any) => o.status === 'CANCELLED').length, color: 'bg-red-100 text-red-800' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar */}
      <div 
        className={`fixed inset-0 z-50 lg:hidden ${sidebarOpen ? 'block' : 'hidden'}`}
        onClick={() => setSidebarOpen(false)}
      >
        <div className="fixed inset-y-0 left-0 z-50 w-64">
          <Sidebar />
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-50 lg:block lg:w-64">
        <Sidebar />
      </div>

      {/* Main content */}
      <div className="lg:pl-64">
        <Topbar onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />

        <main className="py-8 px-4 sm:px-6 lg:px-8" data-testid="analytics-content">
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
                <p className="mt-2 text-gray-600">Analyze your e-commerce performance and trends</p>
              </div>
              <div className="flex items-center space-x-4">
                <Select value={timeRange} onValueChange={setTimeRange}>
                  <SelectTrigger className="w-32" data-testid="select-time-range">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7d">Last 7 days</SelectItem>
                    <SelectItem value="30d">Last 30 days</SelectItem>
                    <SelectItem value="90d">Last 90 days</SelectItem>
                    <SelectItem value="1y">Last year</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Overall Metrics */}
          <MetricsCards 
            data={metrics || { totalOrders: 0, revenue: "0", customers: 0, mtnPayments: 0 }} 
            isLoading={metricsLoading}
          />

          {/* Detailed Analytics */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
            {/* Revenue Analytics */}
            <Card className="bg-white shadow-sm border border-gray-200">
              <CardHeader>
                <CardTitle className="text-lg font-medium text-gray-900">Revenue Analytics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Total Revenue</span>
                    <span className="text-lg font-semibold text-gray-900" data-testid="analytics-total-revenue">
                      ₵{analyticsData.totalRevenue.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Average Order Value</span>
                    <span className="text-lg font-semibold text-gray-900" data-testid="analytics-avg-order-value">
                      ₵{analyticsData.avgOrderValue.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Paid Orders</span>
                    <div className="flex items-center space-x-2">
                      <span className="text-lg font-semibold text-gray-900">
                        {analyticsData.paidOrders}
                      </span>
                      <TrendingUp className="h-4 w-4 text-green-500" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Conversion Analytics */}
            <Card className="bg-white shadow-sm border border-gray-200">
              <CardHeader>
                <CardTitle className="text-lg font-medium text-gray-900">Conversion Metrics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Conversion Rate</span>
                    <span className="text-lg font-semibold text-gray-900" data-testid="analytics-conversion-rate">
                      {analyticsData.conversionRate.toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Payment Success Rate</span>
                    <span className="text-lg font-semibold text-gray-900" data-testid="analytics-payment-success-rate">
                      {analyticsData.paymentSuccessRate.toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Total Orders</span>
                    <div className="flex items-center space-x-2">
                      <span className="text-lg font-semibold text-gray-900">
                        {analyticsData.totalOrders}
                      </span>
                      {analyticsData.totalOrders > 0 ? (
                        <TrendingUp className="h-4 w-4 text-green-500" />
                      ) : (
                        <TrendingDown className="h-4 w-4 text-red-500" />
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Order Status Breakdown */}
            <Card className="bg-white shadow-sm border border-gray-200">
              <CardHeader>
                <CardTitle className="text-lg font-medium text-gray-900">Order Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {orderStatusBreakdown.map((item) => (
                    <div key={item.status} className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">{item.status}</span>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium text-gray-900">{item.count}</span>
                        <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${item.color}`}>
                          {item.count}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Chart Placeholder */}
          <Card className="bg-white shadow-sm border border-gray-200">
            <CardHeader>
              <CardTitle className="text-lg font-medium text-gray-900">Revenue Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
                <div className="text-center">
                  <BarChart3 className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <p className="text-gray-500">Chart visualization coming soon</p>
                  <p className="text-sm text-gray-400">Revenue and order trends will be displayed here</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
}
