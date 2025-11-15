# Mandelbrot & Julia Explorer (WebGL)

An interactive, GPU-accelerated fractal explorer that runs entirely in the browser using WebGL.

## Features

- Mandelbrot & Julia sets in real time
- Scroll to zoom smoothly
- Click and drag to pan the view
- Click to set the Julia seed (when in Julia mode)
- Animated color palette via fragment shader
- Works great on GitHub Pages (pure static site)

## Controls

- **Scroll wheel** – Zoom in / out
- **Left mouse drag** – Pan around the fractal
- **Click** – Set the Julia constant at the clicked position
- **M** – Switch to Mandelbrot mode
- **J** – Switch to Julia mode (using the last clicked seed)
- **R** – Reset view to default

## Local Usage

Simply open `index.html` in a modern browser that supports WebGL.
For best results, serve via a local HTTP server (e.g. `npx serve` or VS Code Live Server).

## Deploying to GitHub Pages

1. Create a new repository on GitHub (e.g. `mandelbrot-julia-explorer`).
2. Add these project files and push to the `main` (or `master`) branch.
3. In your repository, go to **Settings → Pages**.
4. Under **Source**, choose **Deploy from a branch**.
5. Select the `main` branch and the root directory, then save.
6. After a short while, your fractal explorer will be live at:

   ```text
   https://<your-username>.github.io/mandelbrot-julia-explorer/
   ```

## License

MIT – feel free to modify and build on this.
