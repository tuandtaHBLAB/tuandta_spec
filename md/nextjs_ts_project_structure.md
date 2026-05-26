# Next.js TypeScript Project Structure & Coding Standard

## 1. Mục tiêu

Tạo một dự án **Next.js sử dụng TypeScript** với cấu trúc rõ ràng, dễ mở rộng, dễ bảo trì.

Yêu cầu chính:

- Sử dụng **Next.js App Router**.
- Sử dụng **TypeScript** cho toàn bộ source code.
- Tất cả `type` / `interface` dùng chung phải đặt trong folder `types`.
- Tất cả hàm dùng chung phải đặt trong folder `helpers`.
- Component phải được chia theo folder riêng, đặt tên rõ ràng.
- Ưu tiên code sạch, dễ đọc, dễ tái sử dụng.

---

## 2. Tech Stack

```txt
Next.js
TypeScript
React
Tailwind CSS
ESLint
Prettier
```

Có thể sử dụng thêm thư viện UI nếu cần, ví dụ:

```txt
Ant Design
Shadcn UI
React Hook Form
Zod
Axios
```

---

## 3. Cấu trúc thư mục chuẩn

```txt
src/
├── app/
│   ├── layout.tsx
│   ├── page.tsx
│   ├── globals.css
│   ├── about/
│   │   └── page.tsx
│   ├── contact/
│   │   └── page.tsx
│   └── rooms/
│       ├── page.tsx
│       └── [slug]/
│           └── page.tsx
│
├── components/
│   ├── common/
│   │   ├── Button/
│   │   │   ├── Button.tsx
│   │   │   ├── Button.types.ts
│   │   │   └── index.ts
│   │   ├── Container/
│   │   │   ├── Container.tsx
│   │   │   └── index.ts
│   │   └── SectionTitle/
│   │       ├── SectionTitle.tsx
│   │       ├── SectionTitle.types.ts
│   │       └── index.ts
│   │
│   ├── layout/
│   │   ├── Header/
│   │   │   ├── Header.tsx
│   │   │   └── index.ts
│   │   ├── Footer/
│   │   │   ├── Footer.tsx
│   │   │   └── index.ts
│   │   └── MainLayout/
│   │       ├── MainLayout.tsx
│   │       ├── MainLayout.types.ts
│   │       └── index.ts
│   │
│   └── features/
│       ├── rooms/
│       │   ├── RoomCard/
│       │   │   ├── RoomCard.tsx
│       │   │   ├── RoomCard.types.ts
│       │   │   └── index.ts
│       │   ├── RoomList/
│       │   │   ├── RoomList.tsx
│       │   │   ├── RoomList.types.ts
│       │   │   └── index.ts
│       │   └── RoomDetail/
│       │       ├── RoomDetail.tsx
│       │       ├── RoomDetail.types.ts
│       │       └── index.ts
│       │
│       └── contact/
│           └── ContactForm/
│               ├── ContactForm.tsx
│               ├── ContactForm.types.ts
│               └── index.ts
│
├── constants/
│   ├── routes.ts
│   ├── site.ts
│   └── index.ts
│
├── data/
│   ├── rooms.ts
│   └── navigation.ts
│
├── helpers/
│   ├── formatCurrency.ts
│   ├── formatDate.ts
│   ├── generateSlug.ts
│   ├── cn.ts
│   └── index.ts
│
├── hooks/
│   ├── useDebounce.ts
│   └── index.ts
│
├── services/
│   ├── apiClient.ts
│   ├── roomService.ts
│   └── index.ts
│
├── types/
│   ├── common.type.ts
│   ├── room.type.ts
│   ├── contact.type.ts
│   ├── api.type.ts
│   └── index.ts
│
└── utils/
    └── README.md
```

---

## 4. Quy tắc đặt folder component

Mỗi component nên đặt trong **một folder riêng**.

Ví dụ:

```txt
components/common/Button/
├── Button.tsx
├── Button.types.ts
└── index.ts
```

### Quy tắc

- Folder component dùng **PascalCase**.
- File component chính dùng **PascalCase.tsx**.
- File type riêng của component dùng format: `ComponentName.types.ts`.
- Luôn có `index.ts` để export component.

Ví dụ:

```ts
export { Button } from './Button';
export type { ButtonProps } from './Button.types';
```

---

## 5. Quy tắc đặt `types`

Tất cả type dùng chung đặt trong folder:

```txt
src/types/
```

Ví dụ file `src/types/room.type.ts`:

```ts
export type RoomImage = {
  id: string;
  url: string;
  alt: string;
};

export type Room = {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  capacity: number;
  images: RoomImage[];
  amenities: string[];
  isAvailable: boolean;
};
```

File `src/types/index.ts`:

```ts
export type * from './room.type';
export type * from './contact.type';
export type * from './api.type';
export type * from './common.type';
```

Khi import:

```ts
import type { Room } from '@/types';
```

Không import sâu nếu không cần:

```ts
// Không khuyến khích
import type { Room } from '@/types/room.type';
```

---

## 6. Quy tắc đặt `helpers`

Tất cả hàm dùng chung đặt trong folder:

