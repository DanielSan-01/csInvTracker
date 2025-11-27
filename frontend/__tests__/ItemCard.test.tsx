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

  it('shows rarity badge in detailed view', () => {
    render(<ItemCard item={mockItem} variant="detailed" onClick={() => {}} />);
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

    const deleteButton = screen.getByLabelText('Delete item');
    fireEvent.click(deleteButton);

    expect(handleDelete).toHaveBeenCalled();
  });

  it('displays item type in detailed view', () => {
    render(<ItemCard item={mockItem} variant="detailed" onClick={() => {}} />);
    expect(screen.getByText(/Type:.*Rifle/)).toBeInTheDocument();
  });

  it('shows trade protection status when applicable', () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 7); // 7 days from now
    const tradeProtectedItem = { ...mockItem, tradeProtected: true, tradableAfter: futureDate };
    render(<ItemCard item={tradeProtectedItem} variant="detailed" onClick={() => {}} />);
    
    expect(screen.getByText(/Trade lock expires/i)).toBeInTheDocument();
  });
});

describe('ItemCard Float Display', () => {
  it('displays float value with correct precision in grid view', () => {
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
    // formatFloat with precision 3 rounds 0.006789 to 0.007
    expect(screen.getByText(/0\.007/)).toBeInTheDocument();
  });

  it('displays float value with higher precision in detailed view', () => {
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
    
    render(<ItemCard item={item} variant="detailed" onClick={() => {}} />);
    // Detailed view uses precision 6, so should show 0.006789
    expect(screen.getByText(/0\.006789/)).toBeInTheDocument();
  });
});

