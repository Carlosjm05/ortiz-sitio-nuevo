/**
 * Fichas de proyecto y casa: compartir, imprimir, recorrido 360° y video, visor de fotos, plano,
 * pestañas Todos / Disponibles y botones que llevan al simulador (las preguntas, en acordeon.js).
 * Lógica de referencia: renderVals / componentDidMount de Plantilla Proyecto.dc.html y Plantilla Propiedad.dc.html.
 */

const reducir = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const curva = 'cubic-bezier(.2,.7,.2,1)';

/* ───────── Compartir (menú del sistema en celulares; en computador copia el enlace) ───────── */
document.querySelectorAll('[data-compartir]').forEach((boton) => {
	const texto = boton.querySelector('[data-compartir-texto]');
	const original = texto ? texto.textContent : '';
	boton.addEventListener('click', async () => {
		const tactil = window.matchMedia('(pointer: coarse)').matches;
		if (tactil && navigator.share) {
			try {
				await navigator.share({ title: document.title, url: location.href });
			} catch (e) { /* el usuario canceló */ }
			return;
		}
		try {
			await navigator.clipboard.writeText(location.href);
		} catch (e) { /* sin permiso de portapapeles */ }
		if (texto) {
			texto.textContent = 'Enlace copiado';
			setTimeout(() => { texto.textContent = original; }, 1800);
		}
	});
});

document.querySelectorAll('[data-imprimir]').forEach((b) => b.addEventListener('click', () => window.print()));

/* ───────── Recorrido 360° y video: el póster se cambia por el reproductor al hacer clic ───────── */
document.querySelectorAll('[data-incrustar]').forEach((boton) => {
	boton.addEventListener('click', () => {
		const marco = document.createElement('iframe');
		marco.className = 'galeria__incrustado';
		marco.src = boton.dataset.incrustar;
		marco.title = boton.dataset.incrustarTitulo || '';
		marco.allow = boton.dataset.incrustarPermiso || 'fullscreen';
		marco.allowFullscreen = true;
		const caja = boton.parentElement;
		caja.querySelectorAll('.galeria__completa').forEach((a) => a.remove());
		boton.replaceWith(marco);
		marco.focus();
	});
});

/* ───────── Ventanas (plano y visor) con <dialog>: Esc, clic afuera, foco de vuelta, sin desplazar la página ───────── */
let origen = null;
const abrir = (dialogo, desde) => {
	if (!dialogo || dialogo.open) return;
	origen = desde || document.activeElement;
	dialogo.showModal();
	document.documentElement.classList.add('sin-scroll');
};
// La limpieza no depende solo del evento «close» (no siempre llega): se hace también al cerrar con botón, clic afuera o Esc.
const limpiar = () => {
	if (document.querySelector('dialog[data-dialogo][open]')) return;
	document.documentElement.classList.remove('sin-scroll');
	if (origen && origen.focus) origen.focus();
	origen = null;
};
const cerrar = (dialogo) => {
	if (dialogo.open) dialogo.close();
	limpiar();
};
document.querySelectorAll('dialog[data-dialogo]').forEach((dialogo) => {
	dialogo.addEventListener('close', limpiar);
	dialogo.addEventListener('cancel', () => setTimeout(limpiar, 0));
	dialogo.addEventListener('click', (e) => {
		if (e.target === dialogo) cerrar(dialogo);
	});
	dialogo.querySelectorAll('[data-dialogo-cerrar]').forEach((b) => b.addEventListener('click', () => cerrar(dialogo)));
});
document.querySelectorAll('[data-dialogo-abrir]').forEach((boton) => {
	boton.addEventListener('click', () => abrir(document.getElementById(boton.dataset.dialogoAbrir), boton));
});

/* ───────── Visor de fotos ───────── */
const visor = document.querySelector('[data-visor]');
if (visor) {
	let fotos = [];
	try {
		fotos = JSON.parse(visor.querySelector('[data-visor-fotos]').textContent);
	} catch (e) {
		fotos = [];
	}
	const img = visor.querySelector('[data-visor-foto]');
	const cuenta = visor.querySelector('[data-visor-cuenta]');
	let i = 0;
	const mostrar = (n) => {
		if (!fotos.length) return;
		i = (n + fotos.length) % fotos.length;
		img.src = fotos[i].src;
		img.alt = fotos[i].alt;
		cuenta.textContent = (i + 1) + ' / ' + fotos.length;
		if (!reducir() && img.animate) img.animate([{ opacity: 0.4 }, { opacity: 1 }], { duration: 220, easing: curva });
	};
	visor.querySelector('[data-visor-prev]').addEventListener('click', () => mostrar(i - 1));
	visor.querySelector('[data-visor-next]').addEventListener('click', () => mostrar(i + 1));
	visor.addEventListener('keydown', (e) => {
		if (e.key === 'ArrowLeft') { e.preventDefault(); mostrar(i - 1); }
		if (e.key === 'ArrowRight') { e.preventDefault(); mostrar(i + 1); }
	});
	document.querySelectorAll('[data-visor-abrir]').forEach((boton) => {
		boton.addEventListener('click', () => {
			mostrar(Number(boton.dataset.visorAbrir) || 0);
			abrir(visor, boton);
			const cerrar = visor.querySelector('[data-dialogo-cerrar]');
			if (cerrar) cerrar.focus();
		});
	});
}

/* ───────── Inventario: Todos / Disponibles ───────── */
document.querySelectorAll('[data-filtro-unidades]').forEach((tabs) => {
	const lista = document.getElementById(tabs.querySelector('[aria-controls]').getAttribute('aria-controls'));
	const pestanas = [...tabs.querySelectorAll('[data-filtro]')];
	const elegir = (p) => {
		pestanas.forEach((x) => {
			x.setAttribute('aria-selected', String(x === p));
			x.tabIndex = x === p ? 0 : -1;
		});
		const solo = p.dataset.filtro === 'disponibles';
		lista.querySelectorAll('[data-tomada]').forEach((fila) => { fila.hidden = solo; });
	};
	pestanas.forEach((p, n) => {
		p.tabIndex = p.getAttribute('aria-selected') === 'true' ? 0 : -1;
		p.addEventListener('click', () => elegir(p));
		p.addEventListener('keydown', (e) => {
			if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
			e.preventDefault();
			const sig = pestanas[(n + (e.key === 'ArrowRight' ? 1 : -1) + pestanas.length) % pestanas.length];
			sig.focus();
			elegir(sig);
		});
	});
});

/* ───────── Botones que llevan a una sección (Simula tu crédito) ───────── */
document.querySelectorAll('[data-ir]').forEach((boton) => {
	boton.addEventListener('click', () => {
		const destino = document.getElementById(boton.dataset.ir);
		if (!destino) return;
		window.scrollTo({ top: destino.getBoundingClientRect().top + window.scrollY - 150, behavior: reducir() ? 'auto' : 'smooth' });
	});
});
