import { Routes } from '@angular/router';
import { RegisterComponent } from './components/register/register.component';

export const routes: Routes = [
  { path: '', component: RegisterComponent },
  { path: 'about', component: RegisterComponent },
  { path: '**', redirectTo: '', pathMatch: 'full' } 
];