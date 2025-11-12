import { render, screen, fireEvent } from '@testing-library/react';
import ItemCard from '@/app/components/ItemCard';
import { CSItem } from '@/lib/mockData';

describe('ItemCard Component', () => {
  const mockItem: CSItem = {
    id: '1',
    name: 'AK-47 | Redline',
    rarity: 'Classified',
    type: 'Rifle',
    float: 0.15,
    exterior: 'Field-Tested',
    price: 20.50,
    cost: 15.00,
    imageUrl: 'https://test.com/image.png',
    tradeProtected: false,
  };

  it('renders item name correctly', () => {
    render(<ItemCard item={mockItem} onClick={() => {}} />);
    expect(screen.getByText('AK-47 | Redline')).toBeInTheDocument();
  });

  it('displays price and cost', () => {
    render(<ItemCard item={mockItem} onClick={() => {}} />);
    expect(screen.getByText(/\$20\.50/)).toBeInTheDocument();
    expect(screen.getByText(/\$15\.00/)).toBeInTheDocument();
  });

  it('calculates profit correctly', () => {
    render(<ItemCard item={mockItem} onClick={() => {}} />);
    // Profit = 20.50 - 15.00 = 5.50
    expect(screen.getByText(/\$5\.50/)).toBeInTheDocument();
  });

  it('displays exterior abbreviation', () => {
    render(<ItemCard item={mockItem} onClick={() => {}} />);
    expect(screen.getByText('FT')).toBeInTheDocument();
  });

  it('shows rarity badge', () => {
    render(<ItemCard item={mockItem} onClick={() => {}} />);
    expect(screen.getByText('Classified')).toBeInTheDocument();
  });

  it('handles click events', () => {
    const handleClick = jest.fn();
    render(<ItemCard item={mockItem} onClick={handleClick} />);
    
    const card = screen.getByText('AK-47 | Redline').closest('div');
    fireEvent.click(card!);
    
    expect(handleClick).toHaveBeenCalled();
  });

  it('renders delete button when onDelete is provided', () => {
    const handleDelete = jest.fn();
    render(<ItemCard item={mockItem} variant="detailed" onDelete={handleDelete} />);

    const deleteButton = screen.getByText('Delete Item');
    fireEvent.click(deleteButton);

    expect(handleDelete).toHaveBeenCalled();
  });

  it('displays item type', () => {
    render(<ItemCard item={mockItem} onClick={() => {}} />);
    expect(screen.getByText('Rifle')).toBeInTheDocument();
  });

  it('shows trade protection status when applicable', () => {
    const tradeProtectedItem = { ...mockItem, tradeProtected: true, tradableAfter: '2025-11-18T00:00:00Z' };
    render(<ItemCard item={tradeProtectedItem} onClick={() => {}} />);
    
    expect(screen.getByText(/Trade Locked/i)).toBeInTheDocument();
  });
});

describe('ItemCard Float Display', () => {
  it('displays float value with correct precision', () => {
    const item: CSItem = {
      id: '1',
      name: 'AWP | Dragon Lore',
      rarity: 'Covert',
      type: 'Sniper Rifle',
      float: 0.006789,
      exterior: 'Factory New',
      price: 5000,
      imageUrl: 'https://test.com/dlore.png',
      tradeProtected: false,
    };
    
    render(<ItemCard item={item} onClick={() => {}} />);
    expect(screen.getByText(/0\.00678/)).toBeInTheDocument();
  });
});

