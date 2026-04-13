import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'sliceText'
})
export class SliceTextPipe implements PipeTransform {


  transform(text: string, count: number): string {
    return text.split(" ").slice(0,count).join(" ");
  }

}
