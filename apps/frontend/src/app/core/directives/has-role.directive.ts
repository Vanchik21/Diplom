import {
  Directive,
  inject,
  Input,
  TemplateRef,
  ViewContainerRef,
} from '@angular/core';
import { AuthService } from '../auth/auth.service';

@Directive({
  selector: '[hasRole]',
  standalone: true,
})
export class HasRoleDirective {
  private readonly auth = inject(AuthService);
  private readonly vcr = inject(ViewContainerRef);
  private readonly tpl = inject(TemplateRef);

  @Input() set hasRole(role: 'Student' | 'Teacher' | 'Admin') {
    const userRole = this.auth.userRole();
    const allowed = userRole === role || userRole === 'Admin';
    this.vcr.clear();
    if (allowed) this.vcr.createEmbeddedView(this.tpl);
  }
}
