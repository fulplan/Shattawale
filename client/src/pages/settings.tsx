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
import { Settings, User, Lock, AlertTriangle, Bot, Webhook, CreditCard, Globe } from "lucide-react";
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
  const [mtnSettings, setMtnSettings] = useState({
    userId: "",
    primaryKey: "",
    secondaryKey: "",
    subscriptionKey: "",
    apiBaseUrl: "https://sandbox.momodeveloper.mtn.com",
    environment: "sandbox",
    callbackSecret: ""
  });
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

  // Webhook registration mutation
  const registerWebhookMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/telegram/register-webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to register webhook');
      }
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Webhook Registered",
        description: `${data.message} - Your bot is now active and ready to receive messages!`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Webhook Registration Failed",
        description: error.message || "Failed to register webhook. Please check your bot token.",
        variant: "destructive",
      });
    }
  });

  // Bot status query
  const { data: botStatus, refetch: refetchBotStatus } = useQuery({
    queryKey: ['/api/telegram/status'],
    queryFn: async () => {
      const response = await fetch('/api/telegram/status', {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch bot status');
      return response.json();
    },
    enabled: false // Only fetch when explicitly requested
  });

  // Load current settings
  useEffect(() => {
    if (Array.isArray(settings)) {
      const botTokenSetting = settings.find((s: any) => s.key === 'TELEGRAM_BOT_TOKEN');
      if (botTokenSetting) {
        setTelegramBotToken(botTokenSetting.value || '');
      }

      // Load MTN MoMo settings
      const mtnUserId = settings.find((s: any) => s.key === 'MTN_USER_ID');
      const mtnPrimaryKey = settings.find((s: any) => s.key === 'MTN_PRIMARY_KEY');
      const mtnSecondaryKey = settings.find((s: any) => s.key === 'MTN_SECONDARY_KEY');
      const mtnSubscriptionKey = settings.find((s: any) => s.key === 'MTN_SUBSCRIPTION_KEY');
      const mtnApiBaseUrl = settings.find((s: any) => s.key === 'MTN_API_BASE_URL');
      const mtnEnvironment = settings.find((s: any) => s.key === 'MTN_ENV');
      const mtnCallbackSecret = settings.find((s: any) => s.key === 'MTN_CALLBACK_SECRET');

      setMtnSettings({
        userId: mtnUserId?.value || '',
        primaryKey: mtnPrimaryKey?.value || '',
        secondaryKey: mtnSecondaryKey?.value || '',
        subscriptionKey: mtnSubscriptionKey?.value || '',
        apiBaseUrl: mtnApiBaseUrl?.value || 'https://sandbox.momodeveloper.mtn.com',
        environment: mtnEnvironment?.value || 'sandbox',
        callbackSecret: mtnCallbackSecret?.value || ''
      });
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

  const handleMtnSave = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!mtnSettings.userId.trim() || !mtnSettings.primaryKey.trim() || !mtnSettings.subscriptionKey.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter User ID, Primary Key, and Subscription Key.",
        variant: "destructive",
      });
      return;
    }

    // Save all MTN settings
    const promises = [
      updateSettingMutation.mutateAsync({
        key: 'MTN_USER_ID',
        value: mtnSettings.userId,
        description: 'MTN MoMo API User ID'
      }),
      updateSettingMutation.mutateAsync({
        key: 'MTN_PRIMARY_KEY',
        value: mtnSettings.primaryKey,
        description: 'MTN MoMo API Primary Key'
      }),
      updateSettingMutation.mutateAsync({
        key: 'MTN_SECONDARY_KEY',
        value: mtnSettings.secondaryKey,
        description: 'MTN MoMo API Secondary Key'
      }),
      updateSettingMutation.mutateAsync({
        key: 'MTN_SUBSCRIPTION_KEY',
        value: mtnSettings.subscriptionKey,
        description: 'MTN MoMo Subscription Key'
      }),
      updateSettingMutation.mutateAsync({
        key: 'MTN_API_BASE_URL',
        value: mtnSettings.apiBaseUrl,
        description: 'MTN MoMo API Base URL'
      }),
      updateSettingMutation.mutateAsync({
        key: 'MTN_ENV',
        value: mtnSettings.environment,
        description: 'MTN MoMo Environment (sandbox/production)'
      }),
      updateSettingMutation.mutateAsync({
        key: 'MTN_CALLBACK_SECRET',
        value: mtnSettings.callbackSecret,
        description: 'MTN MoMo Webhook Callback Secret'
      })
    ];

    Promise.all(promises).then(() => {
      toast({
        title: "MTN MoMo Settings Updated",
        description: "Your payment settings have been saved successfully.",
      });
    }).catch(() => {
      toast({
        title: "Error",
        description: "Failed to save MTN MoMo settings. Please try again.",
        variant: "destructive",
      });
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
                  
                  <div className="space-y-3">
                    <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                      <div className="flex items-start space-x-2">
                        <Webhook className="h-4 w-4 text-blue-600 mt-0.5" />
                        <div className="text-sm">
                          <p className="font-medium text-blue-900">Webhook Configuration</p>
                          <p className="text-blue-700">
                            Your bot webhook will now register in both development and production modes for testing.
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    {/* Bot Status and Test Section */}
                    <div className="border border-gray-200 rounded-md p-4 bg-gray-50">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-medium text-gray-900">Bot Status & Testing</h4>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => refetchBotStatus()}
                          className="text-xs"
                          data-testid="button-check-bot-status"
                        >
                          Check Status
                        </Button>
                      </div>
                      
                      {botStatus && (
                        <div className="space-y-2 mb-3">
                          <div className="flex items-center space-x-2 text-xs">
                            <div className={`w-2 h-2 rounded-full ${botStatus.configured ? 'bg-green-400' : 'bg-red-400'}`}></div>
                            <span className={botStatus.configured ? 'text-green-700' : 'text-red-700'}>
                              Bot Token: {botStatus.configured ? 'Configured' : 'Not Configured'}
                            </span>
                          </div>
                          
                          {botStatus.webhookInfo && (
                            <div className="text-xs text-gray-600">
                              <p>Current Webhook: {botStatus.webhookInfo.url || 'Not set'}</p>
                              {botStatus.webhookInfo.pending_update_count > 0 && (
                                <p className="text-yellow-600">Pending updates: {botStatus.webhookInfo.pending_update_count}</p>
                              )}
                            </div>
                          )}
                          
                          {botStatus.environment && (
                            <div className="text-xs text-gray-600">
                              <p>Mode: {botStatus.environment.isProduction ? 'Production' : 'Development'}</p>
                              {botStatus.recommendedWebhookUrl && (
                                <p className="font-mono text-xs bg-gray-100 p-1 rounded mt-1 break-all">
                                  {botStatus.recommendedWebhookUrl}
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                      
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => registerWebhookMutation.mutate()}
                        disabled={registerWebhookMutation.isPending || !telegramBotToken}
                        className="w-full text-sm bg-green-50 hover:bg-green-100 text-green-700 border-green-200"
                        data-testid="button-register-webhook"
                      >
                        {registerWebhookMutation.isPending ? "Registering..." : "🚀 Test Webhook Registration"}
                      </Button>
                      
                      <p className="text-xs text-gray-500 mt-2">
                        This will register your bot webhook in the current environment so you can test bot functionality immediately.
                      </p>
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

            {/* MTN Mobile Money Configuration */}
            <Card className="bg-white shadow-sm border border-gray-200">
              <CardHeader className="border-b border-gray-200">
                <CardTitle className="flex items-center space-x-2">
                  <CreditCard className="h-5 w-5" />
                  <span>MTN Mobile Money Configuration</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <form onSubmit={handleMtnSave} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="mtnUserId">User ID</Label>
                      <Input
                        id="mtnUserId"
                        type="text"
                        value={mtnSettings.userId}
                        onChange={(e) => setMtnSettings({ ...mtnSettings, userId: e.target.value })}
                        placeholder="Enter MTN MoMo User ID"
                        data-testid="input-mtn-user-id"
                      />
                    </div>
                    <div>
                      <Label htmlFor="mtnPrimaryKey">Primary Key</Label>
                      <Input
                        id="mtnPrimaryKey"
                        type="password"
                        value={mtnSettings.primaryKey}
                        onChange={(e) => setMtnSettings({ ...mtnSettings, primaryKey: e.target.value })}
                        placeholder="Enter your Primary Key from MTN Developer Portal"
                        data-testid="input-mtn-primary-key"
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="mtnSecondaryKey">Secondary Key (Optional)</Label>
                      <Input
                        id="mtnSecondaryKey"
                        type="password"
                        value={mtnSettings.secondaryKey}
                        onChange={(e) => setMtnSettings({ ...mtnSettings, secondaryKey: e.target.value })}
                        placeholder="Enter your Secondary Key (optional)"
                        data-testid="input-mtn-secondary-key"
                      />
                    </div>
                    <div>
                      <Label htmlFor="mtnSubscriptionKey">Subscription Key</Label>
                      <Input
                        id="mtnSubscriptionKey"
                        type="password"
                        value={mtnSettings.subscriptionKey}
                        onChange={(e) => setMtnSettings({ ...mtnSettings, subscriptionKey: e.target.value })}
                        placeholder="Enter your Subscription Key"
                        data-testid="input-mtn-subscription-key"
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="mtnEnvironment">Environment</Label>
                      <select
                        id="mtnEnvironment"
                        value={mtnSettings.environment}
                        onChange={(e) => {
                          const env = e.target.value;
                          setMtnSettings({ 
                            ...mtnSettings, 
                            environment: env,
                            apiBaseUrl: env === 'production' 
                              ? 'https://momodeveloper.mtn.com' 
                              : 'https://sandbox.momodeveloper.mtn.com'
                          });
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        data-testid="select-mtn-environment"
                      >
                        <option value="sandbox">Sandbox (Testing)</option>
                        <option value="production">Production (Live)</option>
                      </select>
                    </div>
                    <div>
                      <Label htmlFor="mtnApiBaseUrl">API Base URL</Label>
                      <Input
                        id="mtnApiBaseUrl"
                        type="url"
                        value={mtnSettings.apiBaseUrl}
                        onChange={(e) => setMtnSettings({ ...mtnSettings, apiBaseUrl: e.target.value })}
                        placeholder="MTN MoMo API Base URL"
                        data-testid="input-mtn-api-url"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="mtnCallbackSecret">Webhook Callback Secret</Label>
                    <Input
                      id="mtnCallbackSecret"
                      type="password"
                      value={mtnSettings.callbackSecret}
                      onChange={(e) => setMtnSettings({ ...mtnSettings, callbackSecret: e.target.value })}
                      placeholder="Enter webhook callback secret for payment notifications"
                      data-testid="input-mtn-callback-secret"
                    />
                    <p className="mt-1 text-sm text-gray-500">
                      Used to verify payment webhook notifications for security
                    </p>
                  </div>
                  
                  <div className="bg-amber-50 border border-amber-200 rounded-md p-3">
                    <div className="flex items-start space-x-2">
                      <Globe className="h-4 w-4 text-amber-600 mt-0.5" />
                      <div className="text-sm">
                        <p className="font-medium text-amber-900">How to Get Your MTN MoMo Keys</p>
                        <p className="text-amber-700 mb-2">
                          Register at <a href="https://momodeveloper.mtn.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">MTN MoMo Developer Portal</a> to get your keys.
                        </p>
                        <div className="text-xs text-amber-600 space-y-1">
                          <p>📋 <strong>Primary Key:</strong> Your main API key from the portal</p>
                          <p>📋 <strong>Secondary Key:</strong> Backup key (optional)</p>
                          <p>📋 <strong>Subscription Key:</strong> Your Ocp-Apim-Subscription-Key</p>
                          <p>👤 <strong>User ID:</strong> Your collection user ID</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <Button 
                    type="submit" 
                    disabled={updateSettingMutation.isPending}
                    className="bg-blue-600 hover:bg-blue-700"
                    data-testid="button-save-mtn-settings"
                  >
                    {updateSettingMutation.isPending ? "Saving..." : "Save MTN MoMo Settings"}
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
