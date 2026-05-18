import { Injectable, OnDestroy } from '@angular/core';
import { Engine, Scene, ArcRotateCamera, HemisphericLight, Vector3, Color4 } from '@babylonjs/core';

@Injectable()
export class BabylonSceneService implements OnDestroy {
  private engine!: Engine;
  private _scene!: Scene;

  get scene(): Scene {
    return this._scene;
  }

  initialize(canvas: HTMLCanvasElement): Scene {
    this.engine = new Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true });

    this._scene = new Scene(this.engine);
    this._scene.clearColor = new Color4(0.06, 0.07, 0.09, 1);

    const camera = new ArcRotateCamera('camera', -Math.PI / 2, Math.PI * 0.42, 6, new Vector3(0, -1, 0), this._scene);
    camera.lowerRadiusLimit = 2;
    camera.upperRadiusLimit = 20;
    camera.attachControl(canvas, true);

    const light = new HemisphericLight('light', new Vector3(0, 1, 0), this._scene);
    light.intensity = 0.9;

    return this._scene;
  }

  runRenderLoop(frameFn: (deltaSeconds: number) => void): void {
    let lastTime = performance.now();
    this.engine.runRenderLoop(() => {
      const now = performance.now();
      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;
      frameFn(dt);
      this._scene.render();
    });
  }

  resize(): void {
    this.engine.resize();
  }

  ngOnDestroy(): void {
    this.engine.stopRenderLoop();
    this._scene.dispose();
    this.engine.dispose();
  }
}
