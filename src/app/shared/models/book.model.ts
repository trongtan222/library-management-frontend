/**
 * Standardized Book model for the entire application.
 * Use this instead of inline interfaces to ensure consistency.
 *
 * Backend inconsistency handled by BookAdapter:
 * - Backend returns both 'bookId' and 'id'
 * - Backend returns both 'bookName' and 'name'
 * - This model normalizes to single standard fields
 */
export interface Book {
  id: number;
  name: string;
  author: string;
  genre?: string;
  category?: string;
  coverUrl?: string;
  description?: string;
  isbn?: string;
  publisher?: string;
  publicationYear?: number;
  numberOfCopies: number;
  numberOfCopiesAvailable: number;
  language?: string;
  pageCount?: number;
}

/**
 * Adapter to normalize backend data into standard Book model.
 * Handles field name inconsistencies from different endpoints.
 *
 * Usage:
 * ```typescript
 * this.http.get<any[]>('/api/books').pipe(
 *   map(books => books.map(BookAdapter.adapt))
 * )
 * ```
 */
export class BookAdapter {
  static adapt(raw: any): Book {
    if (!raw) {
      throw new Error('Cannot adapt null or undefined book data');
    }

    return {
      id: raw.bookId || raw.id,
      name: raw.bookName || raw.name || 'Untitled',
      author: raw.bookAuthor || raw.author || 'Unknown Author',
      genre: raw.bookGenre || raw.genre,
      category: raw.bookCategory || raw.category,
      coverUrl: raw.coverUrl || raw.bookCoverUrl || raw.imageUrl,
      description: raw.description || raw.bookDescription,
      isbn: raw.isbn,
      publisher: raw.publisher,
      publicationYear: raw.publicationYear || raw.publishYear,
      numberOfCopies: raw.noOfCopies || raw.numberOfCopies || 0,
      numberOfCopiesAvailable:
        raw.numberOfCopiesAvailable || raw.noOfCopiesAvailable || 0,
      language: raw.language || 'Vietnamese',
      pageCount: raw.pageCount || raw.pages,
    };
  }

  /**
   * Adapt array of books
   */
  static adaptMany(rawBooks: any[]): Book[] {
    if (!Array.isArray(rawBooks)) {
      return [];
    }
    return rawBooks.map((book) => BookAdapter.adapt(book));
  }
}
