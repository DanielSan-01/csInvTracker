'use client';

import type { ChangeEvent, FormEvent } from 'react';
import type { ReactNode, InputHTMLAttributes, SelectHTMLAttributes } from 'react';

import type { NewSkinFormState } from '../types';

type AddSkinTabProps = {
  newSkin: NewSkinFormState;
  onFieldChange: (field: keyof NewSkinFormState, value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onClear: () => void;
  loading: boolean;
  success: boolean;
};

const AddSkinTab = ({ newSkin, onFieldChange, onSubmit, onClear, loading, success }: AddSkinTabProps) => {
  const handleChange = (field: keyof NewSkinFormState) => (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    onFieldChange(field, event.target.value);
  };

  return (
    <div className="mx-auto max-w-3xl">
      <div className="rounded-lg border border-gray-700 bg-gray-800 p-8">
        <h2 className="mb-6 text-2xl font-bold">Add New Skin to Catalog</h2>

        {success && (
          <div className="mb-6 rounded-lg border border-emerald-400/50 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
            Skin created successfully! It's now searchable for all users.
          </div>
        )}

        <form onSubmit={onSubmit} className="space-y-6">
          <Field>
            <Label>Skin Name *</Label>
            <Input
              required
              value={newSkin.name}
              onChange={handleChange('name')}
              placeholder="★ Karambit | Doppler"
            />
          </Field>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field>
              <Label>Rarity *</Label>
              <Select required value={newSkin.rarity} onChange={handleChange('rarity')}>
                <option value="Consumer Grade">Consumer Grade</option>
                <option value="Industrial Grade">Industrial Grade</option>
                <option value="Mil-Spec">Mil-Spec</option>
                <option value="Restricted">Restricted</option>
                <option value="Classified">Classified</option>
                <option value="Covert">Covert</option>
                <option value="Extraordinary">Extraordinary</option>
                <option value="Contraband">Contraband</option>
              </Select>
            </Field>
            <Field>
              <Label>Type *</Label>
              <Select required value={newSkin.type} onChange={handleChange('type')}>
                <option value="Knife">Knife</option>
                <option value="Gloves">Gloves</option>
                <option value="Rifle">Rifle</option>
                <option value="Pistol">Pistol</option>
                <option value="SMG">SMG</option>
                <option value="Shotgun">Shotgun</option>
                <option value="Sniper Rifle">Sniper Rifle</option>
                <option value="Machine Gun">Machine Gun</option>
                <option value="Other">Other</option>
              </Select>
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field>
              <Label>Weapon</Label>
              <Input value={newSkin.weapon} onChange={handleChange('weapon')} placeholder="Karambit" />
            </Field>
            <Field>
              <Label>Collection</Label>
              <Input
                value={newSkin.collection}
                onChange={handleChange('collection')}
                placeholder="The Chroma 2 Collection"
              />
            </Field>
          </div>

          <Field>
            <Label>Image URL</Label>
            <Input
              value={newSkin.imageUrl}
              onChange={handleChange('imageUrl')}
              placeholder="https://community.akamai.steamstatic.com/..."
            />
            {newSkin.imageUrl && (
              <div className="mt-3">
                <img
                  src={newSkin.imageUrl}
                  alt="Preview"
                  className="max-w-xs rounded-lg border border-gray-600"
                  onError={(event) => {
                    event.currentTarget.src = '';
                    event.currentTarget.style.display = 'none';
                  }}
                />
              </div>
            )}
          </Field>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field>
              <Label>Default Price ($)</Label>
              <Input
                type="number"
                step="0.01"
                value={newSkin.defaultPrice}
                onChange={handleChange('defaultPrice')}
                placeholder="50.00"
              />
            </Field>
            <Field>
              <Label>Paint Index</Label>
              <Input
                type="number"
                value={newSkin.paintIndex}
                onChange={handleChange('paintIndex')}
                placeholder="418"
              />
            </Field>
          </div>

          <div className="flex justify-end gap-4 pt-4">
            <button
              type="button"
              onClick={onClear}
              className="rounded-lg bg-gray-700 px-6 py-2 font-semibold transition-colors hover:bg-gray-600"
            >
              Clear
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-blue-600 px-6 py-2 font-semibold transition-colors hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? 'Creating...' : 'Create Skin'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

type FieldProps = {
  children: ReactNode;
};

const Field = ({ children }: FieldProps) => <div className="space-y-2">{children}</div>;

const Label = ({ children }: { children: ReactNode }) => (
  <label className="block text-sm font-medium text-gray-300">{children}</label>
);

type InputProps = InputHTMLAttributes<HTMLInputElement>;

const Input = ({ className = '', ...rest }: InputProps) => (
  <input
    className={`w-full rounded-lg border border-gray-600 bg-gray-900 px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 ${className}`}
    {...rest}
  />
);

type SelectProps = SelectHTMLAttributes<HTMLSelectElement>;

const Select = ({ className = '', ...rest }: SelectProps) => (
  <select
    className={`w-full rounded-lg border border-gray-600 bg-gray-900 px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 ${className}`}
    {...rest}
  />
);

export default AddSkinTab;

