'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Settings,
  Palette,
  Users,
  Shield,
  Download,
  Upload,
  Copy,
  Save,
  RefreshCw,
  Trash2,
  Plus,
  Edit3,
  Eye,
  EyeOff
} from 'lucide-react';
import { CustomFieldEditor, type CustomField } from '../custom-fields';
import { MilestoneManager, type Milestone } from '../milestones';

interface BoardSettings {
  id: string;
  name: string;
  description?: string;
  color: string;
  is_private: boolean;
  allow_comments: boolean;
  auto_assign_cards: boolean;
  enable_time_tracking: boolean;
  enable_subtasks: boolean;
  enable_card_links: boolean;
  custom_fields: CustomField[];
  milestones: Milestone[];
  members: Array<{
    id: string;
    name: string;
    email: string;
    role: 'owner' | 'admin' | 'member' | 'viewer';
    avatar?: string;
  }>;
  activity_settings: {
    email_notifications: boolean;
    in_app_notifications: boolean;
    digest_frequency: 'never' | 'daily' | 'weekly';
  };
}

interface BoardSettingsProps {
  board: BoardSettings;
  isOpen: boolean;
  onClose: () => void;
  onUpdateBoard: (updates: Partial<BoardSettings>) => void;
  onExportBoard: (format: 'json' | 'csv') => void;
  onImportBoard: (data: any) => void;
  onDeleteBoard: () => void;
  onInviteMember: (email: string, role: 'admin' | 'member' | 'viewer') => void;
  onUpdateMemberRole: (memberId: string, role: 'admin' | 'member' | 'viewer') => void;
  onRemoveMember: (memberId: string) => void;
}

const boardColors = [
  '#3b82f6', // blue
  '#10b981', // green
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // violet
  '#06b6d4', // cyan
  '#f97316', // orange
  '#84cc16', // lime
  '#ec4899', // pink
  '#6b7280', // gray
];

const roleLabels = {
  owner: 'Owner',
  admin: 'Admin',
  member: 'Member',
  viewer: 'Viewer',
};

const roleDescriptions = {
  owner: 'Full access including board deletion',
  admin: 'Can manage board settings and members',
  member: 'Can create and edit cards',
  viewer: 'Can only view board content',
};

