import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Search, Users, User, Eye } from "lucide-react";

export default function Customers() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const { data: customers = [], isLoading } = useQuery({
    queryKey: ["/api/customers"],
  }) as { data: any[], isLoading: boolean };

  const { data: orders = [] } = useQuery({
    queryKey: ["/api/orders"],
  }) as { data: any[] };

  const filteredCustomers = customers.filter((customer: any) => {
    const searchTerm = searchQuery.toLowerCase();
    return (
      customer.firstName?.toLowerCase().includes(searchTerm) ||
      customer.lastName?.toLowerCase().includes(searchTerm) ||
      customer.username?.toLowerCase().includes(searchTerm) ||
      customer.phone?.toLowerCase().includes(searchTerm) ||
      customer.telegramId?.toLowerCase().includes(searchTerm)
    );
  });

  const getCustomerOrderCount = (customerId: string) => {
    return orders.filter((order: any) => order.userId === customerId).length;
  };

  const getCustomerTotalSpent = (customerId: string) => {
    const customerOrders = orders.filter((order: any) => order.userId === customerId && order.status === 'PAID');
    return customerOrders.reduce((total: number, order: any) => total + parseFloat(order.totalGhs || "0"), 0);
  };

  const getCustomerLatestAddress = (customerId: string) => {
    const customerOrders = orders.filter((order: any) => order.userId === customerId);
    if (customerOrders.length === 0) return null;
    
    // Get the most recent order with address
    const ordersWithAddress = customerOrders
      .filter((order: any) => order.address)
      .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    return ordersWithAddress.length > 0 ? ordersWithAddress[0].address : null;
  };

  const getCustomerPhone = (customerId: string) => {
    // First check user phone, then check latest order phone
    const customer = customers.find((c: any) => c.id === customerId);
    if (customer?.phone) return customer.phone;
    
    const customerOrders = orders.filter((order: any) => order.userId === customerId);
    if (customerOrders.length === 0) return null;
    
    // Get the most recent order with phone
    const ordersWithPhone = customerOrders
      .filter((order: any) => order.customerPhone)
      .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    return ordersWithPhone.length > 0 ? ordersWithPhone[0].customerPhone : null;
  };

  const handleViewOrders = (customerId: string) => {
    const customerOrders = orders.filter((order: any) => order.userId === customerId);
    if (customerOrders.length === 0) {
      alert('This customer has no orders yet.');
      return;
    }
    
    // Create a detailed summary
    const orderSummary = customerOrders.map((order: any) => 
      `Order #${order.orderNumber} - ${order.status} - ₵${order.totalGhs}`
    ).join('\n');
    
    alert(`Customer Orders (${customerOrders.length} total):\n\n${orderSummary}`);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getCustomerInitials = (customer: any) => {
    const firstName = customer.firstName || "";
    const lastName = customer.lastName || "";
    return (firstName.charAt(0) + lastName.charAt(0)).toUpperCase() || customer.username?.charAt(0).toUpperCase() || "U";
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

        <main className="py-8 px-4 sm:px-6 lg:px-8" data-testid="customers-content">
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
                <p className="mt-2 text-gray-600">Manage your Telegram bot users and their order history</p>
              </div>
            </div>
          </div>

          {/* Search */}
          <Card className="bg-white border border-gray-200 mb-6">
            <CardContent className="p-6">
              <div className="max-w-md">
                <Label className="block text-sm font-medium text-gray-700 mb-1">Search Customers</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    type="text"
                    placeholder="Search by name, username, phone, or Telegram ID..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                    data-testid="input-search-customers"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Customers Table */}
          <Card className="bg-white shadow-sm border border-gray-200">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Customer
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Telegram Info
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Contact & Address
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Orders
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total Spent
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Joined
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {isLoading ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center">
                        <div className="flex items-center justify-center">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                          <span className="ml-2 text-gray-500">Loading customers...</span>
                        </div>
                      </td>
                    </tr>
                  ) : filteredCustomers.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center">
                        <Users className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                        <p className="text-gray-500 text-lg">No customers found</p>
                        <p className="text-gray-400 text-sm">
                          {searchQuery
                            ? "Try adjusting your search terms"
                            : "Customers will appear here once they start the Telegram bot"
                          }
                        </p>
                      </td>
                    </tr>
                  ) : (
                    filteredCustomers.map((customer: any) => {
                      const orderCount = getCustomerOrderCount(customer.id);
                      const totalSpent = getCustomerTotalSpent(customer.id);
                      
                      return (
                        <tr key={customer.id} className="hover:bg-gray-50" data-testid={`customer-row-${customer.id}`}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="flex-shrink-0">
                                <div className="h-10 w-10 bg-gray-200 rounded-full flex items-center justify-center">
                                  <span className="text-sm font-medium text-gray-600">
                                    {getCustomerInitials(customer)}
                                  </span>
                                </div>
                              </div>
                              <div className="ml-4">
                                <div className="text-sm font-medium text-gray-900" data-testid={`customer-name-${customer.id}`}>
                                  {customer.firstName || customer.lastName 
                                    ? `${customer.firstName || ''} ${customer.lastName || ''}`.trim()
                                    : customer.username || 'Unknown User'
                                  }
                                </div>
                                <div className="text-sm text-gray-500">
                                  ID: {customer.id.substring(0, 8)}...
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              <div>@{customer.username || 'N/A'}</div>
                              <div className="text-gray-500 font-mono text-xs">
                                TG: {customer.telegramId}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-900">
                              <div className="font-medium">
                                📱 {getCustomerPhone(customer.id) || 'No phone'}
                              </div>
                              {(() => {
                                const address = getCustomerLatestAddress(customer.id);
                                return address ? (
                                  <div className="text-xs text-gray-500 mt-1 max-w-xs">
                                    📍 {typeof address === 'string' ? address : 
                                         `${address.street || ''} ${address.city || ''} ${address.region || ''}`.trim() || 'Address available'}
                                  </div>
                                ) : (
                                  <div className="text-xs text-gray-400 mt-1">No delivery address</div>
                                );
                              })()
                              }
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900" data-testid={`customer-orders-${customer.id}`}>
                            {orderCount}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900" data-testid={`customer-spent-${customer.id}`}>
                            ₵{totalSpent.toFixed(2)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatDate(customer.createdAt)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-blue-600 hover:text-blue-900"
                              onClick={() => handleViewOrders(customer.id)}
                              data-testid={`button-view-customer-${customer.id}`}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              View Orders
                            </Button>
                          </td>
                        </tr>
                      );
                    })
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
