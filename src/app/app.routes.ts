import { Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home.component';
import { AccessoryDetailComponent } from './pages/accessory-detail/accessory-detail.component';
import { ReferenceComponent } from './pages/reference/reference.component';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'accessory/:id', component: AccessoryDetailComponent },
  { path: 'reference', component: ReferenceComponent },
  { path: '**', redirectTo: '' },
];
