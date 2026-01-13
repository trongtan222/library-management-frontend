import { Borrow } from './borrow';

describe('Borrow', () => {
  it('should create a Borrow object', () => {
    const sample: Borrow = {
      bookName: 'Sample Book',
      borrowId: 1,
      bookId: 10,
      userId: 5,
      issueDate: '2025-01-01',
      dueDate: '2025-01-10'
    };
    expect(sample).toBeTruthy();
  });
});
