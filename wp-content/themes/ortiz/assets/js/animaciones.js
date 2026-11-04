/**
 * Animaciones de entrada (Web Animations API). Con «reducir movimiento» no se anima nada.
 *   [data-kinetic]  titular palabra por palabra (cada 35 ms, sin desenfoque)
 *   [data-reveal]   aparece al entrar en pantalla (480 ms, 16 px, escalonado máx. 4 × 50 ms)
 *   [data-kenburns] acercamiento lento de la foto (22 s)
 *   [data-spin]     anillo del recorrido 360° (una vuelta cada 14 s)
 *   [data-float]    flota suavemente
 *   [data-marquee]  franja de municipios (40 s; se detiene al pasar el cursor)
 *   [data-count]    cuenta hasta el número
 * Lógica de referencia: componentDidMount de cada .dc.html.
 */

const reducir = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const curva = 'cubic-bezier(.2,.7,.2,1)';

if (!reducir && Element.prototype.animate) {
	document.querySelectorAll('[data-kinetic]').forEach((titular) => {
		[...titular.children].forEach((palabra, i) => palabra.animate(
			[{ opacity: 0, transform: 'translateY(30%)' }, { opacity: 1, transform: 'none' }],
			{ duration: 520, delay: 40 + i * 35, easing: curva, fill: 'backwards' }
		));
	});

	document.querySelectorAll('[data-kenburns]').forEach((el) => el.animate(
		[{ transform: 'scale(1.02)' }, { transform: 'scale(1.12) translateX(-2%)' }],
		{ duration: 22000, iterations: Infinity, direction: 'alternate', easing: 'ease-in-out' }
	));

	document.querySelectorAll('[data-spin]').forEach((el) => el.animate(
		[{ transform: 'rotate(0)' }, { transform: 'rotate(360deg)' }],
		{ duration: 14000, iterations: Infinity }
	));

	document.querySelectorAll('[data-float]').forEach((el) => el.animate(
		[{ transform: 'translateY(0)' }, { transform: 'translateY(-8px)' }],
		{ duration: 2600, iterations: Infinity, direction: 'alternate', easing: 'ease-in-out' }
	));

	document.querySelectorAll('[data-marquee]').forEach((pista) => {
		const anim = pista.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(-50%)' }], { duration: 40000, iterations: Infinity });
		const zona = pista.closest('[data-marquee-zona]') || pista;
		zona.addEventListener('mouseenter', () => anim.pause());
		zona.addEventListener('mouseleave', () => anim.play());
		zona.addEventListener('focusin', () => anim.pause());
		zona.addEventListener('focusout', () => anim.play());
	});

	const contar = (el) => {
		const meta = Number(el.dataset.count) || 0;
		const t0 = performance.now();
		const paso = (t) => {
			const k = Math.min(1, (t - t0) / 1400);
			el.textContent = Math.round(meta * (1 - Math.pow(1 - k, 3)));
			if (k < 1) requestAnimationFrame(paso);
		};
		requestAnimationFrame(paso);
	};

	const io = new IntersectionObserver((entradas) => entradas.forEach((e) => {
		if (!e.isIntersecting) return;
		const el = e.target;
		io.unobserve(el);
		if (el.dataset.count) {
			contar(el);
			return;
		}
		const hermanos = el.parentElement ? [...el.parentElement.children].filter((c) => c.hasAttribute('data-reveal')) : [];
		const i = Math.max(0, hermanos.indexOf(el));
		el.animate(
			[{ opacity: 0, transform: 'translateY(16px)' }, { opacity: 1, transform: 'none' }],
			{ duration: 480, delay: Math.min(i, 4) * 50, easing: curva, fill: 'backwards' }
		);
	}), { threshold: 0, rootMargin: '0px 0px -6% 0px' });

	document.querySelectorAll('[data-reveal], [data-count]').forEach((el) => io.observe(el));
}
