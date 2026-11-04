/**
 * Arrastrar con el mouse cualquier carrusel horizontal (clic sostenido y mover).
 * Cursor «grabbing»; si hubo arrastre no se dispara el clic del enlace; scroll-snap se reactiva al soltar.
 * Lógica de referencia: onDragDown en componentDidMount de cada .dc.html.
 */

const desplazable = (el) => {
	const cs = getComputedStyle(el);
	return (cs.overflowX === 'auto' || cs.overflowX === 'scroll') && el.scrollWidth > el.clientWidth + 4;
};

document.addEventListener('pointerdown', (e) => {
	if (e.pointerType !== 'mouse' || e.button !== 0) return;
	if (e.target.closest('input,textarea,select,[data-sin-arrastre]')) return;
	let el = e.target;
	while (el && el !== document.body && !desplazable(el)) el = el.parentElement;
	if (!el || el === document.body) return;

	const x0 = e.clientX;
	const s0 = el.scrollLeft;
	const snap = el.style.scrollSnapType;
	let movido = false;

	const mover = (ev) => {
		const dx = ev.clientX - x0;
		if (!movido && Math.abs(dx) > 5) {
			movido = true;
			el.style.scrollSnapType = 'none';
			el.style.cursor = 'grabbing';
			el.style.userSelect = 'none';
		}
		if (movido) {
			ev.preventDefault();
			el.scrollLeft = s0 - dx;
		}
	};

	const soltar = () => {
		window.removeEventListener('pointermove', mover);
		window.removeEventListener('pointerup', soltar);
		el.style.cursor = '';
		el.style.userSelect = '';
		if (!movido) return;
		const anular = (c) => { c.preventDefault(); c.stopPropagation(); };
		window.addEventListener('click', anular, { capture: true, once: true });
		setTimeout(() => window.removeEventListener('click', anular, { capture: true }), 60);
		el.style.scrollSnapType = snap;
	};

	window.addEventListener('pointermove', mover, { passive: false });
	window.addEventListener('pointerup', soltar);
});

// Las imágenes y enlaces no se «arrastran» como archivo dentro de los carruseles.
document.addEventListener('dragstart', (e) => {
	if (e.target.closest && e.target.closest('a,img')) e.preventDefault();
});
