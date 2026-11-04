/**
 * Enlaces: botón «Compartir» (menú de compartir del teléfono o, si no hay, copia el enlace y muestra «Copiado»).
 * Sin JS el botón no aparece. Lógica de referencia: share de Enlaces.dc.html.
 * (El carrusel de proyectos se arrastra con el mouse gracias a arrastre.js, común a todo el sitio.)
 */

// Copia con un campo oculto cuando el navegador no deja usar el portapapeles moderno.
const copiarViejo = (texto) => {
	const t = document.createElement('textarea');
	t.value = texto;
	t.setAttribute('readonly', '');
	t.style.position = 'fixed';
	t.style.opacity = '0';
	document.body.append(t);
	t.select();
	let ok = false;
	try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
	t.remove();
	return ok;
};

const boton = document.querySelector('[data-compartir]');
if (boton) {
	const txt = boton.querySelector('[data-compartir-txt]');
	const original = txt.textContent;
	boton.hidden = false;
	boton.addEventListener('click', async () => {
		const url = window.location.href;
		try {
			if (navigator.share) {
				await navigator.share({ title: boton.dataset.titulo || document.title, url });
				return;
			}
			await navigator.clipboard.writeText(url);
		} catch (e) {
			if (e && e.name === 'AbortError') return; // La persona cerró el menú de compartir.
			if (!copiarViejo(url)) return;
		}
		txt.textContent = boton.dataset.copiado || original;
		clearTimeout(boton._t);
		boton._t = setTimeout(() => { txt.textContent = original; }, 1800);
	});
}
