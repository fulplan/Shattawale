import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { MetricsCards } from "@/components/charts/metrics-cards";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Download, Tags, FileText } from "lucide-react";
import { Link } from "wouter";

export default function Dashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const { data: metrics, isLoading: metricsLoading } = useQuery({
    queryKey: ["/api/dashboard/metrics"],
  });

  const { data: recentOrders } = useQuery({
    queryKey: ["/api/orders"],
    select: (data) => data?.slice(0, 5) || []
  });

  const recentOrdersData = recentOrders || [];

  const getStatusColor = (status: string) => {
    switch (status.toUpperCase()) {
      case 'PAID':
        return 'bg-green-100 text-green-800';
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800';
      case 'SHIPPED':
        return 'bg-blue-100 text-blue-800';
      case 'DELIVERED':
        return 'bg-purple-100 text-purple-800';
      case 'CANCELLED':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

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

        <main className="py-8 px-4 sm:px-6 lg:px-8" data-testid="dashboard-content">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900">Dashboard Overview</h1>
            <p className="mt-2 text-gray-600">Monitor your Telegram e-commerce performance</p>
          </div>

          {/* Key Metrics Cards */}
          <MetricsCards 
            data={metrics || { totalOrders: 0, revenue: "0", customers: 0, mtnPayments: 0 }} 
            isLoading={metricsLoading}
          />

          {/* Recent Orders & Quick Actions */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Recent Orders */}
            <div className="lg:col-span-2">
              <Card className="bg-white shadow-sm border border-gray-200">
                <CardHeader className="border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg font-medium text-gray-900">Recent Orders</CardTitle>
                    <Link href="/orders">
                      <Button variant="link" className="text-sm text-blue-600 hover:text-blue-800 font-medium p-0" data-testid="link-view-all-orders">
                        View all
                      </Button>
                    </Link>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y divide-gray-200">
                    {recentOrdersData.length === 0 ? (
                      <div className="px-6 py-8 text-center text-gray-500">
                        <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                        <p>No orders yet</p>
                        <p className="text-sm">Orders will appear here once customers start placing them</p>
                      </div>
                    ) : (
                      recentOrdersData.map((order: any) => (
                        <div key={order.id} className="px-6 py-4" data-testid={`order-item-${order.id}`}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <div className="flex-shrink-0">
                                <div className="h-8 w-8 bg-gray-200 rounded-full flex items-center justify-center">
                                  <span className="text-xs font-medium text-gray-600">
                                    {order.orderNumber?.substring(0, 2) || "OR"}
                                  </span>
                                </div>
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium text-gray-900" data-testid={`order-number-${order.id}`}>
                                  Order #{order.orderNumber}
                                </p>
                                <p className="text-sm text-gray-500">
                                  {formatDate(order.createdAt)}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Badge 
                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}
                                data-testid={`order-status-${order.id}`}
                              >
                                {order.status}
                              </Badge>
                              <span className="text-sm font-medium text-gray-900" data-testid={`order-amount-${order.id}`}>
                                ₵{parseFloat(order.totalGhs || "0").toFixed(2)}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions & System Status */}
            <div className="space-y-6">
              {/* Quick Actions */}
              <Card className="bg-white shadow-sm border border-gray-200">
                <CardHeader className="border-b border-gray-200">
                  <CardTitle className="text-lg font-medium text-gray-900">Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  <Link href="/products">
                    <Button className="w-full bg-blue-600 text-white hover:bg-blue-700" data-testid="button-add-product">
                      <Plus className="mr-2 h-4 w-4" />
                      Add New Product
                    </Button>
                  </Link>
                  <Link href="/coupons">
                    <Button className="w-full bg-green-600 text-white hover:bg-green-700" data-testid="button-create-coupon">
                      <Tags className="mr-2 h-4 w-4" />
                      Create Coupon
                    </Button>
                  </Link>
                  <Button className="w-full bg-purple-600 text-white hover:bg-purple-700" data-testid="button-export-orders">
                    <Download className="mr-2 h-4 w-4" />
                    Export Orders
                  </Button>
                </CardContent>
              </Card>

              {/* System Status */}
              <Card className="bg-white shadow-sm border border-gray-200">
                <CardHeader className="border-b border-gray-200">
                  <CardTitle className="text-lg font-medium text-gray-900">System Status</CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-center justify-between" data-testid="status-telegram">
                    <div className="flex items-center space-x-2">
                      <div className="h-2 w-2 bg-green-400 rounded-full"></div>
                      <span className="text-sm text-gray-700">Telegram Bot</span>
                    </div>
                    <span className="text-xs text-green-600 font-medium">Online</span>
                  </div>
                  <div className="flex items-center justify-between" data-testid="status-mtn">
                    <div className="flex items-center space-x-2">
                      <div className="h-2 w-2 bg-green-400 rounded-full"></div>
                      <span className="text-sm text-gray-700">MTN MoMo API</span>
                    </div>
                    <span className="text-xs text-green-600 font-medium">Connected</span>
                  </div>
                  <div className="flex items-center justify-between" data-testid="status-database">
                    <div className="flex items-center space-x-2">
                      <div className="h-2 w-2 bg-green-400 rounded-full"></div>
                      <span className="text-sm text-gray-700">Database</span>
                    </div>
                    <span className="text-xs text-green-600 font-medium">Healthy</span>
                  </div>
                  <div className="flex items-center justify-between" data-testid="status-reconciliation">
                    <div className="flex items-center space-x-2">
                      <div className="h-2 w-2 bg-yellow-400 rounded-full"></div>
                      <span className="text-sm text-gray-700">Reconciliation</span>
                    </div>
                    <span className="text-xs text-yellow-600 font-medium">Running</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
