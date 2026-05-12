import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  OnDestroy,
  input,
  viewChild,
} from '@angular/core';
import { Scene } from '@babylonjs/core';
import { BabylonSceneService } from './babylon-scene.service';

export type BabylonSetupFn = (scene: Scene) => void;
export type BabylonFrameFn = (scene: Scene, deltaSeconds: number) => void;

@Component({
  selector: 'app-babylon-adapter',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [BabylonSceneService],
  templateUrl: './babylon-adapter.component.html',
  styleUrl: './babylon-adapter.component.scss',
})
export class BabylonAdapterComponent implements AfterViewInit, OnDestroy {
  readonly setupFn = input<BabylonSetupFn | undefined>(undefined);
  readonly frameFn = input<BabylonFrameFn | undefined>(undefined);
  readonly paused = input(false);

  private readonly canvasRef = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');
  private scene!: Scene;

  constructor(private readonly babylonScene: BabylonSceneService) {}

  ngAfterViewInit(): void {
    this.scene = this.babylonScene.initialize(this.canvasRef().nativeElement);
    this.setupFn()?.(this.scene);

    this.babylonScene.runRenderLoop((dt: number) => {
      if (!this.paused()) {
        this.frameFn()?.(this.scene, dt);
      }
    });
  }

  @HostListener('window:resize')
  onResize(): void {
    this.babylonScene.resize();
  }

  ngOnDestroy(): void {
    this.babylonScene.ngOnDestroy();
  }
}
