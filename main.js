(function() {
  const canvas = document.getElementById('fractalCanvas');
  const buildInfoText = 'Last update: 2024-06-05 15:45 UTC';
  const buildInfoEl = document.getElementById('buildInfo');
  if (buildInfoEl) {
    buildInfoEl.textContent = buildInfoText;
  }
  const gl = canvas.getContext('webgl');
  if (!gl) {
    alert('WebGL not supported in this browser.');
    return;
  }

  // Vertex shader: full-screen quad
  const VERT_SRC = `
attribute vec2 a_position;
void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

  // Fragment shader: Mandelbrot / Julia with smooth coloring + animated palette
  const FRAG_SRC = `
precision highp float;

uniform vec2 u_resolution;
uniform vec2 u_center;
uniform float u_zoom;
uniform int u_iterations;
uniform float u_time;
uniform int u_juliaMode;
uniform vec2 u_c;

vec3 palette(float t) {
  // cosine palette: nice smooth rainbow-ish
  return 0.5 + 0.5 * cos(6.28318 * (vec3(0.0, 0.15, 0.33) + t));
}

void main() {
  // Normalized pixel coordinates (keeping aspect via height)
  vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution) / u_resolution.y;

  vec2 z;
  vec2 c;

  if (u_juliaMode == 0) {
    // Mandelbrot: z starts at 0, c is pixel
    z = vec2(0.0);
    c = u_center + uv * u_zoom;
  } else {
    // Julia: z is pixel, c is constant
    z = u_center + uv * u_zoom;
    c = u_c;
  }

  const int HARD_MAX_ITER = 2000;
  int maxIterInt = u_iterations;
  if (maxIterInt < 1) {
    maxIterInt = 1;
  }
  if (maxIterInt > HARD_MAX_ITER) {
    maxIterInt = HARD_MAX_ITER;
  }

  float maxIter = float(maxIterInt);

  int i = 0;
  bool hitBreak = false;
  for (int iter = 0; iter < HARD_MAX_ITER; ++iter) {
    i = iter;
    if (iter >= maxIterInt) {
      hitBreak = true;
      break;
    }
    // z = z^2 + c
    vec2 z2 = vec2(
      z.x * z.x - z.y * z.y,
      2.0 * z.x * z.y
    );
    z = z2 + c;
    if (dot(z, z) > 16.0) {
      hitBreak = true;
      break; // escape radius^2
    }
  }
  if (!hitBreak) {
    i = maxIterInt;
  }

  float t = float(i) / maxIter;

  // Smooth coloring for points that escaped
  if (i < maxIterInt) {
    float mag2 = dot(z, z);
    float log_zn = 0.5 * log(mag2);
    float nu = log(log_zn / log(2.0)) / log(2.0);
    t = (float(i) + 1.0 - nu) / maxIter;
  }

  // Slight palette animation over time
  t = fract(t + 0.05 * sin(u_time * 0.1));

  vec3 color = palette(t);

  // Inside the set: solid dark color
  if (i >= maxIterInt) {
    color = vec3(0.0);
  }

  gl_FragColor = vec4(color, 1.0);
}
`;

  function createShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error('Shader compile error:', gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      return null;
    }
    return shader;
  }

  function createProgram(gl, vertSrc, fragSrc) {
    const vs = createShader(gl, gl.VERTEX_SHADER, vertSrc);
    const fs = createShader(gl, gl.FRAGMENT_SHADER, fragSrc);
    if (!vs || !fs) return null;
    const program = gl.createProgram();
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error('Program link error:', gl.getProgramInfoLog(program));
      gl.deleteProgram(program);
      return null;
    }
    return program;
  }

  const program = createProgram(gl, VERT_SRC, FRAG_SRC);
  if (!program) {
    alert('Failed to create WebGL program.');
    return;
  }

  gl.useProgram(program);

  // Full-screen quad positions
  const positions = new Float32Array([
    -1, -1,
     1, -1,
    -1,  1,
    -1,  1,
     1, -1,
     1,  1,
  ]);

  const positionBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

  const aPositionLoc = gl.getAttribLocation(program, 'a_position');
  gl.enableVertexAttribArray(aPositionLoc);
  gl.vertexAttribPointer(aPositionLoc, 2, gl.FLOAT, false, 0, 0);

  // Uniform locations
  const uResolutionLoc = gl.getUniformLocation(program, 'u_resolution');
  const uCenterLoc     = gl.getUniformLocation(program, 'u_center');
  const uZoomLoc       = gl.getUniformLocation(program, 'u_zoom');
  const uIterationsLoc = gl.getUniformLocation(program, 'u_iterations');
  const uTimeLoc       = gl.getUniformLocation(program, 'u_time');
  const uJuliaModeLoc  = gl.getUniformLocation(program, 'u_juliaMode');
  const uCLoc          = gl.getUniformLocation(program, 'u_c');

  // View / fractal parameters
  let center = { x: -0.5, y: 0.0 };
  let zoom = 3.0;
  let iterations = 300;
  let juliaMode = 0; // 0 = Mandelbrot, 1 = Julia
  let juliaC = { x: -0.8, y: 0.156 };

  // Input handling
  let isDragging = false;
  let lastX = 0;
  let lastY = 0;

  function resizeCanvas() {
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    gl.viewport(0, 0, canvas.width, canvas.height);
  }

  window.addEventListener('resize', resizeCanvas);
  resizeCanvas();

  canvas.addEventListener('mousedown', (e) => {
    isDragging = true;
    lastX = e.clientX;
    lastY = e.clientY;
  });

  window.addEventListener('mouseup', () => {
    isDragging = false;
  });

  window.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    const dx = e.clientX - lastX;
    const dy = e.clientY - lastY;
    lastX = e.clientX;
    lastY = e.clientY;

    // Translate screen delta in pixels to complex plane delta
    const scale = zoom / canvas.height;
    center.x -= dx * scale;
    center.y += dy * scale;
  });

  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const delta = e.deltaY;
    const zoomFactor = Math.exp(delta * 0.001);
    zoom *= zoomFactor;

    // Adjust iterations gently with zoom depth
    const depth = Math.max(1.0, Math.log2(3.0 / zoom + 1.0));
    iterations = Math.round(150.0 + depth * 80.0);
    iterations = Math.min(iterations, 1500);
  }, { passive: false });

  // Click to set Julia constant
  canvas.addEventListener('click', (e) => {
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const x = (e.clientX - rect.left) * dpr;
    const y = (e.clientY - rect.top) * dpr;

    const uvx = (x - 0.5 * canvas.width) / canvas.height;
    const uvy = (y - 0.5 * canvas.height) / canvas.height;

    juliaC.x = center.x + uvx * zoom;
    juliaC.y = center.y + uvy * zoom;
  });

  // Keyboard shortcuts
  window.addEventListener('keydown', (e) => {
    if (e.key === 'j' || e.key === 'J') {
      juliaMode = 1;
    } else if (e.key === 'm' || e.key === 'M') {
      juliaMode = 0;
    } else if (e.key === 'r' || e.key === 'R') {
      // reset view
      center = { x: -0.5, y: 0.0 };
      zoom = 3.0;
      iterations = 300;
      juliaMode = 0;
      juliaC = { x: -0.8, y: 0.156 };
    }
  });

  const startTime = performance.now();

  function render(now) {
    const time = (now - startTime) / 1000.0;

    gl.useProgram(program);
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.enableVertexAttribArray(aPositionLoc);
    gl.vertexAttribPointer(aPositionLoc, 2, gl.FLOAT, false, 0, 0);

    gl.uniform2f(uResolutionLoc, canvas.width, canvas.height);
    gl.uniform2f(uCenterLoc, center.x, center.y);
    gl.uniform1f(uZoomLoc, zoom);
    gl.uniform1i(uIterationsLoc, iterations);
    gl.uniform1f(uTimeLoc, time);
    gl.uniform1i(uJuliaModeLoc, juliaMode);
    gl.uniform2f(uCLoc, juliaC.x, juliaC.y);

    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLES, 0, 6);

    requestAnimationFrame(render);
  }

  requestAnimationFrame(render);
})();
