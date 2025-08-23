import { Card, CardContent } from "@/components/ui/card";
import { ShoppingBag, DollarSign, Users, Smartphone } from "lucide-react";

interface MetricsData {
  totalOrders: number;
  revenue: string;
  customers: number;
  mtnPayments: number;
}

interface MetricsCardsProps {
  data: MetricsData;
  isLoading?: boolean;
}

export function MetricsCards({ data, isLoading }: MetricsCardsProps) {
  const metrics = [
    {
      title: "Total Orders",
      value: isLoading ? "..." : data.totalOrders.toLocaleString(),
      icon: ShoppingBag,
      iconBg: "bg-blue-100",
      iconColor: "text-blue-600",
      change: "+12.3%",
      changeLabel: "from last month",
      testId: "metric-orders"
    },
    {
      title: "Revenue (GHS)",
      value: isLoading ? "..." : `₵${parseFloat(data.revenue || "0").toLocaleString()}`,
      icon: DollarSign,
      iconBg: "bg-green-100",
      iconColor: "text-green-600",
      change: "+8.7%",
      changeLabel: "from last month",
      testId: "metric-revenue"
    },
    {
      title: "Active Customers",
      value: isLoading ? "..." : data.customers.toLocaleString(),
      icon: Users,
      iconBg: "bg-purple-100",
      iconColor: "text-purple-600",
      change: "+5.2%",
      changeLabel: "from last month",
      testId: "metric-customers"
    },
    {
      title: "MTN Payments",
      value: isLoading ? "..." : data.mtnPayments.toLocaleString(),
      icon: Smartphone,
      iconBg: "bg-yellow-100",
      iconColor: "text-yellow-600",
      change: "98.5%",
      changeLabel: "success rate",
      testId: "metric-payments"
    }
  ];

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-8">
      {metrics.map((metric) => {
        const Icon = metric.icon;
        
        return (
          <Card key={metric.title} className="bg-white shadow-sm border border-gray-200" data-testid={metric.testId}>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className={`h-10 w-10 ${metric.iconBg} rounded-lg flex items-center justify-center`}>
                    <Icon className={`${metric.iconColor} h-5 w-5`} />
                  </div>
                </div>
                <div className="ml-4 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">{metric.title}</dt>
                    <dd className="text-2xl font-semibold text-gray-900" data-testid={`${metric.testId}-value`}>
                      {metric.value}
                    </dd>
                  </dl>
                </div>
              </div>
              <div className="mt-4">
                <div className="flex items-center text-sm">
                  <span className="text-green-600 font-medium">{metric.change}</span>
                  <span className="text-gray-500 ml-1">{metric.changeLabel}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
