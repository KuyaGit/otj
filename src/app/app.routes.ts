import { Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home.component';
import { AccessoryDetailComponent } from './pages/accessory-detail/accessory-detail.component';
import { ReferenceComponent } from './pages/reference/reference.component';
import { JeepdashComponent } from './pages/jeepdash/jeepdash.component';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'accessory/:id', component: AccessoryDetailComponent },
  { path: 'reference', component: ReferenceComponent },
  { path: 'jeepdash', component: JeepdashComponent },
  {
    path: 'map',
    loadComponent: () => import('./pages/jeep-map/jeep-map.component').then((m) => m.JeepMapComponent),
  },
  { path: '**', redirectTo: '' },
];
