// Đổi tên từ Users thành User
export class User {
    userId: number;
    username: string;
    name: string;
    email?: string;
    password?: string;
    roles: string[];
    role?: string; // Vai trò chính (admin, user, ...)
    className?: string; // Lớp học của user (nếu là học sinh)
    loanHistory?: any[]; // Lịch sử mượn sách (có thể là Borrow[] hoặc object)
}