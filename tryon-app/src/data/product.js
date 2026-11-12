/**
 * Placeholder product. Photos come from Unsplash for the demo —
 * replace `src` with real catalogue photos later. If a photo fails
 * to load, the gallery shows a styled fallback instead of a broken image.
 */
const unsplash = (id) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=1080&h=1350&q=80`

export const PRODUCT = {
  id: 'jacket-margo',
  name: 'Жакет «Марго»',
  price: 12490,
  color: '#b48a62',
  photos: {
    model: [
      { id: 'model-front', caption: 'Спереди', view: 'front', src: unsplash('1594633312681-425c7b97ccd1') },
      { id: 'model-back', caption: 'Сзади', view: 'back', src: unsplash('1515886657613-9f3515b0c78f') },
      { id: 'model-detail', caption: 'Детали ткани', view: 'detail', src: unsplash('1539109136881-3be0616acf4b') },
    ],
    hanger: [
      { id: 'hanger-front', caption: 'Спереди', view: 'front', src: unsplash('1591047139829-d91aecb6caea') },
      { id: 'hanger-back', caption: 'Сзади', view: 'back', src: unsplash('1551028719-00167b16eac5') },
      { id: 'hanger-detail', caption: 'Детали ткани', view: 'detail', src: unsplash('1576566588028-4147f3842f27') },
    ],
  },
}

export const formatPrice = (rub) => `${rub.toLocaleString('ru-RU')} ₽`
