export interface Author {
  id: number;
  name: string;
  portraitUrl?: string;
  wikipediaUrl?: string;
  websiteUrl?: string;
  bookCount?: number;
}

export interface Category {
  id: number;
  name: string;
  bookCount?: number;
  parentId?: number;
  color?: string;
  iconClass?: string;
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
