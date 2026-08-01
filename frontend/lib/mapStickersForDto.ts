import { CSSticker } from '@/lib/mockData';
import { CreateStickerDto } from '@/lib/api';

export function mapStickersForDto(stickers?: CSSticker[]): CreateStickerDto[] | undefined {
  if (!stickers || stickers.length === 0) {
    return undefined;
  }

  const mapped = stickers
    .filter((sticker) => sticker.name && sticker.name.trim().length > 0)
    .map((sticker) => ({
      name: sticker.name,
      price: sticker.price,
      slot: sticker.slot,
      imageUrl: sticker.imageUrl,
    }));

  return mapped.length > 0 ? mapped : undefined;
}
