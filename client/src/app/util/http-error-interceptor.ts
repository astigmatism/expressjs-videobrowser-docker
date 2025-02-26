import { Injectable } from '@angular/core';
import { HttpRequest, HttpHandler, HttpEvent, HttpInterceptor, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, of } from 'rxjs';
import { catchError, retry } from 'rxjs/operators';
import { Router } from '@angular/router';
import { HttpService } from '../services/http/http.service';

@Injectable()
export class HttpErrorInterceptor implements HttpInterceptor {

    constructor(private httpService: HttpService, private router: Router) { }

    intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {

        let handled: boolean = false;

        // include cookies
        request = request.clone({
            withCredentials: true
        });

        return next.handle(request)
            .pipe(
                catchError((returnedError) => {
                    let errorMessage = null;

                    if (returnedError.error instanceof ErrorEvent) {
                        errorMessage = `Error: ${returnedError.error.message}`;
                    } else if (returnedError instanceof HttpErrorResponse) {
                        errorMessage = `Error Status ${returnedError.status}: ${returnedError.error ? returnedError.error.error: 'No error title'} - ${returnedError.error ? returnedError.error.message : 'No error message'}`;
                        handled = this.handleServerSideError(returnedError);
                    }

                    //console.error(errorMessage ? errorMessage : returnedError);

                    if (!handled) {
                        if (errorMessage) {
                            return throwError(errorMessage);
                        } else {
                            return throwError("Unexpected problem occurred");
                        }
                    } else {
                        return of(returnedError);
                    }
                })
            )
    }

    private handleServerSideError(error: HttpErrorResponse): boolean {
        let handled: boolean = false;

        switch (error.status) {
            case 401:
                this.router.navigate(['login']);
                handled = true;
                break;
            case 403:
                this.router.navigate(['login']);
                handled = true;
                break;
        }

        return handled;
    }
}