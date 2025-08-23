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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Plus, Search, Tags, Edit, Trash2, Calendar } from "lucide-react";

export default function Coupons() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [couponForm, setCouponForm] = useState({
    code: "",
    name: "",
    description: "",
    type: "percent",
    value: "",
    minOrderAmount: "",
    maxUses: "",
    startsAt: "",
    expiresAt: ""
  });
  const { toast } = useToast();

  const { data: coupons = [], isLoading } = useQuery({
    queryKey: ["/api/coupons"],
  });

  const createCouponMutation = useMutation({
    mutationFn: async (couponData: any) => {
      const response = await apiRequest("POST", "/api/coupons", couponData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/coupons"] });
      setIsModalOpen(false);
      resetForm();
      toast({
        title: "Coupon created",
        description: "Coupon has been successfully created.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Creation failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteCouponMutation = useMutation({
    mutationFn: async (couponId: string) => {
      await apiRequest("DELETE", `/api/coupons/${couponId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/coupons"] });
      toast({
        title: "Coupon deleted",
        description: "Coupon has been successfully deleted.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Delete failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const filteredCoupons = coupons.filter((coupon: any) => {
    const searchTerm = searchQuery.toLowerCase();
    return (
      coupon.code.toLowerCase().includes(searchTerm) ||
      coupon.name.toLowerCase().includes(searchTerm)
    );
  });

  const resetForm = () => {
    setCouponForm({
      code: "",
      name: "",
      description: "",
      type: "percent",
      value: "",
      minOrderAmount: "",
      maxUses: "",
      startsAt: "",
      expiresAt: ""
    });
    setEditingCoupon(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = {
      ...couponForm,
      value: parseFloat(couponForm.value),
      minOrderAmount: couponForm.minOrderAmount ? parseFloat(couponForm.minOrderAmount) : null,
      maxUses: couponForm.maxUses ? parseInt(couponForm.maxUses) : null,
      startsAt: couponForm.startsAt ? new Date(couponForm.startsAt).toISOString() : null,
      expiresAt: couponForm.expiresAt ? new Date(couponForm.expiresAt).toISOString() : null,
    };
    
    createCouponMutation.mutate(formData);
  };

  const handleDeleteCoupon = (couponId: string) => {
    if (confirm("Are you sure you want to delete this coupon?")) {
      deleteCouponMutation.mutate(couponId);
    }
  };

  const getCouponStatus = (coupon: any) => {
    const now = new Date();
    const expiresAt = coupon.expiresAt ? new Date(coupon.expiresAt) : null;
    const startsAt = coupon.startsAt ? new Date(coupon.startsAt) : null;

    if (!coupon.isActive) return { text: "Inactive", color: "bg-gray-100 text-gray-800" };
    if (expiresAt && now > expiresAt) return { text: "Expired", color: "bg-red-100 text-red-800" };
    if (startsAt && now < startsAt) return { text: "Scheduled", color: "bg-blue-100 text-blue-800" };
    if (coupon.maxUses && coupon.usedCount >= coupon.maxUses) return { text: "Used Up", color: "bg-yellow-100 text-yellow-800" };
    return { text: "Active", color: "bg-green-100 text-green-800" };
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

        <main className="py-8 px-4 sm:px-6 lg:px-8" data-testid="coupons-content">
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Coupons</h1>
                <p className="mt-2 text-gray-600">Manage discount codes and promotional offers</p>
              </div>
              <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogTrigger asChild>
                  <Button 
                    className="bg-green-600 text-white hover:bg-green-700"
                    onClick={() => resetForm()}
                    data-testid="button-add-coupon"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Create Coupon
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>
                      {editingCoupon ? "Edit Coupon" : "Create New Coupon"}
                    </DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="code">Coupon Code</Label>
                        <Input
                          id="code"
                          value={couponForm.code}
                          onChange={(e) => setCouponForm({ ...couponForm, code: e.target.value.toUpperCase() })}
                          placeholder="SAVE20"
                          required
                          data-testid="input-coupon-code"
                        />
                      </div>
                      <div>
                        <Label htmlFor="type">Type</Label>
                        <Select value={couponForm.type} onValueChange={(value) => setCouponForm({ ...couponForm, type: value })}>
                          <SelectTrigger data-testid="select-coupon-type">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="percent">Percentage</SelectItem>
                            <SelectItem value="fixed">Fixed Amount</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    
                    <div>
                      <Label htmlFor="name">Name</Label>
                      <Input
                        id="name"
                        value={couponForm.name}
                        onChange={(e) => setCouponForm({ ...couponForm, name: e.target.value })}
                        placeholder="20% Off Sale"
                        required
                        data-testid="input-coupon-name"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="description">Description</Label>
                      <Input
                        id="description"
                        value={couponForm.description}
                        onChange={(e) => setCouponForm({ ...couponForm, description: e.target.value })}
                        placeholder="Get 20% off your order"
                        data-testid="input-coupon-description"
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="value">
                          Value {couponForm.type === "percent" ? "(%)" : "(GHS)"}
                        </Label>
                        <Input
                          id="value"
                          type="number"
                          step={couponForm.type === "percent" ? "1" : "0.01"}
                          max={couponForm.type === "percent" ? "100" : undefined}
                          value={couponForm.value}
                          onChange={(e) => setCouponForm({ ...couponForm, value: e.target.value })}
                          placeholder={couponForm.type === "percent" ? "20" : "50.00"}
                          required
                          data-testid="input-coupon-value"
                        />
                      </div>
                      <div>
                        <Label htmlFor="minOrderAmount">Min Order (GHS)</Label>
                        <Input
                          id="minOrderAmount"
                          type="number"
                          step="0.01"
                          value={couponForm.minOrderAmount}
                          onChange={(e) => setCouponForm({ ...couponForm, minOrderAmount: e.target.value })}
                          placeholder="100.00"
                          data-testid="input-min-order"
                        />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="maxUses">Max Uses</Label>
                        <Input
                          id="maxUses"
                          type="number"
                          value={couponForm.maxUses}
                          onChange={(e) => setCouponForm({ ...couponForm, maxUses: e.target.value })}
                          placeholder="100"
                          data-testid="input-max-uses"
                        />
                      </div>
                      <div>
                        <Label htmlFor="expiresAt">Expires At</Label>
                        <Input
                          id="expiresAt"
                          type="date"
                          value={couponForm.expiresAt}
                          onChange={(e) => setCouponForm({ ...couponForm, expiresAt: e.target.value })}
                          data-testid="input-expires-at"
                        />
                      </div>
                    </div>
                    
                    <div className="flex justify-end space-x-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsModalOpen(false)}
                        data-testid="button-cancel-coupon"
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        disabled={createCouponMutation.isPending}
                        className="bg-green-600 hover:bg-green-700"
                        data-testid="button-save-coupon"
                      >
                        {createCouponMutation.isPending ? "Creating..." : "Create Coupon"}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* Search */}
          <Card className="bg-white border border-gray-200 mb-6">
            <CardContent className="p-6">
              <div className="max-w-md">
                <Label className="block text-sm font-medium text-gray-700 mb-1">Search Coupons</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    type="text"
                    placeholder="Search by code or name..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                    data-testid="input-search-coupons"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Coupons Table */}
          <Card className="bg-white shadow-sm border border-gray-200">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Coupon
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type & Value
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Usage
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Expires
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
                          <span className="ml-2 text-gray-500">Loading coupons...</span>
                        </div>
                      </td>
                    </tr>
                  ) : filteredCoupons.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center">
                        <Tags className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                        <p className="text-gray-500 text-lg">No coupons found</p>
                        <p className="text-gray-400 text-sm">
                          {searchQuery
                            ? "Try adjusting your search terms"
                            : "Create your first coupon to start offering discounts"
                          }
                        </p>
                      </td>
                    </tr>
                  ) : (
                    filteredCoupons.map((coupon: any) => {
                      const status = getCouponStatus(coupon);
                      
                      return (
                        <tr key={coupon.id} className="hover:bg-gray-50" data-testid={`coupon-row-${coupon.id}`}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-gray-900" data-testid={`coupon-code-${coupon.id}`}>
                                {coupon.code}
                              </div>
                              <div className="text-sm text-gray-500">{coupon.name}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {coupon.type === "percent" 
                                ? `${coupon.value}% off`
                                : `₵${parseFloat(coupon.value || "0").toFixed(2)} off`
                              }
                            </div>
                            {coupon.minOrderAmount && (
                              <div className="text-sm text-gray-500">
                                Min order: ₵{parseFloat(coupon.minOrderAmount).toFixed(2)}
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {coupon.usedCount || 0}
                            {coupon.maxUses && ` / ${coupon.maxUses}`}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <Badge className={status.color} data-testid={`coupon-status-${coupon.id}`}>
                              {status.text}
                            </Badge>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {coupon.expiresAt ? formatDate(coupon.expiresAt) : "No expiry"}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-blue-600 hover:text-blue-900 mr-2"
                              data-testid={`button-edit-coupon-${coupon.id}`}
                            >
                              <Edit className="h-4 w-4 mr-1" />
                              Edit
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteCoupon(coupon.id)}
                              className="text-red-600 hover:text-red-900"
                              disabled={deleteCouponMutation.isPending}
                              data-testid={`button-delete-coupon-${coupon.id}`}
                            >
                              <Trash2 className="h-4 w-4 mr-1" />
                              Delete
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
