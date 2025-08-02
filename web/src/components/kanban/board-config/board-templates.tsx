'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
  Copy,
  Plus,
  Star,
  Bookmark,
  Settings,
  Eye,
  Download,
  Upload,
  Trash2,
  Edit3,
  CheckCircle2,
  Clock,
  Users,
  Target,
  Zap
} from 'lucide-react';

interface BoardTemplate {
  id: string;
  name: string;
  description: string;
  category: 'personal' | 'team' | 'project' | 'custom';
  is_favorite: boolean;
  usage_count: number;
  created_at: string;
  preview_image?: string;
  columns: Array<{
    name: string;
    color: string;
  }>;
  custom_fields: Array<{
    name: string;
    field_type: string;
    is_required: boolean;
  }>;
  milestones: Array<{
    name: string;
    color: string;
  }>;
  sample_cards: Array<{
    title: string;
    description: string;
    column: string;
    priority: string;
  }>;
  settings: {
    enable_time_tracking: boolean;
    enable_subtasks: boolean;
    enable_card_links: boolean;
    allow_comments: boolean;
  };
}

interface BoardTemplatesProps {
  templates: BoardTemplate[];
  onCreateFromTemplate: (templateId: string, boardName: string) => void;
  onSaveAsTemplate: (boardId: string, templateName: string, description: string) => void;
  onDeleteTemplate: (templateId: string) => void;
  onToggleFavorite: (templateId: string, isFavorite: boolean) => void;
}

const predefinedTemplates: BoardTemplate[] = [
  {
    id: 'agile-scrum',
    name: 'Agile Scrum Board',
    description: 'Standard Scrum board with backlog, sprint planning, and review columns',
    category: 'team',
    is_favorite: false,
    usage_count: 1250,
    created_at: '2024-01-01',
    columns: [
      { name: 'Backlog', color: '#6b7280' },
      { name: 'Sprint Planning', color: '#3b82f6' },
      { name: 'In Progress', color: '#f59e0b' },
      { name: 'Review', color: '#8b5cf6' },
      { name: 'Done', color: '#10b981' },
    ],
    custom_fields: [
      { name: 'Story Points', field_type: 'number', is_required: true },
      { name: 'Sprint', field_type: 'dropdown', is_required: false },
      { name: 'Epic', field_type: 'text', is_required: false },
    ],
    milestones: [
      { name: 'Sprint 1', color: '#3b82f6' },
      { name: 'Sprint 2', color: '#10b981' },
      { name: 'Release', color: '#ef4444' },
    ],
    sample_cards: [
      {
        title: 'User Authentication',
        description: 'Implement user login and registration system',
        column: 'Backlog',
        priority: 'high',
      },
      {
        title: 'Dashboard Design',
        description: 'Create responsive dashboard layout',
        column: 'Sprint Planning',
        priority: 'medium',
      },
    ],
    settings: {
      enable_time_tracking: true,
      enable_subtasks: true,
      enable_card_links: true,
      allow_comments: true,
    },
  },
  {
    id: 'marketing-campaign',
    name: 'Marketing Campaign',
    description: 'Track marketing campaigns from ideation to execution and analysis',
    category: 'team',
    is_favorite: false,
    usage_count: 890,
    created_at: '2024-01-01',
    columns: [
      { name: 'Ideas', color: '#8b5cf6' },
      { name: 'Planning', color: '#3b82f6' },
      { name: 'Content Creation', color: '#f59e0b' },
      { name: 'Review & Approval', color: '#ef4444' },
      { name: 'Live', color: '#10b981' },
      { name: 'Analysis', color: '#6b7280' },
    ],
    custom_fields: [
      { name: 'Budget', field_type: 'number', is_required: true },
      { name: 'Channel', field_type: 'dropdown', is_required: true },
      { name: 'Target Audience', field_type: 'text', is_required: false },
      { name: 'Campaign Type', field_type: 'dropdown', is_required: true },
    ],
    milestones: [
      { name: 'Campaign Launch', color: '#10b981' },
      { name: 'Mid-Campaign Review', color: '#f59e0b' },
      { name: 'Campaign End', color: '#ef4444' },
    ],
    sample_cards: [
      {
        title: 'Q1 Product Launch Campaign',
        description: 'Multi-channel campaign for new product launch',
        column: 'Planning',
        priority: 'high',
      },
      {
        title: 'Social Media Content Calendar',
        description: 'Create content calendar for social media posts',
        column: 'Content Creation',
        priority: 'medium',
      },
    ],
    settings: {
      enable_time_tracking: true,
      enable_subtasks: true,
      enable_card_links: false,
      allow_comments: true,
    },
  },
  {
    id: 'personal-gtd',
    name: 'Personal GTD (Getting Things Done)',
    description: 'Personal productivity system based on David Allen\'s GTD methodology',
    category: 'personal',
    is_favorite: false,
    usage_count: 2100,
    created_at: '2024-01-01',
    columns: [
      { name: 'Inbox', color: '#6b7280' },
      { name: 'Next Actions', color: '#3b82f6' },
      { name: 'Waiting For', color: '#f59e0b' },
      { name: 'Someday/Maybe', color: '#8b5cf6' },
      { name: 'Done', color: '#10b981' },
    ],
    custom_fields: [
      { name: 'Context', field_type: 'dropdown', is_required: false },
      { name: 'Energy Level', field_type: 'dropdown', is_required: false },
      { name: 'Time Required', field_type: 'number', is_required: false },
    ],
    milestones: [
      { name: 'Weekly Review', color: '#3b82f6' },
      { name: 'Monthly Goals', color: '#10b981' },
      { name: 'Quarterly Review', color: '#ef4444' },
    ],
    sample_cards: [
      {
        title: 'Review and organize email inbox',
        description: 'Process all emails and organize into appropriate folders',
        column: 'Next Actions',
        priority: 'medium',
      },
      {
        title: 'Plan weekend trip',
        description: 'Research and book weekend getaway',
        column: 'Someday/Maybe',
        priority: 'low',
      },
    ],
    settings: {
      enable_time_tracking: true,
      enable_subtasks: true,
      enable_card_links: false,
      allow_comments: false,
    },
  },
];

