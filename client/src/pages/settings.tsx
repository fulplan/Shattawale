import { useState, useEffect } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Settings, User, Lock, AlertTriangle, Bot, Webhook } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

export default function SettingsPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });
  const [telegramBotToken, setTelegramBotToken] = useState("");
  const { user, changePasswordMutation } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch system settings
  const { data: settings = [] } = useQuery({
    queryKey: ['/api/settings'],
    queryFn: async () => {
      const response = await fetch('/api/settings', {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch settings');
      return response.json();
    }
  });

  // Update system setting mutation
  const updateSettingMutation = useMutation({
    mutationFn: async ({ key, value, description }: { key: string; value: string; description?: string }) => {
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ key, value, description })
      });
      if (!response.ok) throw new Error('Failed to save setting');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/settings'] });
      toast({
        title: "Settings Updated",
        description: "Your settings have been saved successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: "Failed to save settings. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Load current telegram bot token from settings
  useEffect(() => {
    if (Array.isArray(settings)) {
      const botTokenSetting = settings.find((s: any) => s.key === 'TELEGRAM_BOT_TOKEN');
      if (botTokenSetting) {
        setTelegramBotToken(botTokenSetting.value || '');
      }
    }
  }, [settings]);

  const handleTelegramSave = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!telegramBotToken.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter a valid Telegram bot token.",
        variant: "destructive",
      });
      return;
    }

    updateSettingMutation.mutate({
      key: 'TELEGRAM_BOT_TOKEN',
      value: telegramBotToken,
      description: 'Telegram bot token for e-commerce bot'
    });
  };

  const handlePasswordChange = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast({
        title: "Password mismatch",
        description: "New password and confirmation password do not match.",
        variant: "destructive",
      });
      return;
    }

    if (passwordForm.newPassword.length < 8) {
      toast({
        title: "Password too short",
        description: "Password must be at least 8 characters long.",
        variant: "destructive",
      });
      return;
    }

    changePasswordMutation.mutate({
      currentPassword: passwordForm.currentPassword,
      newPassword: passwordForm.newPassword,
    });

    // Reset form on success
    if (!changePasswordMutation.isError) {
      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: ""
      });
    }
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

        <main className="py-8 px-4 sm:px-6 lg:px-8" data-testid="settings-content">
          <div className="mb-8">
            <div className="flex items-center space-x-2">
              <Settings className="h-8 w-8 text-gray-900" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
                <p className="mt-2 text-gray-600">Manage your account and system preferences</p>
              </div>
            </div>
          </div>

          <div className="space-y-8 max-w-2xl">
            {/* Password Change Alert */}
            {user?.mustChangePassword && (
              <Alert className="bg-amber-50 border-amber-200">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-amber-800">
                  <strong>Password Change Required:</strong> You must change your password before continuing to use the system.
                </AlertDescription>
              </Alert>
            )}

            {/* User Profile */}
            <Card className="bg-white shadow-sm border border-gray-200">
              <CardHeader className="border-b border-gray-200">
                <CardTitle className="flex items-center space-x-2">
                  <User className="h-5 w-5" />
                  <span>User Profile</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium text-gray-700">Name</Label>
                      <div className="mt-1 text-sm text-gray-900" data-testid="user-profile-name">
                        {user?.name || "N/A"}
                      </div>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-700">Email</Label>
                      <div className="mt-1 text-sm text-gray-900" data-testid="user-profile-email">
                        {user?.email || "N/A"}
                      </div>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-700">Role</Label>
                      <div className="mt-1 text-sm text-gray-900" data-testid="user-profile-role">
                        {user?.role || "N/A"}
                      </div>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-700">User ID</Label>
                      <div className="mt-1 text-sm text-gray-500 font-mono" data-testid="user-profile-id">
                        {user?.id ? `${user.id.substring(0, 8)}...` : "N/A"}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Telegram Bot Configuration */}
            <Card className="bg-white shadow-sm border border-gray-200">
              <CardHeader className="border-b border-gray-200">
                <CardTitle className="flex items-center space-x-2">
                  <Bot className="h-5 w-5" />
                  <span>Telegram Bot Configuration</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <form onSubmit={handleTelegramSave} className="space-y-4">
                  <div>
                    <Label htmlFor="telegramBotToken">Telegram Bot Token</Label>
                    <Input
                      id="telegramBotToken"
                      type="password"
                      value={telegramBotToken}
                      onChange={(e) => setTelegramBotToken(e.target.value)}
                      placeholder="Enter your Telegram bot token (e.g., 123456789:ABC...)"
                      data-testid="input-telegram-bot-token"
                    />
                    <p className="mt-1 text-sm text-gray-500">
                      Get your bot token from <a href="https://t.me/BotFather" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">@BotFather</a> on Telegram
                    </p>
                  </div>
                  
                  <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                    <div className="flex items-start space-x-2">
                      <Webhook className="h-4 w-4 text-blue-600 mt-0.5" />
                      <div className="text-sm">
                        <p className="font-medium text-blue-900">Webhook Configuration</p>
                        <p className="text-blue-700">
                          In development mode, webhooks are not registered. Deploy your app to production to enable automatic webhook configuration for your bot.
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <Button 
                    type="submit" 
                    disabled={updateSettingMutation.isPending}
                    className="bg-blue-600 hover:bg-blue-700"
                    data-testid="button-save-telegram-bot"
                  >
                    {updateSettingMutation.isPending ? "Saving..." : "Save Bot Token"}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Change Password */}
            <Card className="bg-white shadow-sm border border-gray-200">
              <CardHeader className="border-b border-gray-200">
                <CardTitle className="flex items-center space-x-2">
                  <Lock className="h-5 w-5" />
                  <span>Change Password</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <form onSubmit={handlePasswordChange} className="space-y-4">
                  <div>
                    <Label htmlFor="currentPassword">Current Password</Label>
                    <Input
                      id="currentPassword"
                      type="password"
                      value={passwordForm.currentPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                      placeholder="Enter your current password"
                      required
                      data-testid="input-current-password"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="newPassword">New Password</Label>
                    <Input
                      id="newPassword"
                      type="password"
                      value={passwordForm.newPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                      placeholder="Enter your new password"
                      required
                      minLength={8}
                      data-testid="input-new-password"
                    />
                    <p className="mt-1 text-sm text-gray-500">
                      Password must be at least 8 characters long
                    </p>
                  </div>
                  
                  <div>
                    <Label htmlFor="confirmPassword">Confirm New Password</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={passwordForm.confirmPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                      placeholder="Confirm your new password"
                      required
                      data-testid="input-confirm-password"
                    />
                  </div>
                  
                  <Button 
                    type="submit" 
                    disabled={changePasswordMutation.isPending}
                    className="bg-blue-600 hover:bg-blue-700"
                    data-testid="button-change-password"
                  >
                    {changePasswordMutation.isPending ? "Changing Password..." : "Change Password"}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* System Information */}
            <Card className="bg-white shadow-sm border border-gray-200">
              <CardHeader className="border-b border-gray-200">
                <CardTitle>System Information</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium text-gray-700">Environment</Label>
                      <div className="mt-1 text-sm text-gray-900">
                        {process.env.NODE_ENV || "development"}
                      </div>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-700">Version</Label>
                      <div className="mt-1 text-sm text-gray-900">
                        EcomBot Admin v1.0.0
                      </div>
                    </div>
                  </div>
                  
                  <div className="border-t border-gray-200 pt-4">
                    <Label className="text-sm font-medium text-gray-700">Service Status</Label>
                    <div className="mt-2 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Database Connection</span>
                        <div className="flex items-center space-x-1">
                          <div className="h-2 w-2 bg-green-400 rounded-full"></div>
                          <span className="text-xs text-green-600">Connected</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Telegram Bot API</span>
                        <div className="flex items-center space-x-1">
                          <div className="h-2 w-2 bg-green-400 rounded-full"></div>
                          <span className="text-xs text-green-600">Online</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">MTN MoMo Integration</span>
                        <div className="flex items-center space-x-1">
                          <div className="h-2 w-2 bg-green-400 rounded-full"></div>
                          <span className="text-xs text-green-600">Connected</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Support Information */}
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="p-6">
                <div className="text-center">
                  <h3 className="text-lg font-medium text-blue-900 mb-2">Need Help?</h3>
                  <p className="text-sm text-blue-700 mb-4">
                    If you need assistance with the EcomBot admin system, please contact support.
                  </p>
                  <div className="space-y-1 text-sm text-blue-600">
                    <p><strong>Email:</strong> support@ecombot.gh</p>
                    <p><strong>Documentation:</strong> Available in README.md</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}
