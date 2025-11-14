import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { UsersService } from '../services/users.service';

@Component({
    selector: 'app-update-user',
    templateUrl: './update-user.component.html',
    styleUrls: ['./update-user.component.css'],
    standalone: false
})
export class UpdateUserComponent implements OnInit {
  userId: number;
  user: { name: string; username: string; roles: string } = { name: '', username: '', roles: '' };
  
  constructor(
    private usersService: UsersService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.userId = this.route.snapshot.params['userId'];
    this.usersService.getUserById(this.userId).subscribe(data => {
      this.user = {
        name: data.name,
        username: data.username,
        roles: data.roles.join(', ') // Chuyển mảng roles thành chuỗi để hiển thị
      };
    });
  }

  onSubmit() {
    // Chuyển chuỗi roles thành mảng trước khi gửi đi
    const rolesArray = this.user.roles.split(',').map(role => role.trim()).filter(Boolean);
    
    const payload = {
      name: this.user.name,
      username: this.user.username,
      roles: rolesArray
    };

    this.usersService.updateUser(this.userId, payload).subscribe(() => {
      this.router.navigate(['/users']);
    }, error => console.log(error));
  }
}
