// Định nghĩa interface cho Author và Category
export interface Author {
  id: number;
  name: string;
}

export interface Category {
  id: number;
  name: string;
}

// Model chính
export interface Books {
  id: number;
  name: string;
  authors: Author[]; // Phải là mảng Author
  categories: Category[]; // Phải là mảng Category
  publishedYear: number;
  isbn: string;
  numberOfCopiesAvailable: number; 
  coverUrl?: string;
}