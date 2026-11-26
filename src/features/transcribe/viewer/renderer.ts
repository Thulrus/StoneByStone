/** WebGL2 drawing for the photo viewer. No React; one instance per canvas. */
import type { Enhancement } from './filters';
import type { Mat3 } from './geometry';
import { FRAGMENT, VERTEX } from './shader';

const UNIFORMS = [
  'photo',
  'toSource',
  'canvasPx',
  'texel',
  'brightness',
  'contrast',
  'black',
  'white',
  'gamma',
  'grayscale',
  'invert',
  'sharpen',
  'localContrast',
  'emboss',
  'localLod',
  'light',
  'background',
] as const;
type Uniform = (typeof UNIFORMS)[number];

function compile(gl: WebGL2RenderingContext, type: number, src: string): WebGLShader {
  const s = gl.createShader(type);
  if (!s) throw new Error('createShader');
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) ?? '');
  return s;
}

export class PhotoRenderer {
  private readonly loc = new Map<Uniform, WebGLUniformLocation | null>();
  private texture: WebGLTexture | null = null;
  private size = { w: 1, h: 1 };

  private constructor(
    private readonly gl: WebGL2RenderingContext,
    private readonly program: WebGLProgram,
  ) {
    for (const u of UNIFORMS) this.loc.set(u, gl.getUniformLocation(program, u));
  }

  /** `undefined` where WebGL2 isn't available (the viewer falls back to CSS filters). */
  static create(canvas: HTMLCanvasElement): PhotoRenderer | undefined {
    const gl = canvas.getContext('webgl2', { preserveDrawingBuffer: true, antialias: false });
    if (!gl) return undefined;
    try {
      const program = gl.createProgram();
      gl.attachShader(program, compile(gl, gl.VERTEX_SHADER, VERTEX));
      gl.attachShader(program, compile(gl, gl.FRAGMENT_SHADER, FRAGMENT));
      gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return undefined;
      gl.useProgram(program);
      const buf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(
        gl.ARRAY_BUFFER,
        new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
        gl.STATIC_DRAW,
      );
      const corner = gl.getAttribLocation(program, 'corner');
      gl.enableVertexAttribArray(corner);
      gl.vertexAttribPointer(corner, 2, gl.FLOAT, false, 0, 0);
      return new PhotoRenderer(gl, program);
    } catch {
      return undefined;
    }
  }

  /** Upload the photo, with mipmaps for zoomed-out views and local contrast. */
  setImage(img: TexImageSource & { width: number; height: number }): void {
    const { gl } = this;
    if (this.texture) gl.deleteTexture(this.texture);
    this.texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    this.size = { w: img.width, h: img.height };
  }

  /** Draw one frame. `toSource` maps canvas device pixels to source uv. */
  draw(e: Enhancement, toSource: Mat3, background: readonly [number, number, number]): void {
    const { gl } = this;
    const w = gl.drawingBufferWidth;
    const h = gl.drawingBufferHeight;
    gl.viewport(0, 0, w, h);
    const u = (name: Uniform) => this.loc.get(name) ?? null;
    // GLSL mat3 is column-major; ours is row-major, so transpose on upload.
    gl.uniformMatrix3fv(u('toSource'), true, toSource as unknown as number[]);
    gl.uniform1i(u('photo'), 0);
    gl.uniform2f(u('canvasPx'), w, h);
    gl.uniform2f(u('texel'), 1 / this.size.w, 1 / this.size.h);
    gl.uniform1f(u('brightness'), e.brightness);
    gl.uniform1f(u('contrast'), e.contrast);
    gl.uniform1f(u('black'), e.black);
    gl.uniform1f(u('white'), e.white);
    gl.uniform1f(u('gamma'), e.gamma);
    gl.uniform1f(u('grayscale'), e.grayscale ? 1 : 0);
    gl.uniform1f(u('invert'), e.invert ? 1 : 0);
    gl.uniform1f(u('sharpen'), e.sharpen);
    gl.uniform1f(u('localContrast'), e.localContrast);
    gl.uniform1f(u('emboss'), e.emboss);
    // About a 1/40-of-the-photo radius, whatever its resolution.
    gl.uniform1f(u('localLod'), Math.max(1, Math.log2(Math.max(this.size.w, this.size.h) / 40)));
    const r = (e.lightDeg * Math.PI) / 180;
    gl.uniform2f(u('light'), -Math.cos(r), -Math.sin(r));
    gl.uniform3f(u('background'), ...background);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  dispose(): void {
    if (this.texture) this.gl.deleteTexture(this.texture);
    this.gl.deleteProgram(this.program);
  }
}
