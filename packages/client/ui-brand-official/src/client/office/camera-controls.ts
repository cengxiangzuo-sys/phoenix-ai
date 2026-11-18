/** Input controller for the isolated scene. Rotation and zoom never translate the orbit center. */
export const cameraControlsSource = `
function installOfficeCameraControls(canvas, resetButton) {
  const initial = { yaw: Math.atan2(20, 27), pitch: Math.atan2(24, Math.hypot(20, 27)), zoom: 1.04 };
  const view = { ...initial, dragged: false, reset() { Object.assign(view, initial); } };
  let pointer = null;
  const clamp = (value, low, high) => Math.min(high, Math.max(low, value));
  function zoom(delta) { view.zoom = clamp(view.zoom * Math.exp(-delta * .0015), .55, 3); }
  canvas.addEventListener('pointerdown', event => {
    if (event.button !== 0 || pointer) return;
    view.dragged = false;
    pointer = { id: event.pointerId, x: event.clientX, y: event.clientY, distance: 0 };
    canvas.setPointerCapture(event.pointerId);
    canvas.classList.add('dragging');
    canvas.focus({ preventScroll: true });
  });
  canvas.addEventListener('pointermove', event => {
    if (!pointer || pointer.id !== event.pointerId) return;
    const dx = event.clientX - pointer.x, dy = event.clientY - pointer.y;
    pointer.distance += Math.hypot(dx, dy);
    pointer.x = event.clientX; pointer.y = event.clientY;
    if (pointer.distance < 4) return;
    view.dragged = true;
    view.yaw = (view.yaw - dx * .006) % (Math.PI * 2);
    view.pitch = clamp(view.pitch + dy * .004, .35, 1.3);
  });
  function release(event) {
    if (!pointer || pointer.id !== event.pointerId) return;
    pointer = null;
    canvas.classList.remove('dragging');
    if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
  }
  canvas.addEventListener('pointerup', release);
  canvas.addEventListener('pointercancel', release);
  canvas.addEventListener('lostpointercapture', release);
  canvas.addEventListener('wheel', event => {
    event.preventDefault();
    zoom(clamp(event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? canvas.clientHeight : 1), -300, 300));
  }, { passive: false });
  canvas.addEventListener('keydown', event => {
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', '+', '=', '-', '0'].includes(event.key)) return;
    event.preventDefault();
    if (event.key === 'ArrowLeft') view.yaw -= .12;
    if (event.key === 'ArrowRight') view.yaw += .12;
    if (event.key === 'ArrowUp') view.pitch = clamp(view.pitch + .08, .35, 1.3);
    if (event.key === 'ArrowDown') view.pitch = clamp(view.pitch - .08, .35, 1.3);
    if (event.key === '+' || event.key === '=') zoom(-80);
    if (event.key === '-') zoom(80);
    if (event.key === '0') resetButton.click();
  });
  resetButton.addEventListener('click', () => view.reset());
  return view;
}
`
