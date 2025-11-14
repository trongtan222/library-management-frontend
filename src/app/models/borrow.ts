// Model đầy đủ đọc từ backend
export interface Borrow {
bookName: any;
  borrowId: number;
  bookId: number;
  userId: number;
  issueDate: string;   // ISO yyyy-MM-dd
  dueDate: string;     // ISO yyyy-MM-dd
  returnDate?: string; // có thể null/undefined khi chưa trả
}

// DTO khi tạo mới — backend chỉ cần 2-3 trường
export type BorrowCreate = {
  bookId: number;
  userId: number;
  loanDays: number;        // server tính dueDate (hoặc bạn gửi kèm)
  issueDate?: string;      // nếu BE cho phép client gửi
  dueDate?: string;        // nếu BE cho phép client gửi
};
