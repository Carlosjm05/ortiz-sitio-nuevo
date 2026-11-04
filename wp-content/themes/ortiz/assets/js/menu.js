/**
 * Header: se compacta al bajar (76 → 70 px) y abre/cierra el mega menú y el panel «Menú».
 * Entrada: el panel baja con fundido (380 ms, −16 px → 0) y sus columnas entran escalonadas cada 50 ms.
 * Salida: columnas suben y se desvanecen (200 ms, cada 30 ms) y luego el panel (280 ms).
 * Mientras está abierto, la página no se desplaza (el panel sí, por dentro).
 * Lógica de referencia: toggleMega / componentDidUpdate de Inicio Ortiz v2.dc.html.
 */

const cabecera = document.querySelector('[data-cabecera]');
const panel = document.getElementById('mega-municipios');
const reducir = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const entrada = 'cubic-bezier(.2,.7,.2,1)';
const salida = 'cubic-bezier(.4,0,.2,1)';

if (cabecera) {
	// La clase en <html> deja que otras piezas fijas (el menú de secciones de las fichas) sigan la altura del header.
	const alBajar = () => {
		const bajado = window.scrollY > 40;
		cabecera.classList.toggle('is-bajado', bajado);
		document.documentElement.classList.toggle('cabecera-baja', bajado);
	};
	alBajar();
	window.addEventListener('scroll', alBajar, { passive: true });
}

if (cabecera && panel) {
	const botones = [...document.querySelectorAll('[data-mega-toggle]')];
	const grid = panel.firstElementChild;
	const visibles = () => [...grid.children].filter((el) => el.getClientRects().length > 0);
	let abierto = false;
	let cerrando = false;
	let origen = null;

	const marcar = (estado) => {
		botones.forEach((b) => b.setAttribute('aria-expanded', String(estado)));
		cabecera.classList.toggle('is-menu-abierto', estado);
		document.documentElement.classList.toggle('sin-scroll', estado);
	};

	const abrir = (boton) => {
		if (abierto) return;
		abierto = true;
		origen = boton;
		panel.hidden = false;
		marcar(true);
		if (reducir() || !panel.animate) return;
		panel.animate([{ opacity: 0, transform: 'translateY(-16px)' }, { opacity: 1, transform: 'none' }], { duration: 380, easing: entrada });
		visibles().forEach((el, i) => el.animate(
			[{ opacity: 0, transform: 'translateY(10px)' }, { opacity: 1, transform: 'none' }],
			{ duration: 420, delay: 80 + i * 50, easing: entrada, fill: 'backwards' }
		));
	};

	const cerrar = (devolverFoco = false) => {
		if (!abierto || cerrando) return;
		const terminar = () => {
			panel.getAnimations({ subtree: true }).forEach((a) => a.cancel());
			panel.hidden = true;
			abierto = false;
			cerrando = false;
			marcar(false);
			if (devolverFoco && origen) origen.focus();
		};
		if (reducir() || !panel.animate) {
			terminar();
			return;
		}
		cerrando = true;
		visibles().reverse().forEach((el, i) => el.animate(
			[{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateY(-8px)' }],
			{ duration: 200, delay: i * 30, easing: salida, fill: 'forwards' }
		));
		panel.animate(
			[{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateY(-16px)' }],
			{ duration: 280, delay: 90, easing: salida, fill: 'forwards' }
		).finished.then(terminar, terminar);
	};

	botones.forEach((b) => b.addEventListener('click', () => (abierto ? cerrar() : abrir(b))));

	document.addEventListener('keydown', (e) => {
		if (e.key === 'Escape' && abierto) cerrar(true);
	});

	// Clic fuera del panel y del header: cierra.
	document.addEventListener('click', (e) => {
		if (abierto && !cabecera.contains(e.target)) cerrar();
	});
}
