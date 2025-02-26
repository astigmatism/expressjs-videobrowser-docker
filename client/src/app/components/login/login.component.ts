import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { HttpService } from 'src/app/services/http/http.service';

@Component({
    selector: 'app-login',
    templateUrl: './login.component.html',
    styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit {

    @ViewChild('password') password!: ElementRef;

    constructor(private httpService: HttpService, private router: Router) { }

    ngOnInit(): void {
    }

    onClick(): void {
        const password = this.password.nativeElement.value;
        const sub = this.httpService.login(password).subscribe((data: any) => {
            sub.unsubscribe();
            this.router.navigate(['/']);
        });
    }

    onKeyDown(event: KeyboardEvent): void {
        switch(event.key) {
            case 'Enter':
                this.onClick();
               break;
        }
    }
}
