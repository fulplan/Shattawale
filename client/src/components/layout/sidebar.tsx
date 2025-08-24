import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { 
  ShoppingCart, 
  BarChart3, 
  Package, 
  ShoppingBag, 
  Users, 
  CreditCard, 
  Tags, 
  Settings, 
  User,
  MessageSquare 
} from "lucide-react";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: BarChart3 },
  { name: "Products", href: "/products", icon: Package },
  { name: "Orders", href: "/orders", icon: ShoppingBag },
  { name: "Customers", href: "/customers", icon: Users },
  { name: "Payments", href: "/payments", icon: CreditCard },
  { name: "Coupons", href: "/coupons", icon: Tags },
  { name: "Bot Commands", href: "/bot-commands", icon: MessageSquare },
  { name: "Analytics", href: "/analytics", icon: BarChart3 },
  { name: "Settings", href: "/settings", icon: Settings },
];

interface SidebarProps {
  className?: string;
}

export function Sidebar({ className }: SidebarProps) {
  const [location] = useLocation();
  const { user } = useAuth();

  return (
    <div className={cn("flex flex-col h-full bg-white shadow-lg border-r border-gray-200", className)}>
      {/* Logo */}
      <div className="flex items-center justify-center h-16 px-4 border-b border-gray-200">
        <div className="flex items-center space-x-2">
          <div className="h-8 w-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <ShoppingCart className="text-white text-sm h-4 w-4" />
          </div>
          <span className="text-xl font-bold text-gray-900">EcomBot</span>
        </div>
      </div>
      
      {/* Navigation */}
      <nav className="mt-5 px-2 space-y-1 flex-1" data-testid="sidebar-navigation">
        {navigation.map((item) => {
          const isActive = location === item.href || (item.href === "/dashboard" && location === "/");
          const Icon = item.icon;
          
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors",
                isActive
                  ? "bg-blue-50 text-blue-700"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              )}
              data-testid={`nav-link-${item.name.toLowerCase()}`}
            >
              <Icon 
                className={cn(
                  "mr-3 h-5 w-5",
                  isActive ? "text-blue-500" : "text-gray-400"
                )} 
              />
              {item.name}
            </Link>
          );
        })}
      </nav>
      
      {/* User Profile */}
      <div className="p-4 border-t border-gray-200">
        <div className="flex items-center" data-testid="user-profile">
          <div className="flex-shrink-0">
            <div className="h-8 w-8 bg-gray-300 rounded-full flex items-center justify-center">
              <User className="text-gray-600 text-sm h-4 w-4" />
            </div>
          </div>
          <div className="ml-3 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate" data-testid="user-name">
              {user?.name || "Admin User"}
            </p>
            <p className="text-xs text-gray-500 truncate" data-testid="user-email">
              {user?.email || "admin@example.com"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
