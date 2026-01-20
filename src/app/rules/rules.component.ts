import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';

interface Rule {
  id: number;
  category: string;
  icon: string;
  color: string;
  items: RuleItem[];
  expanded?: boolean;
}

interface RuleItem {
  title: string;
  description: string;
  important?: boolean;
}

interface FAQ {
  question: string;
  answer: string;
  expanded?: boolean;
}

@Component({
  selector: 'app-rules',
  templateUrl: './rules.component.html',
  styleUrls: ['./rules.component.css'],
  standalone: false,
})
export class RulesComponent implements OnInit {
  searchQuery = '';
  rules: Rule[] = [];
  filteredRules: Rule[] = [];
  faqs: FAQ[] = [];

  // Contact form
  contactForm = {
    name: '',
    email: '',
    question: '',
  };
  isSubmittingContact = false;

  ngOnInit(): void {
    this.loadRules();
    this.loadFAQs();
  }

  loadRules(): void {
    // TODO: Replace with API call to backend
    // Example: this.rulesService.getAllRules().subscribe(data => this.rules = data);

    this.rules = [
      {
        id: 1,
        category: 'Quy định Mượn - Trả Sách',
        icon: 'fa-book',
        color: 'primary',
        expanded: true,
        items: [
          {
            title: 'Số lượng sách được mượn',
            description:
              'Mỗi bạn đọc được mượn tối đa 5 cuốn sách cùng một lúc.',
            important: true,
          },
          {
            title: 'Thời hạn mượn sách',
            description:
              'Thời hạn mượn sách là 14 ngày (2 tuần). Có thể gia hạn thêm 1 lần nếu không có người đặt trước.',
          },
          {
            title: 'Điều kiện mượn sách',
            description:
              'Phải có thẻ thư viện hợp lệ và không có khoản phạt nào chưa thanh toán.',
          },
          {
            title: 'Gia hạn sách',
            description:
              'Có thể gia hạn trực tuyến hoặc đến quầy thủ thư trước khi hết hạn 24 giờ.',
          },
        ],
      },
      {
        id: 2,
        category: 'Mức Phạt & Đền Bù',
        icon: 'fa-money-bill-wave',
        color: 'danger',
        items: [
          {
            title: 'Phạt trả sách quá hạn',
            description: '5.000đ/ngày/cuốn sách. Tối đa 200.000đ cho mỗi cuốn.',
            important: true,
          },
          {
            title: 'Làm mất sách',
            description:
              'Đền bù 200% giá trị cuốn sách hoặc mua sách mới cùng loại để thay thế.',
            important: true,
          },
          {
            title: 'Làm hư hỏng sách',
            description:
              'Tùy mức độ hư hại: Nhẹ (50.000đ), Trung bình (100.000đ), Nặng (đền bù toàn bộ như mất sách).',
          },
          {
            title: 'Không trả thẻ thư viện khi kết thúc',
            description: 'Phí làm lại thẻ mới: 20.000đ.',
          },
        ],
      },
      {
        id: 3,
        category: 'Giờ Mở Cửa & Địa Điểm',
        icon: 'fa-clock',
        color: 'info',
        items: [
          {
            title: 'Giờ mở cửa (Thứ 2 - Thứ 6)',
            description: '7:00 - 17:30',
          },
          {
            title: 'Giờ mở cửa (Thứ 7)',
            description: '8:00 - 12:00',
          },
          {
            title: 'Ngày nghỉ',
            description:
              'Chủ nhật và các ngày lễ, Tết theo quy định của nhà trường.',
          },
          {
            title: 'Địa điểm',
            description: 'Tầng 2, Tòa nhà A, Trường THCS Nguyễn Du.',
          },
        ],
      },
      {
        id: 4,
        category: 'Quy định Hành vi trong Thư viện',
        icon: 'fa-user-shield',
        color: 'warning',
        items: [
          {
            title: 'Giữ im lặng',
            description:
              'Không gây ồn ào, không nói chuyện to, tắt hoặc để im lặng điện thoại.',
          },
          {
            title: 'Không ăn uống',
            description:
              'Không được ăn uống trong khu vực thư viện. Chỉ được uống nước kín nắp.',
          },
          {
            title: 'Giữ gìn vệ sinh',
            description:
              'Không xả rác, giữ gọn gàng khu vực bạn sử dụng trước khi rời đi.',
          },
          {
            title: 'Bảo quản tài liệu',
            description:
              'Không viết, vẽ, gấp góc, xé trang hoặc làm hư hại sách.',
          },
        ],
      },
      {
        id: 5,
        category: 'Quyền lợi của Bạn đọc',
        icon: 'fa-star',
        color: 'success',
        items: [
          {
            title: 'Tra cứu miễn phí',
            description:
              'Sử dụng hệ thống tra cứu sách trực tuyến và máy tính trong thư viện.',
          },
          {
            title: 'Đọc sách tại chỗ',
            description:
              'Đọc bất kỳ cuốn sách nào trong thư viện mà không cần mượn về.',
          },
          {
            title: 'Yêu cầu mua sách mới',
            description:
              'Góp ý mua thêm sách mới cho thư viện qua form góp ý hoặc email thủ thư.',
          },
          {
            title: 'Tham gia sự kiện',
            description:
              'Được mời tham gia các buổi giao lưu tác giả, câu lạc bộ đọc sách.',
          },
        ],
      },
    ];

    this.filteredRules = [...this.rules];
  }

