/**
 * Flechas de los carruseles: avanzan una tarjeta (ancho de la tarjeta + separación), con desplazamiento suave.
 * Marcado: [data-carrusel-zona] con [data-carrusel] (la pista) y botones [data-carrusel-prev] / [data-carrusel-next].
 * El arrastre con el mouse está en arrastre.js. Lógica de referencia: scrollBy() de los .dc.html.
 */

const reducir = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

document.querySelectorAll('[data-carrusel]').forEach((pista) => {
	const zona = pista.closest('[data-carrusel-zona]') || pista.parentElement;
	const paso = () => {
		const primera = pista.firstElementChild;
		if (!primera) return pista.clientWidth;
		const gap = parseFloat(getComputedStyle(pista).columnGap) || 0;
		return primera.getBoundingClientRect().width + gap;
	};
	const mover = (dir) => pista.scrollBy({ left: dir * paso(), behavior: reducir() ? 'auto' : 'smooth' });
	zona.querySelectorAll('[data-carrusel-prev]').forEach((b) => b.addEventListener('click', () => mover(-1)));
	zona.querySelectorAll('[data-carrusel-next]').forEach((b) => b.addEventListener('click', () => mover(1)));
	pista.addEventListener('keydown', (e) => {
		if (e.target !== pista) return;
		if (e.key === 'ArrowRight') { e.preventDefault(); mover(1); }
		if (e.key === 'ArrowLeft') { e.preventDefault(); mover(-1); }
	});
});