```txt
src/helpers/
```

Ví dụ:

```txt
helpers/
├── formatCurrency.ts
├── formatDate.ts
├── generateSlug.ts
├── cn.ts
└── index.ts
```

### Ví dụ `formatCurrency.ts`

```ts
export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(value);
};
```

### Ví dụ `generateSlug.ts`

```ts
export const generateSlug = (text: string): string => {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
};
```

### File `helpers/index.ts`

```ts
export * from './formatCurrency';
export * from './formatDate';
export * from './generateSlug';
export * from './cn';
```

Khi import:

```ts
import { formatCurrency, generateSlug } from '@/helpers';
```

---

## 7. Quy tắc chia component

Component chia thành 3 nhóm chính:

```txt
components/
├── common/
├── layout/
└── features/
```

### `components/common`

Chứa component dùng lại nhiều nơi.

Ví dụ:

```txt
Button
Input
Modal
Container
SectionTitle
Loading
EmptyState
```

### `components/layout`

Chứa component liên quan layout chính.

Ví dụ:

```txt
Header
Footer
Sidebar
MainLayout
MobileMenu
```

### `components/features`

Chứa component theo từng nghiệp vụ / module.

Ví dụ:

```txt
features/rooms
features/contact
features/feedback
features/auth
features/payment
```

---

## 8. Ví dụ component chuẩn

### `components/features/rooms/RoomCard/RoomCard.types.ts`

```ts
import type { Room } from '@/types';

export type RoomCardProps = {
  room: Room;
};
```

### `components/features/rooms/RoomCard/RoomCard.tsx`

```tsx
import Image from 'next/image';
import Link from 'next/link';
import type { RoomCardProps } from './RoomCard.types';
import { formatCurrency } from '@/helpers';

export const RoomCard = ({ room }: RoomCardProps) => {
  return (
    <article className="overflow-hidden rounded-2xl border bg-white shadow-sm">
      <div className="relative h-56 w-full">
        <Image
          src={room.images[0]?.url || '/images/placeholder.jpg'}
          alt={room.images[0]?.alt || room.name}
          fill
          className="object-cover"
        />
      </div>

      <div className="p-4">
        <h3 className="text-xl font-semibold">{room.name}</h3>
        <p className="mt-2 line-clamp-2 text-sm text-gray-600">
          {room.description}
        </p>

        <div className="mt-4 flex items-center justify-between">
          <span className="font-medium text-green-700">
            {formatCurrency(room.price)} / đêm
          </span>

          <Link
            href={`/rooms/${room.slug}`}
            className="rounded-full bg-green-700 px-4 py-2 text-sm text-white"
          >
            Xem chi tiết
          </Link>
        </div>
      </div>
    </article>
  );
};
```

### `components/features/rooms/RoomCard/index.ts`

```ts
export { RoomCard } from './RoomCard';
export type { RoomCardProps } from './RoomCard.types';
```

---

## 9. Quy tắc page trong App Router

Mỗi page chỉ nên đóng vai trò:

- Lấy data.
- Gọi component chính.
- Cấu hình metadata nếu cần.

Không viết UI quá dài trực tiếp trong `page.tsx`.

Ví dụ `app/rooms/page.tsx`:

```tsx
import type { Metadata } from 'next';
import { RoomList } from '@/components/features/rooms/RoomList';
import { rooms } from '@/data/rooms';

export const metadata: Metadata = {
  title: 'Danh sách phòng',
  description: 'Khám phá các phòng homestay đẹp, tiện nghi và giá tốt.',
};

export default function RoomsPage() {
  return <RoomList rooms={rooms} />;
}
```

---

## 10. Quy tắc import alias

Cấu hình `tsconfig.json`:

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  }
}
```

Sử dụng import alias:

```ts
import { formatCurrency } from '@/helpers';
import type { Room } from '@/types';
import { RoomCard } from '@/components/features/rooms/RoomCard';
```

Không dùng import tương đối quá sâu:

```ts
// Không khuyến khích
import { formatCurrency } from '../../../../helpers/formatCurrency';
```

---

## 11. Quy tắc đặt tên

### Folder

```txt
PascalCase cho component folder
camelCase cho helper/service/hook file
kebab-case cho route folder nếu cần SEO
```

Ví dụ:

```txt
RoomCard
ContactForm
formatCurrency.ts
useDebounce.ts
rooms/[slug]
```

### Component

```tsx
export const RoomCard = () => {};
```

Không dùng:

```tsx
export default function Component() {}
```

Ngoại lệ: file `page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx` của Next.js bắt buộc dùng default export.

---

## 12. Quy tắc service API

Tất cả logic gọi API đặt trong:

```txt
src/services/
```

Ví dụ `services/apiClient.ts`:

```ts
import axios from 'axios';

export const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  timeout: 10000,
});
```

Ví dụ `services/roomService.ts`:

```ts
import { apiClient } from './apiClient';
import type { Room } from '@/types';

