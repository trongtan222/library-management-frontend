export class Users {
    userId: number;
    username: string;
    name: string;
    password?: string; // Mật khẩu không bao giờ được gửi về, nên để optional
    roles: string[]; // Sửa từ 'any' thành 'string[]'
}