const categoryColors = {
  personal: 'bg-blue-100 text-blue-800',
  team: 'bg-green-100 text-green-800',
  project: 'bg-purple-100 text-purple-800',
  custom: 'bg-gray-100 text-gray-800',
};

const categoryIcons = {
  personal: Users,
  team: Users,
  project: Target,
  custom: Settings,
};

export function BoardTemplates({
  templates,
  onCreateFromTemplate,
  onSaveAsTemplate,
  onDeleteTemplate,
  onToggleFavorite,
}: BoardTemplatesProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<BoardTemplate | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isSaveTemplateOpen, setIsSaveTemplateOpen] = useState(false);
  const [newBoardName, setNewBoardName] = useState('');
  const [templateName, setTemplateName] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');
  const [activeCategory, setActiveCategory] = useState<'all' | 'personal' | 'team' | 'project' | 'custom'>('all');

  const allTemplates = [...predefinedTemplates, ...templates];
  const filteredTemplates = activeCategory === 'all' 
    ? allTemplates 
    : allTemplates.filter(t => t.category === activeCategory);

  const favoriteTemplates = allTemplates.filter(t => t.is_favorite);

  const handleCreateFromTemplate = () => {
    if (!selectedTemplate || !newBoardName.trim()) return;
    onCreateFromTemplate(selectedTemplate.id, newBoardName);
    setNewBoardName('');
    setIsCreateDialogOpen(false);
    setSelectedTemplate(null);
  };

  const handleSaveAsTemplate = () => {
    if (!templateName.trim()) return;
    onSaveAsTemplate('current-board', templateName, templateDescription);
    setTemplateName('');
    setTemplateDescription('');
    setIsSaveTemplateOpen(false);
  };

  const renderTemplate = (template: BoardTemplate) => {
    const CategoryIcon = categoryIcons[template.category];
    
    return (
      <Card 
        key={template.id} 
        className="hover:shadow-lg transition-shadow cursor-pointer group"
        onClick={() => setSelectedTemplate(template)}
      >
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-2">
                <CardTitle className="text-lg group-hover:text-blue-600 transition-colors">
                  {template.name}
                </CardTitle>
                {template.is_favorite && (
                  <Star className="w-4 h-4 text-yellow-500 fill-current" />
                )}
              </div>
              <p className="text-sm text-gray-600 line-clamp-2">
                {template.description}
              </p>
            </div>
            <Badge className={categoryColors[template.category]}>
              <CategoryIcon className="w-3 h-3 mr-1" />
              {template.category}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {/* Columns Preview */}
            <div>
              <h5 className="text-sm font-medium text-gray-700 mb-2">Columns</h5>
              <div className="flex space-x-1">
                {template.columns.slice(0, 4).map((column, index) => (
                  <div
                    key={index}
                    className="flex-1 h-2 rounded-full"
                    style={{ backgroundColor: column.color }}
                    title={column.name}
                  />
                ))}
                {template.columns.length > 4 && (
                  <div className="flex-1 h-2 rounded-full bg-gray-200 flex items-center justify-center">
                    <span className="text-xs text-gray-500">+{template.columns.length - 4}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Features */}
            <div className="flex items-center space-x-4 text-xs text-gray-500">
              {template.custom_fields.length > 0 && (
                <div className="flex items-center space-x-1">
                  <Settings className="w-3 h-3" />
                  <span>{template.custom_fields.length} fields</span>
                </div>
              )}
              {template.milestones.length > 0 && (
                <div className="flex items-center space-x-1">
                  <Target className="w-3 h-3" />
                  <span>{template.milestones.length} milestones</span>
                </div>
              )}
              {template.settings.enable_time_tracking && (
                <div className="flex items-center space-x-1">
                  <Clock className="w-3 h-3" />
                  <span>Time tracking</span>
                </div>
              )}
            </div>

            {/* Usage Stats */}
            <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t">
              <span>Used {template.usage_count.toLocaleString()} times</span>
              <div className="flex items-center space-x-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="opacity-0 group-hover:opacity-100 transition-opacity h-6 px-2"
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleFavorite(template.id, !template.is_favorite);
                  }}
                >
                  <Star className={`w-3 h-3 ${template.is_favorite ? 'text-yellow-500 fill-current' : ''}`} />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="opacity-0 group-hover:opacity-100 transition-opacity h-6 px-2"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsCreateDialogOpen(true);
                  }}
                >
                  <Copy className="w-3 h-3" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Board Templates</h2>
          <p className="text-gray-600">Get started quickly with pre-built board templates</p>
        </div>
        <Dialog open={isSaveTemplateOpen} onOpenChange={setIsSaveTemplateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Bookmark className="w-4 h-4 mr-2" />
              Save Current as Template
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Save Board as Template</DialogTitle>
              <DialogDescription>
                Save your current board configuration as a reusable template
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="templateName">Template Name</Label>
                <Input
                  id="templateName"
                  placeholder="Enter template name"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="templateDescription">Description</Label>
                <Textarea
                  id="templateDescription"
                  placeholder="Describe what this template is for"
                  value={templateDescription}
                  onChange={(e) => setTemplateDescription(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsSaveTemplateOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveAsTemplate} disabled={!templateName.trim()}>
                Save Template
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Favorites Section */}
      {favoriteTemplates.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <Star className="w-5 h-5 mr-2 text-yellow-500" />
            Favorites
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {favoriteTemplates.map(renderTemplate)}
          </div>
        </div>
      )}

      {/* Category Filter */}
      <div className="flex items-center space-x-1 border-b">
        {[
          { key: 'all', label: 'All Templates' },
          { key: 'personal', label: 'Personal' },
          { key: 'team', label: 'Team' },
          { key: 'project', label: 'Project' },
          { key: 'custom', label: 'Custom' },
        ].map((category) => (
          <Button
            key={category.key}
            variant="ghost"
            size="sm"
            className={`${
              activeCategory === category.key
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-600'
            }`}
            onClick={() => setActiveCategory(category.key as any)}
          >
            {category.label}
          </Button>
        ))}
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTemplates.map(renderTemplate)}
      </div>

      {/* Template Preview Dialog */}
      <Dialog open={!!selectedTemplate} onOpenChange={() => setSelectedTemplate(null)}>
        <DialogContent className="max-w-2xl">
          {selectedTemplate && (
            <>
              <DialogHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <DialogTitle className="flex items-center space-x-2">
                      <span>{selectedTemplate.name}</span>
                      <Badge className={categoryColors[selectedTemplate.category]}>
                        {selectedTemplate.category}
                      </Badge>
                    </DialogTitle>
                    <DialogDescription>
                      {selectedTemplate.description}
                    </DialogDescription>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onToggleFavorite(selectedTemplate.id, !selectedTemplate.is_favorite)}
                  >
                    <Star className={`w-4 h-4 ${selectedTemplate.is_favorite ? 'text-yellow-500 fill-current' : ''}`} />
                  </Button>
                </div>
              </DialogHeader>
              
              <div className="space-y-4">
                {/* Columns */}
                <div>
                  <h4 className="font-medium mb-2">Columns ({selectedTemplate.columns.length})</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedTemplate.columns.map((column, index) => (
                      <Badge
                        key={index}
                        variant="outline"
                        style={{ borderColor: column.color, color: column.color }}
                      >
                        {column.name}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Custom Fields */}
                {selectedTemplate.custom_fields.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">Custom Fields ({selectedTemplate.custom_fields.length})</h4>
                    <div className="space-y-1">
                      {selectedTemplate.custom_fields.map((field, index) => (
                        <div key={index} className="flex items-center justify-between text-sm">
                          <span>{field.name}</span>
                          <div className="flex items-center space-x-2">
                            <Badge variant="outline">{field.field_type}</Badge>
                            {field.is_required && (
                              <Badge className="bg-red-100 text-red-800">Required</Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Features */}
                <div>
                  <h4 className="font-medium mb-2">Features</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(selectedTemplate.settings).map(([key, enabled]) => (
                      <div key={key} className="flex items-center space-x-2">
                        {enabled ? (
                          <CheckCircle2 className="w-4 h-4 text-green-500" />
                        ) : (
                          <div className="w-4 h-4 rounded-full border-2 border-gray-300" />
                        )}
                        <span className="text-sm capitalize">
                          {key.replace('enable_', '').replace('_', ' ')}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Sample Cards */}
                {selectedTemplate.sample_cards.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">Sample Cards</h4>
                    <div className="space-y-2">
                      {selectedTemplate.sample_cards.map((card, index) => (
                        <div key={index} className="p-2 border rounded text-sm">
                          <div className="font-medium">{card.title}</div>
                          <div className="text-gray-600">{card.description}</div>
                          <div className="flex items-center space-x-2 mt-1">
                            <Badge variant="outline">{card.column}</Badge>
                            <Badge className={`${
                              card.priority === 'high' ? 'bg-red-100 text-red-800' :
                              card.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {card.priority}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <DialogFooter>
                <div className="flex items-center justify-between w-full">
                  <div className="text-sm text-gray-500">
                    Used {selectedTemplate.usage_count.toLocaleString()} times
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button variant="outline" onClick={() => setSelectedTemplate(null)}>
                      Close
                    </Button>
                    <Button onClick={() => setIsCreateDialogOpen(true)}>
                      <Copy className="w-4 h-4 mr-2" />
                      Use Template
                    </Button>
                  </div>
                </div>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Create from Template Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Board from Template</DialogTitle>
            <DialogDescription>
              {selectedTemplate && `Create a new board based on "${selectedTemplate.name}"`}
            </DialogDescription>
          </DialogHeader>
          <div>
            <Label htmlFor="newBoardName">Board Name</Label>
            <Input
              id="newBoardName"
              placeholder="Enter board name"
              value={newBoardName}
              onChange={(e) => setNewBoardName(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateFromTemplate} disabled={!newBoardName.trim()}>
              Create Board
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}