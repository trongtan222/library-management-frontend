import { Book } from './book.model';
import { User } from './user.model';

/**
 * Loan/Borrow Record model.
 * Represents a book loan transaction.
 */
export interface Loan {
  id: number;
  book?: Book;
  bookId?: number;
  user?: User;
  userId?: number;
  borrowDate: Date;
  dueDate: Date;
  returnDate?: Date;
  status: LoanStatus;
  renewalCount?: number;
  notes?: string;
}

/**
 * Loan status enum
 */
export enum LoanStatus {
  ACTIVE = 'ACTIVE',
  RETURNED = 'RETURNED',
  OVERDUE = 'OVERDUE',
  RENEWED = 'RENEWED',
}

/**
 * Reservation model
 */
export interface Reservation {
  id: number;
  book?: Book;
  bookId: number;
  user?: User;
  userId: number;
  reservationDate: Date;
  expiryDate?: Date;
  status: ReservationStatus;
  notified?: boolean;
}

/**
 * Reservation status enum
 */
export enum ReservationStatus {
  PENDING = 'PENDING',
  READY = 'READY',
  FULFILLED = 'FULFILLED',
  EXPIRED = 'EXPIRED',
  CANCELLED = 'CANCELLED',
}

/**
 * Adapter for Loan data
 */
export class LoanAdapter {
  static adapt(raw: any): Loan {
    if (!raw) {
      throw new Error('Cannot adapt null or undefined loan data');
    }

    return {
      id: raw.loanId || raw.id,
      book: raw.book,
      bookId: raw.bookId,
      user: raw.user || raw.member,
      userId: raw.userId || raw.memberId,
      borrowDate: new Date(raw.borrowDate || raw.loanDate),
      dueDate: new Date(raw.dueDate || raw.returnDate),
      returnDate: raw.returnDate ? new Date(raw.returnDate) : undefined,
      status: this.normalizeStatus(raw.status),
      renewalCount: raw.renewalCount || raw.renewCount || 0,
      notes: raw.notes,
    };
  }

  private static normalizeStatus(status: any): LoanStatus {
    if (!status) return LoanStatus.ACTIVE;

    const statusStr = String(status).toUpperCase();
    if (statusStr in LoanStatus) {
      return LoanStatus[statusStr as keyof typeof LoanStatus];
    }

    return LoanStatus.ACTIVE;
  }

  static adaptMany(rawLoans: any[]): Loan[] {
    if (!Array.isArray(rawLoans)) {
      return [];
    }
    return rawLoans.map((loan) => LoanAdapter.adapt(loan));
  }
}

/**
 * Adapter for Reservation data
 */
export class ReservationAdapter {
  static adapt(raw: any): Reservation {
    if (!raw) {
      throw new Error('Cannot adapt null or undefined reservation data');
    }

    return {
      id: raw.reservationId || raw.id,
      book: raw.book,
      bookId: raw.bookId,
      user: raw.user || raw.member,
      userId: raw.userId || raw.memberId,
      reservationDate: new Date(raw.reservationDate || raw.createdDate),
      expiryDate: raw.expiryDate ? new Date(raw.expiryDate) : undefined,
      status: this.normalizeStatus(raw.status),
      notified: raw.notified || false,
    };
  }

  private static normalizeStatus(status: any): ReservationStatus {
    if (!status) return ReservationStatus.PENDING;

    const statusStr = String(status).toUpperCase();
    if (statusStr in ReservationStatus) {
      return ReservationStatus[statusStr as keyof typeof ReservationStatus];
    }

    return ReservationStatus.PENDING;
  }

  static adaptMany(rawReservations: any[]): Reservation[] {
    if (!Array.isArray(rawReservations)) {
      return [];
    }
    return rawReservations.map((res) => ReservationAdapter.adapt(res));
  }
}
