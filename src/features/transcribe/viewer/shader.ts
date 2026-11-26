/**
 * One fragment pass (plan §9): projective resample (zoom, pan, straighten, perspective), then
 * unsharp mask, local contrast, raking light, levels, brightness/contrast, grey, invert.
 * Local contrast reads the mipmap chain as a cheap wide blur, so its cost doesn't grow with
 * the radius. Every branch is on a uniform, so derivatives stay defined.
 */
export const VERTEX = `#version 300 es
in vec2 corner;
void main() { gl_Position = vec4(corner, 0.0, 1.0); }
`;

export const FRAGMENT = `#version 300 es
precision highp float;
uniform sampler2D photo;
uniform mat3 toSource;      // canvas px (y down) -> source uv
uniform vec2 canvasPx;
uniform vec2 texel;         // 1 / photo size
uniform float brightness, contrast, black, white, gamma, grayscale, invert;
uniform float sharpen, localContrast, emboss, localLod;
uniform vec2 light;         // unit vector the light comes from, in uv
uniform vec3 background;
out vec4 outColor;

float luma(vec3 c) { return dot(c, vec3(0.299, 0.587, 0.114)); }
vec3 at(vec2 uv) { return textureLod(photo, uv, 0.0).rgb; }

void main() {
  vec2 p = vec2(gl_FragCoord.x, canvasPx.y - gl_FragCoord.y);
  vec3 h = toSource * vec3(p, 1.0);
  vec2 uv = h.xy / h.z;
  vec3 c = texture(photo, uv).rgb;

  if (sharpen > 0.0) {
    vec2 d = texel * 1.5;
    vec3 blur = (at(uv + vec2(d.x, 0.0)) + at(uv - vec2(d.x, 0.0)) +
                 at(uv + vec2(0.0, d.y)) + at(uv - vec2(0.0, d.y))) * 0.15 +
                (at(uv + d) + at(uv - d) + at(uv + vec2(d.x, -d.y)) + at(uv - vec2(d.x, -d.y))) * 0.1;
    c += sharpen * (c - blur);
  }
  if (localContrast > 0.0) {
    // Contrast-limited: detail around the local mean is boosted, but clipped so flat areas
    // don't turn to noise and bright spots don't bloom.
    vec3 mean = mix(textureLod(photo, uv, localLod).rgb, textureLod(photo, uv, localLod + 1.5).rgb, 0.5);
    vec3 detail = clamp((c - mean) * (1.0 + 4.0 * localContrast), -0.45, 0.45);
    c = mix(c, vec3(0.5) + detail + (mean - vec3(0.5)) * (1.0 - localContrast), localContrast);
  }
  if (emboss > 0.0) {
    vec2 d = light * texel * 2.0;
    float relief = 0.5 + 3.0 * (luma(at(uv + d)) - luma(at(uv - d)));
    c = mix(c, c * 2.0 * clamp(relief, 0.0, 1.0), emboss);
  }
  c = clamp((c - black) / max(white - black, 0.01), 0.0, 1.0);
  c = pow(c, vec3(1.0 / gamma));
  c = (c - 0.5) * (1.0 + contrast) + 0.5 + brightness;
  if (grayscale > 0.5) c = vec3(luma(c));
  if (invert > 0.5) c = 1.0 - c;

  bool inside = h.z > 0.0 && all(greaterThanEqual(uv, vec2(0.0))) && all(lessThanEqual(uv, vec2(1.0)));
  outColor = vec4(inside ? clamp(c, 0.0, 1.0) : background, 1.0);
}
`;