export function BoardSettings({
  board,
  isOpen,
  onClose,
  onUpdateBoard,
  onExportBoard,
  onImportBoard,
  onDeleteBoard,
  onInviteMember,
  onUpdateMemberRole,
  onRemoveMember,
}: BoardSettingsProps) {
  const [activeTab, setActiveTab] = useState('general');
  const [editedBoard, setEditedBoard] = useState<Partial<BoardSettings>>(board);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'member' | 'viewer'>('member');

  const handleSave = () => {
    onUpdateBoard(editedBoard);
  };

  const handleInviteMember = () => {
    if (!inviteEmail.trim()) return;
    onInviteMember(inviteEmail, inviteRole);
    setInviteEmail('');
    setInviteRole('member');
    setIsInviteDialogOpen(false);
  };

  const handleFeatureToggle = (feature: string, enabled: boolean) => {
    setEditedBoard(prev => ({ ...prev, [feature]: enabled }));
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center">
            <Settings className="w-5 h-5 mr-2" />
            Board Settings
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
            <TabsList className="flex-shrink-0 grid w-full grid-cols-5">
              <TabsTrigger value="general">General</TabsTrigger>
              <TabsTrigger value="features">Features</TabsTrigger>
              <TabsTrigger value="fields">Custom Fields</TabsTrigger>
              <TabsTrigger value="milestones">Milestones</TabsTrigger>
              <TabsTrigger value="members">Members</TabsTrigger>
            </TabsList>

            <div className="flex-1 overflow-y-auto pt-4">
              <TabsContent value="general" className="space-y-6 mt-0">
                <Card>
                  <CardHeader>
                    <CardTitle>Basic Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="boardName">Board Name</Label>
                      <Input
                        id="boardName"
                        value={editedBoard.name || ''}
                        onChange={(e) => setEditedBoard({ ...editedBoard, name: e.target.value })}
                        placeholder="Enter board name"
                      />
                    </div>
                    <div>
                      <Label htmlFor="boardDescription">Description</Label>
                      <Textarea
                        id="boardDescription"
                        value={editedBoard.description || ''}
                        onChange={(e) => setEditedBoard({ ...editedBoard, description: e.target.value })}
                        placeholder="Describe your board"
                        rows={3}
                      />
                    </div>
                    <div>
                      <Label>Board Color</Label>
                      <div className="flex items-center space-x-2 mt-2">
                        {boardColors.map((color) => (
                          <button
                            key={color}
                            type="button"
                            className={`w-8 h-8 rounded-full border-2 ${
                              editedBoard.color === color ? 'border-gray-400' : 'border-gray-200'
                            }`}
                            style={{ backgroundColor: color }}
                            onClick={() => setEditedBoard({ ...editedBoard, color })}
                          />
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Privacy & Permissions</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-base">Private Board</Label>
                        <p className="text-sm text-gray-600">Only invited members can view this board</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={editedBoard.is_private || false}
                        onChange={(e) => setEditedBoard({ ...editedBoard, is_private: e.target.checked })}
                        className="w-4 h-4 rounded"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-base">Allow Comments</Label>
                        <p className="text-sm text-gray-600">Members can comment on cards</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={editedBoard.allow_comments || false}
                        onChange={(e) => setEditedBoard({ ...editedBoard, allow_comments: e.target.checked })}
                        className="w-4 h-4 rounded"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-base">Auto-assign Cards</Label>
                        <p className="text-sm text-gray-600">Automatically assign new cards to their creator</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={editedBoard.auto_assign_cards || false}
                        onChange={(e) => setEditedBoard({ ...editedBoard, auto_assign_cards: e.target.checked })}
                        className="w-4 h-4 rounded"
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Notification Settings</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-base">Email Notifications</Label>
                        <p className="text-sm text-gray-600">Send email updates for board activity</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={editedBoard.activity_settings?.email_notifications || false}
                        onChange={(e) => setEditedBoard({
                          ...editedBoard,
                          activity_settings: {
                            ...editedBoard.activity_settings!,
                            email_notifications: e.target.checked,
                          },
                        })}
                        className="w-4 h-4 rounded"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-base">In-app Notifications</Label>
                        <p className="text-sm text-gray-600">Show notifications in the application</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={editedBoard.activity_settings?.in_app_notifications || false}
                        onChange={(e) => setEditedBoard({
                          ...editedBoard,
                          activity_settings: {
                            ...editedBoard.activity_settings!,
                            in_app_notifications: e.target.checked,
                          },
                        })}
                        className="w-4 h-4 rounded"
                      />
                    </div>
                    <div>
                      <Label htmlFor="digestFrequency">Digest Frequency</Label>
                      <select
                        id="digestFrequency"
                        value={editedBoard.activity_settings?.digest_frequency || 'weekly'}
                        onChange={(e) => setEditedBoard({
                          ...editedBoard,
                          activity_settings: {
                            ...editedBoard.activity_settings!,
                            digest_frequency: e.target.value as 'never' | 'daily' | 'weekly',
                          },
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md mt-1"
                      >
                        <option value="never">Never</option>
                        <option value="daily">Daily</option>
                        <option value="weekly">Weekly</option>
                      </select>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-red-600">Danger Zone</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between p-4 border border-red-200 rounded-lg bg-red-50">
                      <div>
                        <h4 className="font-medium text-red-800">Delete Board</h4>
                        <p className="text-sm text-red-600">
                          Permanently delete this board and all its data. This cannot be undone.
                        </p>
                      </div>
                      <Button
                        variant="destructive"
                        onClick={() => setIsDeleteDialogOpen(true)}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete Board
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="features" className="space-y-6 mt-0">
                <Card>
                  <CardHeader>
                    <CardTitle>Feature Controls</CardTitle>
                    <p className="text-sm text-gray-600">
                      Enable or disable specific features for this board
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <h4 className="font-medium">Time Tracking</h4>
                        <p className="text-sm text-gray-600">
                          Allow time tracking on cards with timers and reports
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        checked={editedBoard.enable_time_tracking || false}
                        onChange={(e) => handleFeatureToggle('enable_time_tracking', e.target.checked)}
                        className="w-4 h-4 rounded"
                      />
                    </div>

                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <h4 className="font-medium">Subtasks</h4>
                        <p className="text-sm text-gray-600">
                          Enable hierarchical subtasks within cards
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        checked={editedBoard.enable_subtasks || false}
                        onChange={(e) => handleFeatureToggle('enable_subtasks', e.target.checked)}
                        className="w-4 h-4 rounded"
                      />
                    </div>

                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <h4 className="font-medium">Card Links</h4>
                        <p className="text-sm text-gray-600">
                          Allow linking cards to show relationships and dependencies
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        checked={editedBoard.enable_card_links || false}
                        onChange={(e) => handleFeatureToggle('enable_card_links', e.target.checked)}
                        className="w-4 h-4 rounded"
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Data Management</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center space-x-3">
                      <Button
                        variant="outline"
                        onClick={() => onExportBoard('json')}
                        className="flex-1"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Export as JSON
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => onExportBoard('csv')}
                        className="flex-1"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Export as CSV
                      </Button>
                      <Button variant="outline" className="flex-1">
                        <Upload className="w-4 h-4 mr-2" />
                        Import Data
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="fields" className="mt-0">
                <CustomFieldEditor
                  boardId={board.id}
                  fields={editedBoard.custom_fields || []}
                  onCreateField={(field) => {
                    const newFields = [...(editedBoard.custom_fields || []), { ...field, id: Date.now().toString() }];
                    setEditedBoard({ ...editedBoard, custom_fields: newFields });
                  }}
                  onUpdateField={(fieldId, updates) => {
                    const updatedFields = (editedBoard.custom_fields || []).map(field =>
                      field.id === fieldId ? { ...field, ...updates } : field
                    );
                    setEditedBoard({ ...editedBoard, custom_fields: updatedFields });
                  }}
                  onDeleteField={(fieldId) => {
                    const filteredFields = (editedBoard.custom_fields || []).filter(field => field.id !== fieldId);
                    setEditedBoard({ ...editedBoard, custom_fields: filteredFields });
                  }}
                />
              </TabsContent>

              <TabsContent value="milestones" className="mt-0">
                <MilestoneManager
                  boardId={board.id}
                  milestones={editedBoard.milestones || []}
                  onCreateMilestone={(milestone) => {
                    const newMilestones = [...(editedBoard.milestones || []), { ...milestone, id: Date.now().toString() }];
                    setEditedBoard({ ...editedBoard, milestones: newMilestones });
                  }}
                  onUpdateMilestone={(milestoneId, updates) => {
                    const updatedMilestones = (editedBoard.milestones || []).map(milestone =>
                      milestone.id === milestoneId ? { ...milestone, ...updates } : milestone
                    );
                    setEditedBoard({ ...editedBoard, milestones: updatedMilestones });
                  }}
                  onDeleteMilestone={(milestoneId) => {
                    const filteredMilestones = (editedBoard.milestones || []).filter(milestone => milestone.id !== milestoneId);
                    setEditedBoard({ ...editedBoard, milestones: filteredMilestones });
                  }}
                  onCompleteMilestone={(milestoneId, isCompleted) => {
                    const updatedMilestones = (editedBoard.milestones || []).map(milestone =>
                      milestone.id === milestoneId
                        ? {
                            ...milestone,
                            is_completed: isCompleted,
                            completion_date: isCompleted ? new Date().toISOString().split('T')[0] : undefined,
                          }
                        : milestone
                    );
                    setEditedBoard({ ...editedBoard, milestones: updatedMilestones });
                  }}
                />
              </TabsContent>

              <TabsContent value="members" className="space-y-6 mt-0">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>Board Members ({board.members.length})</CardTitle>
                      <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
                        <DialogTrigger asChild>
                          <Button>
                            <Plus className="w-4 h-4 mr-2" />
                            Invite Member
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Invite Member</DialogTitle>
                            <DialogDescription>
                              Invite someone to collaborate on this board
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div>
                              <Label htmlFor="inviteEmail">Email Address</Label>
                              <Input
                                id="inviteEmail"
                                type="email"
                                placeholder="Enter email address"
                                value={inviteEmail}
                                onChange={(e) => setInviteEmail(e.target.value)}
                              />
                            </div>
                            <div>
                              <Label htmlFor="inviteRole">Role</Label>
                              <select
                                id="inviteRole"
                                value={inviteRole}
                                onChange={(e) => setInviteRole(e.target.value as 'admin' | 'member' | 'viewer')}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                              >
                                <option value="viewer">Viewer - {roleDescriptions.viewer}</option>
                                <option value="member">Member - {roleDescriptions.member}</option>
                                <option value="admin">Admin - {roleDescriptions.admin}</option>
                              </select>
                            </div>
                          </div>
                          <DialogFooter>
                            <Button variant="outline" onClick={() => setIsInviteDialogOpen(false)}>
                              Cancel
                            </Button>
                            <Button onClick={handleInviteMember} disabled={!inviteEmail.trim()}>
                              Send Invitation
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {board.members.map((member) => (
                        <div
                          key={member.id}
                          className="flex items-center justify-between p-3 border rounded-lg"
                        >
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                              {member.avatar ? (
                                <img
                                  src={member.avatar}
                                  alt={member.name}
                                  className="w-full h-full rounded-full object-cover"
                                />
                              ) : (
                                <span className="text-sm font-medium text-gray-600">
                                  {member.name.charAt(0).toUpperCase()}
                                </span>
                              )}
                            </div>
                            <div>
                              <h4 className="font-medium">{member.name}</h4>
                              <p className="text-sm text-gray-600">{member.email}</p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-3">
                            <Badge variant={member.role === 'owner' ? 'default' : 'outline'}>
                              {roleLabels[member.role]}
                            </Badge>
                            {member.role !== 'owner' && (
                              <div className="flex items-center space-x-1">
                                <select
                                  value={member.role}
                                  onChange={(e) => onUpdateMemberRole(member.id, e.target.value as any)}
                                  className="text-sm px-2 py-1 border rounded"
                                >
                                  <option value="viewer">Viewer</option>
                                  <option value="member">Member</option>
                                  <option value="admin">Admin</option>
                                </select>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => onRemoveMember(member.id)}
                                  className="text-red-600 hover:text-red-700"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </div>
          </Tabs>
        </div>

        <DialogFooter className="flex-shrink-0">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            <Save className="w-4 h-4 mr-2" />
            Save Changes
          </Button>
        </DialogFooter>

        {/* Delete Confirmation Dialog */}
        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="text-red-600">Delete Board</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete "{board.name}"? This action cannot be undone and will
                permanently delete all cards, comments, and attachments.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  onDeleteBoard();
                  setIsDeleteDialogOpen(false);
                  onClose();
                }}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Board
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
}