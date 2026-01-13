export interface Author {
  id: number;
  name: string;
}

export interface Category {
  id: number;
  name: string;
}

// Đổi tên từ Books (số nhiều) thành Book (số ít)
export interface Book {
  id: number;
  name: string;
  authors: Author[];
  categories: Category[];
  publishedYear: number;
  isbn: string;
  numberOfCopiesAvailable: number;
  coverUrl?: string;
  description?: string;
  isWishlisted?: boolean;
}