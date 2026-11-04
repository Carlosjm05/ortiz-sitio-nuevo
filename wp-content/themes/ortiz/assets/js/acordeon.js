/**
 * Preguntas frecuentes: una abierta a la vez, con fundido suave (la primera abierta al cargar).
 * Las cerradas quedan con hidden="until-found": si el navegador encuentra el texto con Ctrl+F, la pregunta se abre.
 * Se usa en fichas, listados, municipio y departamento.
 */

const reducir = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const curva = 'cubic-bezier(.2,.7,.2,1)';

document.querySelectorAll('[data-acordeon]').forEach((lista) => {
	const botones = [...lista.querySelectorAll('.faq__pregunta')];
	const respuesta = (b) => document.getElementById(b.getAttribute('aria-controls'));
	const poner = (b, abierta) => {
		const r = respuesta(b);
		b.setAttribute('aria-expanded', String(abierta));
		const icono = b.querySelector('.faq__icono');
		if (icono) icono.textContent = abierta ? '−' : '+';
		if (!r) return;
		if (abierta) {
			r.removeAttribute('hidden');
			if (!reducir() && r.animate) r.animate([{ opacity: 0, transform: 'translateY(-6px)' }, { opacity: 1, transform: 'none' }], { duration: 280, easing: curva });
		} else {
			r.setAttribute('hidden', 'until-found');
		}
	};
	botones.forEach((b) => {
		b.addEventListener('click', () => {
			const abierta = b.getAttribute('aria-expanded') === 'true';
			botones.forEach((otro) => { if (otro !== b && otro.getAttribute('aria-expanded') === 'true') poner(otro, false); });
			poner(b, !abierta);
		});
		const r = respuesta(b);
		if (r) r.addEventListener('beforematch', () => {
			botones.forEach((otro) => { if (otro !== b) poner(otro, false); });
			poner(b, true);
		});
	});
});