export const roomService = {
  getRooms: async (): Promise<Room[]> => {
    const response = await apiClient.get<Room[]>('/rooms');
    return response.data;
  },

  getRoomBySlug: async (slug: string): Promise<Room> => {
    const response = await apiClient.get<Room>(`/rooms/${slug}`);
    return response.data;
  },
};
```

---

## 13. Quy tắc data mock

Nếu chưa có backend, data mock đặt trong:

```txt
src/data/
```

Ví dụ `data/rooms.ts`:

```ts
import type { Room } from '@/types';

export const rooms: Room[] = [
  {
    id: 'room-001',
    name: 'Phòng Garden View',
    slug: 'phong-garden-view',
    description: 'Phòng có view sân vườn, phù hợp cho cặp đôi hoặc gia đình nhỏ.',
    price: 750000,
    capacity: 2,
    images: [
      {
        id: 'img-001',
        url: '/images/rooms/garden-view.jpg',
        alt: 'Phòng Garden View',
      },
    ],
    amenities: ['Wifi', 'Điều hòa', 'Máy sấy', 'Ban công'],
    isAvailable: true,
  },
];
```

---

## 14. Quy tắc CSS / Tailwind

- Ưu tiên Tailwind CSS.
- Không viết inline style nếu không cần thiết.
- Class quá dài có thể tách thành component nhỏ.
- Các style dùng lại nhiều lần có thể đưa vào helper `cn` hoặc component common.

Ví dụ helper `cn.ts`:

```ts
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export const cn = (...inputs: ClassValue[]) => {
  return twMerge(clsx(inputs));
};
```

---

## 15. Quy tắc form

Nếu form đơn giản:

```txt
useState + validation thủ công
```

Nếu form phức tạp:

```txt
React Hook Form + Zod
```

Type của form đặt trong:

```txt
src/types/contact.type.ts
```

Ví dụ:

```ts
export type ContactFormValues = {
  fullName: string;
  phone: string;
  email?: string;
  message: string;
};
```

---

## 16. Quy tắc SEO

Mỗi page quan trọng cần có `metadata`.

Ví dụ:

```tsx
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Homestay gần thiên nhiên',
  description: 'Không gian nghỉ dưỡng yên tĩnh, hiện đại và gần gũi thiên nhiên.',
};
```

Với detail page dùng dynamic metadata:

```tsx
import type { Metadata } from 'next';
import { rooms } from '@/data/rooms';

type PageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export const generateMetadata = async ({
  params,
}: PageProps): Promise<Metadata> => {
  const { slug } = await params;
  const room = rooms.find((item) => item.slug === slug);

  return {
    title: room?.name || 'Chi tiết phòng',
    description: room?.description || 'Thông tin chi tiết phòng homestay.',
  };
};
```

---

## 17. Quy tắc Server Component / Client Component

Mặc định dùng **Server Component**.

Chỉ thêm `'use client'` khi component cần:

- `useState`
- `useEffect`
- event handler như `onClick`, `onChange`
- browser API như `window`, `localStorage`
- thư viện chỉ chạy ở client

Ví dụ:

```tsx
'use client';

import { useState } from 'react';

export const Counter = () => {
  const [count, setCount] = useState(0);

  return <button onClick={() => setCount(count + 1)}>{count}</button>;
};
```

---

## 18. Checklist khi code

Trước khi hoàn thành task, cần kiểm tra:

- [ ] Component đã được tách folder riêng chưa?
- [ ] Type dùng chung đã đặt trong `src/types` chưa?
- [ ] Hàm dùng chung đã đặt trong `src/helpers` chưa?
- [ ] Page có đang quá dài không?
- [ ] Có dùng import alias `@/` chưa?
- [ ] Có metadata SEO cho page quan trọng chưa?
- [ ] Có dùng TypeScript đầy đủ chưa?
- [ ] Có tránh `any` không cần thiết chưa?
- [ ] Có tách logic API vào `services` chưa?
- [ ] Có export qua `index.ts` chưa?

---

## 19. Yêu cầu Codex thực hiện

Khi code dự án này, hãy tuân thủ các nguyên tắc sau:

1. Tạo project Next.js với TypeScript.
2. Sử dụng cấu trúc folder như mô tả ở trên.
3. Không viết toàn bộ UI trong một file lớn.
4. Component phải được chia nhỏ, mỗi component có folder riêng.
5. Type dùng chung phải đặt trong `src/types`.
6. Helper dùng chung phải đặt trong `src/helpers`.
7. API logic phải đặt trong `src/services`.
8. Data mock phải đặt trong `src/data`.
9. Import nên dùng alias `@/`.
10. Ưu tiên Server Component, chỉ dùng Client Component khi cần.
11. Code phải rõ ràng, dễ đọc, dễ mở rộng.
12. Không dùng `any` nếu có thể định nghĩa type cụ thể.
13. Mỗi route chính nên có metadata SEO.
14. Sau khi code xong, kiểm tra lint và TypeScript error.

---

## 20. Kết quả mong muốn

Sau khi hoàn thành, project cần đạt:

- Cấu trúc source code rõ ràng.
- Component dễ tái sử dụng.
- TypeScript type an toàn.
- Helper function tập trung, không lặp code.
- Dễ mở rộng thêm page, component, API service.
- Phù hợp để phát triển sản phẩm thực tế bằng Next.js.
