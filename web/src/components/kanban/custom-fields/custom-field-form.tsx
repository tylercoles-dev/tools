'use client';

import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Type, 
  Hash, 
  Calendar, 
  ChevronDown, 
  CheckSquare, 
  List,
  AlertCircle
} from 'lucide-react';

export type CustomFieldType = 'text' | 'number' | 'date' | 'dropdown' | 'checkbox' | 'multi_select';

export interface CustomField {
  id: string;
  name: string;
  field_type: CustomFieldType;
  is_required: boolean;
  position: number;
  options?: string;
  validation_rules?: string;
}

export interface CustomFieldValue {
  custom_field_id: string;
  value: string | null;
}

interface CustomFieldFormProps {
  fields: CustomField[];
  values: CustomFieldValue[];
  onChange: (fieldId: string, value: string | null) => void;
  errors?: Record<string, string>;
}

const fieldTypeIcons = {
  text: Type,
  number: Hash,
  date: Calendar,
  dropdown: ChevronDown,
  checkbox: CheckSquare,
  multi_select: List,
};

export function CustomFieldForm({ 
  fields, 
  values, 
  onChange, 
  errors = {} 
}: CustomFieldFormProps) {
  const [localValues, setLocalValues] = useState<Record<string, string | null>>({});

  useEffect(() => {
    const valueMap: Record<string, string | null> = {};
    values.forEach(value => {
      valueMap[value.custom_field_id] = value.value;
    });
    setLocalValues(valueMap);
  }, [values]);

  const handleValueChange = (fieldId: string, value: string | null) => {
    setLocalValues(prev => ({ ...prev, [fieldId]: value }));
    onChange(fieldId, value);
  };

  const getFieldValue = (fieldId: string): string => {
    return localValues[fieldId] || '';
  };

  const parseValidationRules = (rules?: string): Record<string, any> => {
    if (!rules) return {};
    
    const parsed: Record<string, any> = {};
    rules.split(',').forEach(rule => {
      const [key, value] = rule.trim().split('=');
      if (key && value) {
        parsed[key] = isNaN(Number(value)) ? value : Number(value);
      }
    });
    return parsed;
  };

  const validateField = (field: CustomField, value: string): string | null => {
    if (field.is_required && (!value || value.trim() === '')) {
      return `${field.name} is required`;
    }

    if (field.field_type === 'number' && value) {
      const numValue = Number(value);
      if (isNaN(numValue)) {
        return `${field.name} must be a valid number`;
      }

      const rules = parseValidationRules(field.validation_rules);
      if (rules.min !== undefined && numValue < rules.min) {
        return `${field.name} must be at least ${rules.min}`;
      }
      if (rules.max !== undefined && numValue > rules.max) {
        return `${field.name} must be at most ${rules.max}`;
      }
    }

    return null;
  };

  const renderField = (field: CustomField) => {
    const value = getFieldValue(field.id);
    const error = errors[field.id] || validateField(field, value);
    const Icon = fieldTypeIcons[field.field_type];

    const fieldId = `custom-field-${field.id}`;

    switch (field.field_type) {
      case 'text':
        return (
          <div key={field.id} className="space-y-2">
            <Label 
              htmlFor={fieldId} 
              className="flex items-center space-x-2"
            >
              <Icon className="w-4 h-4" />
              <span>{field.name}</span>
              {field.is_required && (
                <Badge variant="outline" className="text-xs">Required</Badge>
              )}
            </Label>
            <Input
              id={fieldId}
              type="text"
              value={value}
              onChange={(e) => handleValueChange(field.id, e.target.value)}
              placeholder={`Enter ${field.name.toLowerCase()}`}
              className={error ? 'border-red-500' : ''}
            />
            {error && (
              <p className="text-sm text-red-600 flex items-center space-x-1">
                <AlertCircle className="w-4 h-4" />
                <span>{error}</span>
              </p>
            )}
          </div>
        );

      case 'number':
        const rules = parseValidationRules(field.validation_rules);
        return (
          <div key={field.id} className="space-y-2">
            <Label 
              htmlFor={fieldId}
              className="flex items-center space-x-2"
            >
              <Icon className="w-4 h-4" />
              <span>{field.name}</span>
              {field.is_required && (
                <Badge variant="outline" className="text-xs">Required</Badge>
              )}
            </Label>
            <Input
              id={fieldId}
              type="number"
              value={value}
              onChange={(e) => handleValueChange(field.id, e.target.value)}
              placeholder={`Enter ${field.name.toLowerCase()}`}
              min={rules.min}
              max={rules.max}
              step={rules.step || 1}
              className={error ? 'border-red-500' : ''}
            />
            {error && (
              <p className="text-sm text-red-600 flex items-center space-x-1">
                <AlertCircle className="w-4 h-4" />
                <span>{error}</span>
              </p>
            )}
          </div>
        );

      case 'date':
        return (
          <div key={field.id} className="space-y-2">
            <Label 
              htmlFor={fieldId}
              className="flex items-center space-x-2"
            >
              <Icon className="w-4 h-4" />
              <span>{field.name}</span>
              {field.is_required && (
                <Badge variant="outline" className="text-xs">Required</Badge>
              )}
            </Label>
            <Input
              id={fieldId}
              type="date"
              value={value}
              onChange={(e) => handleValueChange(field.id, e.target.value)}
              className={error ? 'border-red-500' : ''}
            />
            {error && (
              <p className="text-sm text-red-600 flex items-center space-x-1">
                <AlertCircle className="w-4 h-4" />
                <span>{error}</span>
              </p>
            )}
          </div>
        );

      case 'dropdown':
        const options = field.options?.split('\n').filter(opt => opt.trim()) || [];
        return (
          <div key={field.id} className="space-y-2">
            <Label 
              htmlFor={fieldId}
              className="flex items-center space-x-2"
            >
              <Icon className="w-4 h-4" />
              <span>{field.name}</span>
              {field.is_required && (
                <Badge variant="outline" className="text-xs">Required</Badge>
              )}
            </Label>
            <select
              id={fieldId}
              value={value}
              onChange={(e) => handleValueChange(field.id, e.target.value)}
              className={`w-full px-3 py-2 border rounded-md ${error ? 'border-red-500' : 'border-gray-300'}`}
            >
              <option value="">Select {field.name.toLowerCase()}</option>
              {options.map((option, index) => (
                <option key={index} value={option.trim()}>
                  {option.trim()}
                </option>
              ))}
            </select>
            {error && (
              <p className="text-sm text-red-600 flex items-center space-x-1">
                <AlertCircle className="w-4 h-4" />
                <span>{error}</span>
              </p>
            )}
          </div>
        );

      case 'checkbox':
        return (
          <div key={field.id} className="space-y-2">
            <div className="flex items-center space-x-2">
              <input
                id={fieldId}
                type="checkbox"
                checked={value === 'true'}
                onChange={(e) => handleValueChange(field.id, e.target.checked ? 'true' : 'false')}
                className="rounded"
              />
              <Label 
                htmlFor={fieldId}
                className="flex items-center space-x-2"
              >
                <Icon className="w-4 h-4" />
                <span>{field.name}</span>
                {field.is_required && (
                  <Badge variant="outline" className="text-xs">Required</Badge>
                )}
              </Label>
            </div>
            {error && (
              <p className="text-sm text-red-600 flex items-center space-x-1">
                <AlertCircle className="w-4 h-4" />
                <span>{error}</span>
              </p>
            )}
          </div>
        );

      case 'multi_select':
        const multiOptions = field.options?.split('\n').filter(opt => opt.trim()) || [];
        const selectedValues = value ? value.split(',').map(v => v.trim()) : [];
        
        const toggleOption = (option: string) => {
          const trimmedOption = option.trim();
          let newValues;
          
          if (selectedValues.includes(trimmedOption)) {
            newValues = selectedValues.filter(v => v !== trimmedOption);
          } else {
            newValues = [...selectedValues, trimmedOption];
          }
          
          handleValueChange(field.id, newValues.length > 0 ? newValues.join(',') : '');
        };

        return (
          <div key={field.id} className="space-y-2">
            <Label className="flex items-center space-x-2">
              <Icon className="w-4 h-4" />
              <span>{field.name}</span>
              {field.is_required && (
                <Badge variant="outline" className="text-xs">Required</Badge>
              )}
            </Label>
            <div className="space-y-2 p-3 border rounded-md">
              {multiOptions.map((option, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id={`${fieldId}-${index}`}
                    checked={selectedValues.includes(option.trim())}
                    onChange={() => toggleOption(option)}
                    className="rounded"
                  />
                  <Label 
                    htmlFor={`${fieldId}-${index}`}
                    className="text-sm"
                  >
                    {option.trim()}
                  </Label>
                </div>
              ))}
            </div>
            {selectedValues.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {selectedValues.map((value, index) => (
                  <Badge key={index} variant="secondary" className="text-xs">
                    {value}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-auto p-0 ml-1"
                      onClick={() => toggleOption(value)}
                    >
                      ×
                    </Button>
                  </Badge>
                ))}
              </div>
            )}
            {error && (
              <p className="text-sm text-red-600 flex items-center space-x-1">
                <AlertCircle className="w-4 h-4" />
                <span>{error}</span>
              </p>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  if (fields.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <h4 className="font-medium text-gray-900">Custom Fields</h4>
      <div className="space-y-4">
        {fields
          .sort((a, b) => a.position - b.position)
          .map(renderField)}
      </div>
    </div>
  );
}