import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { AppComponent } from './app.component';
import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';
import { HeaderComponent } from './components/header/header.component';
import { GridComponent } from './components/grid/grid.component';
import { GridFolderComponent } from './components/grid-folder/grid-folder.component';
import { AppRoutingModule } from './app-routing.module';
import { BrowserComponent } from './components/browser/browser.component';
import { GridVideoComponent } from './components/grid-video/grid-video.component';
import { GridImageComponent } from './components/grid-image/grid-image.component';
import { VideoCaptionComponent } from './components/grid-video/video-caption/video-caption.component';
import { ImageGalleryComponent } from './components/image-gallery/image-gallery.component';
import { FooterComponent } from './components/footer/footer.component';
import { HttpErrorInterceptor } from './util/http-error-interceptor';
import { LoginComponent } from './components/login/login.component';
import { UploadComponent } from './components/upload/upload.component';
import { NewFolderComponent } from './components/new-folder/new-folder.component';
import { WebsocketService } from './services/web-sockets/web-sockets.service';
import { ServerLogDialogComponent } from './components/server-log-dialog/server-log-dialog.component';
import { InputModalComponent } from './components/input-modal/input-modal.component';

@NgModule({
  declarations: [
    AppComponent,
    HeaderComponent,
    GridComponent,
    GridFolderComponent,
    BrowserComponent,
    GridVideoComponent,
    GridImageComponent,
    VideoCaptionComponent,
    ImageGalleryComponent,
    FooterComponent,
    LoginComponent,
    UploadComponent,
    NewFolderComponent,
    ServerLogDialogComponent,
    InputModalComponent
  ],
  imports: [
    AppRoutingModule,
    BrowserModule,
    HttpClientModule,
  ],
  providers: [
    { provide: HTTP_INTERCEPTORS, useClass: HttpErrorInterceptor, multi: true },
    WebsocketService
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
