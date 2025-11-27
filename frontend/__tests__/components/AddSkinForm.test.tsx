import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import AddSkinForm from '@/app/components/AddSkinForm';
import type { NewSkinData } from '@/app/components/add-skin/types';
import { CSItem } from '@/lib/mockData';

const mockFromTo = jest.fn();
const mockTo = jest.fn();

jest.mock('gsap', () => ({
  fromTo: (...args: unknown[]) => mockFromTo(...args),
  to: (...args: unknown[]) => mockTo(...args),
}));

const mockUseSkinCatalog = jest.fn();

jest.mock('@/hooks/useSkinCatalog', () => ({
  useSkinCatalog: (...args: unknown[]) => mockUseSkinCatalog(...(args as Parameters<typeof mockUseSkinCatalog>)),
}));

const baseSelectedSkin = {
  id: 123,
  name: 'Butterfly Knife | Doppler',
  rarity: 'Covert',
  type: 'Knife',
  defaultPrice: 3500,
  imageUrl: 'https://example.com/knife.png',
};

const baseItem: CSItem = {
  id: '99',
  name: 'Butterfly Knife | Doppler',
  rarity: 'Covert',
  float: 0.01,
  exterior: 'Factory New',
  paintSeed: 396,
  price: 3200,
  cost: 3000,
  imageUrl: 'https://example.com/current.png',
  type: 'Knife',
  tradeProtected: false,
};

beforeEach(() => {
  jest.clearAllMocks();
  mockUseSkinCatalog.mockReturnValue({
    skins: [],
    loading: false,
    selectedSkin: baseSelectedSkin,
  });
  // Mock GSAP to immediately call onComplete if provided
  mockFromTo.mockImplementation((_target, _from, to) => {
    if (to?.onComplete && typeof to.onComplete === 'function') {
      setTimeout(() => to.onComplete(), 0);
    }
  });
  mockTo.mockImplementation((_target, vars) => {
    if (vars?.onComplete && typeof vars.onComplete === 'function') {
      setTimeout(() => vars.onComplete(), 0);
    }
  });
});

describe('AddSkinForm submission behaviour', () => {
  it('calls onUpdate and closes when update succeeds', async () => {
    const handleAdd = jest.fn();
    const handleUpdate = jest.fn<Promise<boolean>, [string, NewSkinData]>().mockResolvedValue(true);
    const handleClose = jest.fn();

    await act(async () => {
      render(
        <AddSkinForm
          item={baseItem}
          onAdd={handleAdd}
          onUpdate={handleUpdate}
          onClose={handleClose}
        />,
      );
    });

    const submitButton = screen.getByRole('button', { name: /update skin/i });
    fireEvent.click(submitButton);

    await waitFor(() =>
      expect(handleUpdate).toHaveBeenCalledWith(
        baseItem.id,
        expect.objectContaining({
          name: baseItem.name,
          price: baseItem.price,
          imageUrl: baseItem.imageUrl,
          tradeProtected: false,
        }),
      ),
    );

    expect(handleAdd).not.toHaveBeenCalled();
    await waitFor(() => expect(handleClose).toHaveBeenCalled());
  });

  it('keeps the modal open when update reports failure', async () => {
    const handleUpdate = jest.fn<Promise<boolean>, [string, NewSkinData]>().mockResolvedValue(false);
    const handleClose = jest.fn();

    await act(async () => {
      render(
        <AddSkinForm
          item={baseItem}
          onAdd={jest.fn()}
          onUpdate={handleUpdate}
          onClose={handleClose}
        />,
      );
    });

    fireEvent.click(screen.getByRole('button', { name: /update skin/i }));

    await waitFor(() => expect(handleUpdate).toHaveBeenCalled());
    expect(handleClose).not.toHaveBeenCalled();
  });

  it('submits new skin and closes when add succeeds', async () => {
    const handleAdd = jest.fn<Promise<boolean>, [NewSkinData]>().mockResolvedValue(true);
    const handleClose = jest.fn();

    await act(async () => {
      render(
        <AddSkinForm
          onAdd={handleAdd}
          onClose={handleClose}
        />,
      );
    });

    fireEvent.click(screen.getByRole('button', { name: /^add skin$/i }));

    await waitFor(() =>
      expect(handleAdd).toHaveBeenCalledWith(
        expect.objectContaining({
          skinId: baseSelectedSkin.id,
          name: baseSelectedSkin.name,
          price: Number(baseSelectedSkin.defaultPrice),
          imageUrl: baseSelectedSkin.imageUrl,
        }),
      ),
    );

    await waitFor(() => expect(handleClose).toHaveBeenCalled());
  });
});
