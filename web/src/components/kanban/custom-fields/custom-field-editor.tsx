'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
  Plus,
  Settings,
  Trash2,
  Edit3,
  Type,
  Hash,
  Calendar,
  ChevronDown,
  CheckSquare,
  List,
  Save,
  X
} from 'lucide-react';

export type CustomFieldType = 'text' | 'number' | 'date' | 'dropdown' | 'checkbox' | 'multi_select';

export interface CustomField {
  id?: string;
  name: string;
  field_type: CustomFieldType;
  is_required: boolean;
  position: number;
  options?: string;
  validation_rules?: string;
}

interface CustomFieldEditorProps {
  boardId: string;
  fields: CustomField[];
  onCreateField: (field: Omit<CustomField, 'id'>) => void;
  onUpdateField: (fieldId: string, updates: Partial<CustomField>) => void;
  onDeleteField: (fieldId: string) => void;
}

const fieldTypeIcons = {
  text: Type,
  number: Hash,
  date: Calendar,
  dropdown: ChevronDown,
  checkbox: CheckSquare,
  multi_select: List,
};

const fieldTypeLabels = {
  text: 'Text',
  number: 'Number',
  date: 'Date',
  dropdown: 'Dropdown',
  checkbox: 'Checkbox',
  multi_select: 'Multi-select',
};

export function CustomFieldEditor({
  boardId,
  fields,
  onCreateField,
  onUpdateField,
  onDeleteField,
}: CustomFieldEditorProps) {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingField, setEditingField] = useState<CustomField | null>(null);
  const [newField, setNewField] = useState<Omit<CustomField, 'id'>>({
    name: '',
    field_type: 'text',
    is_required: false,
    position: fields.length,
    options: '',
    validation_rules: '',
  });

  const handleCreateField = () => {
    if (!newField.name.trim()) return;

    onCreateField({
      ...newField,
      position: fields.length,
    });

    setNewField({
      name: '',
      field_type: 'text',
      is_required: false,
      position: fields.length + 1,
      options: '',
      validation_rules: '',
    });
    setIsCreateDialogOpen(false);
  };

  const handleUpdateField = () => {
    if (!editingField?.id || !editingField.name.trim()) return;

    onUpdateField(editingField.id, editingField);
    setEditingField(null);
  };

  const handleFieldTypeChange = (fieldType: CustomFieldType) => {
    if (editingField) {
      setEditingField({ ...editingField, field_type: fieldType, options: '' });
    } else {
      setNewField({ ...newField, field_type: fieldType, options: '' });
    }
  };

  const renderFieldOptions = (field: Omit<CustomField, 'id'>, isEditing: boolean = false) => {
    const currentField = isEditing ? editingField! : field;
    const setField = isEditing ? setEditingField : setNewField;

    if (currentField.field_type === 'dropdown' || currentField.field_type === 'multi_select') {
      return (
        <div>
          <Label htmlFor="fieldOptions">Options (one per line)</Label>
          <Textarea
            id="fieldOptions"
            placeholder="Option 1&#10;Option 2&#10;Option 3"
            value={currentField.options || ''}
            onChange={(e) => setField({ ...currentField, options: e.target.value })}
            className="min-h-[100px]"
          />
          <p className="text-sm text-gray-500 mt-1">
            Enter each option on a new line
          </p>
        </div>
      );
    }

    if (currentField.field_type === 'number') {
      return (
        <div>
          <Label htmlFor="validationRules">Validation (optional)</Label>
          <Input
            id="validationRules"
            placeholder="e.g., min=0,max=100"
            value={currentField.validation_rules || ''}
            onChange={(e) => setField({ ...currentField, validation_rules: e.target.value })}
          />
          <p className="text-sm text-gray-500 mt-1">
            Comma-separated rules: min=X, max=X, step=X
          </p>
        </div>
      );
    }

    return null;
  };

  const FieldIcon = ({ type }: { type: CustomFieldType }) => {
    const Icon = fieldTypeIcons[type];
    return <Icon className="w-4 h-4" />;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center">
            <Settings className="w-5 h-5 mr-2" />
            Custom Fields
          </CardTitle>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Add Field
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Create Custom Field</DialogTitle>
                <DialogDescription>
                  Add a new custom field to this board
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="fieldName">Field Name</Label>
                  <Input
                    id="fieldName"
                    placeholder="Enter field name"
                    value={newField.name}
                    onChange={(e) => setNewField({ ...newField, name: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="fieldType">Field Type</Label>
                  <select
                    id="fieldType"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    value={newField.field_type}
                    onChange={(e) => handleFieldTypeChange(e.target.value as CustomFieldType)}
                  >
                    {Object.entries(fieldTypeLabels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
                {renderFieldOptions(newField)}
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="isRequired"
                    checked={newField.is_required}
                    onChange={(e) => setNewField({ ...newField, is_required: e.target.checked })}
                    className="rounded"
                  />
                  <Label htmlFor="isRequired">Required field</Label>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateField} disabled={!newField.name.trim()}>
                  Create Field
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {fields.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Settings className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No custom fields yet</p>
            <p className="text-sm">Add custom fields to capture additional information on cards</p>
          </div>
        ) : (
          <div className="space-y-3">
            {fields
              .sort((a, b) => a.position - b.position)
              .map((field) => (
                <div
                  key={field.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                >
                  <div className="flex items-center space-x-3">
                    <FieldIcon type={field.field_type} />
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-medium">{field.name}</span>
                        {field.is_required && (
                          <Badge variant="outline" className="text-xs">
                            Required
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-500">
                        {fieldTypeLabels[field.field_type]}
                        {field.options && ` • ${field.options.split('\n').length} options`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditingField(field)}
                    >
                      <Edit3 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDeleteField(field.id!)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
          </div>
        )}

        {/* Edit Field Dialog */}
        <Dialog open={!!editingField} onOpenChange={() => setEditingField(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Custom Field</DialogTitle>
              <DialogDescription>
                Update the field configuration
              </DialogDescription>
            </DialogHeader>
            {editingField && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="editFieldName">Field Name</Label>
                  <Input
                    id="editFieldName"
                    placeholder="Enter field name"
                    value={editingField.name}
                    onChange={(e) =>
                      setEditingField({ ...editingField, name: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="editFieldType">Field Type</Label>
                  <select
                    id="editFieldType"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    value={editingField.field_type}
                    onChange={(e) => handleFieldTypeChange(e.target.value as CustomFieldType)}
                  >
                    {Object.entries(fieldTypeLabels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
                {renderFieldOptions(editingField, true)}
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="editIsRequired"
                    checked={editingField.is_required}
                    onChange={(e) =>
                      setEditingField({ ...editingField, is_required: e.target.checked })
                    }
                    className="rounded"
                  />
                  <Label htmlFor="editIsRequired">Required field</Label>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingField(null)}>
                Cancel
              </Button>
              <Button onClick={handleUpdateField} disabled={!editingField?.name.trim()}>
                Update Field
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}