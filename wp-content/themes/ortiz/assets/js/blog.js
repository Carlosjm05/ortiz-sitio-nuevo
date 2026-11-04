/**
 * Blog: búsqueda en vivo, filtros por tipo y tema, «La más leída», pestañas de «Guías por paso» y suscripción.
 * Sin JS: la búsqueda va por ?buscar=, los temas son enlaces a /blog/categoria/{tema}/, se ve el primer paso y la
 * suscripción se envía por admin-post. Lógica de referencia: gList, gdCats, blTypes, gdSteps y blSubmit de Blog.dc.html.
 */

const reducir = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const curva = 'cubic-bezier(.2,.7,.2,1)';
const norm = (t) => String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const plural = (n, s, p) => n + ' ' + (n === 1 ? s : p);
const aparecer = (el) => { if (el && !reducir() && el.animate) el.animate([{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], { duration: 300, easing: curva }); };

/* ───────── Todo el blog ───────── */
const zona = document.querySelector('[data-btodo]');
if (zona) {
	const cards = [...zona.querySelectorAll('.bcard')];
	const dest = zona.querySelector('[data-bdest]');
	const destId = zona.dataset.destacada || '0';
	const total = zona.querySelector('[data-btodo-n]');
	const vacio = zona.querySelector('[data-bvacio]');
	const waVacio = zona.querySelector('[data-bvacio-wa]');
	const tabsTipo = [...zona.querySelectorAll('[data-tipo-filtro]')];
	const chipsTema = [...zona.querySelectorAll('[data-tema-filtro]')];
	const q = document.querySelector('[data-blog-q]');
	const borrar = document.querySelector('[data-blog-borrar]');
	const estado = { tipo: 'todo', tema: zona.dataset.temaInicial || '', q: q ? q.value.trim() : '' };
	// ?tipo=guia (miga «Guías» de los artículos) llega con ese filtro puesto.
	const tipoUrl = new URLSearchParams(window.location.search).get('tipo');
	if (tipoUrl && tabsTipo.some((b) => b.dataset.tipoFiltro === tipoUrl)) estado.tipo = tipoUrl;

	const pasa = (c, tipo = estado.tipo, tema = estado.tema) => (tipo === 'todo' || c.dataset.tipo === tipo)
		&& (tema === '' || c.dataset.tema === tema)
		&& (!estado.q || c.dataset.texto.includes(norm(estado.q)));

	const filtrar = () => {
		const destOn = !!dest && estado.tema === '' && !estado.q && (estado.tipo === 'todo' || estado.tipo === 'guia');
		let n = 0;
		cards.forEach((c) => {
			const ok = pasa(c);
			if (ok) n += 1;
			const ver = ok && !(destOn && c.dataset.id === destId);
			if (ver && c.hidden) aparecer(c);
			c.hidden = !ver;
		});
		if (dest) dest.hidden = !destOn;
		if (total) total.textContent = plural(n, 'publicación', 'publicaciones');
		if (vacio) vacio.hidden = n > 0;
		if (waVacio) {
			const base = waVacio.href.split('?')[0];
			waVacio.href = base + '?text=' + encodeURIComponent(((waVacio.dataset.prefijo || '') + ' ' + estado.q).trim());
		}
		// Conteos de los temas según el tipo y la búsqueda (los de tipo cuentan todo, como el diseño).
		chipsTema.forEach((b) => {
			const t = b.dataset.temaFiltro;
			b.setAttribute('aria-selected', String(t === estado.tema));
			b.querySelector('[data-cuenta]').textContent = cards.filter((c) => pasa(c, estado.tipo, t)).length;
		});
		tabsTipo.forEach((b) => b.setAttribute('aria-selected', String(b.dataset.tipoFiltro === estado.tipo)));
		if (borrar) borrar.hidden = !estado.q;
		const url = new URL(window.location.href);
		if (estado.q) url.searchParams.set('buscar', estado.q); else url.searchParams.delete('buscar');
		window.history.replaceState(null, '', url);
	};
	const irALista = () => zona.scrollIntoView({ behavior: reducir() ? 'auto' : 'smooth', block: 'start' });

	tabsTipo.forEach((b) => b.addEventListener('click', () => { estado.tipo = b.dataset.tipoFiltro; estado.tema = ''; filtrar(); }));
	chipsTema.forEach((b) => b.addEventListener('click', () => { estado.tema = b.dataset.temaFiltro; filtrar(); }));
	document.querySelectorAll('[data-blog-tema]').forEach((a) => a.addEventListener('click', (e) => {
		e.preventDefault();
		estado.tema = a.dataset.blogTema;
		estado.tipo = 'todo';
		filtrar();
		irALista();
	}));

	if (q) {
		let t = null;
		q.addEventListener('input', () => {
			clearTimeout(t);
			t = setTimeout(() => { estado.q = q.value.trim(); filtrar(); }, 150);
		});
		q.closest('form').addEventListener('submit', (e) => { e.preventDefault(); estado.q = q.value.trim(); filtrar(); irALista(); });
	}
	if (borrar) borrar.addEventListener('click', () => { q.value = ''; estado.q = ''; filtrar(); q.focus(); });
	document.querySelectorAll('[data-blog-sug]').forEach((a) => a.addEventListener('click', (e) => {
		e.preventDefault();
		q.value = a.dataset.blogSug;
		estado.q = q.value;
		filtrar();
		irALista();
	}));
	if (estado.tipo !== 'todo') filtrar();
}

/* ───────── Guías por paso (clic, cursor y flechas) ───────── */
document.querySelectorAll('[data-bpasos]').forEach((z) => {
	const tabs = [...z.querySelectorAll('[role="tab"]')];
	const elegir = (tab, foco) => {
		tabs.forEach((t) => {
			const on = t === tab;
			t.setAttribute('aria-selected', String(on));
			t.tabIndex = on ? 0 : -1;
			const p = document.getElementById(t.getAttribute('aria-controls'));
			if (!p) return;
			if (on && p.hidden) { p.hidden = false; aparecer(p); } else if (!on) p.hidden = true;
		});
		if (foco) tab.focus();
	};
	tabs.forEach((t, i) => {
		t.addEventListener('click', () => elegir(t, false));
		t.addEventListener('mouseenter', () => { if (window.matchMedia('(hover: hover)').matches) elegir(t, false); });
		t.addEventListener('keydown', (e) => {
			const ir = { ArrowDown: i + 1, ArrowRight: i + 1, ArrowUp: i - 1, ArrowLeft: i - 1, Home: 0, End: tabs.length - 1 }[e.key];
			if (ir === undefined) return;
			e.preventDefault();
			elegir(tabs[(ir + tabs.length) % tabs.length], true);
		});
	});
});

/* ───────── Suscripción ───────── */
const fSub = document.querySelector('[data-bsub]');
if (fSub) {
	let cfg = {};
	try { cfg = JSON.parse(fSub.querySelector('[data-bsub-config]').textContent); } catch (e) { cfg = {}; }
	const error = fSub.querySelector('[data-bsub-error]');
	const listo = document.querySelector('[data-bsub-listo]');
	const valor = (n) => fSub.elements[n].value.trim();
	const mensaje = (t) => { error.textContent = t; error.hidden = t === ''; };
	fSub.noValidate = true;
	const faltan = () => valor('nombre').length < 2 || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(valor('correo')) || !fSub.elements.acepto.checked;
	let intento = false;
	fSub.addEventListener('input', () => { if (intento && !faltan()) mensaje(''); });
	fSub.addEventListener('change', () => { if (intento && !faltan()) mensaje(''); });
	fSub.addEventListener('submit', async (e) => {
		e.preventDefault();
		intento = true;
		if (faltan()) { mensaje('Falta tu nombre, tu correo o aceptar la política.'); return; }
		const boton = fSub.querySelector('button[type="submit"]');
		boton.disabled = true;
		const envio = cfg.envio || {};
		const datos = new FormData(fSub);
		const pedir = () => fetch(cfg.url, { method: 'POST', body: datos, credentials: 'same-origin', headers: { 'X-WP-Nonce': envio.restNonce || '' } })
			.then(async (r) => ({ status: r.status, json: await r.json().catch(() => null) }));
		try {
			let res = await pedir();
			const codigo = res.json ? (res.json.codigo || res.json.code) : '';
			if (res.status === 403 && (codigo === 'ortiz_nonce' || codigo === 'rest_cookie_invalid_nonce') && envio.nonceUrl) {
				const n = await (await fetch(envio.nonceUrl, { credentials: 'same-origin' })).json();
				envio.restNonce = n.restNonce;
				datos.set('_ortiz_nonce', n.nonce);
				res = await pedir();
			}
			if (!res.json || !res.json.ok) { mensaje(res.json && res.json.msg ? res.json.msg : 'No pudimos suscribirte. Inténtalo de nuevo.'); return; }
			const nombre = valor('nombre').split(/\s+/)[0];
			listo.querySelector('[data-bsub-listo-titulo]').textContent = (cfg.listo || '').replace('{nombre}', nombre);
			const t = listo.querySelector('[data-bsub-listo-texto]');
			t.textContent = cfg.confirma || '';
			t.hidden = !cfg.confirma;
			fSub.hidden = true;
			listo.hidden = false;
			aparecer(listo);
			if (window.ortizEvento) window.ortizEvento('generate_lead', { form_name: 'suscripcion' });
		} catch (err) {
			mensaje('No pudimos suscribirte. Revisa tu conexión.');
		} finally {
			boton.disabled = false;
		}
	});
}
