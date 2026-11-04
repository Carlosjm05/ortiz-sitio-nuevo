/**
 * Departamento: «Elige tu municipio» (pestañas que cambian la tarjeta al pasar el cursor o tocar), pestañas del
 * carrusel de proyectos por municipio y «Ver sus proyectos» (filtra el carrusel y baja hasta él).
 * Lógica de referencia: muns / munChips / goProjects de Departamento Tolima.dc.html.
 */

const reducir = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ───────── Elige tu municipio ───────── */
document.querySelectorAll('[data-municipios]').forEach((caja) => {
	const tabs = [...caja.querySelectorAll('[data-mun-tab]')];
	const elegir = (tab, enfocar) => {
		tabs.forEach((t) => {
			const on = t === tab;
			t.setAttribute('aria-selected', String(on));
			t.tabIndex = on ? 0 : -1;
			const panel = document.getElementById(t.getAttribute('aria-controls'));
			if (panel) panel.hidden = !on;
		});
		if (enfocar) tab.focus();
	};
	tabs.forEach((t, i) => {
		t.addEventListener('click', () => elegir(t, false));
		t.addEventListener('mouseenter', () => { if (t.getAttribute('aria-selected') !== 'true') elegir(t, false); });
		t.addEventListener('keydown', (e) => {
			const mapa = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 };
			if (!(e.key in mapa)) return;
			e.preventDefault();
			elegir(tabs[(i + mapa[e.key] + tabs.length) % tabs.length], true);
		});
	});
});

/* ───────── Carrusel de proyectos filtrado por municipio ───────── */
const zona = document.querySelector('[data-proyectos-lugar]');
const chips = zona ? [...zona.querySelectorAll('[data-chip-mun]')] : [];
const pista = zona ? zona.querySelector('[data-carrusel]') : null;

const filtrar = (mun) => {
	if (!pista) return;
	chips.forEach((c) => {
		const on = c.dataset.chipMun === mun;
		c.setAttribute('aria-selected', String(on));
		c.tabIndex = on ? 0 : -1;
	});
	[...pista.children].forEach((t) => { t.hidden = mun !== '' && t.dataset.mun !== mun; });
	pista.scrollTo({ left: 0, behavior: reducir() ? 'auto' : 'smooth' });
};

chips.forEach((c, i) => {
	c.addEventListener('click', () => filtrar(c.dataset.chipMun));
	c.addEventListener('keydown', (e) => {
		if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
		e.preventDefault();
		const sig = chips[(i + (e.key === 'ArrowRight' ? 1 : -1) + chips.length) % chips.length];
		sig.focus();
		filtrar(sig.dataset.chipMun);
	});
});

document.querySelectorAll('[data-ver-mun]').forEach((a) => {
	a.addEventListener('click', (e) => {
		const destino = document.getElementById('s-cards');
		if (!destino) return;
		e.preventDefault();
		if (chips.some((c) => c.dataset.chipMun === a.dataset.verMun)) filtrar(a.dataset.verMun);
		window.scrollTo({ top: destino.getBoundingClientRect().top + window.scrollY - 140, behavior: reducir() ? 'auto' : 'smooth' });
	});
});
