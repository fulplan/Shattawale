import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Search, FileText, Eye, Truck } from "lucide-react";

export default function Orders() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const { toast } = useToast();

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["/api/orders"],
  });

  const updateOrderMutation = useMutation({
    mutationFn: async ({ orderId, updates }: { orderId: string; updates: any }) => {
      const response = await apiRequest("PUT", `/api/orders/${orderId}`, updates);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      toast({
        title: "Order updated",
        description: "Order status has been successfully updated.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const filteredOrders = orders.filter((order: any) => {
    const matchesSearch = 
      order.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.customerPhone?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || order.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status.toUpperCase()) {
      case 'PAID':
        return 'bg-green-100 text-green-800';
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800';
      case 'PACKED':
        return 'bg-blue-100 text-blue-800';
      case 'SHIPPED':
        return 'bg-purple-100 text-purple-800';
      case 'DELIVERED':
        return 'bg-emerald-100 text-emerald-800';
      case 'CANCELLED':
        return 'bg-red-100 text-red-800';
      case 'REFUNDED':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const handleStatusChange = (orderId: string, newStatus: string) => {
    updateOrderMutation.mutate({
      orderId,
      updates: { status: newStatus }
    });
  };

  const orderStatuses = [
    'PENDING',
    'PAID',
    'PACKED',
    'SHIPPED',
    'DELIVERED',
    'CANCELLED',
    'REFUNDED'
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

        <main className="py-8 px-4 sm:px-6 lg:px-8" data-testid="orders-content">
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Orders</h1>
                <p className="mt-2 text-gray-600">Manage customer orders and fulfillment</p>
              </div>
            </div>
          </div>

          {/* Search and Filters */}
          <Card className="bg-white border border-gray-200 mb-6">
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label className="block text-sm font-medium text-gray-700 mb-1">Search Orders</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      type="text"
                      placeholder="Search by order number or phone..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                      data-testid="input-search-orders"
                    />
                  </div>
                </div>
                <div>
                  <Label className="block text-sm font-medium text-gray-700 mb-1">Status</Label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger data-testid="select-status-filter">
                      <SelectValue placeholder="All Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      {orderStatuses.map((status) => (
                        <SelectItem key={status} value={status}>
                          {status}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="block text-sm font-medium text-gray-700 mb-1">Sort By</Label>
                  <Select defaultValue="recent">
                    <SelectTrigger data-testid="select-sort">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="recent">Most Recent</SelectItem>
                      <SelectItem value="oldest">Oldest First</SelectItem>
                      <SelectItem value="amount-high">Amount High-Low</SelectItem>
                      <SelectItem value="amount-low">Amount Low-High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Orders Table */}
          <Card className="bg-white shadow-sm border border-gray-200">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Order
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Customer
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {isLoading ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center">
                        <div className="flex items-center justify-center">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                          <span className="ml-2 text-gray-500">Loading orders...</span>
                        </div>
                      </td>
                    </tr>
                  ) : filteredOrders.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center">
                        <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                        <p className="text-gray-500 text-lg">No orders found</p>
                        <p className="text-gray-400 text-sm">
                          {searchQuery || statusFilter !== "all"
                            ? "Try adjusting your filters"
                            : "Orders will appear here once customers start purchasing"
                          }
                        </p>
                      </td>
                    </tr>
                  ) : (
                    filteredOrders.map((order: any) => (
                      <tr key={order.id} className="hover:bg-gray-50" data-testid={`order-row-${order.id}`}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900" data-testid={`order-number-${order.id}`}>
                              {order.orderNumber}
                            </div>
                            {order.trackingNumber && (
                              <div className="text-sm text-gray-500">
                                Tracking: {order.trackingNumber}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {order.customerPhone || "N/A"}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900" data-testid={`order-amount-${order.id}`}>
                          ₵{parseFloat(order.totalGhs || "0").toFixed(2)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Select
                            value={order.status}
                            onValueChange={(value) => handleStatusChange(order.id, value)}
                            disabled={updateOrderMutation.isPending}
                          >
                            <SelectTrigger className="w-32">
                              <Badge className={`${getStatusColor(order.status)} border-0`} data-testid={`order-status-${order.id}`}>
                                {order.status}
                              </Badge>
                            </SelectTrigger>
                            <SelectContent>
                              {orderStatuses.map((status) => (
                                <SelectItem key={status} value={status}>
                                  {status}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(order.createdAt)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-blue-600 hover:text-blue-900 mr-2"
                            data-testid={`button-view-${order.id}`}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </Button>
                          {(order.status === 'PAID' || order.status === 'PACKED') && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleStatusChange(order.id, order.status === 'PAID' ? 'PACKED' : 'SHIPPED')}
                              className="text-green-600 hover:text-green-900"
                              data-testid={`button-fulfill-${order.id}`}
                            >
                              <Truck className="h-4 w-4 mr-1" />
                              {order.status === 'PAID' ? 'Pack' : 'Ship'}
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </main>
      </div>
    </div>
  );
}
