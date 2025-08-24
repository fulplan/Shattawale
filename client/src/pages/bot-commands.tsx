import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Plus, Edit, Trash2, MessageSquare, Terminal } from "lucide-react";

export default function BotCommands() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [editingCommand, setEditingCommand] = useState<any>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [formData, setFormData] = useState({
    command: "",
    description: "",
    response: "",
    isActive: true
  });
  const { toast } = useToast();

  const { data: commands = [], isLoading } = useQuery({
    queryKey: ["/api/bot-commands"],
  });

  const commandsArray = (commands as any[]) || [];

  const createCommandMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/bot-commands", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bot-commands"] });
      setShowCreateDialog(false);
      setFormData({ command: "", description: "", response: "", isActive: true });
      toast({
        title: "Command created",
        description: "Bot command has been successfully created.",
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

  const updateCommandMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const response = await apiRequest("PUT", `/api/bot-commands/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bot-commands"] });
      setEditingCommand(null);
      toast({
        title: "Command updated",
        description: "Bot command has been successfully updated.",
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

  const deleteCommandMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest("DELETE", `/api/bot-commands/${id}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bot-commands"] });
      toast({
        title: "Command deleted",
        description: "Bot command has been successfully deleted.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Deletion failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingCommand) {
      updateCommandMutation.mutate({ id: editingCommand.id, data: formData });
    } else {
      createCommandMutation.mutate(formData);
    }
  };

  const handleEdit = (command: any) => {
    setEditingCommand(command);
    setFormData({
      command: command.command,
      description: command.description,
      response: command.response,
      isActive: command.isActive
    });
    setShowCreateDialog(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this command?")) {
      deleteCommandMutation.mutate(id);
    }
  };

  const resetForm = () => {
    setFormData({ command: "", description: "", response: "", isActive: true });
    setEditingCommand(null);
    setShowCreateDialog(false);
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

        <main className="py-8 px-4 sm:px-6 lg:px-8">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Bot Commands</h1>
              <p className="mt-2 text-gray-600">Manage custom commands for your Telegram bot</p>
            </div>
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button onClick={() => resetForm()} data-testid="button-create-command">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Command
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[525px]">
                <DialogHeader>
                  <DialogTitle>{editingCommand ? 'Edit Command' : 'Create New Command'}</DialogTitle>
                  <DialogDescription>
                    {editingCommand ? 'Update the bot command details.' : 'Add a new custom command for your Telegram bot.'}
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="command">Command</Label>
                    <Input
                      id="command"
                      placeholder="e.g., /help, /about, /support"
                      value={formData.command}
                      onChange={(e) => setFormData({ ...formData, command: e.target.value })}
                      required
                      data-testid="input-command"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Input
                      id="description"
                      placeholder="Brief description of what this command does"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      required
                      data-testid="input-description"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="response">Response Message</Label>
                    <Textarea
                      id="response"
                      placeholder="The message the bot will send when this command is used..."
                      value={formData.response}
                      onChange={(e) => setFormData({ ...formData, response: e.target.value })}
                      required
                      rows={4}
                      data-testid="textarea-response"
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="isActive"
                      checked={formData.isActive}
                      onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                      data-testid="switch-active"
                    />
                    <Label htmlFor="isActive">Active</Label>
                  </div>
                  <div className="flex justify-end space-x-2 pt-4">
                    <Button type="button" variant="outline" onClick={resetForm}>
                      Cancel
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={createCommandMutation.isPending || updateCommandMutation.isPending}
                      data-testid="button-save-command"
                    >
                      {editingCommand ? 'Update' : 'Create'} Command
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Terminal className="h-5 w-5 mr-2" />
                Custom Commands
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8">Loading commands...</div>
              ) : commandsArray.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <MessageSquare className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>No custom commands created yet.</p>
                  <p className="text-sm">Create your first command to get started!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {commandsArray.map((command: any) => (
                    <div key={command.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <code className="px-2 py-1 bg-gray-100 rounded text-sm font-mono">
                              {command.command}
                            </code>
                            <Badge variant={command.isActive ? "default" : "secondary"}>
                              {command.isActive ? "Active" : "Inactive"}
                            </Badge>
                          </div>
                          <h3 className="font-medium text-gray-900">{command.description}</h3>
                          <p className="text-sm text-gray-600 mt-1 max-w-2xl">
                            {command.response.length > 150 
                              ? `${command.response.substring(0, 150)}...` 
                              : command.response
                            }
                          </p>
                          <p className="text-xs text-gray-400 mt-2">
                            Created: {new Date(command.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex space-x-2 ml-4">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => handleEdit(command)}
                            data-testid={`button-edit-${command.id}`}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => handleDelete(command.id)}
                            className="text-red-600 hover:text-red-700"
                            data-testid={`button-delete-${command.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
}