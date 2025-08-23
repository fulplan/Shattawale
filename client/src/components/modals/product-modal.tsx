import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { CloudUpload } from "lucide-react";

interface ProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  product?: any;
  categories: any[];
}

export function ProductModal({ isOpen, onClose, product, categories }: ProductModalProps) {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    title: "",
    sku: "",
    description: "",
    priceGhs: "",
    stock: "",
    categoryId: "",
    isActive: true,
    images: [] as string[],
    tags: [] as string[],
  });

  useEffect(() => {
    if (product) {
      setFormData({
        title: product.title || "",
        sku: product.sku || "",
        description: product.description || "",
        priceGhs: product.priceGhs || "",
        stock: product.stock?.toString() || "",
        categoryId: product.categoryId || "",
        isActive: product.isActive ?? true,
        images: product.images || [],
        tags: product.tags || [],
      });
    } else {
      setFormData({
        title: "",
        sku: "",
        description: "",
        priceGhs: "",
        stock: "",
        categoryId: "",
        isActive: true,
        images: [],
        tags: [],
      });
    }
  }, [product]);

  const createProductMutation = useMutation({
    mutationFn: async (productData: any) => {
      const response = await apiRequest("POST", "/api/products", productData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      onClose();
      toast({
        title: "Product created",
        description: "Product has been successfully created.",
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

  const updateProductMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const response = await apiRequest("PUT", `/api/products/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      onClose();
      toast({
        title: "Product updated",
        description: "Product has been successfully updated.",
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const submitData = {
      ...formData,
      priceGhs: parseFloat(formData.priceGhs),
      stock: parseInt(formData.stock),
    };

    if (product) {
      updateProductMutation.mutate({ id: product.id, data: submitData });
    } else {
      createProductMutation.mutate(submitData);
    }
  };

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const isLoading = createProductMutation.isPending || updateProductMutation.isPending;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {product ? "Edit Product" : "Add New Product"}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="title">Product Name *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => handleChange("title", e.target.value)}
                placeholder="Enter product name"
                required
                data-testid="input-product-title"
              />
            </div>
            <div>
              <Label htmlFor="sku">SKU *</Label>
              <Input
                id="sku"
                value={formData.sku}
                onChange={(e) => handleChange("sku", e.target.value)}
                placeholder="Enter SKU"
                required
                data-testid="input-product-sku"
              />
            </div>
          </div>
          
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleChange("description", e.target.value)}
              placeholder="Enter product description"
              rows={3}
              data-testid="input-product-description"
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <Label htmlFor="priceGhs">Price (GHS) *</Label>
              <Input
                id="priceGhs"
                type="number"
                step="0.01"
                min="0"
                value={formData.priceGhs}
                onChange={(e) => handleChange("priceGhs", e.target.value)}
                placeholder="0.00"
                required
                data-testid="input-product-price"
              />
            </div>
            <div>
              <Label htmlFor="stock">Stock Quantity *</Label>
              <Input
                id="stock"
                type="number"
                min="0"
                value={formData.stock}
                onChange={(e) => handleChange("stock", e.target.value)}
                placeholder="0"
                required
                data-testid="input-product-stock"
              />
            </div>
            <div>
              <Label htmlFor="category">Category</Label>
              <Select value={formData.categoryId} onValueChange={(value) => handleChange("categoryId", value)}>
                <SelectTrigger data-testid="select-product-category">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No category</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div>
            <Label>Product Images</Label>
            <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg">
              <div className="space-y-1 text-center">
                <CloudUpload className="mx-auto h-12 w-12 text-gray-400" />
                <div className="flex text-sm text-gray-600">
                  <label htmlFor="file-upload" className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500">
                    <span>Upload files</span>
                    <input
                      id="file-upload"
                      name="file-upload"
                      type="file"
                      className="sr-only"
                      multiple
                      accept="image/*"
                      data-testid="input-product-images"
                    />
                  </label>
                  <p className="pl-1">or drag and drop</p>
                </div>
                <p className="text-xs text-gray-500">PNG, JPG, GIF up to 10MB</p>
              </div>
            </div>
          </div>
          
          <div className="flex justify-end space-x-2 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
              data-testid="button-cancel-product"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="bg-blue-600 hover:bg-blue-700"
              data-testid="button-save-product"
            >
              {isLoading 
                ? (product ? "Updating..." : "Creating...") 
                : (product ? "Update Product" : "Save Product")
              }
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