  loadFAQs(): void {
    // TODO: Replace with API call
    this.faqs = [
      {
        question: 'Tôi có thể mượn bao nhiêu cuốn sách cùng lúc?',
        answer:
          'Bạn được mượn tối đa 5 cuốn sách cùng một lúc. Thời hạn mượn mỗi cuốn là 14 ngày.',
      },
      {
        question: 'Làm thế nào để gia hạn sách đã mượn?',
        answer:
          'Bạn có thể gia hạn trực tuyến qua tài khoản của mình hoặc đến quầy thủ thư. Lưu ý: Phải gia hạn trước khi hết hạn 24 giờ và chỉ được gia hạn 1 lần duy nhất.',
      },
      {
        question: 'Nếu làm mất sách thì phải làm sao?',
        answer:
          'Bạn cần thông báo ngay cho thủ thư và đền bù 200% giá trị cuốn sách hoặc mua sách mới cùng loại để thay thế. Sau đó mới được phép mượn sách tiếp.',
      },
      {
        question: 'Thư viện có mở cửa vào Chủ nhật không?',
        answer:
          'Không. Thư viện chỉ mở cửa từ Thứ 2 đến Thứ 7. Thứ 7 chỉ mở buổi sáng (8:00 - 12:00).',
      },
      {
        question:
          'Tôi có thể đọc sách trong thư viện mà không cần mượn về không?',
        answer:
          'Có! Bạn hoàn toàn có thể đọc bất kỳ cuốn sách nào tại chỗ mà không cần thủ tục mượn.',
      },
    ];
  }

  filterRules(): void {
    if (!this.searchQuery.trim()) {
      this.filteredRules = [...this.rules];
      return;
    }

    const query = this.searchQuery.toLowerCase();
    this.filteredRules = this.rules
      .map((rule) => ({
        ...rule,
        items: rule.items.filter(
          (item) =>
            item.title.toLowerCase().includes(query) ||
            item.description.toLowerCase().includes(query),
        ),
      }))
      .filter((rule) => rule.items.length > 0);
  }

  toggleRule(rule: Rule): void {
    rule.expanded = !rule.expanded;
  }

  toggleFAQ(faq: FAQ): void {
    faq.expanded = !faq.expanded;
  }

  expandAll(): void {
    this.filteredRules.forEach((rule) => (rule.expanded = true));
  }

  collapseAll(): void {
    this.filteredRules.forEach((rule) => (rule.expanded = false));
  }

  submitQuestion(): void {
    if (
      !this.contactForm.name ||
      !this.contactForm.email ||
      !this.contactForm.question
    ) {
      alert('Vui lòng điền đầy đủ thông tin!');
      return;
    }

    this.isSubmittingContact = true;

    // TODO: Call API to send question to admin
    // Example: this.rulesService.submitQuestion(this.contactForm).subscribe(...)

    setTimeout(() => {
      alert(
        'Câu hỏi của bạn đã được gửi đến thủ thư. Chúng tôi sẽ phản hồi qua email trong 24 giờ!',
      );
      this.contactForm = { name: '', email: '', question: '' };
      this.isSubmittingContact = false;
    }, 1000);
  }

  printRules(): void {
    window.print();
  }
}
