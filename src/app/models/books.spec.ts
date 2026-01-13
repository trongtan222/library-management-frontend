import { Books } from './book';

describe('Books', () => {
  it('should create a Books object', () => {
    const sample: Books = {
      id: 1,
      name: 'Sample Book',
      authors: [{ id: 1, name: 'Author' }],
      categories: [{ id: 1, name: 'Category' }],
      publishedYear: 2020,
      isbn: 'ISBN-1234',
      numberOfCopiesAvailable: 3,
      coverUrl: ''
    };
    expect(sample).toBeTruthy();
  });
});
