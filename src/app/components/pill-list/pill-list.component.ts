import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-pill-list',
  templateUrl: './pill-list.component.html',
  styleUrls: ['./pill-list.component.scss']
})
export class PillListComponent {
  @Input() items: string[] = [];

  getItemClassName(itemStr: string): string {
    return itemStr.replace(/\s+/g, "_").replace('+', "plus").replace('ç', "c").toLowerCase();
  }
}