import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { RefreshCw, CheckCircle, Clock, XCircle, Percent, Info } from "lucide-react";

export default function Payments() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { toast } = useToast();

  const { data: payments = [], isLoading } = useQuery({
    queryKey: ["/api/payments"],
  });

  const { data: reconciliationStatus } = useQuery({
    queryKey: ["/api/reconciliation/status"],
  });

  const forceReconciliationMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/reconciliation/force");
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/payments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/reconciliation/status"] });
      toast({
        title: "Reconciliation completed",
        description: data.message,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Reconciliation failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const getStatusColor = (status: string) => {
    switch (status.toUpperCase()) {
      case 'SUCCESS':
        return 'bg-green-100 text-green-800';
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800';
      case 'FAILED':
        return 'bg-red-100 text-red-800';
      case 'TIMEOUT':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const paymentMetrics = {
    successful: payments.filter((p: any) => p.status === 'SUCCESS').length,
    pending: payments.filter((p: any) => p.status === 'PENDING').length,
    failed: payments.filter((p: any) => p.status === 'FAILED' || p.status === 'TIMEOUT').length,
    successRate: payments.length > 0 
      ? ((payments.filter((p: any) => p.status === 'SUCCESS').length / payments.length) * 100).toFixed(1)
      : '0'
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

        <main className="py-8 px-4 sm:px-6 lg:px-8" data-testid="payments-content">
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Payment Logs</h1>
                <p className="mt-2 text-gray-600">MTN Mobile Money transaction history and reconciliation</p>
              </div>
              <Button 
                className="bg-blue-600 text-white hover:bg-blue-700"
                onClick={() => forceReconciliationMutation.mutate()}
                disabled={forceReconciliationMutation.isPending}
                data-testid="button-force-reconciliation"
              >
                <RefreshCw className={`mr-2 h-4 w-4 ${forceReconciliationMutation.isPending ? 'animate-spin' : ''}`} />
                Force Reconciliation
              </Button>
            </div>
          </div>

          {/* MTN MoMo Status Dashboard */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card className="bg-white border border-gray-200">
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="h-10 w-10 bg-green-100 rounded-lg flex items-center justify-center">
                      <CheckCircle className="text-green-600 h-5 w-5" />
                    </div>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Successful Payments</p>
                    <p className="text-2xl font-semibold text-gray-900" data-testid="metric-successful-payments">
                      {paymentMetrics.successful}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white border border-gray-200">
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="h-10 w-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                      <Clock className="text-yellow-600 h-5 w-5" />
                    </div>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Pending</p>
                    <p className="text-2xl font-semibold text-gray-900" data-testid="metric-pending-payments">
                      {paymentMetrics.pending}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white border border-gray-200">
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="h-10 w-10 bg-red-100 rounded-lg flex items-center justify-center">
                      <XCircle className="text-red-600 h-5 w-5" />
                    </div>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Failed</p>
                    <p className="text-2xl font-semibold text-gray-900" data-testid="metric-failed-payments">
                      {paymentMetrics.failed}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white border border-gray-200">
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Percent className="text-blue-600 h-5 w-5" />
                    </div>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Success Rate</p>
                    <p className="text-2xl font-semibold text-gray-900" data-testid="metric-success-rate">
                      {paymentMetrics.successRate}%
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Payment Transactions Table */}
          <Card className="bg-white shadow-sm border border-gray-200">
            <CardHeader className="border-b border-gray-200">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-medium text-gray-900">Recent Transactions</CardTitle>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-500">Auto-reconciliation:</span>
                  <Badge className="bg-green-100 text-green-800" data-testid="reconciliation-status">
                    <div className="h-1.5 w-1.5 bg-green-400 rounded-full mr-1 animate-pulse"></div>
                    Active ({reconciliationStatus?.schedule || '*/15 * * * *'})
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Order ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      MTN Reference
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Customer Phone
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Timestamp
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
                          <span className="ml-2 text-gray-500">Loading payments...</span>
                        </div>
                      </td>
                    </tr>
                  ) : payments.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center">
                        <CheckCircle className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                        <p className="text-gray-500 text-lg">No payment transactions yet</p>
                        <p className="text-gray-400 text-sm">
                          Payment logs will appear here once customers start making purchases
                        </p>
                      </td>
                    </tr>
                  ) : (
                    payments.map((payment: any) => (
                      <tr key={payment.id} className="hover:bg-gray-50" data-testid={`payment-row-${payment.id}`}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="font-mono text-sm text-blue-600" data-testid={`payment-order-${payment.id}`}>
                            {payment.externalId || 'N/A'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="font-mono text-sm text-gray-900">
                            {payment.providerReference || 'PENDING'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {payment.customerPhone}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900" data-testid={`payment-amount-${payment.id}`}>
                          ₵{parseFloat(payment.amountGhs || "0").toFixed(2)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge className={getStatusColor(payment.status)} data-testid={`payment-status-${payment.id}`}>
                            {payment.status}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(payment.createdAt)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-blue-600 hover:text-blue-900"
                            data-testid={`button-view-details-${payment.id}`}
                          >
                            View Details
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Reconciliation Job Status */}
          <Alert className="mt-8 bg-blue-50 border-blue-200">
            <Info className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-700">
              <h3 className="text-sm font-medium text-blue-800 mb-2">Automatic Reconciliation</h3>
              <p className="text-sm">
                The system automatically reconciles pending payments every 15 minutes. Payments timeout after 10 minutes if no confirmation is received from MTN MoMo.
              </p>
              {reconciliationStatus && (
                <div className="mt-2 text-sm">
                  <p><strong>Last reconciliation:</strong> {reconciliationStatus.lastRun ? formatDate(reconciliationStatus.lastRun) : 'Not available'}</p>
                  <p><strong>Next scheduled:</strong> {reconciliationStatus.nextRun ? formatDate(reconciliationStatus.nextRun) : 'Not available'}</p>
                </div>
              )}
            </AlertDescription>
          </Alert>
        </main>
      </div>
    </div>
  );
}
