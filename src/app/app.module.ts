import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';

import { AppComponent } from './app.component';

import { NgSelectModule } from '@ng-select/ng-select';

import { LOCALE_ID } from '@angular/core';
import { registerLocaleData } from '@angular/common';
import localeCa from '@angular/common/locales/ca';
import { PillListComponent } from './components/pill-list/pill-list.component';  // Spanish locale data

// Register the French locale
registerLocaleData(localeCa, 'ca');

@NgModule({
  declarations: [
    AppComponent,
    PillListComponent
  ],
  imports: [
    BrowserModule,
    FormsModule,
    NgSelectModule,
    HttpClientModule
  ],
  providers: [
    { provide: LOCALE_ID, useValue: 'ca' }  // Set the locale globally
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
